"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

// Boxed, recessed field on the auth card — matches the reference dashboards'
// form style (soft-filled input, no visible chrome until focus) rather than the
// underline-only treatment from the prior Editorial Minimal pass.
export function AuthInput({ label, type, id, className, ...props }: AuthInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <input
          id={inputId}
          type={resolvedType}
          className={cn(
            "w-full rounded-lg border border-transparent bg-muted px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/15",
            isPassword && "pr-10",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthButton({
  children,
  loading,
  className,
  ...props
}: { children: ReactNode; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50",
        className
      )}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
