"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthButton, AuthInput } from "@/components/auth-input";
import { firebaseAuth } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Without actionCodeSettings, Firebase sends users to its own generic hosted
      // page instead of our /reset-password — this keeps the whole flow in-app.
      await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase(), {
        url: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Swallow the error deliberately — don't reveal whether the email exists.
    }
    setSent(true);
    setSubmitting(false);
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <Link href="/sign-in" className="font-semibold text-primary hover:opacity-80">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a password reset link has been sent.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthButton type="submit" loading={submitting}>
            Send reset link
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  );
}
