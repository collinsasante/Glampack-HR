"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { isStaffRole } from "@/lib/api/employees";

// Successor to index.html's meta-refresh redirect stub.
export default function Home() {
  const { firebaseUser, employee, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser || !firebaseUser.emailVerified) {
      router.replace("/sign-in");
    } else if (employee) {
      router.replace(isStaffRole(employee) ? "/admin-dashboard" : "/dashboard");
    }
  }, [loading, firebaseUser, employee, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
