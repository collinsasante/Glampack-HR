import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[400px] animate-fade-in-up">
        <div className="mb-6 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-9 w-9 shrink-0" />
          <span className="text-sm font-semibold text-foreground">Glampack HR</span>
        </div>

        <div className="rounded-2xl border border-black/[0.04] bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_16px_32px_-16px_rgba(0,0,0,0.12)] dark:border-white/[0.06] dark:shadow-none">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground text-wrap-balance">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
