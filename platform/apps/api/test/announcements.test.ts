import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

describe("Announcements", () => {
  it("lets HR create an announcement, and any employee read it", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader } = await createTestEmployee();

    const created = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "Holiday Notice", message: "Office closed Monday", type: "HR" });
    expect(created.status).toBe(201);

    const list = await request(app).get("/api/v1/announcements").set("Authorization", authHeader);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it("blocks a plain Employee from creating an announcement (matches the live app's role gate)", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", authHeader)
      .send({ title: "X", message: "Y", type: "General" });
    expect(res.status).toBe(403);
  });

  it("dedupes read-tracking via upsert instead of erroring on repeat reads", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader } = await createTestEmployee();
    const created = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "X", message: "Y", type: "General" });

    const first = await request(app).post(`/api/v1/announcements/${created.body.id}/read`).set("Authorization", authHeader);
    const second = await request(app).post(`/api/v1/announcements/${created.body.id}/read`).set("Authorization", authHeader);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201); // idempotent, not a 409
  });

  it("lists only the announcement IDs the caller has personally read, for the unread-count badge", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader } = await createTestEmployee();
    const readOne = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "Read this", message: "Y", type: "General" });
    const unread = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "Unread", message: "Y", type: "General" });

    await request(app).post(`/api/v1/announcements/${readOne.body.id}/read`).set("Authorization", authHeader);

    const mine = await request(app).get("/api/v1/announcements/reads/me").set("Authorization", authHeader);
    expect(mine.status).toBe(200);
    expect(mine.body).toEqual([readOne.body.id]);
    expect(mine.body).not.toContain(unread.body.id);
  });

  it("supports threaded comments via parentCommentId", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader } = await createTestEmployee();
    const created = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "X", message: "Y", type: "General" });

    const root = await request(app)
      .post(`/api/v1/announcements/${created.body.id}/comments`)
      .set("Authorization", authHeader)
      .send({ comment: "First!" });

    const reply = await request(app)
      .post(`/api/v1/announcements/${created.body.id}/comments`)
      .set("Authorization", hrAuth)
      .send({ comment: "Thanks for reading", parentCommentId: root.body.id });

    expect(reply.status).toBe(201);
    expect(reply.body.parentCommentId).toBe(root.body.id);
  });

  it("reports real aggregate read counts per announcement, restricted to staff", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader: readerAuth } = await createTestEmployee();
    const { authHeader: otherReaderAuth } = await createTestEmployee();
    const created = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "X", message: "Y", type: "General" });

    await request(app).post(`/api/v1/announcements/${created.body.id}/read`).set("Authorization", readerAuth);
    await request(app).post(`/api/v1/announcements/${created.body.id}/read`).set("Authorization", otherReaderAuth);

    const blocked = await request(app).get("/api/v1/announcements/reads/counts").set("Authorization", readerAuth);
    expect(blocked.status).toBe(403);

    const counts = await request(app).get("/api/v1/announcements/reads/counts").set("Authorization", hrAuth);
    expect(counts.status).toBe(200);
    expect(counts.body[created.body.id]).toBe(2);
  });

  it("only lets the author or an admin delete an announcement", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader: otherHrAuth } = await createTestEmployee({ role: "HR" });
    const created = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", hrAuth)
      .send({ title: "X", message: "Y", type: "General" });

    const blocked = await request(app)
      .delete(`/api/v1/announcements/${created.body.id}`)
      .set("Authorization", otherHrAuth);
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .delete(`/api/v1/announcements/${created.body.id}`)
      .set("Authorization", hrAuth);
    expect(allowed.status).toBe(204);
  });
});
