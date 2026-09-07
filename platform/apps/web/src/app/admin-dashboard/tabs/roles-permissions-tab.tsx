"use client";

import { Fragment, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/apiClient";
import { hasPermission, listEmployees, updateEmployeeRole, type Employee } from "@/lib/api/employees";
import { createRole, deleteRole, listRoles, setRolePermission, type RoleWithPermissions } from "@/lib/api/roles";
import { humanize } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { PERMISSIONS, type PermissionKey } from "@glampack/shared";

const GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

function RolesList({
  roles,
  canManage,
  onChanged,
}: {
  roles: RoleWithPermissions[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await createRole(name.trim());
      toast.success(`Role "${name.trim()}" created — grant it permissions below.`);
      setName("");
      setDialogOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: RoleWithPermissions) {
    try {
      await deleteRole(role.name);
      toast.success(`Role "${role.name}" deleted.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete role");
    }
  }

  function deleteDisabledReason(role: RoleWithPermissions): string | null {
    if (role.employeeCount > 0) return `${role.employeeCount} employee${role.employeeCount === 1 ? "" : "s"} still hold this role`;
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Roles ({roles.length})</CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Role
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const blockedReason = deleteDisabledReason(role);
                return (
                  <TableRow key={role.name}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">{role.employeeCount}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!!blockedReason}
                          title={blockedReason ?? "Delete role"}
                          onClick={() => handleDelete(role)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 px-4 md:hidden">
          {roles.map((role) => {
            const blockedReason = deleteDisabledReason(role);
            return (
              <div key={role.name} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">{role.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {role.employeeCount} employee{role.employeeCount === 1 ? "" : "s"}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!!blockedReason}
                    title={blockedReason ?? "Delete role"}
                    onClick={() => handleDelete(role)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Role</DialogTitle>
              <DialogDescription>
                Starts with zero permissions — grant it capabilities in the matrix below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-4">
              <Label htmlFor="role-name">Role name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Supervisor" required />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Add Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PermissionsMatrix({
  roles,
  canManage,
  onToggle,
}: {
  roles: RoleWithPermissions[];
  canManage: boolean;
  onToggle: (roleName: string, key: PermissionKey, granted: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What each role can do</CardTitle>
        <p className="text-xs text-muted-foreground">
          Enforced by the server on every request — checking a box here really does grant it.
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-auto whitespace-normal">Capability</TableHead>
              {roles.map((role) => (
                <TableHead key={role.name} className="w-12 px-1 text-center text-[11px] sm:w-16 sm:text-sm">
                  <span className="sm:hidden">{role.name.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{role.name}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {GROUPS.map((group) => (
              <Fragment key={group}>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={roles.length + 1}
                    className="bg-muted/40 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {group}
                  </TableCell>
                </TableRow>
                {PERMISSIONS.filter((p) => p.group === group).map((perm) => (
                  <TableRow key={perm.key}>
                    <TableCell className="text-xs whitespace-normal text-foreground sm:text-sm">{perm.label}</TableCell>
                    {roles.map((role) => (
                      <TableCell key={role.name} className="px-1 text-center">
                        <Checkbox
                          checked={role.permissions.includes(perm.key)}
                          disabled={!canManage}
                          onCheckedChange={(v) => onToggle(role.name, perm.key, !!v)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <p className="px-6 pt-3 text-xs text-muted-foreground">
          Nobody can change their own role, including Admins — this prevents an accidental lockout. The last role
          holding "Create, delete, and edit roles' permissions" can't be stripped of it, for the same reason.
        </p>
      </CardContent>
    </Card>
  );
}

function RoleControl({
  isSelf,
  options,
  disabled,
  value,
  onChange,
}: {
  isSelf: boolean;
  options: string[];
  disabled: boolean;
  value: string;
  onChange: (role: string) => void;
}) {
  if (options.length === 0 || isSelf) {
    return (
      <span className="text-xs text-muted-foreground">
        {isSelf ? "Can't change your own role" : "Not permitted for your role"}
      </span>
    );
  }
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RolesPermissionsTab() {
  const { employee: viewer } = useAuth();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [roleList, employeeList] = await Promise.all([listRoles(), listEmployees()]);
    setRoles(roleList);
    setEmployees(employeeList);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const canManageRoles = viewer ? hasPermission(viewer, "roles.manage") : false;
  const canAssignSenior = viewer ? hasPermission(viewer, "roles.assign_senior") : false;
  const isSenior = (roleName: string) => roles.find((r) => r.name === roleName)?.permissions.includes("roles.assign_senior") ?? false;

  function assignableRoles(target: Employee): string[] {
    if (canAssignSenior) return roles.map((r) => r.name);
    if (isSenior(target.role)) return [];
    return roles.filter((r) => !r.permissions.includes("roles.assign_senior")).map((r) => r.name);
  }

  async function handleTogglePermission(roleName: string, key: PermissionKey, granted: boolean) {
    try {
      await setRolePermission(roleName, key, granted);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update permission");
    }
  }

  async function handleRoleChange(id: string, role: string) {
    setError(null);
    setSavingId(id);
    try {
      await updateEmployeeRole(id, role);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update role");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RolesList roles={roles} canManage={canManageRoles} onChanged={refresh} />
      <PermissionsMatrix roles={roles} canManage={canManageRoles} onToggle={handleTogglePermission} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign roles ({employees.length} employees)</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {error && <p className="mb-3 px-6 text-sm text-destructive">{error}</p>}
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Set Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const isSelf = emp.id === viewer?.id;
                  const options = assignableRoles(emp);
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>{emp.department && humanize(emp.department)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{emp.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <RoleControl
                          isSelf={isSelf}
                          options={options}
                          disabled={savingId === emp.id}
                          value={emp.role}
                          onChange={(role) => handleRoleChange(emp.id, role)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 px-4 md:hidden">
            {employees.map((emp) => {
              const isSelf = emp.id === viewer?.id;
              const options = assignableRoles(emp);
              return (
                <div key={emp.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{emp.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {emp.department ? humanize(emp.department) : "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">{emp.role}</Badge>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <RoleControl
                      isSelf={isSelf}
                      options={options}
                      disabled={savingId === emp.id}
                      value={emp.role}
                      onChange={(role) => handleRoleChange(emp.id, role)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
