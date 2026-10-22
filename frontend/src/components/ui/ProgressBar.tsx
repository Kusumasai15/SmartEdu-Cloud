import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = "md",
  variant = "default",
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const variantClasses = {
    default: "bg-primary",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    destructive: "bg-rose-500",
    info: "bg-sky-500",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-medium">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && <span className="font-mono text-foreground">{percentage}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-secondary rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={cn("h-full transition-all duration-500 ease-out rounded-full", variantClasses[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  variant = "default",
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const strokeColors = {
    default: "stroke-primary",
    success: "stroke-emerald-500",
    warning: "stroke-amber-500",
    destructive: "stroke-rose-500",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-secondary fill-transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("fill-transparent transition-all duration-500 ease-out", strokeColors[variant])}
        />
      </svg>
      <span className="absolute text-[11px] font-bold font-mono text-foreground">
        {Math.round(value)}%
      </span>
    </div>
  );
}
