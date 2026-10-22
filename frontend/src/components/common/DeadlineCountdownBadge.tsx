"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface DeadlineCountdownBadgeProps {
  dueDate?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function DeadlineCountdownBadge({
  dueDate,
  className = "",
  showIcon = true,
}: DeadlineCountdownBadgeProps) {
  const [timeLeftText, setTimeLeftText] = useState<string>("");
  const [status, setStatus] = useState<"ACTIVE" | "CLOSING_SOON" | "OVERDUE">("ACTIVE");

  useEffect(() => {
    if (!dueDate) {
      setTimeLeftText("No deadline");
      setStatus("ACTIVE");
      return;
    }

    const calculateTimeRemaining = () => {
      let targetTime: number | null = null;

      // Handle relative formats like "Tomorrow, 5:00 PM", "Today", or ISO strings
      const lower = dueDate.toLowerCase().trim();
      if (lower.includes("tomorrow")) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(23, 59, 59, 0);
        targetTime = d.getTime();
      } else if (lower.includes("today")) {
        const d = new Date();
        d.setHours(23, 59, 59, 0);
        targetTime = d.getTime();
      } else {
        const parsed = Date.parse(dueDate);
        if (!isNaN(parsed)) {
          targetTime = parsed;
        } else {
          // Try standard date regex match YYYY-MM-DD
          const match = dueDate.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            targetTime = new Date(`${match[1]}-${match[2]}-${match[3]}T23:59:59`).getTime();
          }
        }
      }

      if (!targetTime) {
        setTimeLeftText(`Due: ${dueDate}`);
        setStatus("ACTIVE");
        return;
      }

      const now = Date.now();
      const diffMs = targetTime - now;

      if (diffMs <= 0) {
        setTimeLeftText("Past Due / Closed");
        setStatus("OVERDUE");
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);

      if (days > 1) {
        setTimeLeftText(`${days}d ${hours}h left`);
        setStatus("ACTIVE");
      } else if (days === 1) {
        setTimeLeftText(`1d ${hours}h left`);
        setStatus("ACTIVE");
      } else if (hours >= 1) {
        setTimeLeftText(`${hours}h ${mins}m left`);
        setStatus("CLOSING_SOON");
      } else {
        setTimeLeftText(`${mins}m left (Closing Soon)`);
        setStatus("CLOSING_SOON");
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 30000);
    return () => clearInterval(interval);
  }, [dueDate]);

  if (!dueDate) return null;

  const colorStyles = {
    ACTIVE: "bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800",
    CLOSING_SOON: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800 animate-pulse",
    OVERDUE: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${colorStyles} ${className}`}
      title={`Deadline: ${dueDate}`}
    >
      {showIcon && (
        status === "OVERDUE" ? (
          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
        ) : (
          <Clock className={`w-3 h-3 shrink-0 ${status === "CLOSING_SOON" ? "text-amber-600" : "text-blue-600"}`} />
        )
      )}
      <span className="font-mono tracking-tight">{timeLeftText}</span>
    </span>
  );
}
