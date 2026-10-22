"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: string; isPositive?: boolean };
  isLoading?: boolean;
  className?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  isLoading = false,
  className,
  delay = 0,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn("big-card space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="shimmer-line h-3 w-28 rounded-full" />
          <div className="shimmer-line h-10 w-10 rounded-xl" />
        </div>
        <div className="shimmer-line h-8 w-24 rounded-lg" />
        <div className="shimmer-line h-3 w-36 rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn("big-card cursor-default group relative overflow-hidden", className)}
    >
      {/* Subtle top border accent highlight on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm"
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>

      <div className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
        {value}
      </div>

      {(description || trend) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          {trend && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-md",
                trend.isPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              )}
            >
              {trend.value}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground truncate font-medium">{description}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
