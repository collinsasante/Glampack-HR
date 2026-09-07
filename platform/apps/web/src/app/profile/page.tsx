"use client";

import { useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AccountStatusCard } from "@/components/profile/account-status-card";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { EmergencyContactsCard } from "@/components/profile/emergency-contacts-card";
import { EmployeeSummary } from "@/components/profile/employee-summary";
import { EmploymentInformationCard } from "@/components/profile/employment-information-card";
import { PersonalInfoForm } from "@/components/profile/personal-info-form";
import { PersonalInformationCard } from "@/components/profile/personal-information-card";
import { ProfileHero } from "@/components/profile/profile-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/api/employees";
import { useAuth } from "@/lib/auth-context";

function ProfileContent() {
  const { employee, firebaseUser, refreshEmployee, signOut } = useAuth();
  const [tab, setTab] = useState("overview");

  if (!employee) return null;

  const canEditEmployment = hasPermission(employee, "employees.edit_others");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information, employment details, and account security.
        </p>
      </div>

      <ProfileHero employee={employee} onEdit={() => setTab("personal")} />

      <EmployeeSummary employee={employee} />

      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PersonalInformationCard employee={employee} />
            <EmploymentInformationCard employee={employee} showSalary={canEditEmployment} />
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <PersonalInfoForm employee={employee} canEditEmployment={canEditEmployment} onSaved={refreshEmployee} />
          <EmergencyContactsCard employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="employment">
          <EmploymentInformationCard employee={employee} showSalary={canEditEmployment} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <ChangePasswordCard />
          <AccountStatusCard employee={employee} firebaseUser={firebaseUser} onSignOut={signOut} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </RequireAuth>
  );
}
