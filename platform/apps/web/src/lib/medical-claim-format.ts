export function claimStatusVariant(status: string): "success" | "warning" | "destructive" {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "destructive";
  return "warning";
}
