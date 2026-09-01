"use client";

import { sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthButton } from "@/components/auth-input";
import { firebaseAuth } from "@/lib/firebase";

export default function VerifyEmailPendingPage() {
  const [sent, setSent] = useState(false);

  async function handleResend() {
    if (firebaseAuth.currentUser) {
      await sendEmailVerification(firebaseAuth.currentUser);
      setSent(true);
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle="We've sent a verification link to your email address. Click it, then come back and sign in."
      footer={
        <Link href="/sign-in" className="font-semibold text-primary hover:opacity-80">
          Back to sign in
        </Link>
      }
    >
      <AuthButton type="button" onClick={handleResend} disabled={sent}>
        {sent ? "Verification email sent" : "Resend verification email"}
      </AuthButton>
    </AuthLayout>
  );
}
