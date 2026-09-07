"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { isStaffRole } from "@/lib/api/employees";

interface RequireAuthProps {
  children: ReactNode;
  /** If true, only a role holding at least one real permission may view the page. */
  requireStaff?: boolean;
}

export function RequireAuth({ children, requireStaff }: RequireAuthProps) {
  const { firebaseUser, employee, loading } = useAuth();
  const router = useRouter();
  const blocked = Boolean(employee && requireStaff && !isStaffRole(employee));

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser || !firebaseUser.emailVerified) {
      router.replace("/sign-in");
      return;
    }
    if (blocked) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, blocked, router]);

  if (loading || !firebaseUser || !employee) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" className="h-9 w-9 animate-pulse" />
        Loading…
      </div>
    );
  }

  if (blocked) {
    return null;
  }

  return <>{children}</>;
}
