"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmployee, updateEmployee, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";
import type { AccountStatus, Department, EmployeeStatus, EmploymentType } from "@glampack/shared";

const DEPARTMENTS: Department[] = [
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
];
const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Permanent", "Intern", "NationalServicePersonnel", "IndependentContractor"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["FullTime", "PartTime", "Contract", "Temporary"];

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.string().optional(),
  status: z.string().optional(),
  salary: z.string().optional(),
  annualLeaveBalance: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  ghanaCardNumber: z.string().optional(),
  ssnitNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function EmployeeDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function load() {
    setLoading(true);
    try {
      const emp = await getEmployee(id);
      setEmployee(emp);
      reset({
        fullName: emp.fullName,
        department: emp.department ?? "",
        jobTitle: emp.jobTitle ?? "",
        employmentType: emp.employmentType ?? "",
        status: emp.status,
        salary: emp.salary ?? "",
        annualLeaveBalance: String(emp.annualLeaveBalance),
        phone: emp.phone ?? "",
        address: emp.address ?? "",
        city: emp.city ?? "",
        country: emp.country ?? "",
        ghanaCardNumber: emp.ghanaCardNumber ?? "",
        ssnitNumber: emp.ssnitNumber ?? "",
        bankName: emp.bankName ?? "",
        bankAccountNumber: emp.bankAccountNumber ?? "",
        bankBranch: emp.bankBranch ?? "",
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setSaved(false);
    try {
      await updateEmployee(id, {
        ...values,
        department: values.department || undefined,
        employmentType: values.employmentType || undefined,
        salary: values.salary ? Number(values.salary) : undefined,
        annualLeaveBalance: values.annualLeaveBalance ? Number(values.annualLeaveBalance) : undefined,
      });
      await load();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!employee) return;
    const accountStatus: AccountStatus = employee.accountStatus === "Active" ? "Inactive" : "Active";
    await updateEmployee(id, { accountStatus });
    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !employee) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">Employee not found</p>
        <p className="text-sm text-muted-foreground">This employee may have been removed.</p>
        <Button variant="outline" nativeButton={false} render={<Link href="/employees" />}>
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {initials(employee.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">{employee.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.employeeId} · {employee.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={employee.accountStatus === "Active" ? "success" : "secondary"}>
            {employee.accountStatus}
          </Badge>
          <Badge variant="secondary" title="Change roles from the Roles & Permissions tab">
            {employee.role}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleToggleActive}>
            {employee.accountStatus === "Active" ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{field.value ? humanize(field.value) : "Not set"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {humanize(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{field.value ? humanize(field.value) : "Not set"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {humanize(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Employee Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{field.value ? humanize(field.value) : "Not set"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {humanize(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary (GH₵)</Label>
              <Input id="salary" type="number" min="0" step="0.01" {...register("salary")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualLeaveBalance">Annual Leave Balance</Label>
              <Input id="annualLeaveBalance" type="number" min="0" {...register("annualLeaveBalance")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ghanaCardNumber">Ghana Card Number</Label>
              <Input id="ghanaCardNumber" {...register("ghanaCardNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssnitNumber">SSNIT Number</Label>
              <Input id="ssnitNumber" {...register("ssnitNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" {...register("bankName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
              <Input id="bankAccountNumber" {...register("bankAccountNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankBranch">Bank Branch</Label>
              <Input id="bankBranch" {...register("bankBranch")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          <Button type="button" variant="ghost" onClick={() => router.push("/employees")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <RequireAuth requireStaff>
      <AppShell>
        <EmployeeDetailContent />
      </AppShell>
    </RequireAuth>
  );
}
