"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Users,
  Sparkles,
  BookOpen,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { CourseHealthIntelligence, CourseHealthStatus } from "@/types";

interface CourseHealthCardProps {
  data: CourseHealthIntelligence | null;
  loading?: boolean;
}

export const CourseHealthCard: React.FC<CourseHealthCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="big-card p-6 border animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-muted rounded"></div>
        <div className="h-24 w-full bg-muted/60 rounded-xl"></div>
      </div>
    );
  }

  if (!data) return null;

  const getStatusBadge = (status: CourseHealthStatus) => {
    switch (status) {
      case "AT_RISK":
        return { bg: "bg-red-500/10 text-red-600 border-red-500/30", icon: ShieldAlert, label: "Course At Risk" };
      case "WATCH":
        return { bg: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: AlertTriangle, label: "Watchlist Course" };
      default:
        return { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: ShieldCheck, label: "Healthy Course" };
    }
  };

  const statusBadge = getStatusBadge(data.health_status);
  const StatusIcon = statusBadge.icon;

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
              {data.course_code} • {data.semester_name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {data.total_enrolled} Enrolled Students
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {data.course_name} — Health &amp; Intelligence
          </h2>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${statusBadge.bg}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{statusBadge.label} (Score: {data.health_score}/100)</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Class Pass Rate</span>
          <span className="text-2xl font-black text-primary font-mono">{data.pass_rate.toFixed(1)}%</span>
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Class Average</span>
          <span className="text-2xl font-black text-foreground font-mono">{data.class_average_percentage.toFixed(1)}%</span>
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Avg Attendance</span>
          <span className={`text-2xl font-black font-mono ${data.average_attendance < 75 ? "text-destructive" : "text-emerald-600"}`}>
            {data.average_attendance.toFixed(1)}%
          </span>
        </div>
        <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">At-Risk Students</span>
          <span className={`text-2xl font-black font-mono ${data.at_risk_students_count > 0 ? "text-amber-600" : "text-foreground"}`}>
            {data.at_risk_students_count}
          </span>
        </div>
      </div>

      {/* Faculty Summary */}
      {data.ai_course_summary && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                Faculty Class Diagnostic
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {data.is_ai_generated ? "Generated Summary" : "Rules-Based Diagnostic"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
            &ldquo;{data.ai_course_summary}&rdquo;
          </p>
        </div>
      )}

      {/* Difficult Topics / Question Insights */}
      {data.difficult_topics.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Curriculum Areas &amp; Difficult Topic Analysis
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {data.difficult_topics.map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">{t.topic_or_module}</span>
                    <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono">{t.assessment_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.recommendation}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <span className="text-muted-foreground">Avg Score: <strong className="text-foreground">{t.average_score_percentage.toFixed(1)}%</strong></span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 font-bold">{t.difficulty_level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
