"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Same reveal-on-click pattern as the password field in auth-input.tsx — salary and
// payment figures are masked by default so they can't be shoulder-surfed on a shared
// screen, with a per-value toggle to reveal.
export function MaskedCurrency({
  amount,
  className,
  iconClassName,
  buttonClassName,
}: {
  amount: number | string;
  className?: string;
  iconClassName?: string;
  buttonClassName?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("tabular-nums", className)}>{revealed ? currency(amount) : "GH₵ ******"}</span>
      <button
        type="button"
        onClick={(e) => {
          // Several cards this sits inside are wrapped in a Next.js <Link> (a real
          // anchor) — stopPropagation alone doesn't block the anchor's own default
          // navigation, so both are needed to keep the toggle from also following the link.
          e.preventDefault();
          e.stopPropagation();
          setRevealed((v) => !v);
        }}
        className={cn("text-muted-foreground transition-colors hover:text-foreground", buttonClassName)}
        aria-label={revealed ? "Hide amount" : "Show amount"}
      >
        {revealed ? (
          <EyeOff className={cn("h-3.5 w-3.5", iconClassName)} />
        ) : (
          <Eye className={cn("h-3.5 w-3.5", iconClassName)} />
        )}
      </button>
    </span>
  );
}
