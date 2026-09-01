"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  User,
  Megaphone,
  Wallet,
  HeartPulse,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { isStaffRole } from "@/lib/api/employees";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  staffOnly?: boolean;
}

const OVERVIEW_ITEMS: NavItem[] = [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }];

const WORKSPACE_ITEMS: NavItem[] = [
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Leave", href: "/leave", icon: CalendarDays },
  { name: "Payroll", href: "/payroll", icon: Wallet },
  { name: "Announcements", href: "/announcements", icon: Megaphone },
  { name: "Medical Claims", href: "/medical-claims", icon: HeartPulse },
  { name: "Profile", href: "/profile", icon: User },
];

const MANAGEMENT_ITEMS: NavItem[] = [{ name: "Employees", href: "/employees", icon: Users, staffOnly: true }];

const NAV_ITEMS = [...OVERVIEW_ITEMS, ...WORKSPACE_ITEMS, ...MANAGEMENT_ITEMS];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Successor to navigation.js — "Reports" and "Policies" are intentionally dropped:
// they pointed at monthly-summary.html/company-policies.html, neither of which
// were ever actually built in the old app (dead nav links).
export function AppShell({ children }: { children: ReactNode }) {
  const { employee, signOut } = useAuth();
  const pathname = usePathname();
  const isStaff = Boolean(employee && isStaffRole(employee.role));
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.staffOnly || isStaff);
  const visibleManagementItems = MANAGEMENT_ITEMS.filter((item) => !item.staffOnly || isStaff);
  const activeItem = visibleNavItems.find(
    (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
  );

  function isActive(href: string) {
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  }

  function renderNavItem(item: NavItem) {
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          isActive={isActive(item.href)}
          className="h-9 rounded-lg text-sm font-medium text-muted-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground data-active:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_10px_-4px_rgba(0,0,0,0.08)] hover:bg-sidebar-accent/60 hover:text-foreground"
          render={<Link href={item.href} />}
        >
          <item.icon />
          <span>{item.name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r-0">
        <SidebarHeader className="px-4 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
              G
            </div>
            <span className="text-sm font-bold text-foreground">Glampack HR</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-2">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              Overview
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">{OVERVIEW_ITEMS.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="px-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">{WORKSPACE_ITEMS.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isStaff && (
            <SidebarGroup className="mt-4 p-0">
              <SidebarGroupLabel className="px-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {visibleManagementItems.map(renderNavItem)}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isActive("/admin-dashboard")}
                      className="h-9 rounded-lg text-sm font-medium text-primary data-active:bg-sidebar-accent data-active:font-semibold data-active:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_10px_-4px_rgba(0,0,0,0.08)] hover:bg-sidebar-accent/60"
                      render={<Link href="/admin-dashboard" />}
                    >
                      <ShieldCheck />
                      <span>Admin</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-1.5">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {employee ? initials(employee.fullName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{employee?.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{employee?.role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center gap-3 px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-semibold text-foreground">
            {activeItem?.name ?? (pathname?.startsWith("/admin-dashboard") ? "Admin Dashboard" : "")}
          </span>
          <div className="flex flex-1 items-center justify-end gap-2">
            {isStaff && <GlobalSearch />}
            <ThemeToggle />
            <NotificationsBell />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto px-6 pb-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
