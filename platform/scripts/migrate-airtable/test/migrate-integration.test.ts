import { beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { TABLES } from "../src/config.js";
import type { AirtableRecord } from "../src/airtable-client.js";

// Fixtures mirror the real field shapes confirmed via the live Airtable base earlier in
// this session (selectName-style {id,name,color} for single-selects, plain arrays of
// record IDs for links) — not invented shapes.
const FIXTURES: Record<string, AirtableRecord[]> = {
  [TABLES.employees]: [
    {
      id: "recEMP1",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        "Full Name": "Fredrick Debrah",
        Email: "fredrick@glampack.test",
        Role: { id: "sel1", name: "Admin" },
        Status: { id: "sel2", name: "Permanent" },
        Department: { id: "sel3", name: "Administration" },
        "Account Status": { id: "sel4", name: "Active" },
        "Employee ID": "EMPFRED01",
        "Annual Leave Balance": 20,
      },
    },
    {
      id: "recEMP2",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        "Full Name": "Test Employee",
        Email: "test.employee@glampack.test",
        Role: { id: "sel5", name: "Employee" },
        Status: { id: "sel2", name: "Permanent" },
        Department: { id: "sel6", name: "Production" },
        "Account Status": { id: "sel4", name: "Active" },
        "Annual Leave Balance": 15,
      },
    },
  ],
  [TABLES.emergencyContacts]: [
    {
      id: "recEC1",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        Employee: ["recEMP1"],
        Name: "Ama Debrah",
        Relationship: { id: "selr1", name: "Spouse" },
        "Phone Number": "0555000111",
      },
    },
  ],
  [TABLES.attendance]: [
    {
      id: "recATT1",
      createdTime: "2026-01-15T07:36:39.000Z",
      fields: {
        Employee: ["recEMP2"],
        Date: "2026-01-15",
        "Check In": "2026-01-15T07:36:39.000Z",
        Shift: { id: "sels1", name: "Straight Shift" },
        "Check In Location": "5.778817, -0.132601, Accra, Greater Accra Region (20378.2m from office)\n",
        "IP Address": "143.105.209.143\n",
      },
    },
  ],
  [TABLES.leaveRequests]: [
    {
      id: "recLR1",
      createdTime: "2026-01-04T00:00:00.000Z",
      fields: {
        Employee: ["recEMP2"],
        "Leave Type": { id: "sellt1", name: "Vacation" },
        "Start Date": "2026-01-04",
        "End Date": "2026-01-06",
        Days: 3,
        Status: { id: "sels2", name: "Approved" },
        Notes: "Family event",
      },
    },
  ],
  [TABLES.announcements]: [
    {
      id: "recANN1",
      createdTime: "2026-01-05T00:00:00.000Z",
      fields: {
        Title: "Staff Leave Notification",
        Message: "Please submit leave requests in advance.",
        "Posted By": "Fredrick Debrah",
        Priority: { id: "selp1", name: "High" },
        // Deliberately no Type field — matches the real base, where 0/10 records set it.
      },
    },
  ],
  [TABLES.announcementReads]: [
    {
      id: "recAR1",
      createdTime: "2026-01-06T00:00:00.000Z",
      fields: { Announcement: ["recANN1"], Employee: ["recEMP2"], "Read Date": "2026-01-06T00:00:00.000Z" },
    },
  ],
  [TABLES.announcementComments]: [
    {
      id: "recAC1",
      createdTime: "2026-01-06T00:00:00.000Z",
      fields: { Announcement: ["recANN1"], Employee: ["recEMP2"], Comment: "Noted, thank you." },
    },
  ],
  [TABLES.payroll]: [
    {
      id: "recPAY1",
      createdTime: "2026-01-31T00:00:00.000Z",
      fields: {
        Employee: ["recEMP2"],
        Month: "2026-01",
        "Basic Salary": 3000,
        "Housing Allowance": 300,
        "Custom Allowances": "[]",
        "Custom Deductions": "[]",
        Status: { id: "selpay1", name: "Processed" },
      },
    },
  ],
  [TABLES.medicalClaims]: [
    {
      id: "recMED1",
      createdTime: "2026-01-10T00:00:00.000Z",
      fields: {
        Employee: ["recEMP2"],
        "Date of visit": "2026-01-10",
        "Hospital/Clinic Name": "Ridge Hospital",
        "Description of Treatment": "Routine checkup",
        "Amount Spent (GH₵)": 100,
        Status: { id: "selmed1", name: "Pending" },
        "Upload Receipt/Proof": [{ url: "https://example.com/receipt.jpg", filename: "receipt.jpg", type: "image/jpeg" }],
      },
    },
  ],
};

vi.mock("../src/airtable-client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/airtable-client.js")>();
  return {
    ...actual,
    listAllRecords: vi.fn(async (tableId: string) => FIXTURES[tableId] ?? []),
  };
});

const prisma = new PrismaClient();

async function resetDb() {
  await prisma.announcementComment.deleteMany();
  await prisma.announcementRead.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.medicalClaimReceipt.deleteMany();
  await prisma.medicalClaim.deleteMany();
  await prisma.payrollCustomAllowance.deleteMany();
  await prisma.payrollCustomDeduction.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.employee.deleteMany();
}

describe("runMigration (end-to-end against real Postgres, mocked Airtable/Firebase/S3)", () => {
  beforeAll(async () => {
    await resetDb();
    const { runMigration } = await import("../src/migrate.js");
    await runMigration();
  });

  it("migrates both employees with correctly mapped enums", async () => {
    const admin = await prisma.employee.findUniqueOrThrow({ where: { email: "fredrick@glampack.test" } });
    expect(admin.role).toBe("Admin");
    expect(admin.department).toBe("Administration");
    expect(admin.employeeId).toBe("EMPFRED01");

    const employee = await prisma.employee.findUniqueOrThrow({ where: { email: "test.employee@glampack.test" } });
    expect(employee.role).toBe("Employee");
    // No explicit "Employee ID" in the fixture — must have generated one.
    expect(employee.employeeId).toMatch(/^EMP[A-Z0-9]{6}$/);
  });

  it("folds the linked Emergency Contact record correctly", async () => {
    const admin = await prisma.employee.findUniqueOrThrow({ where: { email: "fredrick@glampack.test" } });
    const contacts = await prisma.emergencyContact.findMany({ where: { employeeId: admin.id } });
    expect(contacts).toHaveLength(1);
    expect(contacts[0]!.relationship).toBe("Spouse");
  });

  it("parses the real composite location string into discrete columns", async () => {
    const attendance = await prisma.attendance.findFirstOrThrow();
    expect(Number(attendance.checkInLat)).toBeCloseTo(5.778817, 5);
    expect(attendance.checkInCity).toBe("Accra");
    expect(attendance.checkInRegion).toBe("Greater Accra Region");
    expect(attendance.checkInMethod).toBe("GPS");
    expect(Number(attendance.checkInDistanceFromOfficeM)).toBeCloseTo(20378.2, 1);
  });

  it("migrates the leave request using the real Days value, not a recomputed one", async () => {
    const leaveRequest = await prisma.leaveRequest.findFirstOrThrow();
    expect(leaveRequest.numberOfDays).toBe(3);
    expect(leaveRequest.leaveType).toBe("Vacation");
    expect(leaveRequest.notes).toBe("Family event");
  });

  it("resolves the announcement's plain-text Posted By to the matching employee, and captures Priority separately from Type", async () => {
    const announcement = await prisma.announcement.findFirstOrThrow();
    const poster = await prisma.employee.findUniqueOrThrow({ where: { id: announcement.postedByEmployeeId } });
    expect(poster.fullName).toBe("Fredrick Debrah");
    expect(announcement.priority).toBe("High");
    expect(announcement.type).toBe("General"); // no real Type field in the fixture — default applied
  });

  it("migrates the announcement read and threaded comment with resolved FKs", async () => {
    const read = await prisma.announcementRead.findFirstOrThrow();
    expect(read.employeeId).not.toBeNull();
    const comment = await prisma.announcementComment.findFirstOrThrow();
    expect(comment.comment).toBe("Noted, thank you.");
  });

  it("migrates payroll with server-computed totals, not trusting any (absent) stored totals", async () => {
    const payroll = await prisma.payroll.findFirstOrThrow();
    expect(Number(payroll.totalAllowances)).toBe(300);
    expect(Number(payroll.grossSalary)).toBe(3300);
    expect(payroll.status).toBe("Processed");
  });

  it("migrates the medical claim and re-uploads its receipt to S3 (mocked), not the transient Airtable URL", async () => {
    const claim = await prisma.medicalClaim.findFirstOrThrow({ include: { receipts: true } });
    expect(claim.receipts).toHaveLength(1);
    expect(claim.receipts[0]!.url).toContain("mock-bucket.s3");
    expect(claim.receipts[0]!.url).not.toContain("example.com");
  });
});
