"use client";

import { AlertTriangle, Download, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PayrollStatCards } from "@/components/payroll/payroll-stat-cards";
import { PayrollOverviewChart } from "@/components/payroll/payroll-overview-chart";
import { PayrollStatusCard } from "@/components/payroll/payroll-status-card";
import { PayrollRunCard } from "@/components/payroll/payroll-run-card";
import { PayrollRecordsTable } from "@/components/payroll/payroll-records-table";
import { PayrollDetailSheet } from "@/components/payroll/payroll-detail-sheet";
import { RunPayrollModal } from "@/components/payroll/run-payroll-modal";
import { ExportPayrollModal } from "@/components/payroll/export-payroll-modal";
import { listEmployees, type Employee } from "@/lib/api/employees";
import { listPayroll, processPayroll, type Payroll } from "@/lib/api/payroll";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, offset: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function AdminPayrollView() {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<Payroll[]>([]);
  const [previousRecords, setPreviousRecords] = useState<Payroll[]>([]);
  const [allRecords, setAllRecords] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [current, previous, all, employeeList] = await Promise.all([
        listPayroll({ month }),
        listPayroll({ month: shiftMonth(month, -1) }),
        listPayroll({}),
        listEmployees(),
      ]);
      setRecords(current);
      setPreviousRecords(previous);
      setAllRecords(all);
      setEmployees(employeeList);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.accountStatus === "Active"), [employees]);
  const processedCount = records.filter((r) => r.status === "Processed" || r.status === "Paid").length;
  const pendingCount = records.filter((r) => r.status === "Pending").length;
  const lastProcessedDate = records
    .filter((r) => r.paymentDate)
    .map((r) => new Date(r.paymentDate!))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const missingEmployees = useMemo(() => {
    const covered = new Set(records.map((r) => r.employeeId));
    return activeEmployees.filter((e) => !covered.has(e.id));
  }, [activeEmployees, records]);

  function handleViewDetails(p: Payroll) {
    setSelectedPayroll(p);
    setSheetOpen(true);
  }

  async function handleProcessOne(p: Payroll) {
    await processPayroll(p.id, { status: "Processed", paymentDate: new Date() });
    setSheetOpen(false);
    await refresh();
    toast.success("Payroll processed.");
  }

  async function handleBulkProcessPending() {
    const pending = records.filter((r) => r.status === "Pending");
    setBulkProcessing(true);
    setBulkProgress({ done: 0, total: pending.length });
    for (const p of pending) {
      await processPayroll(p.id, { status: "Processed", paymentDate: new Date() });
      setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }
    setBulkProcessing(false);
    await refresh();
    toast.success("Payroll successfully processed.", {
      description: `${pending.length} employee${pending.length === 1 ? "" : "s"} processed successfully.`,
    });
  }

  function scrollToTable() {
    document.getElementById("payroll-records")?.scrollIntoView({ behavior: "smooth" });
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium text-foreground">Unable to load payroll</p>
        <p className="text-sm text-muted-foreground">We couldn&apos;t retrieve payroll information right now.</p>
        <Button onClick={refresh}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Dashboard / Payroll</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">Manage employee compensation and payroll processing.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 w-full min-w-0 sm:w-44"
          />
          <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setRunModalOpen(true)}>
            <Play className="h-4 w-4" /> Run Payroll
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] w-full" />
          ))}
        </div>
      ) : (
        <PayrollStatCards month={month} currentRecords={records} previousRecords={previousRecords} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? <Skeleton className="h-[320px] w-full" /> : <PayrollOverviewChart allRecords={allRecords} />}
        </div>
        <div className="lg:col-span-1">
          {loading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <PayrollStatusCard
              processedCount={processedCount}
              pendingCount={pendingCount}
              totalEmployees={activeEmployees.length}
              lastProcessedDate={lastProcessedDate}
              onStartPayroll={() => setRunModalOpen(true)}
            />
          )}
        </div>
      </div>

      {!loading && (processedCount > 0 || pendingCount > 0) && (
        <PayrollRunCard
          month={month}
          totalEmployees={activeEmployees.length}
          processedCount={processedCount}
          pendingCount={pendingCount}
          onReview={scrollToTable}
          onProcessPending={handleBulkProcessPending}
          processing={bulkProcessing}
          processProgress={bulkProgress}
        />
      )}

      <div id="payroll-records">
        <PayrollRecordsTable
          records={records}
          employees={employees}
          loading={loading}
          onViewDetails={handleViewDetails}
          onProcess={handleProcessOne}
        />
      </div>

      <PayrollDetailSheet
        payroll={selectedPayroll}
        employee={employees.find((e) => e.id === selectedPayroll?.employeeId)}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onProcess={handleProcessOne}
      />

      <RunPayrollModal
        open={runModalOpen}
        onOpenChange={setRunModalOpen}
        month={month}
        missingEmployees={missingEmployees}
        onComplete={refresh}
      />

      <ExportPayrollModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        month={month}
        records={records}
        employees={employees}
      />
    </div>
  );
}
