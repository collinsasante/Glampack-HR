import type { AnnouncementPriority, AnnouncementType } from "@glampack/shared";

export function priorityBadgeVariant(priority: AnnouncementPriority | null): "destructive" | "warning" | "secondary" {
  if (priority === "High") return "destructive";
  if (priority === "Medium") return "warning";
  return "secondary";
}

export function typeBadgeVariant(type: AnnouncementType): "destructive" | "outline" {
  return type === "Urgent" ? "destructive" : "outline";
}

export function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
