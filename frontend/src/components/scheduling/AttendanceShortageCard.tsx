"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  BookOpen,
  Info,
} from "lucide-react";
import { StudentAttendanceShortageReportItem } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AttendanceShortageCard() {
  const [report, setReport] = useState<StudentAttendanceShortageReportItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShortage = async () => {
      setLoading(true);
      try {
        const resp = await fetchApi<StudentAttendanceShortageReportItem>("/scheduling-analytics/shortage/me");
        if (resp.success && resp.data) {
          setReport(resp.data);
        }
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    };
    loadShortage();
  }, []);

  if (loading) {
    return <div className="h-28 bg-muted/40 rounded-xl animate-pulse" />;
  }

  if (!report || report.shortage_courses.length === 0) {
    return null;
  }

  const shortageCourses = report.shortage_courses.filter((c) => c.is_shortage);

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 via-background to-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {report.has_any_shortage ? (
              <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            <CardTitle className="text-base font-bold text-foreground">
              Attendance Shortage &amp; Recovery Intelligence
            </CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={
              report.has_any_shortage
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold"
                : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold"
            }
          >
            Overall: {report.overall_attendance_pct}%
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Deterministic mathematical projections showing exact sessions required to maintain 75% exam eligibility.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {shortageCourses.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>All enrolled courses currently satisfy the mandatory 75% attendance requirement. You are fully eligible for semester examinations!</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shortageCourses.map((c) => (
              <div
                key={c.course_id}
                className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {c.course_code}: {c.course_name}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {c.current_attendance_pct}% ({c.sessions_attended}/{c.total_sessions_conducted})
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card p-2.5 rounded-lg border">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Recovery Guidance: </span>
                    {c.recovery_guidance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
