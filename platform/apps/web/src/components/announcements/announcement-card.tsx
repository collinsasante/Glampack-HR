"use client";

import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { priorityBadgeVariant, typeBadgeVariant } from "@/lib/announcement-format";
import type { Announcement } from "@/lib/api/announcements";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AnnouncementCard({
  announcement,
  employeeById,
  currentEmployee,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  announcement: Announcement;
  employeeById: Record<string, Employee>;
  currentEmployee: Employee;
  onView: (a: Announcement) => void;
  onEdit: (a: Announcement) => void;
  onDuplicate: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
}) {
  const author = employeeById[announcement.postedByEmployeeId];
  const canManage = currentEmployee.role === "Admin" || announcement.postedByEmployeeId === currentEmployee.id;
  const canDuplicate = currentEmployee.role === "Admin" || currentEmployee.role === "HR";

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onView(announcement)}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={typeBadgeVariant(announcement.type)}>{announcement.type}</Badge>
            {announcement.priority && (
              <Badge variant={priorityBadgeVariant(announcement.priority)}>{announcement.priority}</Badge>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(announcement)}>
                  <Eye className="h-3.5 w-3.5" /> View
                </DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem onClick={() => onEdit(announcement)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                )}
                {canDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(announcement)}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </DropdownMenuItem>
                )}
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(announcement)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div>
          <p className="font-medium text-foreground">{announcement.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{announcement.message}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                {author ? initials(author.fullName) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{author?.fullName ?? "Unknown"}</span>
          </div>
          <span className="text-xs text-muted-foreground">{new Date(announcement.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
