"use client";

import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { priorityBadgeVariant, typeBadgeVariant } from "@/lib/announcement-format";
import type { Announcement } from "@/lib/api/announcements";
import { hasPermission } from "@/lib/api/employees";
import type { Employee } from "@/lib/api/employees";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AnnouncementTable({
  announcements,
  employeeById,
  currentEmployee,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  announcements: Announcement[];
  employeeById: Record<string, Employee>;
  currentEmployee: Employee;
  onView: (a: Announcement) => void;
  onEdit: (a: Announcement) => void;
  onDuplicate: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
}) {
  const canDuplicate = hasPermission(currentEmployee, "announcements.create");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Announcement</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Posted</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {announcements.map((a) => {
          const author = employeeById[a.postedByEmployeeId];
          const canManage = hasPermission(currentEmployee, "announcements.manage_any") || a.postedByEmployeeId === currentEmployee.id;
          return (
            <TableRow key={a.id} className="cursor-pointer" onClick={() => onView(a)}>
              <TableCell className="max-w-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={typeBadgeVariant(a.type)}>{a.type}</Badge>
                </div>
                <p className="mt-1 font-medium text-foreground">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">{a.message}</p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                      {author ? initials(author.fullName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground">{author?.fullName ?? "Unknown"}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <p>{new Date(a.createdAt).toLocaleDateString()}</p>
                <p className="text-xs">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </TableCell>
              <TableCell>
                {a.priority ? (
                  <Badge variant={priorityBadgeVariant(a.priority)}>{a.priority}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Row actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(a)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </DropdownMenuItem>
                    {canManage && (
                      <DropdownMenuItem onClick={() => onEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                    )}
                    {canDuplicate && (
                      <DropdownMenuItem onClick={() => onDuplicate(a)}>
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </DropdownMenuItem>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(a)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
