import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

describe("GET /api/v1/employees/me", () => {
  it("resolves the current user from a verified token", async () => {
    const { authHeader, employee } = await createTestEmployee();
    const res = await request(app).get("/api/v1/employees/me").set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(employee.id);
    expect(res.body.email).toBe(employee.email);
  });

  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/employees/me");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed token", async () => {
    const res = await request(app).get("/api/v1/employees/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/employees", () => {
  it("lets HR create a new employee with a unique generated employeeId", async () => {
    const { authHeader } = await createTestEmployee({ role: "HR" });
    const res = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", authHeader)
      .send({ fullName: "New Hire", email: "new.hire@glampack.test", status: "Permanent" });

    expect(res.status).toBe(201);
    expect(res.body.employeeId).toMatch(/^EMP[A-Z0-9]{6}$/);
    expect(res.body.annualLeaveBalance).toBe(20);
    expect(res.body.accountStatus).toBe("Active");
  });

  it("rejects a plain Employee creating a new employee", async () => {
    const { authHeader } = await createTestEmployee({ role: "Employee" });
    const res = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", authHeader)
      .send({ fullName: "New Hire", email: "blocked@glampack.test", status: "Permanent" });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/employees/:id", () => {
  it("lets an employee edit their own allowed fields but not their role", async () => {
    const { authHeader, employee } = await createTestEmployee();
    const res = await request(app)
      .patch(`/api/v1/employees/${employee.id}`)
      .set("Authorization", authHeader)
      .send({ phone: "0555000111", role: "Admin" }); // role must be silently stripped, not applied

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe("0555000111");
    expect(res.body.role).toBe("Employee");
  });

  it("blocks an employee from editing someone else's record", async () => {
    const { authHeader } = await createTestEmployee();
    const { employee: other } = await createTestEmployee();
    const res = await request(app)
      .patch(`/api/v1/employees/${other.id}`)
      .set("Authorization", authHeader)
      .send({ phone: "0555000111" });
    expect(res.status).toBe(403);
  });
});
