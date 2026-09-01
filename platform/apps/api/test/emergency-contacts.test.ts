import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

describe("Emergency contacts", () => {
  it("lets an employee create their own emergency contact", async () => {
    const { authHeader, employee } = await createTestEmployee();
    const res = await request(app)
      .post(`/api/v1/employees/${employee.id}/emergency-contacts`)
      .set("Authorization", authHeader)
      .send({ name: "Ama Doe", relationship: "Spouse", phoneNumber: "0555123456" });

    expect(res.status).toBe(201);
    expect(res.body.employeeId).toBe(employee.id);
  });

  it("blocks creating an emergency contact for someone else's employeeId", async () => {
    const { authHeader } = await createTestEmployee();
    const { employee: other } = await createTestEmployee();
    const res = await request(app)
      .post(`/api/v1/employees/${other.id}/emergency-contacts`)
      .set("Authorization", authHeader)
      .send({ name: "Ama Doe", relationship: "Spouse", phoneNumber: "0555123456" });
    expect(res.status).toBe(403);
  });

  it("ignores any employeeId in the update payload — the link cannot be re-parented", async () => {
    const { authHeader, employee } = await createTestEmployee();
    const { employee: other } = await createTestEmployee();
    const created = await request(app)
      .post(`/api/v1/employees/${employee.id}/emergency-contacts`)
      .set("Authorization", authHeader)
      .send({ name: "Ama Doe", relationship: "Spouse", phoneNumber: "0555123456" });

    const res = await request(app)
      .patch(`/api/v1/emergency-contacts/${created.body.id}`)
      .set("Authorization", authHeader)
      .send({ name: "Ama Updated", employeeId: other.id });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ama Updated");
    expect(res.body.employeeId).toBe(employee.id); // unchanged
  });

  it("blocks another employee from updating someone else's emergency contact", async () => {
    const { authHeader, employee } = await createTestEmployee();
    const { authHeader: otherAuth } = await createTestEmployee();
    const created = await request(app)
      .post(`/api/v1/employees/${employee.id}/emergency-contacts`)
      .set("Authorization", authHeader)
      .send({ name: "Ama Doe", relationship: "Spouse", phoneNumber: "0555123456" });

    const res = await request(app)
      .patch(`/api/v1/emergency-contacts/${created.body.id}`)
      .set("Authorization", otherAuth)
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);
  });
});
