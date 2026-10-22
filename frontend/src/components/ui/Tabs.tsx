"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills" | "contained";
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = "underline",
  className,
}: TabsProps) {
  if (variant === "contained") {
    return (
      <div className={cn("inline-flex items-center gap-1 p-1 bg-secondary/80 rounded-lg border border-border/60", className)}>
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
                isActive
                  ? "bg-card text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              {tab.icon && <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={cn("px-1.5 py-0.2 rounded-full text-[10px] font-mono", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-6 border-b border-border overflow-x-auto no-scrollbar", className)}>
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 shrink-0 transition-all duration-150 relative",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.icon && <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
