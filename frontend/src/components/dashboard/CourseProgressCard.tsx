"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, User, ArrowRight, Clock, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/smartedu/StatusBadge";
import { StudentEnrollment } from "@/types";

export interface CourseProgressCardProps {
  enrollment: StudentEnrollment;
  attendancePercentage?: number;
  className?: string;
}

export function CourseProgressCard({
  enrollment,
  attendancePercentage = 100,
  className,
}: CourseProgressCardProps) {
  return (
    <div className={cn("saas-card flex flex-col justify-between group", className)}>
      <div className="space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold font-mono">
              {enrollment.course_code}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {enrollment.credits} Credits
            </span>
          </div>

          <StatusBadge status={enrollment.status} />
        </div>

        {/* Course Title */}
        <div>
          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {enrollment.course_name}
          </h3>
          {enrollment.department_code && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              Department of {enrollment.department_code} • {enrollment.semester_name || "Active Term"}
            </p>
          )}
        </div>

        {/* Progress & Attendance Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Term</span>
              <span className="font-mono text-xs font-semibold text-foreground truncate">{enrollment.semester_name || "Fall 2026"}</span>
            </div>
            <ProgressBar value={100} size="sm" showPercentage={false} variant="default" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Attendance</span>
              <span
                className={cn(
                  "font-mono font-bold",
                  attendancePercentage >= 75
                    ? "text-emerald-600 dark:text-emerald-400"
                    : attendancePercentage >= 65
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {attendancePercentage}%
              </span>
            </div>
            <ProgressBar
              value={attendancePercentage}
              size="sm"
              showPercentage={false}
              variant={
                attendancePercentage >= 75
                  ? "success"
                  : attendancePercentage >= 65
                  ? "warning"
                  : "destructive"
              }
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          Learning Modules
        </span>

        <Link
          href={`/courses/${enrollment.course_id}/learn`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>Continue</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
