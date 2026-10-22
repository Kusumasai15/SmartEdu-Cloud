"use client";

import React, { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Users,
  Building2,
  Calendar,
  ArrowRight,
  Bell,
  CheckCircle2,
  X,
  Radio,
  Plus,
  Layers,
  Sparkles,
  Award,
  Clock,
  ShieldCheck,
  Database,
  DoorOpen,
  BarChart3,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";

interface AdminOverviewTabProps {
  adminName: string;
  stats: any;
  totalUsers: number;
  activeSessions: number;
  systemUptime: string;
  onSelectTab: (tabId: string) => void;
}

export function AdminOverviewTab({
  adminName,
  stats,
  totalUsers,
  activeSessions,
  systemUptime,
  onSelectTab,
}: AdminOverviewTabProps) {
  const {
    courses,
    modules,
    quizzes,
    assignments,
    submissions,
    terms,
    schools,
    departments,
    classrooms,
    calendarSchedules,
    users,
    attendanceSessions,
    attendanceWindowHours,
    dispatchCampusAlert,
    broadcastNotice,
    campusAlert,
    dismissCampusAlert,
  } = useAcademicData();

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("Official Academic Notice");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDispatchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    const title = noticeTitle.trim() || "Official Academic Notice";
    const content = broadcastMessage.trim();

    setPublishing(true);
    setPublishError(null);
    try {
      await apiClient.post("/announcements", { title, content, scope_type: "INSTITUTION", priority: "NORMAL", publish_now: true });
      setIsNoticeModalOpen(false);
      showToast("University notice published.");
      setBroadcastMessage("");
      setNoticeTitle("");
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Notice could not be published.");
    } finally { setPublishing(false); }
  };

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const attendancePresent = attendanceSessions.reduce((total, session) => total + session.presentCount, 0);
  const attendanceMarked = attendanceSessions.reduce((total, session) => total + session.totalCount, 0);
  const totalGradedSubmissions = submissions.filter((s) => s.status === "GRADED").length;
  const activeTerm = terms.find((t) => t.status === "Active") || terms[0];

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3.5 bg-white text-slate-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active Campus Broadcast Banner */}
      {campusAlert && (
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-900 dark:text-slate-100">
          <div className="flex items-center gap-2.5 font-semibold">
            <Radio className="h-4 w-4 text-slate-900 dark:text-slate-100 animate-pulse shrink-0" />
            <span>NOTICE: {campusAlert}</span>
          </div>
          <button
            onClick={() => {
              dismissCampusAlert();
              showToast("Notice cleared.");
            }}
            className="px-3 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-[#F8FAFD] dark:hover:bg-slate-600 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── PROFESSIONAL LUMINOUS UNIVERSITY LMS ADMIN HERO BANNER (Image 5 Style) ─── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-50/90 via-sky-50/80 to-indigo-50/50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-200/70 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl z-10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{(() => { const h = new Date().getHours(); if (h >= 4 && h < 12) return "Good Morning,"; if (h >= 12 && h < 17) return "Good Afternoon,"; if (h >= 17 && h < 22) return "Good Evening,"; return "Good Night,"; })()}</span>
            <span className="text-base">👋</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Administrator
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
            Manage your institution&apos;s academic ecosystem — users, courses, examinations, and system operations from one unified platform.
          </p>

          <div className="pt-2 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onSelectTab("users")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Manage Users</span>
            </button>

            <button
              onClick={() => onSelectTab("courses")}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Create Course</span>
            </button>

            <button
              onClick={() => onSelectTab("analytics")}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>View Reports</span>
            </button>

            <button
              onClick={() => onSelectTab("timetable")}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Class Timetable</span>
            </button>
          </div>
        </div>

        {/* Right Column: Mission Quote Card (Image 5 Style) */}
        <div className="hidden lg:flex flex-col justify-center items-end text-right z-10 pl-6 border-l border-blue-200/50 dark:border-slate-800/80 max-w-xs shrink-0">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-blue-100 dark:border-slate-700 shadow-2xs space-y-1.5">
            <p className="text-xs italic font-medium text-slate-700 dark:text-slate-200 leading-snug">
              &ldquo;Empowering Education Through Better Management&rdquo;
            </p>
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
              SmartEdu Institutional Cloud
            </p>
          </div>
        </div>

        {/* Decorative soft atmospheric shapes */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-sky-200/25 dark:bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ─── 5 TOP LMS KPI TILES (Schools, Departments, Courses, Students, Classrooms) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Schools */}
        <button
          onClick={() => onSelectTab("departments")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border border-[#EAEFF5] dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#717C9B]">Schools</span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#582C64] dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-[#1E2438] dark:text-white font-mono block">
              {schools.length} Schools
            </span>
            <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 block mt-0.5">
              Constituent colleges
            </span>
          </div>
        </button>

        {/* 2. Departments */}
        <button
          onClick={() => onSelectTab("departments")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border border-[#EAEFF5] dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-[#16A34A]/40 transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#717C9B]">Departments</span>
            <div className="h-9 w-9 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-[#1E2438] dark:text-white font-mono block">
              {departments.length} Depts
            </span>
            <span className="text-[10px] font-medium text-[#16A34A] block mt-0.5">
              College structure
            </span>
          </div>
        </button>

        {/* 3. Courses */}
        <button
          onClick={() => onSelectTab("courses")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border border-[#EAEFF5] dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#717C9B]">Courses</span>
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-[#1E2438] dark:text-white font-mono block">
              {courses.length} Courses
            </span>
            <span className="text-[10px] font-medium text-slate-900 dark:text-slate-100 block mt-0.5">
              {modules.length} Sections active
            </span>
          </div>
        </button>

        {/* 4. Students */}
        <button
          onClick={() => onSelectTab("admissions")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border border-[#EAEFF5] dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-[#0284C7]/40 transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#717C9B]">Students</span>
            <div className="h-9 w-9 rounded-xl bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-[#1E2438] dark:text-white font-mono block">
              {users.filter((u: any) => u.role === "STUDENT").length} Students
            </span>
            <span className="text-[10px] font-medium text-[#0284C7] block mt-0.5">
              Admissions
            </span>
          </div>
        </button>

        {/* 5. Classrooms & Halls (Real-Time Vacancy Tracker) */}
        <button
          onClick={() => onSelectTab("rooms")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border border-[#EAEFF5] dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-amber-400/60 transition-all group flex flex-col justify-between cursor-pointer col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#717C9B]">Classrooms</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <DoorOpen className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-[#1E2438] dark:text-white font-mono block">
              {classrooms.length} Rooms
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              ⚡ Free Slot Checker
            </span>
          </div>
        </button>
      </div>

            {/* INSTITUTIONAL EVENT ATTENDANCE BANNER */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950/30 border border-blue-500/20 dark:border-blue-800/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Campus Function & On-Duty (OD) Management</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Mass Event Attendance Credit Suite</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Grant official attendance for hackathons, symposiums, sports fests, and university functions by entering roll numbers manually or uploading an Excel roster.</p>
        </div>
        <button onClick={() => onSelectTab('event-attendance')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0">
          <CalendarCheck className="h-4 w-4" />
          <span>Launch Event Attendance Suite &rarr;</span>
        </button>
      </div>

      {/* ─── QUICK CLASSROOM VACANCY & FREE SLOT CHECKER BANNER ─── */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:via-teal-950/10 border border-emerald-500/20 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Live Campus Infrastructure Telemetry
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Classroom &amp; Lecture Hall Vacancy Tracker
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Check which classrooms are vacant or in-session across all campus buildings for any chosen time slot.
          </p>
        </div>

        <button
          onClick={() => onSelectTab("rooms")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <DoorOpen className="h-4 w-4" />
          <span>Open Real-Time Slot Checker →</span>
        </button>
      </div>

      {/* ─── INSTITUTION-WIDE CLASS ATTENDANCE COMPARISON & 48H POLICY STATUS ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-blue-100 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-blue-100 dark:border-slate-800 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Institution-Wide Class Attendance &amp; Policy Status</span>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                  Update window: {attendanceWindowHours} hours
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time class roll call compliance and cross-department attendance comparison.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab("policies")}
              className="btn-saas-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
              <span>Configure Grace Period ({attendanceWindowHours}h)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 rounded-lg border border-blue-100 dark:border-slate-800 bg-blue-50/40 dark:bg-slate-950/50 divide-y md:divide-y-0 md:divide-x divide-blue-100 dark:divide-slate-800 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Total Class Sessions</span>
            <p className="text-2xl font-bold font-mono text-slate-950 dark:text-white">{attendanceSessions.length} Conducted</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Recorded attendance sessions</span>
          </div>

          <div className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Recorded Attendance</span>
            <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">{attendanceMarked > 0 ? `${Math.round((attendancePresent / attendanceMarked) * 100)}%` : "No data"}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">{attendanceMarked > 0 ? `${attendancePresent} of ${attendanceMarked} marked present` : "No attendance has been recorded"}</span>
          </div>

          <div className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Faculty Lock Grace Window</span>
            <p className="text-2xl font-bold font-mono text-slate-950 dark:text-white">{attendanceWindowHours} Hours</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Automatic lock after deadline</span>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-[#EAEFF5] dark:border-slate-800 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEFF5] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                <h3 className="font-bold text-sm text-[#1E2438] dark:text-white">Send Campus Notice</h3>
              </div>
              <button onClick={() => setIsNoticeModalOpen(false)} className="text-[#9AA3B8] hover:text-[#1E2438] dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchBroadcast} className="space-y-4 text-xs">
              {publishError && <p role="alert" className="text-sm text-red-600">{publishError}</p>}
              <div>
                <label className="font-semibold text-[#1E2438] dark:text-slate-200 block mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g., Mid-Term Examination Schedule or Campus Update"
                  className="w-full p-2.5 rounded-xl border border-[#EAEFF5] dark:border-slate-700 bg-[#F8FAFD] dark:bg-slate-800 text-[#1E2438] dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <p className="text-sm text-muted-foreground">Audience: all active university accounts</p>

              <div>
                <label className="font-semibold text-[#1E2438] dark:text-slate-200 block mb-1">Notice Message</label>
                <textarea
                  rows={4}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Write the full broadcast notice..."
                  className="w-full p-3 rounded-xl border border-[#EAEFF5] dark:border-slate-700 bg-[#F8FAFD] dark:bg-slate-800 text-[#1E2438] dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAEFF5] dark:border-slate-800">
                <button type="button" onClick={() => setIsNoticeModalOpen(false)} className="btn-saas-secondary text-xs px-4 py-2 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={publishing} className="btn-saas-primary text-xs px-5 py-2 font-bold shadow-xs cursor-pointer disabled:opacity-50">
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
