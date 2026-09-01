"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/apiClient";
import { updateEmployee, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";
import type { Department, EmploymentType } from "@glampack/shared";

const DEPARTMENTS: Department[] = [
  "Administration", "Management", "Production", "Operations", "CustomerService",
  "Logistics", "WarehousingAndFulfilment", "Finance", "Sales", "Marketing",
  "Engineering", "CreativeDesign", "Pakkmax",
];
const EMPLOYMENT_TYPES: EmploymentType[] = ["FullTime", "PartTime", "Contract", "Temporary"];

const CONTACT_FIELDS: readonly [key: string, label: string][] = [
  ["phone", "Phone Number"],
  ["address", "Residential Address"],
  ["city", "City"],
  ["country", "Country"],
];
const IDENTITY_FIELDS: readonly [key: string, label: string][] = [
  ["ghanaCardNumber", "Ghana Card Number"],
  ["ssnitNumber", "SSNIT Number"],
];
const BANK_FIELDS: readonly [key: string, label: string][] = [
  ["bankName", "Bank Name"],
  ["bankAccountNumber", "Bank Account Number"],
  ["bankBranch", "Bank Branch"],
];

// Every employee can edit their own contact/bank/ID details. Only Admin/HR can
// edit identity + employment fields — even on their own record — matching the
// real server-side schema split (updateOwnEmployeeSchema vs. AsStaffSchema).
export function PersonalInfoForm({
  employee,
  canEditEmployment,
  onSaved,
}: {
  employee: Employee;
  canEditEmployment: boolean;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    fullName: "", jobTitle: "", department: "" as Department | "", employmentType: "" as EmploymentType | "",
    dateOfBirth: "",
    phone: "", address: "", city: "", country: "",
    ghanaCardNumber: "", ssnitNumber: "",
    bankName: "", bankAccountNumber: "", bankBranch: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      fullName: employee.fullName,
      jobTitle: employee.jobTitle ?? "",
      department: employee.department ?? "",
      employmentType: employee.employmentType ?? "",
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      city: employee.city ?? "",
      country: employee.country ?? "",
      ghanaCardNumber: employee.ghanaCardNumber ?? "",
      ssnitNumber: employee.ssnitNumber ?? "",
      bankName: employee.bankName ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      bankBranch: employee.bankBranch ?? "",
    });
  }, [employee]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        ghanaCardNumber: form.ghanaCardNumber,
        ssnitNumber: form.ssnitNumber,
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankBranch: form.bankBranch,
      };
      if (canEditEmployment) {
        payload.fullName = form.fullName;
        payload.jobTitle = form.jobTitle;
        payload.department = form.department || undefined;
        payload.employmentType = form.employmentType || undefined;
        payload.dateOfBirth = form.dateOfBirth ? new Date(form.dateOfBirth) : undefined;
      }
      await updateEmployee(employee.id, payload);
      await onSaved();
      toast.success("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {canEditEmployment && (
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Basic Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: (v as Department) ?? "" }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department">{form.department ? humanize(form.department) : undefined}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>{humanize(d)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={form.employmentType} onValueChange={(v) => setForm((f) => ({ ...f, employmentType: (v as EmploymentType) ?? "" }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type">{form.employmentType ? humanize(form.employmentType) : undefined}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Contact Information</p>
            <div className="grid grid-cols-2 gap-4">
              {CONTACT_FIELDS.map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Identification</p>
            <div className="grid grid-cols-2 gap-4">
              {IDENTITY_FIELDS.map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Bank Details</p>
            <div className="grid grid-cols-2 gap-4">
              {BANK_FIELDS.map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {!canEditEmployment && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Your name, date of birth, and employment details are managed by HR. Contact HR to update them.
            </p>
          )}

          {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
