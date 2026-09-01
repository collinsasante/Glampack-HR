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
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (allowRoles && !allowRoles.includes(employee.role)) {
    return null;
  }

  return <>{children}</>;
}
