import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number | string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  badge?: {
    text: string;
    variant?: "default" | "success" | "warning" | "destructive" | "info";
  };
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  badge,
  className,
  onClick,
}: MetricCardProps) {
  const badgeColors = {
    default: "bg-[#F0F2F7] text-[#737A90]",
    success: "bg-emerald-50 text-[#22B573] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80",
    warning: "bg-amber-50 text-[#F4B740] dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80",
    destructive: "bg-rose-50 text-[#E05252] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80",
    info: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between relative overflow-hidden shadow-xs",
        onClick && "cursor-pointer hover:border-[#D4D8E4] hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold text-[#737A90] uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171A2B] dark:text-white font-mono">
            {value}
          </p>
        </div>

        {icon && (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#E8EAF1] dark:border-slate-800 text-xs">
        {subtitle && (
          <span className="text-[11px] text-[#737A90] truncate font-medium">{subtitle}</span>
        )}

        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 font-bold text-[11px]",
              trend.direction === "up" && "text-[#22B573]",
              trend.direction === "down" && "text-[#E05252]",
              trend.direction === "neutral" && "text-[#737A90]"
            )}
          >
            {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
            {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
            {trend.direction === "neutral" && <Minus className="h-3 w-3" />}
            <span>{trend.value}</span>
            {trend.label && <span className="text-[#737A90] font-normal">{trend.label}</span>}
          </div>
        )}

        {badge && (
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide",
              badgeColors[badge.variant || "default"]
            )}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}
