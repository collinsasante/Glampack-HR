"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { listEmployees, type Employee } from "@/lib/api/employees";
import { humanize } from "@/lib/format";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Searches the employee directory — the one dataset staff genuinely need to jump
// to quickly. Fetched once and filtered client-side; the org is HR-scale, not
// big-data, so this stays simple rather than standing up a search endpoint.
export function GlobalSearch() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEmployees().then(setEmployees);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? employees
        .filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            (e.department && humanize(e.department).toLowerCase().includes(q))
        )
        .slice(0, 8)
    : [];

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-9 pl-8"
        />
      </div>
      {open && q && (
        <div className="absolute top-full left-0 z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-black/[0.04] bg-popover shadow-[0_1px_2px_rgba(0,0,0,0.03),0_16px_32px_-16px_rgba(0,0,0,0.16)]">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No employees found.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((emp) => (
                <li key={emp.id}>
                  <Link
                    href={`/employees/${emp.id}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                        {initials(emp.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{emp.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
