import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

// All dates below are pinned inside Q1 2027 (Jan-Mar) to keep the Nov/Dec block
// and quarter-boundary logic deterministic regardless of when tests run.

describe("POST /api/v1/leave-requests — Vacation rules", () => {
  it("computes numberOfDays server-side and ignores any client-submitted value", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06", numberOfDays: 999 });

    expect(res.status).toBe(201);
    expect(res.body.numberOfDays).toBe(3); // inclusive of both endpoints
  });

  it("blocks a second Vacation request in the same quarter", async () => {
    const { authHeader } = await createTestEmployee();
    const first = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-02-10", endDate: "2027-02-11" });

    expect(second.status).toBe(409);
  });

  it("allows a second Vacation request in a different quarter", async () => {
    const { authHeader } = await createTestEmployee();
    await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06" });

    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-04-05", endDate: "2027-04-06" });

    expect(res.status).toBe(201);
  });

  it("rejects Vacation leave starting in December", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-12-05", endDate: "2027-12-06" });
    expect(res.status).toBe(400);
  });

  it("rejects Vacation leave longer than 7 days", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-12" });
    expect(res.status).toBe(400);
  });

  it("rejects Vacation leave spanning two quarters", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-03-30", endDate: "2027-04-02" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/leave-requests — Other (emergency) leave", () => {
  it("requires the start date to be today", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Other", startDate: "2027-01-04", endDate: "2027-01-04" });
    expect(res.status).toBe(400);
  });

  it("accepts Other leave starting today", async () => {
    const { authHeader } = await createTestEmployee();
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Other", startDate: today, endDate: today });
    expect(res.status).toBe(201);
  });
});

describe("Annual 20-day cap", () => {
  it("rejects a request that would push the employee's yearly total over 20 days", async () => {
    const { authHeader } = await createTestEmployee();
    // 4 separate Vacation requests across 4 quarters, 6 days each = 24 days, over the cap.
    const quarters = [
      ["2027-01-04", "2027-01-09"],
      ["2027-04-05", "2027-04-10"],
      ["2027-07-05", "2027-07-10"],
      ["2027-10-04", "2027-10-09"],
    ];
    let lastStatus = 0;
    for (const [startDate, endDate] of quarters) {
      const res = await request(app)
        .post("/api/v1/leave-requests")
        .set("Authorization", authHeader)
        .send({ leaveType: "Vacation", startDate, endDate });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(400); // the 4th request (24 total days) should be rejected
  });
});

describe("Approve / reject / cancel", () => {
  it("deducts the employee's leave balance on approval, in a single transaction", async () => {
    const { authHeader, employee } = await createTestEmployee({ annualLeaveBalance: 20 });
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });

    const created = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06" });

    const approved = await request(app)
      .patch(`/api/v1/leave-requests/${created.body.id}/approve`)
      .set("Authorization", hrAuth);

    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("Approved");

    const updatedEmployee = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
    expect(updatedEmployee.annualLeaveBalance).toBe(17); // 20 - 3 days
  });

  it("restores the balance when a staff member cancels an already-approved request", async () => {
    const { authHeader, employee } = await createTestEmployee({ annualLeaveBalance: 20 });
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });

    const created = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06" });
    await request(app).patch(`/api/v1/leave-requests/${created.body.id}/approve`).set("Authorization", hrAuth);

    const cancelled = await request(app)
      .patch(`/api/v1/leave-requests/${created.body.id}/cancel`)
      .set("Authorization", hrAuth)
      .send({ adminComments: "Employee no longer needs this leave" });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("Cancelled");

    const updatedEmployee = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
    expect(updatedEmployee.annualLeaveBalance).toBe(20); // restored
  });

  it("requires adminComments to reject a request", async () => {
    const { authHeader } = await createTestEmployee();
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });

    const created = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06" });

    const res = await request(app)
      .patch(`/api/v1/leave-requests/${created.body.id}/reject`)
      .set("Authorization", hrAuth)
      .send({});

    expect(res.status).toBe(400);
  });

  it("does not let a plain Employee approve a leave request", async () => {
    const { authHeader } = await createTestEmployee();
    const created = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", authHeader)
      .send({ leaveType: "Vacation", startDate: "2027-01-04", endDate: "2027-01-06" });

    const res = await request(app)
      .patch(`/api/v1/leave-requests/${created.body.id}/approve`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(403);
  });
});
