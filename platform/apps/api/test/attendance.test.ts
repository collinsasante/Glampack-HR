import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);

describe("Attendance check-in/check-out", () => {
  it("checks in with GPS position parsed into discrete columns, distance-from-office computed server-side", async () => {
    const { authHeader } = await createTestEmployee();
    // Matches attendance-tracker.html's old hardcoded office location.
    const office = await prisma.office.create({
      data: { name: "Head Office", latitude: 5.603717, longitude: -0.186964 },
    });
    const res = await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", authHeader)
      .send({
        shift: "MorningProductionDay",
        position: { lat: 5.6037, lng: -0.187 },
        officeId: office.id,
        city: "Accra",
        region: "Greater Accra",
      });

    expect(res.status).toBe(201);
    expect(res.body.checkInMethod).toBe("GPS");
    expect(res.body.checkInOfficeId).toBe(office.id);
    expect(Number(res.body.checkInLat)).toBeCloseTo(5.6037, 4);
    // This position is ~100m from the office, so distance should be small but
    // computed, never a client-submitted value.
    expect(Number(res.body.checkInDistanceFromOfficeM)).toBeGreaterThan(0);
    expect(Number(res.body.checkInDistanceFromOfficeM)).toBeLessThan(200);
  });

  it("computes no distance when no office is selected", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", authHeader)
      .send({ shift: "MorningProductionDay", position: { lat: 5.6037, lng: -0.187 } });

    expect(res.status).toBe(201);
    expect(res.body.checkInOfficeId).toBeNull();
    expect(res.body.checkInDistanceFromOfficeM).toBeNull();
  });

  it("rejects a second check-in on the same day", async () => {
    const { authHeader } = await createTestEmployee();
    await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", authHeader)
      .send({ shift: "MorningProductionDay" });

    const res = await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", authHeader)
      .send({ shift: "MorningProductionDay" });

    expect(res.status).toBe(409);
  });

  it("checks out against the most recent open record (supports overnight shifts)", async () => {
    const { authHeader } = await createTestEmployee();
    await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", authHeader)
      .send({ shift: "NightProduction" });

    const res = await request(app)
      .post("/api/v1/attendance/check-out")
      .set("Authorization", authHeader)
      .send({ position: { lat: 5.6, lng: -0.19 } });

    expect(res.status).toBe(200);
    expect(res.body.checkOutTime).not.toBeNull();
  });

  it("fails to check out with no open check-in", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app).post("/api/v1/attendance/check-out").set("Authorization", authHeader).send({});
    expect(res.status).toBe(409);
  });

  it("scopes a plain employee's attendance list to their own records", async () => {
    const { authHeader, employee } = await createTestEmployee();
    const { authHeader: otherAuth } = await createTestEmployee();

    await request(app).post("/api/v1/attendance/check-in").set("Authorization", authHeader).send({ shift: "StraightShift" });
    await request(app).post("/api/v1/attendance/check-in").set("Authorization", otherAuth).send({ shift: "StraightShift" });

    const res = await request(app).get("/api/v1/attendance").set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].employeeId).toBe(employee.id);
  });
});
