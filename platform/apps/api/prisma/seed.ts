import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.employee.upsert({
    where: { email: "admin@glampack.test" },
    update: {},
    create: {
      employeeId: "EMPADMIN1",
      firebaseUid: "seed-admin-uid",
      fullName: "Ama Admin",
      email: "admin@glampack.test",
      role: "Admin",
      status: "Permanent",
      department: "Administration",
      jobTitle: "HR Administrator",
      annualLeaveBalance: 20,
    },
  });

  const hr = await prisma.employee.upsert({
    where: { email: "hr@glampack.test" },
    update: {},
    create: {
      employeeId: "EMPHR0001",
      firebaseUid: "seed-hr-uid",
      fullName: "Kofi HR",
      email: "hr@glampack.test",
      role: "HR",
      status: "Permanent",
      department: "Administration",
      jobTitle: "HR Officer",
      annualLeaveBalance: 20,
    },
  });

  const manager = await prisma.employee.upsert({
    where: { email: "manager@glampack.test" },
    update: {},
    create: {
      employeeId: "EMPMGR001",
      firebaseUid: "seed-manager-uid",
      fullName: "Efua Manager",
      email: "manager@glampack.test",
      role: "Manager",
      status: "Permanent",
      department: "Production",
      jobTitle: "Production Manager",
      annualLeaveBalance: 20,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { email: "employee@glampack.test" },
    update: {},
    create: {
      employeeId: "EMPSTAFF01",
      firebaseUid: "seed-employee-uid",
      fullName: "Yaw Employee",
      email: "employee@glampack.test",
      role: "Employee",
      status: "Permanent",
      department: "Production",
      jobTitle: "Packaging Associate",
      annualLeaveBalance: 15, // deliberately not the default, to exercise the `!== undefined` guard
    },
  });

  // Leave request with only the legacy `Reason`-style note text, exercising the
  // Reason→Notes migration fallback path (see Phase 3 of the plan).
  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-legacy-reason" },
    update: {},
    create: {
      id: "seed-leave-legacy-reason",
      employeeId: employee.id,
      leaveType: "Vacation",
      startDate: new Date("2026-02-02"),
      endDate: new Date("2026-02-04"),
      numberOfDays: 3,
      status: "Approved",
      notes: "Family event (migrated from legacy Reason field)",
      approvedById: hr.id,
    },
  });

  // Payroll row exercising the custom-allowances/deductions child tables.
  await prisma.payroll.upsert({
    where: { employeeId_month: { employeeId: employee.id, month: "2026-01" } },
    update: {},
    create: {
      employeeId: employee.id,
      month: "2026-01",
      basicSalary: 3000,
      housingAllowance: 300,
      transportAllowance: 200,
      benefits: 0,
      otherAllowances: 0,
      bonus: 0,
      totalAllowances: 600,
      grossSalary: 3600,
      incomeTax: 250,
      welfare: 50,
      socialSecurity: 150,
      healthInsurance: 0,
      otherDeductions: 0,
      totalDeductions: 450,
      netSalary: 3150,
      amountToPay: 3550,
      status: "Paid",
      customAllowances: { create: [{ name: "Loan Repayment Bonus", amount: 100, isRecurring: false }] },
      customDeductions: { create: [{ name: "Uniform Deduction", amount: 20, isRecurring: true, monthsRemaining: 2, totalMonths: 3 }] },
    },
  });

  // Announcement with a resolved postedByEmployeeId, exercising the 3-way field
  // reconciliation described in the plan (Announcement Type / Priority / Type fork).
  await prisma.announcement.upsert({
    where: { id: "seed-announcement-hr" },
    update: {},
    create: {
      id: "seed-announcement-hr",
      title: "Public Holiday Notice",
      message: "The office will be closed on the upcoming public holiday.",
      type: "HR",
      postedByEmployeeId: hr.id,
    },
  });

  console.log({ admin: admin.email, hr: hr.email, manager: manager.email, employee: employee.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
