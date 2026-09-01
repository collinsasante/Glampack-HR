"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/apiClient";
import { createEmployee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";
import type { Department, EmployeeStatus, Role } from "@glampack/shared";

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
const ROLES: Role[] = ["Employee", "Manager", "HR", "Admin"];
const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Permanent", "Intern", "NationalServicePersonnel", "IndependentContractor"];

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.string(),
  status: z.string().min(1, "Employee status is required"),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  fullName: "",
  email: "",
  role: "Employee",
  status: "Permanent",
  department: "",
  jobTitle: "",
};

export function AddEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await createEmployee({
        ...values,
        department: values.department || undefined,
        jobTitle: values.jobTitle || undefined,
      });
      reset(defaultValues);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          reset(defaultValues);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" /> Add Employee
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>
            This creates the employee record HR/Admin can manage. The employee still needs to sign up with this
            same email to get a sign-in account — pre-created records aren&apos;t linked to a login yet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{field.value}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
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
                      <SelectValue>{humanize(field.value)}</SelectValue>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="-mx-0 -mb-0 border-t-0 bg-transparent p-0 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
