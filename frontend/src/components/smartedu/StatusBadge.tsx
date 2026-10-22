import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  switch (normalized) {
    case "ACTIVE":
    case "ENROLLED":
      return <Badge variant="success">Active</Badge>;
    case "DROPPED":
    case "INACTIVE":
      return <Badge variant="destructive">Dropped</Badge>;
    case "COMPLETED":
      return <Badge variant="info">Completed</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "PRIMARY":
      return <Badge variant="purple">Primary Faculty</Badge>;
    case "SECONDARY":
      return <Badge variant="secondary">Co-Instructor</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
