import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

describe("Medical claims", () => {
  it("lets an employee submit a claim with receipts", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/medical-claims")
      .set("Authorization", authHeader)
      .send({
        dateOfVisit: "2027-01-10",
        hospitalClinicName: "Korle Bu Teaching Hospital",
        descriptionOfTreatment: "Routine checkup",
        amountSpent: 250,
        receiptKeys: [{ s3Key: "medical-receipts/abc.pdf", filename: "receipt.pdf", url: "https://example.com/abc.pdf" }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Pending");
    expect(res.body.receipts).toHaveLength(1);
  });

  it("lets HR approve a pending claim with notes", async () => {
    const { authHeader } = await createTestEmployee();
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });

    const created = await request(app)
      .post("/api/v1/medical-claims")
      .set("Authorization", authHeader)
      .send({
        dateOfVisit: "2027-01-10",
        hospitalClinicName: "Ridge Hospital",
        descriptionOfTreatment: "Dental",
        amountSpent: 100,
      });

    const res = await request(app)
      .patch(`/api/v1/medical-claims/${created.body.id}/approve`)
      .set("Authorization", hrAuth)
      .send({ adminNotes: "Receipt verified" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Approved");
    expect(res.body.adminNotes).toBe("Receipt verified");
  });

  it("prevents deciding a claim twice", async () => {
    const { authHeader } = await createTestEmployee();
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });

    const created = await request(app)
      .post("/api/v1/medical-claims")
      .set("Authorization", authHeader)
      .send({ dateOfVisit: "2027-01-10", hospitalClinicName: "X", descriptionOfTreatment: "Y", amountSpent: 50 });

    await request(app).patch(`/api/v1/medical-claims/${created.body.id}/approve`).set("Authorization", hrAuth).send({});
    const second = await request(app)
      .patch(`/api/v1/medical-claims/${created.body.id}/reject`)
      .set("Authorization", hrAuth)
      .send({});

    expect(second.status).toBe(409);
  });

  it("blocks a plain Employee from approving claims", async () => {
    const { authHeader } = await createTestEmployee();
    const created = await request(app)
      .post("/api/v1/medical-claims")
      .set("Authorization", authHeader)
      .send({ dateOfVisit: "2027-01-10", hospitalClinicName: "X", descriptionOfTreatment: "Y", amountSpent: 50 });

    const res = await request(app)
      .patch(`/api/v1/medical-claims/${created.body.id}/approve`)
      .set("Authorization", authHeader)
      .send({});
    expect(res.status).toBe(403);
  });
});
