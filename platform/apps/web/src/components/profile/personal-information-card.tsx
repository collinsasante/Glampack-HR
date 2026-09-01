"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee } from "@/lib/api/employees";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

export function PersonalInformationCard({ employee }: { employee: Employee }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Field label="Full Name" value={employee.fullName} />
        <Field label="Employee ID" value={employee.employeeId} />
        <Field
          label="Date of Birth"
          value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : ""}
        />
        <Field label="Phone" value={employee.phone ?? ""} />
        <Field label="Email" value={employee.email} />
        <Field
          label="Address"
          value={[employee.address, employee.city, employee.country].filter(Boolean).join(", ")}
        />
      </CardContent>
    </Card>
  );
}
