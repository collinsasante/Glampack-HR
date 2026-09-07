"use client";

import { AlertTriangle, Download, HeartPulse, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { MedicalClaimCard } from "@/components/medical/medical-claim-card";
import { MedicalClaimDetailSheet } from "@/components/medical/medical-claim-detail-sheet";
import { MedicalClaimForm } from "@/components/medical/medical-claim-form";
import { MedicalClaimsPagination } from "@/components/medical/medical-claims-pagination";
import { MedicalClaimsStats } from "@/components/medical/medical-claims-stats";
import { MedicalClaimsTable } from "@/components/medical/medical-claims-table";
import {
  DEFAULT_MEDICAL_FILTERS,
  MedicalClaimsToolbar,
  type MedicalClaimFilters,
} from "@/components/medical/medical-claims-toolbar";
import { ExportMedicalClaimsModal } from "@/components/medical/export-medical-claims-modal";
import { RecentMedicalActivityCard } from "@/components/medical/recent-medical-activity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/apiClient";
import {
  approveMedicalClaim,
  listMedicalClaims,
  rejectMedicalClaim,
  type MedicalClaim,
} from "@/lib/api/medical-claims";
import { hasPermission, listEmployees, type Employee } from "@/lib/api/employees";
import { claimStatusVariant } from "@/lib/medical-claim-format";
import { resolveDateRange } from "@/lib/dates";
import { currency } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">Unable to load medical claims</p>
      <p className="text-sm text-muted-foreground">We couldn&apos;t retrieve medical claims right now.</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <HeartPulse className="h-6 w-6" />
      </div>
      <p className="font-medium text-foreground">No medical claims found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Medical claims will appear here once they are submitted.
      </p>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4" /> Submit Medical Claim
      </Button>
    </div>
  );
}

function matchesFilters(c: MedicalClaim, filters: MedicalClaimFilters, employeeName: string) {
  if (filters.status !== "all" && c.status !== filters.status) return false;
  if (filters.date !== "all") {
    const { from, to } = resolveDateRange(filters.date);
    const d = c.createdAt.slice(0, 10);
    if (d < from || d > to) return false;
  }
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = `${employeeName} ${c.hospitalClinicName} ${c.descriptionOfTreatment}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

// ---- Admin/HR management view (Manager is intentionally NOT elevated here —
// medical data is more sensitive than leave/attendance, and the real API only
// scopes org-wide visibility + approve/reject to Admin/HR) ----
function StaffMedicalClaimsView({ employee }: { employee: Employee }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [claims, setClaims] = useState<MedicalClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [filters, setFilters] = useState<MedicalClaimFilters>(DEFAULT_MEDICAL_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selected, setSelected] = useState<MedicalClaim | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [emps, cls] = await Promise.all([listEmployees(), listMedicalClaims()]);
      setEmployees(emps);
      setClaims(cls);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const employeeById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const filtered = useMemo(
    () => claims.filter((c) => matchesFilters(c, filters, employeeById[c.employeeId]?.fullName ?? "")),
    [claims, filters, employeeById]
  );

  useEffect(() => {
    setPage(0);
  }, [filters, pageSize]);

  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  function openView(c: MedicalClaim) {
    setSelected(c);
    setDetailOpen(true);
  }

  async function handleApprove(id: string, notes?: string) {
    try {
      await approveMedicalClaim(id, { adminNotes: notes });
      toast.success("Medical claim approved.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to approve claim");
      throw err;
    }
  }

  async function handleReject(id: string, adminNotes: string) {
    try {
      await rejectMedicalClaim(id, { adminNotes });
      toast.success("Medical claim rejected.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject claim");
      throw err;
    }
  }

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Medical</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage employee medical claims and reimbursements.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Submit Medical Claim
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full" />
          ))}
        </div>
      ) : (
        <MedicalClaimsStats claims={claims} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <MedicalClaimsToolbar filters={filters} onChange={setFilters} />

          <Card>
            <CardContent className="px-0 py-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : claims.length === 0 ? (
                <div className="p-2">
                  <EmptyState onCreate={() => setFormOpen(true)} />
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No claims match your filters.
                </p>
              ) : (
                <>
                  <div className="hidden py-2 lg:block">
                    <MedicalClaimsTable claims={pageItems} employeeById={employeeById} onView={openView} />
                  </div>
                  <div className="grid gap-3 p-4 lg:hidden">
                    {pageItems.map((c) => (
                      <MedicalClaimCard key={c.id} claim={c} employee={employeeById[c.employeeId]} onView={openView} />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {!loading && filtered.length > 0 && (
            <>
              <MedicalClaimsPagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                  <Download className="h-4 w-4" /> Export
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <RecentMedicalActivityCard claims={claims} employeeById={employeeById} />
          )}
        </div>
      </div>

      <MedicalClaimForm open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />

      <MedicalClaimDetailSheet
        claim={selected}
        employee={selected ? employeeById[selected.employeeId] : undefined}
        canReview
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <ExportMedicalClaimsModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        label={filters.status === "all" ? "All Claims" : filters.status}
        claims={filtered}
        employees={employees}
      />
    </div>
  );
}

// ---- Personal view (Employee and Manager both land here) ----
function OwnMedicalClaimsView({ employee }: { employee: Employee }) {
  const [claims, setClaims] = useState<MedicalClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<MedicalClaim | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      setClaims(await listMedicalClaims({ employeeId: employee.id }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const pending = claims.filter((c) => c.status === "Pending").length;
  const approved = claims.filter((c) => c.status === "Approved").length;
  const totalReimbursed = claims.filter((c) => c.status === "Approved").reduce((s, c) => s + Number(c.amountSpent), 0);

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Medical</h1>
          <p className="text-sm text-muted-foreground">Submit and track your medical reimbursement claims.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Submit Claim
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-heading mt-1 text-2xl font-bold text-foreground">{pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="font-heading mt-1 text-2xl font-bold text-foreground">{approved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Reimbursed</p>
              <p className="font-heading mt-1 text-2xl font-bold text-foreground">{currency(totalReimbursed)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="px-0 py-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="p-2">
              <EmptyState onCreate={() => setFormOpen(true)} />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {claims.map((c) => (
                <li
                  key={c.id}
                  className="flex cursor-pointer items-center justify-between px-6 py-3 text-sm"
                  onClick={() => {
                    setSelected(c);
                    setDetailOpen(true);
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.hospitalClinicName}</p>
                    <p className="truncate text-muted-foreground">
                      {new Date(c.dateOfVisit).toLocaleDateString()} · {currency(Number(c.amountSpent))}
                    </p>
                  </div>
                  <Badge variant={claimStatusVariant(c.status)}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MedicalClaimForm open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />

      <MedicalClaimDetailSheet
        claim={selected}
        employee={employee}
        canReview={false}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

function MedicalClaimsContent() {
  const { employee } = useAuth();
  if (!employee) return null;

  const canReview = hasPermission(employee, "medical_claims.decide");

  return canReview ? <StaffMedicalClaimsView employee={employee} /> : <OwnMedicalClaimsView employee={employee} />;
}

export default function MedicalClaimsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <MedicalClaimsContent />
      </AppShell>
    </RequireAuth>
  );
}
