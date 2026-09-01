-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Employee', 'Admin', 'HR', 'Manager');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Permanent', 'Intern', 'NationalServicePersonnel', 'IndependentContractor');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FullTime', 'PartTime', 'Contract', 'Temporary');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('Administration', 'Management', 'Production', 'Operations', 'CustomerService', 'Logistics', 'WarehousingAndFulfilment', 'Finance', 'Sales', 'Marketing', 'Engineering', 'CreativeDesign', 'Pakkmax');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MorningProductionDay', 'NightProduction', 'StraightShift', 'HybridMorning', 'HybridAfternoon', 'SaturdayShift');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('Vacation', 'Sick', 'Study', 'Other');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('General', 'HR', 'Urgent', 'Event', 'Other');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('Pending', 'Processed', 'Paid');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BankTransfer', 'Cash', 'MobileMoney');

-- CreateEnum
CREATE TYPE "EmergencyContactRelationship" AS ENUM ('Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other');

-- CreateEnum
CREATE TYPE "LocationMethod" AS ENUM ('GPS', 'IPFallback');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordLegacy" TEXT,
    "role" "Role" NOT NULL,
    "status" "EmployeeStatus" NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'Active',
    "employmentType" "EmploymentType",
    "department" "Department",
    "jobTitle" TEXT,
    "annualLeaveBalance" INTEGER NOT NULL DEFAULT 20,
    "salary" DECIMAL(12,2),
    "dateOfBirth" DATE,
    "joiningDate" DATE,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "ghanaCardNumber" TEXT,
    "ssnitNumber" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "checkInLat" DECIMAL(10,7),
    "checkInLng" DECIMAL(10,7),
    "checkInAccuracyM" DECIMAL(8,2),
    "checkInMethod" "LocationMethod",
    "checkInCity" TEXT,
    "checkInRegion" TEXT,
    "checkOutLat" DECIMAL(10,7),
    "checkOutLng" DECIMAL(10,7),
    "checkOutAccuracyM" DECIMAL(8,2),
    "checkOutMethod" "LocationMethod",
    "checkOutCity" TEXT,
    "checkOutRegion" TEXT,
    "ipAddress" TEXT,
    "shift" "Shift" NOT NULL,
    "lateReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "adminComments" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "postedByEmployeeId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "readDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementComment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "basicSalary" DECIMAL(12,2) NOT NULL,
    "housingAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "transportAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "benefits" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAllowances" DECIMAL(12,2) NOT NULL,
    "grossSalary" DECIMAL(12,2) NOT NULL,
    "incomeTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "welfare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "socialSecurity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "healthInsurance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "amountToPay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'Pending',
    "paymentMethod" "PaymentMethod",
    "paymentDate" DATE,
    "periodStartDate" DATE,
    "periodEndDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollCustomAllowance" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "monthsRemaining" INTEGER,
    "totalMonths" INTEGER,

    CONSTRAINT "PayrollCustomAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollCustomDeduction" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "monthsRemaining" INTEGER,
    "totalMonths" INTEGER,

    CONSTRAINT "PayrollCustomDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalClaim" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dateOfVisit" DATE NOT NULL,
    "hospitalClinicName" TEXT NOT NULL,
    "descriptionOfTreatment" TEXT NOT NULL,
    "amountSpent" DECIMAL(12,2) NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'Pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalClaimReceipt" (
    "id" TEXT NOT NULL,
    "medicalClaimId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "MedicalClaimReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" "EmergencyContactRelationship" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_firebaseUid_key" ON "Employee"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_leaveType_startDate_idx" ON "LeaveRequest"("leaveType", "startDate");

-- CreateIndex
CREATE INDEX "Announcement_type_idx" ON "Announcement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_employeeId_key" ON "AnnouncementRead"("announcementId", "employeeId");

-- CreateIndex
CREATE INDEX "AnnouncementComment_announcementId_idx" ON "AnnouncementComment"("announcementId");

-- CreateIndex
CREATE INDEX "Payroll_month_status_idx" ON "Payroll"("month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_month_key" ON "Payroll"("employeeId", "month");

-- CreateIndex
CREATE INDEX "MedicalClaim_employeeId_status_idx" ON "MedicalClaim"("employeeId", "status");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_postedByEmployeeId_fkey" FOREIGN KEY ("postedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "AnnouncementComment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCustomAllowance" ADD CONSTRAINT "PayrollCustomAllowance_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCustomDeduction" ADD CONSTRAINT "PayrollCustomDeduction_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalClaim" ADD CONSTRAINT "MedicalClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalClaimReceipt" ADD CONSTRAINT "MedicalClaimReceipt_medicalClaimId_fkey" FOREIGN KEY ("medicalClaimId") REFERENCES "MedicalClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
