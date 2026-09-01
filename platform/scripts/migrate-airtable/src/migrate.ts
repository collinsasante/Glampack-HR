import { PrismaClient } from "@prisma/client";
import { getAuth } from "firebase-admin/auth";
import { cert, initializeApp } from "firebase-admin/app";
import { config, TABLES } from "./config.js";
import { listAllRecords, linkedRecordIds, selectName, type AirtableRecord } from "./airtable-client.js";
import { MigrationReport } from "./report.js";
import { parseLocationString } from "./parsers/location.js";
import { parseCustomLineItems } from "./parsers/custom-line-items.js";
import { reuploadAttachmentToS3 } from "./s3-upload.js";
import {
  DEPARTMENT_MAP,
  EMPLOYEE_STATUS_MAP,
  EMPLOYMENT_TYPE_MAP,
  PAYMENT_METHOD_MAP,
  SHIFT_MAP,
} from "./enum-maps.js";

const prisma = new PrismaClient();
const report = new MigrationReport();

// Airtable record ID -> Postgres cuid, built up as each table migrates. Every downstream
// table (Attendance, Leave Requests, ...) links back to Employees via this map instead of
// re-querying Postgres per row.
const employeeIdMap = new Map<string, string>(); // Airtable recId -> Postgres Employee.id
const announcementIdMap = new Map<string, string>();

let generatedIdCounter = 0;
const usedEmployeeIds = new Set<string>();

function generateEmployeeId(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let candidate: string;
  do {
    generatedIdCounter += 1;
    candidate =
      "EMP" +
      Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (usedEmployeeIds.has(candidate));
  usedEmployeeIds.add(candidate);
  return candidate;
}

function firstField<T = unknown>(fields: Record<string, unknown>, ...names: string[]): T | undefined {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== null && fields[name] !== "") {
      return fields[name] as T;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 1. Employees
// ---------------------------------------------------------------------------

async function migrateEmployees() {
  const records = await listAllRecords(TABLES.employees);
  report.recordRead("Employees", records.length);

  // Backfill firebaseUid by matching email — the old app never stored a Firebase UID
  // on the Employee record at all, so this is the only way to link them after the fact.
  const firebaseUsersByEmail = new Map<string, string>();
  try {
    const serviceAccount = JSON.parse(config.firebaseServiceAccountJson);
    const app = initializeApp({ credential: cert(serviceAccount) }, "migration");
    let pageToken: string | undefined;
    do {
      const page = await getAuth(app).listUsers(1000, pageToken);
      for (const user of page.users) {
        if (user.email) firebaseUsersByEmail.set(user.email.toLowerCase(), user.uid);
      }
      pageToken = page.pageToken;
    } while (pageToken);
  } catch (err) {
    report.recordWarning("Employees", "firebase-listUsers", `Failed to list Firebase users: ${err}`);
  }

  for (const rec of records) {
    const f = rec.fields;
    const email = (f["Email"] as string | undefined)?.trim().toLowerCase();
    if (!email) {
      report.recordSkipped("Employees", rec.id, "No email — cannot create an account-linked record");
      continue;
    }

    const statusLabel = selectName(f["Status"]);
    const status = statusLabel ? EMPLOYEE_STATUS_MAP[statusLabel] : undefined;
    if (statusLabel && !status) {
      report.recordSkipped("Employees", rec.id, `Unrecognized Status value: "${statusLabel}"`);
      continue;
    }

    const roleLabel = selectName(f["Role"]) ?? "Employee";
    const departmentLabel = selectName(f["Department"]);
    const department = departmentLabel ? DEPARTMENT_MAP[departmentLabel] : undefined;
    const employmentTypeLabel = selectName(f["Employment Type"]);
    const employmentType = employmentTypeLabel ? EMPLOYMENT_TYPE_MAP[employmentTypeLabel] : undefined;
    const accountStatusLabel = selectName(f["Account Status"]) ?? "Active";

    // Claim-as-we-go rather than pre-scanning: two different real Employee records can
    // (and, confirmed against production, do) share the same literal "Employee ID" —
    // the first claimant keeps it, any later duplicate gets a freshly generated one
    // instead of crashing the whole migration on a unique-constraint violation.
    const rawEmployeeId = f["Employee ID"] as string | undefined;
    let employeeId: string;
    if (rawEmployeeId && !usedEmployeeIds.has(rawEmployeeId)) {
      employeeId = rawEmployeeId;
      usedEmployeeIds.add(employeeId);
    } else {
      employeeId = generateEmployeeId();
      if (rawEmployeeId) {
        report.recordWarning(
          "Employees",
          rec.id,
          `Duplicate Employee ID "${rawEmployeeId}" (already claimed by another record) — generated "${employeeId}" instead for ${email}`
        );
      }
    }
    const firebaseUid = firebaseUsersByEmail.get(email);
    if (!firebaseUid) {
      report.recordWarning(
        "Employees",
        rec.id,
        `No matching Firebase Auth user for ${email} — firebaseUid left null, will use the email-lookup fallback in authenticate.ts until backfilled`
      );
    }

    // Wrapped broadly: any single bad row (an enum mapping gap for a value we haven't
    // seen, an unexpected constraint) should be logged and skipped, never abort the
    // entire run — exactly the P2002 employeeId collision above was found this way.
    try {
      const employee = await prisma.employee.upsert({
        where: { email },
        create: {
          firebaseUid,
          employeeId,
          email,
          fullName: (f["Full Name"] as string) ?? email,
          role: roleLabel as never,
          status: (status ?? "Permanent") as never,
          accountStatus: accountStatusLabel as never,
          employmentType: employmentType as never,
          department: department as never,
          jobTitle: f["Job Title"] as string | undefined,
          annualLeaveBalance:
            typeof f["Annual Leave Balance"] === "number" ? (f["Annual Leave Balance"] as number) : 20,
          salary: typeof f["Salary"] === "number" ? f["Salary"] : undefined,
          dateOfBirth: f["Date of Birth"] ? new Date(f["Date of Birth"] as string) : undefined,
          joiningDate: firstField<string>(f, "Joining Date", "Join Date")
            ? new Date(firstField<string>(f, "Joining Date", "Join Date")!)
            : undefined,
          phone: f["Phone Number"] as string | undefined,
          address: f["Address"] as string | undefined,
          city: f["City"] as string | undefined,
          country: f["Country"] as string | undefined,
          ghanaCardNumber: f["Ghana Card Number"] as string | undefined,
          ssnitNumber: f["Social Security Number"] as string | undefined,
          bankName: f["Bank Name"] as string | undefined,
          bankAccountNumber: f["Bank Account Number"] as string | undefined,
          bankBranch: f["Bank Branch"] as string | undefined,
          passwordLegacy: f["Password"] as string | undefined,
        },
        update: {},
      });

      employeeIdMap.set(rec.id, employee.id);
      report.recordMigrated("Employees");

      // Fold the legacy inline "Secondary Contact" fields (Contact Name / Relationship /
      // S_Phone Number / S_Email / S_Address) into the real EmergencyContact table, but
      // only if this employee has no linked Emergency Contact records already — avoids
      // creating a duplicate when both representations happen to be populated.
      const hasLinkedContact = linkedRecordIds(f["Emergency Contact"]).length > 0;
      const inlineContactName = f["Contact Name"] as string | undefined;
      if (!hasLinkedContact && inlineContactName) {
        const relationshipLabel = selectName(f["Relationship"]);
        await prisma.emergencyContact.create({
          data: {
            employeeId: employee.id,
            name: inlineContactName,
            relationship: (relationshipLabel ?? "Other") as never,
            phoneNumber: (f["S_Phone Number"] as string) ?? "Unknown",
            email: f["S_Email"] as string | undefined,
            address: f["S_Address"] as string | undefined,
          },
        });
        report.recordWarning(
          "EmergencyContacts",
          rec.id,
          `Folded legacy inline contact fields from Employee "${email}" — please verify manually`
        );
      }
    } catch (err) {
      report.recordSkipped("Employees", rec.id, `Failed to migrate: ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Emergency Contacts (the real linked table)
// ---------------------------------------------------------------------------

async function migrateEmergencyContacts() {
  const records = await listAllRecords(TABLES.emergencyContacts);
  report.recordRead("EmergencyContacts", records.length);

  for (const rec of records) {
    const f = rec.fields;
    const employeeRecId = linkedRecordIds(f["Employee"])[0];
    const employeeId = employeeRecId ? employeeIdMap.get(employeeRecId) : undefined;
    if (!employeeId) {
      report.recordSkipped("EmergencyContacts", rec.id, "No resolvable Employee link");
      continue;
    }

    const relationshipLabel = selectName(f["Relationship"]) ?? "Other";
    try {
      await prisma.emergencyContact.create({
        data: {
          employeeId,
          name: (f["Name"] as string) ?? "Unknown",
          relationship: relationshipLabel as never,
          phoneNumber: (f["Phone Number"] as string) ?? "Unknown",
          email: f["Email"] as string | undefined,
          address: f["Address"] as string | undefined,
        },
      });
      report.recordMigrated("EmergencyContacts");
    } catch (err) {
      report.recordSkipped("EmergencyContacts", rec.id, `Failed to migrate: ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Attendance
// ---------------------------------------------------------------------------

async function migrateAttendance() {
  const records = await listAllRecords(TABLES.attendance);
  report.recordRead("Attendance", records.length);

  for (const rec of records) {
    const f = rec.fields;
    const employeeRecId = linkedRecordIds(f["Employee"])[0];
    const employeeId = employeeRecId ? employeeIdMap.get(employeeRecId) : undefined;
    if (!employeeId) {
      report.recordSkipped("Attendance", rec.id, "No resolvable Employee link");
      continue;
    }

    const dateStr = f["Date"] as string | undefined;
    if (!dateStr) {
      report.recordSkipped("Attendance", rec.id, "No Date — cannot form the unique (employeeId, date) key");
      continue;
    }
    const date = new Date(dateStr);

    const checkIn = parseLocationString(f["Check In Location"] as string | undefined);
    const checkOut = parseLocationString(f["Check Out Location"] as string | undefined);
    const shiftLabel = selectName(f["Shift"]);
    const shift = shiftLabel ? SHIFT_MAP[shiftLabel] : undefined;

    try {
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          employeeId,
          date,
          checkInTime: f["Check In"] ? new Date(f["Check In"] as string) : undefined,
          checkOutTime: f["Check Out"] ? new Date(f["Check Out"] as string) : undefined,
          checkInLat: checkIn?.lat,
          checkInLng: checkIn?.lng,
          checkInDistanceFromOfficeM: checkIn?.distanceFromOfficeM ?? undefined,
          checkInMethod: checkIn?.method,
          checkInCity: checkIn?.city ?? undefined,
          checkInRegion: checkIn?.region ?? undefined,
          checkOutLat: checkOut?.lat,
          checkOutLng: checkOut?.lng,
          checkOutDistanceFromOfficeM: checkOut?.distanceFromOfficeM ?? undefined,
          checkOutMethod: checkOut?.method,
          checkOutCity: checkOut?.city ?? undefined,
          checkOutRegion: checkOut?.region ?? undefined,
          ipAddress: (f["IP Address"] as string | undefined)?.trim(),
          shift: (shift ?? "StraightShift") as never,
          lateReason: f["Late Reason"] as string | undefined,
        },
        update: {},
      });
      report.recordMigrated("Attendance");
    } catch (err) {
      // A second Airtable row for the same (employee, date) pair would otherwise abort
      // the whole run on the unique constraint — log and continue instead.
      report.recordSkipped("Attendance", rec.id, `Upsert failed (likely duplicate employee+date): ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Leave Requests
// ---------------------------------------------------------------------------

async function migrateLeaveRequests() {
  const records = await listAllRecords(TABLES.leaveRequests);
  report.recordRead("LeaveRequests", records.length);

  for (const rec of records) {
    const f = rec.fields;
    const employeeRecId = linkedRecordIds(f["Employee"])[0];
    const employeeId = employeeRecId ? employeeIdMap.get(employeeRecId) : undefined;
    if (!employeeId) {
      report.recordSkipped("LeaveRequests", rec.id, "No resolvable Employee link");
      continue;
    }

    const startDate = f["Start Date"] ? new Date(f["Start Date"] as string) : undefined;
    const endDate = f["End Date"] ? new Date(f["End Date"] as string) : undefined;
    if (!startDate || !endDate) {
      report.recordSkipped("LeaveRequests", rec.id, "Missing Start/End Date");
      continue;
    }

    const numberOfDays =
      typeof f["Days"] === "number"
        ? f["Days"]
        : Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leaveTypeLabel = selectName(f["Leave Type"]) ?? "Other";
    const statusLabel = selectName(f["Status"]) ?? "Pending";
    const adminComments = f["Admin Comments"] as string | undefined;
    // Design improvement from the plan: a Rejected row whose comment starts with
    // "Cancelled:" (admin.js's cancelApprovedLeave marker) becomes a real Cancelled
    // status instead of conflating "admin said no" with "cancelled after approval".
    const status = statusLabel === "Rejected" && adminComments?.startsWith("Cancelled:") ? "Cancelled" : statusLabel;

    const approvedByRecId = linkedRecordIds(f["Approved By"])[0];

    try {
      await prisma.leaveRequest.create({
        data: {
          employeeId,
          leaveType: leaveTypeLabel as never,
          startDate,
          endDate,
          numberOfDays,
          status: status as never,
          notes: f["Notes"] as string | undefined,
          adminComments,
          approvedById: approvedByRecId ? employeeIdMap.get(approvedByRecId) : undefined,
        },
      });
      report.recordMigrated("LeaveRequests");
    } catch (err) {
      report.recordSkipped("LeaveRequests", rec.id, `Failed to migrate (leaveType="${leaveTypeLabel}", status="${status}"): ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Announcements (+ Reads, Comments)
// ---------------------------------------------------------------------------

async function migrateAnnouncements() {
  const records = await listAllRecords(TABLES.announcements);
  report.recordRead("Announcements", records.length);

  // Resolve the plain-text "Posted By" name against Employee.fullName — this is the
  // only real write path (100% of production rows use Priority + Posted By; the
  // "Type"/"Created By" employee-authored path never actually worked — see schema.prisma).
  const employeesByName = new Map<string, string>();
  for (const [, pgId] of employeeIdMap) {
    const emp = await prisma.employee.findUnique({ where: { id: pgId } });
    if (emp) employeesByName.set(emp.fullName.trim().toLowerCase(), emp.id);
  }

  for (const rec of records) {
    const f = rec.fields;
    const postedByName = (f["Posted By"] as string | undefined)?.trim();
    let postedByEmployeeId = postedByName ? employeesByName.get(postedByName.toLowerCase()) : undefined;

    if (!postedByEmployeeId) {
      // Never silently drop — attribute to the first Admin as a placeholder and flag
      // for manual review, since Announcement.postedByEmployeeId is a required FK.
      const fallbackAdmin = await prisma.employee.findFirst({ where: { role: "Admin" } });
      if (!fallbackAdmin) {
        report.recordSkipped("Announcements", rec.id, "No Posted By match and no Admin fallback available");
        continue;
      }
      postedByEmployeeId = fallbackAdmin.id;
      report.recordWarning(
        "Announcements",
        rec.id,
        `Could not resolve Posted By "${postedByName}" to an employee — attributed to ${fallbackAdmin.fullName} as a placeholder`
      );
    }

    const typeLabel = selectName(f["Type"]) ?? selectName(f["Announcement Type"]) ?? "General";
    const priorityLabel = selectName(f["Priority"]);

    try {
      const announcement = await prisma.announcement.create({
        data: {
          title: (f["Title"] as string) ?? "Untitled",
          message: (f["Message"] as string) ?? "",
          type: typeLabel as never,
          priority: priorityLabel as never,
          postedByEmployeeId,
          imageUrl: f["Image URL"] as string | undefined,
          createdAt: f["Date"] ? new Date(f["Date"] as string) : new Date(rec.createdTime),
        },
      });
      announcementIdMap.set(rec.id, announcement.id);
      report.recordMigrated("Announcements");
    } catch (err) {
      report.recordSkipped("Announcements", rec.id, `Failed to migrate (type="${typeLabel}", priority="${priorityLabel}"): ${err}`);
    }
  }
}

async function migrateAnnouncementReads() {
  const records = await listAllRecords(TABLES.announcementReads);
  report.recordRead("AnnouncementReads", records.length);

  for (const rec of records) {
    const f = rec.fields;
    const announcementId = announcementIdMap.get(linkedRecordIds(f["Announcement"])[0] ?? "");
    const employeeId = employeeIdMap.get(linkedRecordIds(f["Employee"])[0] ?? "");
    if (!announcementId || !employeeId) {
      report.recordSkipped("AnnouncementReads", rec.id, "Unresolvable Announcement or Employee link");
      continue;
    }

    await prisma.announcementRead.upsert({
      where: { announcementId_employeeId: { announcementId, employeeId } },
      create: {
        announcementId,
        employeeId,
        readDate: f["Read Date"] ? new Date(f["Read Date"] as string) : new Date(rec.createdTime),
      },
      update: {},
    });
    report.recordMigrated("AnnouncementReads");
  }
}

async function migrateAnnouncementComments() {
  const records = await listAllRecords(TABLES.announcementComments);
  report.recordRead("AnnouncementComments", records.length);

  // Comments can reference a parent comment, which may not have been migrated yet —
  // two-pass: create all comments first (without parent), then wire up parents.
  const commentIdMap = new Map<string, string>();
  const parentByAirtableId = new Map<string, string>();

  for (const rec of records) {
    const f = rec.fields;
    const announcementId = announcementIdMap.get(linkedRecordIds(f["Announcement"])[0] ?? "");
    const employeeId = employeeIdMap.get(linkedRecordIds(f["Employee"])[0] ?? "");
    if (!announcementId || !employeeId) {
      report.recordSkipped("AnnouncementComments", rec.id, "Unresolvable Announcement or Employee link");
      continue;
    }

    try {
      const comment = await prisma.announcementComment.create({
        data: {
          announcementId,
          employeeId,
          comment: (f["Comment"] as string) ?? "",
          createdAt: f["Date"] ? new Date(f["Date"] as string) : new Date(rec.createdTime),
        },
      });
      commentIdMap.set(rec.id, comment.id);

      const parentRecId = linkedRecordIds(f["Parent Comment"])[0];
      if (parentRecId) parentByAirtableId.set(rec.id, parentRecId);
      report.recordMigrated("AnnouncementComments");
    } catch (err) {
      report.recordSkipped("AnnouncementComments", rec.id, `Failed to migrate: ${err}`);
    }
  }

  for (const [airtableId, parentAirtableId] of parentByAirtableId) {
    const id = commentIdMap.get(airtableId);
    const parentId = commentIdMap.get(parentAirtableId);
    if (id && parentId) {
      await prisma.announcementComment.update({ where: { id }, data: { parentCommentId: parentId } });
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Payroll
// ---------------------------------------------------------------------------

function toDecimalOrZero(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

async function migratePayroll() {
  const records = await listAllRecords(TABLES.payroll);
  report.recordRead("Payroll", records.length);

  for (const rec of records) {
    const f = rec.fields;
    const employeeId = employeeIdMap.get(linkedRecordIds(f["Employee"])[0] ?? "");
    if (!employeeId) {
      report.recordSkipped("Payroll", rec.id, "No resolvable Employee link");
      continue;
    }

    const month = f["Month"] as string | undefined;
    if (!month) {
      report.recordSkipped("Payroll", rec.id, "No Month value");
      continue;
    }

    const customAllowances = parseCustomLineItems(f["Custom Allowances"] as string | undefined);
    const customDeductions = parseCustomLineItems(f["Custom Deductions"] as string | undefined);

    const basicSalary = toDecimalOrZero(f["Basic Salary"]);
    const housingAllowance = toDecimalOrZero(f["Housing Allowance"]);
    const transportAllowance = toDecimalOrZero(f["Transport Allowance"]);
    const benefits = toDecimalOrZero(f["Benefits"]);
    const otherAllowances = toDecimalOrZero(f["Other Allowances"]);
    const bonus = toDecimalOrZero(f["Bonus"]);
    const incomeTax = toDecimalOrZero(f["Income Tax"]);
    const welfare = toDecimalOrZero(f["Welfare"]);
    const socialSecurity = toDecimalOrZero(f["Social Security"]);
    const healthInsurance = toDecimalOrZero(f["Health Insurance"]);
    const otherDeductions = toDecimalOrZero(f["Other Deductions"]);

    const customAllowancesTotal = customAllowances.reduce((sum, a) => sum + a.amount, 0);
    const customDeductionsTotal = customDeductions.reduce((sum, d) => sum + d.amount, 0);
    const totalAllowances = housingAllowance + transportAllowance + benefits + otherAllowances + bonus + customAllowancesTotal;
    const grossSalary = basicSalary + totalAllowances;
    const totalDeductions = incomeTax + welfare + socialSecurity + healthInsurance + otherDeductions + customDeductionsTotal;
    // Prefer the historically-stored Net Salary/Amount to Pay when present (preserves
    // exactly what was actually paid historically) rather than always recomputing,
    // since recomputing could silently change a historical payslip's numbers.
    const netSalary = typeof f["Net Salary"] === "number" ? f["Net Salary"] : grossSalary - totalDeductions;
    const amountToPay =
      typeof f["Amount to Pay"] === "number" ? f["Amount to Pay"] : netSalary + incomeTax + socialSecurity;

    const statusLabel = selectName(f["Status"]) ?? "Pending";
    const paymentMethodLabel = selectName(f["Payment Method"]);
    const paymentMethod = paymentMethodLabel ? PAYMENT_METHOD_MAP[paymentMethodLabel] : undefined;

    try {
      await prisma.payroll.upsert({
        where: { employeeId_month: { employeeId, month } },
        create: {
          employeeId,
          month,
          basicSalary,
          housingAllowance,
          transportAllowance,
          benefits,
          otherAllowances,
          bonus,
          totalAllowances,
          grossSalary,
          incomeTax,
          welfare,
          socialSecurity,
          healthInsurance,
          otherDeductions,
          totalDeductions,
          netSalary,
          amountToPay,
          status: statusLabel as never,
          paymentMethod: paymentMethod as never,
          paymentDate: f["Payment Date"] ? new Date(f["Payment Date"] as string) : undefined,
          periodStartDate: f["Period Start Date"] ? new Date(f["Period Start Date"] as string) : undefined,
          periodEndDate: f["Period End Date"] ? new Date(f["Period End Date"] as string) : undefined,
          notes: f["Notes"] as string | undefined,
          customAllowances: { create: customAllowances },
          customDeductions: { create: customDeductions },
        },
        update: {},
      });
      report.recordMigrated("Payroll");
    } catch (err) {
      report.recordSkipped("Payroll", rec.id, `Upsert failed (likely duplicate employee+month): ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Medical Claims
// ---------------------------------------------------------------------------

async function migrateMedicalClaims() {
  const records = await listAllRecords(TABLES.medicalClaims);
  report.recordRead("MedicalClaims", records.length);

  for (const rec of records) {
    const f = rec.fields;
    const employeeId = employeeIdMap.get(linkedRecordIds(f["Employee"])[0] ?? "");
    if (!employeeId) {
      report.recordSkipped("MedicalClaims", rec.id, "No resolvable Employee link");
      continue;
    }

    const dateOfVisit = f["Date of visit"] ? new Date(f["Date of visit"] as string) : undefined;
    if (!dateOfVisit) {
      report.recordSkipped("MedicalClaims", rec.id, "No Date of visit");
      continue;
    }

    type AirtableAttachment = { url: string; filename: string; type: string };
    const attachments = Array.isArray(f["Upload Receipt/Proof"])
      ? (f["Upload Receipt/Proof"] as AirtableAttachment[])
      : [];

    const receipts: { filename: string; s3Key: string; url: string }[] = [];
    for (const att of attachments) {
      if (config.dryRun) {
        receipts.push({ filename: att.filename, s3Key: "(dry-run, not uploaded)", url: att.url });
        continue;
      }
      try {
        const { s3Key, url } = await reuploadAttachmentToS3(att.url, att.filename, att.type, "medical-receipts");
        receipts.push({ filename: att.filename, s3Key, url });
      } catch (err) {
        // The claim record itself still gets created below — just missing this one
        // receipt — so this is a warning, not a skip of the whole row.
        report.recordWarning(
          "MedicalClaims",
          rec.id,
          `Failed to re-upload receipt "${att.filename}" to S3 (Airtable's signed URL may have expired): ${err}`
        );
      }
    }

    const statusLabel = selectName(f["Status"]) ?? "Pending";

    try {
      await prisma.medicalClaim.create({
        data: {
          employeeId,
          dateOfVisit,
          hospitalClinicName: (f["Hospital/Clinic Name"] as string) ?? "Unknown",
          descriptionOfTreatment: (f["Description of Treatment"] as string) ?? "",
          amountSpent: toDecimalOrZero(f["Amount Spent (GH₵)"]),
          status: statusLabel as never,
          receipts: { create: receipts },
        },
      });
      report.recordMigrated("MedicalClaims");
    } catch (err) {
      report.recordSkipped("MedicalClaims", rec.id, `Failed to migrate: ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------

// Exported (rather than only called from the CLI guard below) so the integration test
// can drive the exact same code path against a scratch Postgres with mocked Airtable
// fixtures, without spawning a subprocess.
export async function runMigration(): Promise<MigrationReport> {
  await migrateEmployees();
  await migrateEmergencyContacts();
  await migrateAttendance();
  await migrateLeaveRequests();
  await migrateAnnouncements();
  await migrateAnnouncementReads();
  await migrateAnnouncementComments();
  await migratePayroll();
  await migrateMedicalClaims();
  return report;
}

async function main() {
  console.log(
    config.dryRun
      ? "Running in DRY-RUN mode (writes still happen against DATABASE_URL — point it at a scratch database, not production)"
      : "Running LIVE migration"
  );
  const finalReport = await runMigration();
  finalReport.print();
  await prisma.$disconnect();
  process.exit(finalReport.hasWarnings ? 1 : 0);
}

// Only auto-run when executed directly (`tsx src/migrate.ts`), not when imported by tests.
const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
