"use client";

import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firebaseAuth } from "@/lib/firebase";

const REQUIREMENTS: { test: (pw: string) => boolean; label: string }[] = [
  { test: (pw) => pw.length >= 8, label: "At least 8 characters" },
  { test: (pw) => /[A-Z]/.test(pw), label: "An uppercase letter" },
  { test: (pw) => /[a-z]/.test(pw), label: "A lowercase letter" },
  { test: (pw) => /[0-9]/.test(pw), label: "A number" },
  { test: (pw) => /[^A-Za-z0-9]/.test(pw), label: "A special character" },
];

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// Real password change via the Firebase client SDK — reauthenticates with the
// current password, then updates it. No custom backend endpoint is needed or
// exists for this; Firebase Auth is the sole credential store.
export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metRequirements = REQUIREMENTS.filter((r) => r.test(newPassword)).length;
  // Indexed 0..5 (all 5 requirements met is index 5) — one entry per possible count.
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"][metRequirements];
  const strengthColor = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-amber-500", "bg-emerald-600", "bg-emerald-600"][metRequirements];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (metRequirements < REQUIREMENTS.length) {
      setError("Your new password doesn't meet all the requirements below.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    const user = firebaseAuth.currentUser;
    if (!user?.email) {
      setError("Unable to verify your account. Please sign in again.");
      return;
    }

    setSubmitting(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
      await updatePassword(user, newPassword);
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Your current password is incorrect.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Failed to change password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <PasswordInput id="currentPassword" label="Current Password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordInput id="newPassword" label="New Password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordInput id="confirmPassword" label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />

          {newPassword && (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${strengthColor}`}
                  style={{ width: `${(metRequirements / REQUIREMENTS.length) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{strengthLabel}</p>
              <ul className="mt-2 space-y-1">
                {REQUIREMENTS.map((r) => (
                  <li key={r.label} className={`text-xs ${r.test(newPassword) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {r.test(newPassword) ? "✓" : "○"} {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
