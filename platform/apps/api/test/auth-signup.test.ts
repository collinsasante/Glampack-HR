import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { makeFakeToken } from "./fakeToken.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);

describe("POST /api/v1/auth/signup", () => {
  it("creates an Employee record for a brand-new Firebase account, defaults applied server-side", async () => {
    const token = makeFakeToken({ uid: "new-uid-1", email: "new.hire@glampack.test", email_verified: false });

    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "New Hire", department: "Production" });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("Employee");
    expect(res.body.status).toBe("Permanent");
    expect(res.body.annualLeaveBalance).toBe(20);
    expect(res.body.email).toBe("new.hire@glampack.test");
  });

  it("works even though the token is not yet email-verified (matches the old app's signup-before-verification flow)", async () => {
    const token = makeFakeToken({ uid: "new-uid-2", email: "unverified@glampack.test", email_verified: false });
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Unverified Person" });
    expect(res.status).toBe(201);
  });

  it("rejects signup if an Employee already exists for that email", async () => {
    await prisma.employee.create({
      data: {
        employeeId: "EMPEXIST1",
        email: "existing@glampack.test",
        fullName: "Existing Person",
        role: "Employee",
        status: "Permanent",
      },
    });

    const token = makeFakeToken({ uid: "some-uid", email: "existing@glampack.test" });
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Existing Person" });

    expect(res.status).toBe(409);
  });

  it("does NOT let the client set role, status, or leave balance", async () => {
    const token = makeFakeToken({ uid: "new-uid-3", email: "sneaky@glampack.test" });
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Sneaky Person", role: "Admin", annualLeaveBalance: 999 });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("Employee");
    expect(res.body.annualLeaveBalance).toBe(20);
  });

  it("rejects an invalid/missing token", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({ fullName: "No Token" });
    expect(res.status).toBe(401);
  });
});
