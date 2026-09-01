"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AnnouncementPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const pageNumbers: (number | "ellipsis")[] = [];
  for (let i = 0; i < pageCount; i++) {
    if (i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1) pageNumbers.push(i);
    else if (pageNumbers[pageNumbers.length - 1] !== "ellipsis") pageNumbers.push("ellipsis");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total} announcement{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Rows per page</p>
          <Select value={String(pageSize)} onValueChange={(v) => v && onPageSizeChange(Number(v))}>
            <SelectTrigger size="sm" className="w-16">
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          {pageNumbers.map((n, i) =>
            n === "ellipsis" ? (
              <span key={`e-${i}`} className="px-1.5 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={n}
                variant={n === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(n)}
              >
                {n + 1}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount - 1}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
