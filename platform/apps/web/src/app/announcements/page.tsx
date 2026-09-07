"use client";

import { AlertTriangle, Megaphone, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { AnnouncementDetailSheet } from "@/components/announcements/announcement-detail-sheet";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { AnnouncementPagination } from "@/components/announcements/announcement-pagination";
import { AnnouncementStats } from "@/components/announcements/announcement-stats";
import { AnnouncementTable } from "@/components/announcements/announcement-table";
import {
  AnnouncementToolbar,
  DEFAULT_ANNOUNCEMENT_FILTERS,
  type AnnouncementFilters,
} from "@/components/announcements/announcement-toolbar";
import { DeleteAnnouncementDialog } from "@/components/announcements/delete-announcement-dialog";
import { RecentActivityCard } from "@/components/announcements/recent-activity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { priorityBadgeVariant, typeBadgeVariant } from "@/lib/announcement-format";
import { listAnnouncementReadCounts, listAnnouncements, type Announcement } from "@/lib/api/announcements";
import { hasPermission, isStaffRole, listEmployees, type Employee } from "@/lib/api/employees";
import { resolveDateRange } from "@/lib/dates";
import { useAuth } from "@/lib/auth-context";

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">Unable to load announcements</p>
      <p className="text-sm text-muted-foreground">We couldn&apos;t retrieve announcements right now.</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

function EmptyState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Megaphone className="h-6 w-6" />
      </div>
      <p className="font-medium text-foreground">No announcements yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {canCreate
          ? "Create your first announcement to keep employees informed."
          : "Check back later for updates from HR and management."}
      </p>
      {canCreate && (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create Announcement
        </Button>
      )}
    </div>
  );
}

function matchesFilters(a: Announcement, filters: AnnouncementFilters, authorName: string) {
  if (filters.type !== "all" && a.type !== filters.type) return false;
  if (filters.priority === "none" && a.priority !== null) return false;
  if (filters.priority !== "all" && filters.priority !== "none" && a.priority !== filters.priority) return false;
  if (filters.date !== "all") {
    const { from, to } = resolveDateRange(filters.date);
    const d = a.createdAt.slice(0, 10);
    if (d < from || d > to) return false;
  }
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = `${a.title} ${a.message} ${authorName}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

// ---- Admin/HR/Manager management view ----
function StaffAnnouncementsView({ employee }: { employee: Employee }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readCounts, setReadCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [filters, setFilters] = useState<AnnouncementFilters>(DEFAULT_ANNOUNCEMENT_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState<Announcement | null>(null);

  const [detailAnnouncement, setDetailAnnouncement] = useState<Announcement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canCreate = hasPermission(employee, "announcements.create");

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [emps, anns, counts] = await Promise.all([
        listEmployees(),
        listAnnouncements(),
        listAnnouncementReadCounts(),
      ]);
      setEmployees(emps);
      setAnnouncements(anns);
      setReadCounts(new Map(Object.entries(counts)));
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
  const activeEmployeeCount = employees.filter((e) => e.accountStatus === "Active").length;

  const filtered = useMemo(
    () => announcements.filter((a) => matchesFilters(a, filters, employeeById[a.postedByEmployeeId]?.fullName ?? "")),
    [announcements, filters, employeeById]
  );

  useEffect(() => {
    setPage(0);
  }, [filters, pageSize]);

  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  function openCreate() {
    setEditing(null);
    setDuplicateFrom(null);
    setFormOpen(true);
  }
  function openEdit(a: Announcement) {
    setDetailOpen(false);
    setEditing(a);
    setDuplicateFrom(null);
    setFormOpen(true);
  }
  function openDuplicate(a: Announcement) {
    setDetailOpen(false);
    setEditing(null);
    setDuplicateFrom(a);
    setFormOpen(true);
  }
  function openDelete(a: Announcement) {
    setDetailOpen(false);
    setDeleteTarget(a);
    setDeleteOpen(true);
  }
  function openView(a: Announcement) {
    setDetailAnnouncement(a);
    setDetailOpen(true);
  }

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and communicate important updates to your employees.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Announcement
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full" />
          ))}
        </div>
      ) : (
        <AnnouncementStats announcements={announcements} readCounts={readCounts} activeEmployeeCount={activeEmployeeCount} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AnnouncementToolbar filters={filters} onChange={setFilters} />

          <Card>
            <CardContent className="px-0 py-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-2">
                  <EmptyState canCreate={canCreate} onCreate={openCreate} />
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No announcements match your filters.
                </p>
              ) : (
                <>
                  <div className="hidden py-2 lg:block">
                    <AnnouncementTable
                      announcements={pageItems}
                      employeeById={employeeById}
                      currentEmployee={employee}
                      onView={openView}
                      onEdit={openEdit}
                      onDuplicate={openDuplicate}
                      onDelete={openDelete}
                    />
                  </div>
                  <div className="grid gap-3 p-4 lg:hidden">
                    {pageItems.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        employeeById={employeeById}
                        currentEmployee={employee}
                        onView={openView}
                        onEdit={openEdit}
                        onDuplicate={openDuplicate}
                        onDelete={openDelete}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {!loading && filtered.length > 0 && (
            <AnnouncementPagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          {loading ? <Skeleton className="h-64 w-full" /> : <RecentActivityCard announcements={announcements} employeeById={employeeById} />}
        </div>
      </div>

      <AnnouncementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        duplicateFrom={duplicateFrom}
        onSaved={refresh}
      />

      <AnnouncementDetailSheet
        announcement={detailAnnouncement}
        employeeById={employeeById}
        currentEmployee={employee}
        readCount={detailAnnouncement ? (readCounts.get(detailAnnouncement.id) ?? 0) : undefined}
        activeEmployeeCount={activeEmployeeCount}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onDuplicate={openDuplicate}
        onDelete={openDelete}
      />

      <DeleteAnnouncementDialog
        announcement={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={refresh}
      />
    </div>
  );
}

// ---- Plain employee feed ----
function EmployeeAnnouncementsFeed({ employee }: { employee: Employee }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const [anns, emps] = await Promise.all([listAnnouncements(), listEmployees()]);
      setAnnouncements(anns);
      setEmployees(emps);
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

  const filtered = announcements.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const author = employeeById[a.postedByEmployeeId]?.fullName ?? "";
    return `${a.title} ${a.message} ${author}`.toLowerCase().includes(q);
  });

  if (error) return <ErrorState onRetry={refresh} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Announcements</h1>
        <p className="text-sm text-muted-foreground">Company-wide updates from HR and management.</p>
      </div>

      <Input placeholder="Search announcements…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState canCreate={false} onCreate={() => {}} />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No announcements match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const author = employeeById[a.postedByEmployeeId];
            return (
              <Card
                key={a.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => {
                  setDetail(a);
                  setDetailOpen(true);
                }}
              >
                <CardContent className="py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={typeBadgeVariant(a.type)}>{a.type}</Badge>
                    {a.priority && <Badge variant={priorityBadgeVariant(a.priority)}>{a.priority} priority</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-heading font-medium text-foreground">{a.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">By {author?.fullName ?? "Unknown"}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AnnouncementDetailSheet
        announcement={detail}
        employeeById={employeeById}
        currentEmployee={employee}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}

function AnnouncementsContent() {
  const { employee } = useAuth();
  if (!employee) return null;

  return isStaffRole(employee) ? (
    <StaffAnnouncementsView employee={employee} />
  ) : (
    <EmployeeAnnouncementsFeed employee={employee} />
  );
}

export default function AnnouncementsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <AnnouncementsContent />
      </AppShell>
    </RequireAuth>
  );
}
