"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnnouncementPriority, AnnouncementType } from "@glampack/shared";

export type AnnouncementDateFilter = "all" | "today" | "week" | "month";

const TYPE_OPTIONS: { value: AnnouncementType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "General", label: "General" },
  { value: "HR", label: "HR" },
  { value: "Urgent", label: "Urgent" },
  { value: "Event", label: "Event" },
  { value: "Other", label: "Other" },
];

const PRIORITY_OPTIONS: { value: AnnouncementPriority | "all" | "none"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
  { value: "none", label: "No Priority" },
];

const DATE_OPTIONS: { value: AnnouncementDateFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export interface AnnouncementFilters {
  search: string;
  type: AnnouncementType | "all";
  priority: AnnouncementPriority | "all" | "none";
  date: AnnouncementDateFilter;
}

export const DEFAULT_ANNOUNCEMENT_FILTERS: AnnouncementFilters = {
  search: "",
  type: "all",
  priority: "all",
  date: "all",
};

export function AnnouncementToolbar({
  filters,
  onChange,
}: {
  filters: AnnouncementFilters;
  onChange: (filters: AnnouncementFilters) => void;
}) {
  const isDefault =
    filters.search === "" && filters.type === "all" && filters.priority === "all" && filters.date === "all";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-9 pl-8"
          />
        </div>

        <Select value={filters.type} onValueChange={(v) => onChange({ ...filters, type: (v as AnnouncementType | "all") ?? "all" })}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue>{TYPE_OPTIONS.find((o) => o.value === filters.type)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(v) => onChange({ ...filters, priority: (v as AnnouncementPriority | "all" | "none") ?? "all" })}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue>{PRIORITY_OPTIONS.find((o) => o.value === filters.priority)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.date} onValueChange={(v) => onChange({ ...filters, date: (v as AnnouncementDateFilter) ?? "all" })}>
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
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_ANNOUNCEMENT_FILTERS)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
