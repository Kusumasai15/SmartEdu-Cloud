"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Award,
  CheckCircle2,
  Calendar,
  Activity,
  Bot,
  Check,
} from "lucide-react";
import { StudentIntelligenceResponse, AcademicRiskLevel, PerformanceTrendDirection } from "@/types";

interface AcademicHealthCardProps {
  data: StudentIntelligenceResponse | null;
  loading?: boolean;
}

export const AcademicHealthCard: React.FC<AcademicHealthCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="saas-card p-6 animate-pulse space-y-4">
        <div className="h-5 w-1/3 bg-muted rounded"></div>
        <div className="h-20 w-full bg-muted/60 rounded-xl"></div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, ai_study_insights, is_ai_generated } = data;

  const getRiskBadge = (level: AcademicRiskLevel) => {
    switch (level) {
      case "CRITICAL":
        return { bg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20", icon: ShieldAlert, label: "Critical Risk" };
      case "HIGH":
        return { bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", icon: AlertTriangle, label: "High Risk" };
      case "MEDIUM":
        return { bg: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20", icon: AlertTriangle, label: "Moderate Risk" };
      default:
        return { bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", icon: ShieldCheck, label: "Low Risk (Optimal)" };
    }
  };

  const getTrendBadge = (trend: PerformanceTrendDirection) => {
    switch (trend) {
      case "IMPROVING":
        return { icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", label: "Improving Trajectory" };
      case "DECLINING":
        return { icon: TrendingDown, color: "text-rose-600 dark:text-rose-400", label: "Declining Trajectory" };
      default:
        return { icon: Minus, color: "text-muted-foreground", label: "Stable Trajectory" };
    }
  };

  const riskBadge = getRiskBadge(profile.risk_level);
  const trendBadge = getTrendBadge(profile.performance_trend);
  const RiskIcon = riskBadge.icon;
  const TrendIcon = trendBadge.icon;

  return (
    <div className="saas-card relative overflow-hidden space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              Academic Intelligence
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Snapshot: {profile.snapshot_date}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance Trajectory &amp; Health Score
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${riskBadge.bg}`}>
            <RiskIcon className="h-3.5 w-3.5" />
            <span>{riskBadge.label} ({profile.risk_score}/100)</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border/70 text-xs font-semibold flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>{profile.academic_standing.replace("_", " ")}</span>
          </div>
        </div>
      </div>

      {/* 4 Performance Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-secondary/50 rounded-xl border border-border/60 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Current GPA</span>
          <p className="text-xl font-extrabold text-foreground font-mono">{profile.current_gpa.toFixed(2)}</p>
          <span className="text-[10px] text-muted-foreground block">Cumulative: {profile.cumulative_gpa.toFixed(2)}</span>
        </div>

        <div className="p-3.5 bg-secondary/50 rounded-xl border border-border/60 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Attendance</span>
          <p className={`text-xl font-extrabold font-mono ${profile.attendance_percentage >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {profile.attendance_percentage}%
          </p>
          <span className="text-[10px] text-muted-foreground block">{profile.attendance_percentage >= 75 ? "Above 75% Threshold" : "Shortage Warning"}</span>
        </div>

        <div className="p-3.5 bg-secondary/50 rounded-xl border border-border/60 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Assignments</span>
          <p className="text-xl font-extrabold text-foreground font-mono">{profile.assignment_completion_rate}%</p>
          <span className="text-[10px] text-muted-foreground block">Completion rate</span>
        </div>

        <div className="p-3.5 bg-secondary/50 rounded-xl border border-border/60 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Exam Average</span>
          <p className="text-xl font-extrabold text-foreground font-mono">{profile.exam_average_percentage}%</p>
          <span className="text-[10px] text-muted-foreground block">Across completed tests</span>
        </div>
      </div>

      {/* Trajectory Description */}
      <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/15 flex items-start gap-3">
        <TrendIcon className={`h-4 w-4 shrink-0 mt-0.5 ${trendBadge.color}`} />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-foreground block">{trendBadge.label}</span>
          <p className="text-muted-foreground leading-relaxed">{profile.trend_description}</p>
        </div>
      </div>

      {/* Risk Factors */}
      {profile.primary_risk_factors && profile.primary_risk_factors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Identified Risk Factors ({profile.primary_risk_factors.length})
          </h4>
          <div className="space-y-2">
            {profile.primary_risk_factors.map((rf, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-card border border-border/70 flex items-start gap-2.5 text-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{rf.factor_name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted font-bold">{rf.severity}</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{rf.reason} (Value: {rf.metric_value})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Guidance Box */}
      {ai_study_insights && (
        <div className="p-4 rounded-xl ai-gradient-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Study Guidance Advisory
            </span>
            {is_ai_generated && (
              <span className="text-[10px] text-muted-foreground font-mono bg-card px-2 py-0.5 rounded border border-border/60">
                Advisory Only
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed italic">
            &ldquo;{ai_study_insights}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};
