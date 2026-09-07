import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);

describe("GET /api/v1/roles", () => {
  it("lists the seeded roles with their real permissions", async () => {
    const { authHeader } = await createTestEmployee({ role: "Employee" });
    const res = await request(app).get("/api/v1/roles").set("Authorization", authHeader);
    expect(res.status).toBe(200);
    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).toEqual(expect.arrayContaining(["Employee", "Manager", "HR", "Admin"]));
    const admin = res.body.find((r: { name: string }) => r.name === "Admin");
    expect(admin.permissions).toEqual(expect.arrayContaining(["roles.manage", "employees.deactivate"]));
  });
});

describe("POST /api/v1/roles", () => {
  it("lets a role with roles.manage create a new role with zero starting permissions", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    const res = await request(app)
      .post("/api/v1/roles")
      .set("Authorization", authHeader)
      .send({ name: "Supervisor" });
    expect(res.status).toBe(201);

    const list = await request(app).get("/api/v1/roles").set("Authorization", authHeader);
    const created = list.body.find((r: { name: string }) => r.name === "Supervisor");
    expect(created.permissions).toEqual([]);
    expect(created.isSystem).toBe(false);
  });

  it("blocks a role without roles.manage from creating a role", async () => {
    const { authHeader } = await createTestEmployee({ role: "Manager" });
    const res = await request(app).post("/api/v1/roles").set("Authorization", authHeader).send({ name: "Supervisor" });
    expect(res.status).toBe(403);
  });

  it("rejects a duplicate role name", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    const res = await request(app).post("/api/v1/roles").set("Authorization", authHeader).send({ name: "Admin" });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/v1/roles/:name/permissions", () => {
  it("grants and revokes a permission, and it takes effect immediately", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    await request(app).post("/api/v1/roles").set("Authorization", authHeader).send({ name: "Supervisor" });

    const grant = await request(app)
      .patch("/api/v1/roles/Supervisor/permissions")
      .set("Authorization", authHeader)
      .send({ key: "leave.approve", granted: true });
    expect(grant.status).toBe(204);

    const { authHeader: supervisorAuth } = await createTestEmployee({ role: "Supervisor" });
    const approveRes = await request(app)
      .patch("/api/v1/leave-requests/nonexistent-id/approve")
      .set("Authorization", supervisorAuth);
    // Not 403 — the permission is granted, so it gets past the gate (404 for the
    // nonexistent id instead, proving the check passed).
    expect(approveRes.status).not.toBe(403);

    const revoke = await request(app)
      .patch("/api/v1/roles/Supervisor/permissions")
      .set("Authorization", authHeader)
      .send({ key: "leave.approve", granted: false });
    expect(revoke.status).toBe(204);

    const approveRes2 = await request(app)
      .patch("/api/v1/leave-requests/nonexistent-id/approve")
      .set("Authorization", supervisorAuth);
    expect(approveRes2.status).toBe(403);
  });

  it("blocks removing roles.manage from the only role that has it", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    const res = await request(app)
      .patch("/api/v1/roles/Admin/permissions")
      .set("Authorization", authHeader)
      .send({ key: "roles.manage", granted: false });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/roles/:name", () => {
  it("blocks deleting a role that still has employees assigned", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    await createTestEmployee({ role: "Manager" });
    const res = await request(app).delete("/api/v1/roles/Manager").set("Authorization", authHeader);
    expect(res.status).toBe(409);
  });

  it("deletes an unused custom role", async () => {
    const { authHeader } = await createTestEmployee({ role: "Admin" });
    await request(app).post("/api/v1/roles").set("Authorization", authHeader).send({ name: "Supervisor" });
    const res = await request(app).delete("/api/v1/roles/Supervisor").set("Authorization", authHeader);
    expect(res.status).toBe(204);
    const role = await prisma.role.findUnique({ where: { name: "Supervisor" } });
    expect(role).toBeNull();
  });
});

describe("Dynamic role-based senior protection", () => {
  it("lets a custom role without roles.assign_senior assign basic roles but not senior ones", async () => {
    const { authHeader: adminAuth } = await createTestEmployee({ role: "Admin" });
    await request(app).post("/api/v1/roles").set("Authorization", adminAuth).send({ name: "Supervisor" });
    await request(app)
      .patch("/api/v1/roles/Supervisor/permissions")
      .set("Authorization", adminAuth)
      .send({ key: "roles.assign_basic", granted: true });

    const { authHeader: supervisorAuth } = await createTestEmployee({ role: "Supervisor" });
    const { employee: target } = await createTestEmployee({ role: "Employee" });

    const toManager = await request(app)
      .patch(`/api/v1/employees/${target.id}/role`)
      .set("Authorization", supervisorAuth)
      .send({ role: "Manager" });
    expect(toManager.status).toBe(200);

    const toAdmin = await request(app)
      .patch(`/api/v1/employees/${target.id}/role`)
      .set("Authorization", supervisorAuth)
      .send({ role: "Admin" });
    expect(toAdmin.status).toBe(403);
  });
});
