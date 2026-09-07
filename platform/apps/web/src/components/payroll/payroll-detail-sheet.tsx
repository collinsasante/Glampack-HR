"use client";

import { CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { SalaryBreakdownChart } from "@/components/payroll/salary-breakdown-chart";
import { MaskedCurrency } from "@/components/masked-currency";
import { humanize } from "@/lib/format";
import { downloadPayslip, previewPayslip } from "@/lib/payslip-pdf";
import type { Employee } from "@/lib/api/employees";
import type { Payroll } from "@/lib/api/payroll";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusVariant(status: string): "success" | "warning" {
  return status === "Processed" || status === "Paid" ? "success" : "warning";
}

export function PayrollDetailSheet({
  payroll,
  employee,
  open,
  onOpenChange,
  onProcess,
}: {
  payroll: Payroll | null;
  employee: Employee | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (payroll: Payroll) => void;
}) {
  if (!payroll || !employee) return null;

  const earnings = [
    ["Basic Salary", payroll.basicSalary],
    ["Housing Allowance", payroll.housingAllowance],
    ["Transport Allowance", payroll.transportAllowance],
    ["Benefits", payroll.benefits],
    ["Other Allowances", payroll.otherAllowances],
    ["Bonus", payroll.bonus],
    ...payroll.customAllowances.map((a) => [a.name, a.amount] as const),
  ].filter(([, amount]) => Number(amount) > 0);

  const deductions = [
    ["Income Tax", payroll.incomeTax],
    ["Welfare", payroll.welfare],
    ["Social Security", payroll.socialSecurity],
    ["Health Insurance", payroll.healthInsurance],
    ["Other Deductions", payroll.otherDeductions],
    ...payroll.customDeductions.map((d) => [d.name, d.amount] as const),
  ].filter(([, amount]) => Number(amount) > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Payroll Details</SheetTitle>
          <p className="text-xs text-muted-foreground">{payroll.month}</p>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {initials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{employee.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {employee.department && humanize(employee.department)}
                {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Earnings</p>
            <dl className="space-y-1.5 text-sm">
              {earnings.map(([label, amount]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-foreground">
                    <MaskedCurrency amount={amount} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <Separator />

          <div className="flex justify-between text-sm font-semibold text-foreground">
            <span>Gross Salary</span>
            <MaskedCurrency amount={payroll.grossSalary} />
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Deductions</p>
            {deductions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deductions.</p>
            ) : (
              <dl className="space-y-1.5 text-sm">
                {deductions.map(([label, amount]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-foreground">
                      <MaskedCurrency amount={amount} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
              <span>Total Deductions</span>
              <MaskedCurrency amount={payroll.totalDeductions} />
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Net Salary</p>
            <MaskedCurrency
              amount={payroll.netSalary}
              className="font-heading text-2xl font-bold text-foreground"
              iconClassName="h-4 w-4"
            />
          </div>

          <SalaryBreakdownChart
            basicSalary={Number(payroll.basicSalary)}
            totalAllowances={Number(payroll.totalAllowances)}
            totalDeductions={Number(payroll.totalDeductions)}
            grossSalary={Number(payroll.grossSalary)}
          />

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Payment Date</p>
              <p className="text-foreground">
                {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={statusVariant(payroll.status)} className="mt-0.5">
                {(payroll.status === "Processed" || payroll.status === "Paid") && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {payroll.status}
              </Badge>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border">
          {payroll.status === "Pending" ? (
            <Button className="flex-1" onClick={() => onProcess(payroll)}>
              Process Payroll
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => previewPayslip(payroll, employee)}>
                View Payslip
              </Button>
              <Button className="flex-1" onClick={() => downloadPayslip(payroll, employee)}>
                Download
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
