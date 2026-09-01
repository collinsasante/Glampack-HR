import type { CreateLeaveRequestInput } from "@glampack/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

// Matches leave-request.html's calculateBusinessDays: inclusive of both endpoints
// and of weekends (the 20-day annual allocation already accounts for all 7 days/week).
function calculateInclusiveDays(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / msPerDay) + 1;
}

async function assertVacationRules(employeeId: string, startDate: Date, endDate: Date, days: number) {
  const startMonth = startDate.getMonth(); // 0-indexed: 10=Nov, 11=Dec
  if (startMonth === 10 || startMonth === 11 || endDate.getMonth() === 10 || endDate.getMonth() === 11) {
    throw new HttpError(400, "Annual leave is not allowed in November or December");
  }
  if (days > 7) {
    throw new HttpError(400, "Annual leave is limited to 1 week (7 days) per quarter");
  }
  if (getQuarter(startDate) !== getQuarter(endDate) || startDate.getFullYear() !== endDate.getFullYear()) {
    throw new HttpError(400, "Annual leave cannot span multiple quarters");
  }

  const quarter = getQuarter(startDate);
  const year = startDate.getFullYear();
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);

  const existing = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      leaveType: "Vacation",
      status: { in: ["Pending", "Approved"] },
      startDate: { gte: quarterStart, lte: quarterEnd },
    },
  });
  if (existing) {
    throw new HttpError(
      409,
      `You already have vacation leave approved/pending in Q${quarter} ${year}. Only one vacation leave period per quarter is allowed.`
    );
  }
}

function assertOtherLeaveRules(startDate: Date) {
  if (!isSameCalendarDay(startDate, new Date())) {
    throw new HttpError(400, "Emergency (Other) leave must start today");
  }
}

async function assertAnnualCap(employeeId: string, startDate: Date, additionalDays: number) {
  const year = startDate.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const requestsThisYear = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ["Pending", "Approved"] },
      startDate: { gte: yearStart, lte: yearEnd },
    },
    select: { numberOfDays: true },
  });

  const usedDays = requestsThisYear.reduce((sum, r) => sum + r.numberOfDays, 0);
  if (usedDays + additionalDays > 20) {
    throw new HttpError(400, "Leave request exceeds maximum allowed days (20 days per year)");
  }
}

export async function createLeaveRequest(employeeId: string, input: CreateLeaveRequestInput) {
  const { leaveType, startDate, endDate, notes } = input;
  if (endDate < startDate) throw new HttpError(400, "End date must be on or after start date");

  const numberOfDays = calculateInclusiveDays(startDate, endDate);

  if (leaveType === "Vacation") {
    await assertVacationRules(employeeId, startDate, endDate, numberOfDays);
  } else if (leaveType === "Other") {
    assertOtherLeaveRules(startDate);
  }

  await assertAnnualCap(employeeId, startDate, numberOfDays);

  return prisma.leaveRequest.create({
    data: { employeeId, leaveType, startDate, endDate, numberOfDays, notes, status: "Pending" },
  });
}

export async function listLeaveRequests(filters: { employeeId?: string; status?: string }) {
  return prisma.leaveRequest.findMany({
    where: { employeeId: filters.employeeId, status: filters.status as any },
    orderBy: { createdAt: "desc" },
  });
}

export async function approveLeaveRequest(id: string, approvedById: string) {
  return prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) throw new HttpError(404, "Leave request not found");
    if (leaveRequest.status !== "Pending") throw new HttpError(409, "Only pending requests can be approved");

    const employee = await tx.employee.findUniqueOrThrow({ where: { id: leaveRequest.employeeId } });
    const newBalance = employee.annualLeaveBalance - leaveRequest.numberOfDays;

    await tx.employee.update({ where: { id: employee.id }, data: { annualLeaveBalance: newBalance } });

    return tx.leaveRequest.update({
      where: { id },
      data: { status: "Approved", approvedById },
    });
  });
}

export async function rejectLeaveRequest(id: string, adminComments: string) {
  const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leaveRequest) throw new HttpError(404, "Leave request not found");
  if (leaveRequest.status !== "Pending") throw new HttpError(409, "Only pending requests can be rejected");

  return prisma.leaveRequest.update({ where: { id }, data: { status: "Rejected", adminComments } });
}

// Employees may cancel their own Pending requests; staff may cancel any request,
// including restoring the balance if it had already been Approved.
export async function cancelLeaveRequest(
  id: string,
  requester: { id: string; isStaff: boolean },
  adminComments: string
) {
  return prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) throw new HttpError(404, "Leave request not found");

    if (!requester.isStaff) {
      if (leaveRequest.employeeId !== requester.id) throw new HttpError(403, "Not your leave request");
      if (leaveRequest.status !== "Pending") throw new HttpError(409, "Only pending requests can be self-cancelled");
    } else if (leaveRequest.status === "Cancelled" || leaveRequest.status === "Rejected") {
      throw new HttpError(409, "This leave request is already closed");
    }

    if (leaveRequest.status === "Approved") {
      const employee = await tx.employee.findUniqueOrThrow({ where: { id: leaveRequest.employeeId } });
      await tx.employee.update({
        where: { id: employee.id },
        data: { annualLeaveBalance: employee.annualLeaveBalance + leaveRequest.numberOfDays },
      });
    }

    return tx.leaveRequest.update({ where: { id }, data: { status: "Cancelled", adminComments } });
  });
}
