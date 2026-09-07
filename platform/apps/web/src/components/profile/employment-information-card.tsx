"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskedCurrency } from "@/components/masked-currency";
import { humanize } from "@/lib/format";
import type { Employee } from "@/lib/api/employees";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function yearsOfService(joiningDate: string | null) {
  if (!joiningDate) return "—";
  const years = (Date.now() - new Date(joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return `${years.toFixed(1)} years`;
}

export function EmploymentInformationCard({ employee, showSalary }: { employee: Employee; showSalary: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employment Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Field label="Employee ID" value={employee.employeeId} />
        <Field label="Job Title" value={employee.jobTitle ?? ""} />
        <Field label="Department" value={employee.department ? humanize(employee.department) : ""} />
        <Field label="Employment Type" value={employee.employmentType ? humanize(employee.employmentType) : ""} />
        <Field label="Employment Status" value={humanize(employee.status)} />
        <Field
          label="Account Status"
          value={<Badge variant={employee.accountStatus === "Active" ? "success" : "secondary"}>{employee.accountStatus}</Badge>}
        />
        <Field
          label="Date Joined"
          value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : ""}
        />
        <Field label="Years of Service" value={yearsOfService(employee.joiningDate)} />
        {showSalary && (
          <Field
            label="Salary"
            value={employee.salary ? <MaskedCurrency amount={Number(employee.salary)} /> : ""}
          />
        )}
      </CardContent>
    </Card>
  );
}
