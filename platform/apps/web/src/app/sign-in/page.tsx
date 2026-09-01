"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthButton, AuthInput } from "@/components/auth-input";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getMe, isStaffRole } from "@/lib/api/employees";

export default function SignInPage() {
  const router = useRouter();
  const { refreshEmployee } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);

      if (!credential.user.emailVerified) {
        setError("Please verify your email before signing in. Check your inbox for the verification link.");
        return;
      }

      await refreshEmployee();
      const employee = await getMe();
      router.replace(isStaffRole(employee.role) ? "/admin-dashboard" : "/dashboard");
    } catch {
      // Deliberately generic — never reveal whether the email exists (matches
      // Firebase's own default behavior and avoids account enumeration).
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back — enter your details to continue."
      footer={
        <>
          New here?{" "}
          <Link href="/sign-up" className="font-semibold text-primary hover:opacity-80">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="space-y-1.5">
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AuthButton type="submit" loading={submitting}>
          Continue
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
