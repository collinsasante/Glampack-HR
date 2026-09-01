"use client";

import type { User } from "firebase/auth";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee } from "@/lib/api/employees";

export function AccountStatusCard({
  employee,
  firebaseUser,
  onSignOut,
}: {
  employee: Employee;
  firebaseUser: User | null;
  onSignOut: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={employee.accountStatus === "Active" ? "success" : "secondary"}>{employee.accountStatus}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Employee Since</span>
          <span className="text-foreground">
            {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Login</span>
          <span className="text-foreground">
            {firebaseUser?.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).toLocaleString() : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Account Created</span>
          <span className="text-foreground">
            {firebaseUser?.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).toLocaleDateString() : "—"}
          </span>
        </div>

        <div className="border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onSignOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
