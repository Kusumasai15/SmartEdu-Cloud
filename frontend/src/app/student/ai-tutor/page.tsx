"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { StudentAiTutorView } from "@/components/student/StudentAiTutorView";

export default function AiTutorPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT", "ADMINISTRATOR", "FACULTY"]}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
            UniFlow AI Tutor Copilot
          </span>
        </div>

        <StudentAiTutorView />
      </div>
    </RoleGuard>
  );
}
