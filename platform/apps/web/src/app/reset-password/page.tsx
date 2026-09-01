"use client";

import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthButton, AuthInput } from "@/components/auth-input";
import { firebaseAuth } from "@/lib/firebase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError("Missing or invalid reset link.");
      return;
    }
    verifyPasswordResetCode(firebaseAuth, oobCode)
      .then(setEmail)
      .catch(() => setError("This reset link is invalid or has expired."));
  }, [oobCode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!oobCode) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, password);
      setDone(true);
      setTimeout(() => router.replace("/sign-in"), 2000);
    } catch {
      setError("Failed to reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle={email ? `for ${email}` : "Verifying your reset link…"}>
      {done ? (
        <p className="text-sm text-muted-foreground">Password updated. Redirecting to sign in…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            id="password"
            label="New password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            disabled={!email}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AuthButton type="submit" loading={submitting} disabled={!email}>
            Update password
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
