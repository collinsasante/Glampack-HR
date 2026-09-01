export const ROLES = ["Employee", "Admin", "HR", "Manager"] as const;
export type Role = (typeof ROLES)[number];

export const EMPLOYEE_STATUSES = [
  "Permanent",
  "Intern",
  "NationalServicePersonnel",
  "IndependentContractor",
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const ACCOUNT_STATUSES = ["Active", "Inactive"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["FullTime", "PartTime", "Contract", "Temporary"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const DEPARTMENTS = [
  "Administration",
  "Management",
  "Production",
  "Operations",
  "CustomerService",
  "Logistics",
  "WarehousingAndFulfilment",
  "Finance",
  "Sales",
  "Marketing",
  "Engineering",
  "CreativeDesign",
  "Pakkmax",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const SHIFTS = [
  "MorningProductionDay",
  "NightProduction",
  "StraightShift",
  "HybridMorning",
  "HybridAfternoon",
  "SaturdayShift",
] as const;
export type Shift = (typeof SHIFTS)[number];

export const LEAVE_TYPES = ["Vacation", "Sick", "Study", "Other"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const ANNOUNCEMENT_TYPES = ["General", "HR", "Urgent", "Event", "Other"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["Low", "Medium", "High"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const CLAIM_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const PAYROLL_STATUSES = ["Pending", "Processed", "Paid"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const PAYMENT_METHODS = ["BankTransfer", "Cash", "MobileMoney"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Sibling",
  "Child",
  "Friend",
  "Other",
] as const;
export type EmergencyContactRelationship = (typeof EMERGENCY_CONTACT_RELATIONSHIPS)[number];

export const LOCATION_METHODS = ["GPS", "IPFallback"] as const;
export type LocationMethod = (typeof LOCATION_METHODS)[number];

/** Roles allowed to act on behalf of / view all employees' records, not just their own. */
export const STAFF_ROLES: Role[] = ["Admin", "HR", "Manager"];
