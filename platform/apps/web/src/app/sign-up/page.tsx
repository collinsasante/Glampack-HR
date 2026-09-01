"use client";

import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AuthButton, AuthInput } from "@/components/auth-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { firebaseAuth } from "@/lib/firebase";
import { signUp } from "@/lib/api/auth";
import { ApiError } from "@/lib/apiClient";
import { humanize } from "@/lib/format";
import type { Department } from "@glampack/shared";

const DEPARTMENTS: Department[] = [
  "Administration",
  "Management",
  "Production",
  "Operations",
  "CustomerService",
  "Logistics",
  "WarehousingAndFulfilment",
  "Finance",
  "Sales",
  "Marketing",
  "Engineering",
  "CreativeDesign",
  "Pakkmax",
];

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let createdFirebaseUser = false;
    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim().toLowerCase(),
        password
      );
      createdFirebaseUser = true;

      // Create the Employee record before sending the verification email — matches
      // the old app's order, so a user who never verifies still has a record HR can see.
      await signUp({ fullName, department: department || undefined });
      await sendEmailVerification(credential.user);

      router.replace("/verify-email-pending");
    } catch (err) {
      // Roll back the Firebase account if the API call failed and it's not just a
      // "you already signed up" conflict — otherwise we'd strand an orphaned Firebase
      // user with no Employee record and no way to complete signup again.
      if (createdFirebaseUser && !(err instanceof ApiError && err.status === 409)) {
        await firebaseAuth.currentUser?.delete().catch(() => {});
      }
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Set up your Glampack HR profile."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-primary hover:opacity-80">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="fullName"
          label="Full Name"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <AuthInput
          id="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthInput
          id="password"
          label="Password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="space-y-1.5">
          <Label htmlFor="department" className="text-sm font-medium text-foreground">
            Department <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
            <SelectTrigger
              id="department"
              className="w-full rounded-lg border-transparent bg-muted px-3.5 py-2.5 shadow-none data-[placeholder]:text-muted-foreground/60"
            >
              <SelectValue placeholder="Select a department">
                {department ? humanize(department) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {humanize(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AuthButton type="submit" loading={submitting}>
          Create account
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
