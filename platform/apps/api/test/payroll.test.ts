import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

describe("POST /api/v1/payroll", () => {
  it("computes all totals server-side, ignoring any client-submitted totals", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { employee } = await createTestEmployee();

    const res = await request(app)
      .post("/api/v1/payroll")
      .set("Authorization", hrAuth)
      .send({
        employeeId: employee.id,
        month: "2027-01",
        basicSalary: 3000,
        housingAllowance: 300,
        transportAllowance: 200,
        incomeTax: 250,
        socialSecurity: 150,
        // A malicious/buggy client submitting a wildly wrong net salary must be ignored.
        netSalary: 999999,
        totalAllowances: 1,
        grossSalary: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.totalAllowances).toBe("500");
    expect(res.body.grossSalary).toBe("3500");
    expect(res.body.totalDeductions).toBe("400");
    expect(res.body.netSalary).toBe("3100");
    // amountToPay = netSalary + incomeTax + socialSecurity = 3100 + 250 + 150
    expect(res.body.amountToPay).toBe("3500");
  });

  it("folds custom allowances/deductions into the computed totals via child tables", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { employee } = await createTestEmployee();

    const res = await request(app)
      .post("/api/v1/payroll")
      .set("Authorization", hrAuth)
      .send({
        employeeId: employee.id,
        month: "2027-02",
        basicSalary: 2000,
        customAllowances: [{ name: "Loan Bonus", amount: 100, isRecurring: false }],
        customDeductions: [{ name: "Uniform", amount: 20, isRecurring: true, monthsRemaining: 2, totalMonths: 3 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.totalAllowances).toBe("100");
    expect(res.body.grossSalary).toBe("2100");
    expect(res.body.totalDeductions).toBe("20");
    expect(res.body.customAllowances).toHaveLength(1);
    expect(res.body.customDeductions[0].monthsRemaining).toBe(2);
  });

  it("rejects a plain Employee creating payroll", async () => {
    const { authHeader } = await createTestEmployee();
    const res = await request(app)
      .post("/api/v1/payroll")
      .set("Authorization", authHeader)
      .send({ employeeId: "whatever", month: "2027-01", basicSalary: 1000 });
    expect(res.status).toBe(403);
  });

  it("scopes an employee's own payroll list to just their records", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { authHeader, employee } = await createTestEmployee();
    const { employee: other } = await createTestEmployee();

    await request(app)
      .post("/api/v1/payroll")
      .set("Authorization", hrAuth)
      .send({ employeeId: employee.id, month: "2027-01", basicSalary: 1000 });
    await request(app)
      .post("/api/v1/payroll")
      .set("Authorization", hrAuth)
      .send({ employeeId: other.id, month: "2027-01", basicSalary: 1000 });

    const res = await request(app).get("/api/v1/payroll").set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].employeeId).toBe(employee.id);
  });
});

describe("PATCH /api/v1/payroll/:id/process", () => {
  it("transitions status to Processed", async () => {
    const { authHeader: hrAuth } = await createTestEmployee({ role: "HR" });
    const { employee } = await createTestEmployee();
    const created = await request(app)
      .post("/api/v1/payroll")
      .set("Authorization", hrAuth)
      .send({ employeeId: employee.id, month: "2027-01", basicSalary: 1000 });

    const res = await request(app)
      .patch(`/api/v1/payroll/${created.body.id}/process`)
      .set("Authorization", hrAuth)
      .send({ status: "Processed", paymentDate: "2027-01-31" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Processed");
  });
});
