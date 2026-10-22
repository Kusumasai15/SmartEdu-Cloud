"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  ShieldAlert,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Award,
  Activity,
} from "lucide-react";
import { DepartmentIntelligenceResponse, AcademicRiskLevel } from "@/types";

interface DepartmentIntelligenceViewProps {
  data: DepartmentIntelligenceResponse | null;
  loading?: boolean;
}

export const DepartmentIntelligenceView: React.FC<DepartmentIntelligenceViewProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="big-card p-6 border animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-muted rounded"></div>
        <div className="h-32 w-full bg-muted/60 rounded-xl"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="big-card border-2 space-y-6 bg-card"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
              Department Academic Intelligence
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {data.total_students} Students • {data.total_courses} Courses
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {data.department_name} — Academic Health &amp; Early-Warning Roster
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span>{data.at_risk_students_count} At-Risk Students</span>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Dept Average GPA</span>
          <span className="text-2xl font-black text-primary font-mono">{data.department_average_gpa.toFixed(2)}</span>
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Dept Pass Rate</span>
          <span className="text-2xl font-black text-foreground font-mono">{data.department_pass_rate.toFixed(1)}%</span>
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Avg Attendance</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">{data.department_average_attendance.toFixed(1)}%</span>
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Critical Warnings</span>
          <span className="text-2xl font-black text-red-600 font-mono">{data.critical_risk_count}</span>
        </div>
      </div>

      {/* Early-Warning At-Risk Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            Early-Warning Action Roster ({data.at_risk_roster.length})
          </h3>
          <span className="text-[11px] text-muted-foreground">Department Advising Priority</span>
        </div>

        {data.at_risk_roster.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-muted/20 border border-dashed text-xs text-muted-foreground">
            No students currently flagged in High or Critical risk categories. Department academic health is optimal.
          </div>
        ) : (
          <div className="space-y-2">
            {data.at_risk_roster.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-border/80 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">{s.student_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({s.student_identifier})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.risk_level === "CRITICAL" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {s.risk_level} (Score: {s.risk_score.toFixed(0)})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {s.primary_reasons.map((r, ri) => (
                      <span key={ri} className="bg-muted/50 px-2 py-0.5 rounded text-[10px]">• {r}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <span className="text-muted-foreground">GPA: <strong className="text-foreground">{s.current_gpa.toFixed(2)}</strong></span>
                  <span className="text-muted-foreground">Att: <strong className={s.attendance_percentage < 75 ? "text-destructive" : "text-emerald-600"}>{s.attendance_percentage.toFixed(1)}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
