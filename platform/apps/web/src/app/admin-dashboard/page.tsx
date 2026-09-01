"use client";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AdminStatCards } from "@/components/admin-dashboard/stat-cards";
import { AttendanceOverviewChart } from "@/components/admin-dashboard/attendance-overview-chart";
import { AdminAttentionPanel } from "@/components/admin-dashboard/attention-panel";
import { DepartmentOverviewChart } from "@/components/admin-dashboard/department-overview-chart";
import { RecentActivity } from "@/components/admin-dashboard/recent-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { EmployeesTab } from "./tabs/employees-tab";
import { LeaveTab } from "./tabs/leave-tab";
import { PayrollTab } from "./tabs/payroll-tab";
import { AttendanceTab } from "./tabs/attendance-tab";
import { MedicalClaimsTab } from "./tabs/medical-claims-tab";

function AdminDashboardContent() {
  const { employee } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {employee?.fullName} ({employee?.role})
        </p>
      </div>

      <AdminStatCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceOverviewChart />
        </div>
        <div className="lg:col-span-1">
          {employee && <AdminAttentionPanel employee={employee} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DepartmentOverviewChart />
        <RecentActivity />
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="medical">Medical Claims</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <EmployeesTab />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveTab />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollTab />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="medical">
          <MedicalClaimsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAuth allowRoles={["Admin", "HR", "Manager"]}>
      <AppShell>
        <AdminDashboardContent />
      </AppShell>
    </RequireAuth>
  );
}
