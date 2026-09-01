// Airtable choice labels -> Prisma enum values. Verified against the live base's real
// choices (get_table_schema), not guessed — e.g. "National Service Personnel" (with
// spaces) is the real Airtable label; NationalServicePersonnel is the Prisma enum value.

export const EMPLOYEE_STATUS_MAP: Record<string, string> = {
  Permanent: "Permanent",
  Intern: "Intern",
  "National Service Personnel": "NationalServicePersonnel",
  "Independent Contractor": "IndependentContractor",
};

export const DEPARTMENT_MAP: Record<string, string> = {
  Administration: "Administration",
  Management: "Management",
  Production: "Production",
  Operations: "Operations",
  "Customer Service": "CustomerService",
  Logistics: "Logistics",
  "Warehousing & Fulfilment": "WarehousingAndFulfilment",
  Finance: "Finance",
  Sales: "Sales",
  Marketing: "Marketing",
  Engineering: "Engineering",
  "Creative Design": "CreativeDesign",
  Pakkmax: "Pakkmax",
};

export const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  "Full-time": "FullTime",
  "Part-time": "PartTime",
  Contract: "Contract",
  Temporary: "Temporary",
};

export const SHIFT_MAP: Record<string, string> = {
  "Morning Production (Day)": "MorningProductionDay",
  "Night Production": "NightProduction",
  "Straight Shift": "StraightShift",
  "Hybrid Morning": "HybridMorning",
  "Hybrid Afternoon": "HybridAfternoon",
  "Saturday Shift": "SaturdayShift",
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  "Bank Transfer": "BankTransfer",
  Cash: "Cash",
  "Mobile Money": "MobileMoney",
};
