import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  badge,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60 mb-5", className)}>
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
