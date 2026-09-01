// Several Prisma enums (Department, Shift, EmploymentType, PaymentMethod) use
// PascalCase compound values with no spaces (e.g. "CustomerService",
// "MorningProductionDay") since Prisma enum values can't contain spaces or
// parentheses. This reconstructs a readable label for display — not pixel-perfect
// for every original Airtable label (e.g. "Morning Production (Day)" loses its
// parens), but far better than showing the raw enum value to users.
export function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\bAnd\b/g, "&");
}

const currencyFormatter = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" });

export function currency(amount: number | string) {
  return currencyFormatter.format(typeof amount === "string" ? Number(amount) : amount);
}
