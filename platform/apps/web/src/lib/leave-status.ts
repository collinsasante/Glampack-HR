export function leaveStatusVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "destructive";
  if (status === "Cancelled") return "secondary";
  return "warning";
}
