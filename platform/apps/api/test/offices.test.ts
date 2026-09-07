import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

describe("Offices", () => {
  it("lets any authenticated employee list offices", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    await request(app)
      .post("/api/v1/offices")
      .set("Authorization", hrAuth)
      .send({ name: "Head Office", latitude: 5.603717, longitude: -0.186964 });

    const { authHeader } = await createTestEmployee({ role: "Employee" });
    const res = await request(app).get("/api/v1/offices").set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Head Office");
  });

  it("lets HR create an office", async () => {
    const { authHeader } = await createTestEmployee({ role: "HR" });
    const res = await request(app)
      .post("/api/v1/offices")
      .set("Authorization", authHeader)
      .send({ name: "Tema Depot", latitude: 5.6698, longitude: -0.0166 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Tema Depot");
  });

  it("blocks a plain Employee from creating an office", async () => {
    const { authHeader } = await createTestEmployee({ role: "Employee" });
    const res = await request(app)
      .post("/api/v1/offices")
      .set("Authorization", authHeader)
      .send({ name: "Tema Depot", latitude: 5.6698, longitude: -0.0166 });
    expect(res.status).toBe(403);
  });

  it("lets Admin update and delete an office", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    const created = await request(app)
      .post("/api/v1/offices")
      .set("Authorization", authHeader)
      .send({ name: "Kumasi Branch", latitude: 6.6885, longitude: -1.6244 });

    const updated = await request(app)
      .patch(`/api/v1/offices/${created.body.id}`)
      .set("Authorization", authHeader)
      .send({ name: "Kumasi Branch (Renamed)" });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Kumasi Branch (Renamed)");

    const deleted = await request(app).delete(`/api/v1/offices/${created.body.id}`).set("Authorization", authHeader);
    expect(deleted.status).toBe(204);
  });
});
