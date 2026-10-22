"use client";

import React from "react";
import { Award, BookOpen, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { OfficialStudentTranscript } from "@/types";

interface ResultSummaryCardProps {
  transcript: OfficialStudentTranscript | null;
  loading?: boolean;
}

export const ResultSummaryCard: React.FC<ResultSummaryCardProps> = ({ transcript, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200" />
        ))}
      </div>
    );
  }

  if (!transcript) {
    return null;
  }

  const standingColor =
    transcript.academic_standing === "DEAN_LIST"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : transcript.academic_standing === "PROBATION"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* CGPA */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cumulative GPA (CGPA)</span>
          <Award className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900">{transcript.cumulative_gpa.toFixed(2)}</span>
          <span className="text-sm font-medium text-slate-400">/ 10.0</span>
        </div>
        <div className="mt-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${standingColor}`}>
            {transcript.academic_standing.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Credits Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Credits Earned</span>
          <BookOpen className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900">{transcript.total_credits_earned}</span>
          <span className="text-sm font-medium text-slate-400">/ {transcript.total_credits_registered} registered</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Earned: {transcript.total_credits_registered > 0 ? ((transcript.total_credits_earned / transcript.total_credits_registered) * 100).toFixed(0) : 0}% completion
        </p>
      </div>

      {/* Courses Passed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Courses Passed</span>
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900">{transcript.total_courses_passed}</span>
          <span className="text-sm font-medium text-slate-400">courses</span>
        </div>
        <p className="mt-2 text-xs text-emerald-600 font-medium">All prerequisite credits fulfilled</p>
      </div>

      {/* Backlogs / Failed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Backlogs</span>
          <AlertTriangle className={`w-5 h-5 ${transcript.total_courses_failed > 0 ? "text-rose-600" : "text-slate-400"}`} />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-extrabold ${transcript.total_courses_failed > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {transcript.total_courses_failed}
          </span>
          <span className="text-sm font-medium text-slate-400">failed</span>
        </div>
        <p className={`mt-2 text-xs ${transcript.total_courses_failed > 0 ? "text-rose-600 font-medium" : "text-slate-500"}`}>
          {transcript.total_courses_failed > 0 ? "Requires re-registration" : "Clear academic record"}
        </p>
      </div>
    </div>
  );
};
