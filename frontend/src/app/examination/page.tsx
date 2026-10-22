"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { ExamOverviewTab } from "@/components/examination/ExamOverviewTab";
import { ExamScheduleTab } from "@/components/examination/ExamScheduleTab";
import { ExamSeatingTab } from "@/components/examination/ExamSeatingTab";
import { ExamHallTicketsTab } from "@/components/examination/ExamHallTicketsTab";
import { ExamQuestionPaperTab } from "@/components/examination/ExamQuestionPaperTab";
import { ExamEvaluationTab } from "@/components/examination/ExamEvaluationTab";

export default function ExaminationPortalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab") || "overview";

  // Normalize tab aliases
  const normalizedTab = useMemo(() => {
    const t = rawTab.toLowerCase().trim();
    if (t === "monitoring" || t === "proctoring") return "overview";
    if (t === "papers" || t === "question-bank") return "question-bank";
    if (t === "schedules" || t === "schedule") return "schedules";
    if (t === "evaluations" || t === "evaluation" || t === "results" || t === "grades") return "evaluations";
    if (t === "hall-tickets" || t === "halltickets") return "hall-tickets";
    if (t === "seating") return "seating";
    return "overview";
  }, [rawTab]);

  const [activeTab, setActiveTab] = useState<string>(normalizedTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(normalizedTab);
  }, [normalizedTab]);

  const handleNavigateTab = (targetTab: string) => {
    setActiveTab(targetTab);
    router.push(`/examination?tab=${targetTab}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <RoleGuard allowedRoles={["EXAMINATION", "ADMINISTRATOR", "HOD", "FACULTY"]}>
      <div className="space-y-6">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-xs font-semibold text-slate-800 shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Clean operational tabs driven directly by the sidebar */}
        {activeTab === "overview" && (
          <ExamOverviewTab
            onNavigateTab={handleNavigateTab}
            showToast={showToast}
          />
        )}

        {activeTab === "schedules" && (
          <ExamScheduleTab showToast={showToast} />
        )}

        {activeTab === "seating" && (
          <ExamSeatingTab showToast={showToast} />
        )}

        {activeTab === "hall-tickets" && (
          <ExamHallTicketsTab showToast={showToast} />
        )}

        {activeTab === "question-bank" && (
          <ExamQuestionPaperTab showToast={showToast} />
        )}

        {activeTab === "evaluations" && (
          <ExamEvaluationTab showToast={showToast} />
        )}
      </div>
    </RoleGuard>
  );
}
