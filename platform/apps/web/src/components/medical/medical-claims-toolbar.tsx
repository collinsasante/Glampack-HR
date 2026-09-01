"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClaimStatus } from "@glampack/shared";

export type MedicalDateFilter = "all" | "today" | "week" | "month";

const STATUS_OPTIONS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

const DATE_OPTIONS: { value: MedicalDateFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export interface MedicalClaimFilters {
  search: string;
  status: ClaimStatus | "all";
  date: MedicalDateFilter;
}

export const DEFAULT_MEDICAL_FILTERS: MedicalClaimFilters = { search: "", status: "all", date: "all" };

export function MedicalClaimsToolbar({
  filters,
  onChange,
}: {
  filters: MedicalClaimFilters;
  onChange: (filters: MedicalClaimFilters) => void;
}) {
  const isDefault = filters.search === "" && filters.status === "all" && filters.date === "all";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee, clinic, or treatment…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-9 pl-8"
          />
        </div>

        <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: (v as ClaimStatus | "all") ?? "all" })}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.date} onValueChange={(v) => onChange({ ...filters, date: (v as MedicalDateFilter) ?? "all" })}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{DATE_OPTIONS.find((o) => o.value === filters.date)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_MEDICAL_FILTERS)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
