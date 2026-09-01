"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Role } from "@glampack/shared";
import { useAuth } from "@/lib/auth-context";

interface RequireAuthProps {
  children: ReactNode;
  /** If given, only these roles may view the page — anyone else is bounced to /dashboard. */
  allowRoles?: Role[];
}

export function RequireAuth({ children, allowRoles }: RequireAuthProps) {
  const { firebaseUser, employee, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser || !firebaseUser.emailVerified) {
      router.replace("/sign-in");
      return;
    }
    if (employee && allowRoles && !allowRoles.includes(employee.role)) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, employee, allowRoles, router]);

  if (loading || !firebaseUser || !employee) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" className="h-9 w-9 animate-pulse" />
        Loading…
      </div>
    );
  }

  if (allowRoles && !allowRoles.includes(employee.role)) {
    return null;
  }

  return <>{children}</>;
}
