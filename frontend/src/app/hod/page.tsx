"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  RefreshCw,
  Users,
  BookOpen,
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  X,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  FileCheck,
  LayoutDashboard,
  Layers,
  MessageSquare,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { LeadershipOverview } from "@/types";
import { HodCoursesTab } from "@/components/hod/HodCoursesTab";
import { HodStudentLeaveApprovals } from "@/components/hod/HodStudentLeaveApprovals";
import { PeopleDirectory } from "@/components/leadership/PeopleDirectory";
import { ResultReviewTab } from "@/components/leadership/ResultReviewTab";
import { ScheduleTable } from "@/components/leadership/ScheduleTable";
import { AttendanceRequests } from "@/components/leadership/AttendanceRequests";
import { LmsModuleBuilder } from "@/components/lms/LmsModuleBuilder";
import { FacultyModuleFeedbackView } from "@/components/faculty/FacultyModuleFeedbackView";
import { PredictiveAtRiskInterventionView } from "@/components/intelligence/PredictiveAtRiskInterventionView";
import { HodDepartmentAnalyticsView } from "@/components/hod/HodDepartmentAnalyticsView";
import { CardGridSkeleton } from "@/components/smartedu/LoadingSkeleton";

function HodDashboardContent() {
  const { user } = useAuth();
  const { studentLeaves, departments } = useAcademicData();
  const router = useRouter();
  const params = useSearchParams();
  const requested = (params.get("tab") || "overview").toLowerCase().replace(/[\s_]+/g, "-");
  const activeTab = requested;
  const departmentId = user?.department_id || user?.department?.id;
  const departmentName = (user?.department as any)?.name || (typeof user?.department === "string" ? user?.department : "") || "Department";

  const currentDept = departments.find(
    (d) =>
      d.id === departmentId ||
      d.name.toLowerCase() === departmentName.toLowerCase() ||
      d.code.toLowerCase() === departmentName.toLowerCase()
  );

  const pendingHodLeavesCount = (studentLeaves || []).filter((l) => l.status === "PENDING_HOD").length;

  const { data, error, loading, refresh } = useApiResource<LeadershipOverview>(
    user?.role?.name === "HOD" || (user as any)?.role === "HOD" ? "/leadership/overview" : null
  );

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = (tab: string) => router.push(`/hod?tab=${tab}`);

  const publishNotice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setNoticeError(null);
    setMessage(null);
    try {
      await apiClient.post("/announcements", {
        title: String(fields.get("title")).trim(),
        content: String(fields.get("content")).trim(),
        scope_type: "DEPARTMENT",
        scope_id: departmentId,
        priority: "NORMAL",
        publish_now: true,
      });
      setNoticeOpen(false);
      setMessage("✓ Department notice published successfully to students and faculty.");
      setTimeout(() => setMessage(null), 4000);
    } catch (cause) {
      setNoticeError(cause instanceof Error ? cause.message : "Notice could not be published.");
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    {
      label: "Enrolled Students",
      value: data?.totals.students,
      tab: "students",
      icon: GraduationCap,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40",
      description: "Active degree candidates",
    },
    {
      label: "Department Faculty",
      value: data?.totals.faculty,
      tab: "faculty",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40",
      description: "Full-time professors & lecturers",
    },
    {
      label: "Active Courses",
      value: data?.totals.courses,
      tab: "courses",
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40",
      description: "Semester syllabus curricula",
    },
    {
      label: "Results to Review",
      value: data?.totals.pending_result_courses ?? 0,
      tab: "approvals",
      icon: Award,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40",
      description: "Pending grade authorizations",
    },
    {
      label: "Student OD & Leaves",
      value: pendingHodLeavesCount,
      tab: "student-leaves",
      icon: FileCheck,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40",
      description: pendingHodLeavesCount > 0 ? `${pendingHodLeavesCount} pending your sanction` : "All requests sanctioned",
    },
  ];

  return (
    <RoleGuard allowedRoles={["HOD"]}>
      <div className="min-w-0 space-y-6 pb-16">
        {/* Executive Header Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xs bg-gradient-to-r from-blue-50/40 via-slate-50/20 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="space-y-2 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[11px] font-bold text-blue-700 dark:text-blue-300 tracking-wide border border-blue-200/80 dark:border-blue-900/60">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Department Head Academic Governance &bull; {currentDept?.code || "DEPT"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {departmentName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Executive departmental command for syllabus delivery, student leave sanctions, continuous modular feedback, and semester grade authorization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
            <button
              onClick={() => void refresh()}
              title="Refresh records"
              aria-label="Refresh records"
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setNoticeOpen(!noticeOpen)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span>Post Department Notice</span>
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 font-bold">
            {error}
          </p>
        )}

        {message && (
          <div role="status" className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Post Notice Form Modal */}
        {noticeOpen && (
          <form onSubmit={publishNotice} className="space-y-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <span>Post Department Notice</span>
              </h2>
              <button type="button" onClick={() => setNoticeOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {noticeError && (
              <p role="alert" className="text-xs font-bold text-rose-600">
                {noticeError}
              </p>
            )}

            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Notice Title
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. Schedule for 5th Semester Lab Practical Submissions"
                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Notice Content
              <textarea
                name="content"
                required
                rows={4}
                placeholder="Type your official announcement here..."
                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white leading-relaxed"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving ? "Publishing..." : "Publish Notice"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setNoticeOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ─── TAB CONTENTS (No duplicated horizontal header; navigates via sidebar or cards) ─── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
              {stats.map((stat) => (
                <button
                  key={stat.tab}
                  onClick={() => navigate(stat.tab)}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 text-left shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <span className="mt-3.5 block text-xs font-semibold text-slate-500">
                    {stat.label}
                  </span>
                  <strong className="mt-0.5 block text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {stat.value === undefined ? (loading ? "..." : "Not available") : stat.value.toLocaleString()}
                  </strong>
                  <span className="mt-1 block text-[11px] text-slate-400 font-medium">
                    {stat.description}
                  </span>
                </button>
              ))}
            </div>

            {/* Department Syllabus & Course Academic Analytics */}
            <HodDepartmentAnalyticsView
              overview={data}
              departmentName={data?.departments?.find(d => d.id === departmentId)?.name || "Computer Science & Engineering"}
            />

            {/* Course Results Review Table */}
            {data && (
              <ResultReviewTab
                results={data.result_courses.filter((result) => result.status !== "PUBLISHED")}
                onChanged={refresh}
              />
            )}

            {/* Department Schedule Table */}
            <ScheduleTable />
          </div>
        )}

        {activeTab === "courses" && departmentId && <HodCoursesTab departmentId={departmentId} />}
        {activeTab === "modules" && <LmsModuleBuilder />}
        {(activeTab === "module-feedback" || activeTab === "feedback") && <FacultyModuleFeedbackView />}
        {activeTab === "at-risk" && <PredictiveAtRiskInterventionView />}
        {activeTab === "approvals" && (
          loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold animate-pulse">Loading department results...</div>
          ) : (
            data && <ResultReviewTab results={data.result_courses} onChanged={refresh} />
          )
        )}
        {(activeTab === "student-leaves" || activeTab === "leaves") && <HodStudentLeaveApprovals />}
        {activeTab === "students" && <PeopleDirectory kind="students" />}
        {activeTab === "faculty" && <PeopleDirectory kind="faculty" />}
        {activeTab === "timetable" && <ScheduleTable />}
        {activeTab === "disputes" && <AttendanceRequests />}
      </div>
    </RoleGuard>
  );
}

export default function HodDashboardPage() {
  return (
    <React.Suspense fallback={<CardGridSkeleton count={4} />}>
      <HodDashboardContent />
    </React.Suspense>
  );
}
