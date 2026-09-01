import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

// Modern SaaS direction: one bold grotesk carries both headings and body text —
// matches the reference dashboards (AIRES, Mate), which lean on weight contrast
// within a single family rather than a display/body font pairing.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Glampack HR",
  description: "Glampack HR management system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased font-sans", plusJakarta.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before paint so a returning dark-mode user never sees a light flash.
            Reads the same explicit, user-set localStorage key the ThemeToggle writes —
            never the OS/browser preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
