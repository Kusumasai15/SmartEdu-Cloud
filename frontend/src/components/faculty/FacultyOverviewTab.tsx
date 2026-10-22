"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  UserCheck,
  ClipboardList,
  ChevronDown,
  ArrowRight,
  Award,
  Upload,
  Plus,
  Clock,
  Sparkles,
  Megaphone,
  FileCode,
  Layers,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  BarChart3,
  ShieldAlert,
  Flame,
  Check,
  TrendingUp,
  AlertCircle,
  Lock,
  CalendarCheck,
  MessageSquare,
} from "lucide-react";
import { FacultyCourse, AnnouncementItem } from "@/types";
import { useAcademicData } from "@/context/AcademicDataContext";
import { DashboardRightSidebar } from "@/components/dashboard/DashboardRightSidebar";
import { FacultyClassroomAnalyticsView } from "@/components/faculty/FacultyClassroomAnalyticsView";

interface FacultyOverviewTabProps {
  facultyName: string;
  courses: FacultyCourse[];
  totalCourses: number;
  totalStudents: number;
  avgAttendance: string;
  announcements: AnnouncementItem[];
  onOpenRosterModal: () => void;
  onOpenAttendanceModal: (courseId?: string) => void;
  onOpenUploadModal: (courseId?: string) => void;
  onOpenCreateAssignmentModal: () => void;
  onOpenBroadcastModal: () => void;
  onOpenComposerModal: () => void;
  onOpenAiGeneratorModal?: () => void;
  onOpenCaseStudyModal?: () => void;
  onOpenQuestionPaperModal?: () => void;
  onSelectCourseForGradebook: (course: FacultyCourse) => void;
}

export function FacultyOverviewTab({
  facultyName,
  courses,
  totalCourses,
  totalStudents,
  avgAttendance,
  announcements,
  onOpenRosterModal,
  onOpenAttendanceModal,
  onOpenUploadModal,
  onOpenCreateAssignmentModal,
  onOpenBroadcastModal,
  onOpenComposerModal,
  onOpenAiGeneratorModal,
  onOpenCaseStudyModal,
  onOpenQuestionPaperModal,
  onSelectCourseForGradebook,
}: FacultyOverviewTabProps) {
  const router = useRouter();
  const {
    submissions,
    calendarSchedules,
    attendanceSessions,
    attendanceWindowHours,
    users,
    isSemesterSeeUnlocked,
    currentSemester,
  } = useAcademicData();

  const pendingSubmissionsCount = submissions.filter((s) => s.status !== "GRADED").length;

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayDateString = now.toISOString().slice(0, 10);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNames[currentDayIndex];

  // 1. Compute Today's Classes & Venues for this Faculty
  const todaysSchedule = useMemo(() => {
    const cleanMyFac = (facultyName || "").toLowerCase().replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
    const myCourseCodes = new Set(
      courses.map((c) => (((c as any).course_code || (c as any).code || "") as string).toLowerCase().trim()).filter(Boolean)
    );

    const todaysEvents = calendarSchedules
      .filter((ev) => {
        if (ev.dayIndex !== currentDayIndex) return false;
        const normEvFac = (ev.faculty || "").toLowerCase().trim();
        const cleanEvFac = normEvFac.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
        const isMyCourse = Boolean(ev.courseCode && myCourseCodes.has(ev.courseCode.toLowerCase().trim()));
        const isMyFac = Boolean(
          cleanMyFac && (
            cleanEvFac.includes(cleanMyFac) ||
            cleanMyFac.includes(cleanEvFac) ||
            (cleanMyFac.split(" ")[0].length >= 3 && cleanEvFac.includes(cleanMyFac.split(" ")[0]))
          )
        );
        return isMyFac || isMyCourse;
      })
      .sort((a, b) => (a.startHour ?? 0) - (b.startHour ?? 0));

    return todaysEvents.map((ev) => {
      // Check if attendance already recorded today for this event/course
      const isRecorded = attendanceSessions.some(
        (s) =>
          Boolean(s.courseCode && ev.courseCode && s.courseCode.toLowerCase() === ev.courseCode.toLowerCase()) &&
          (s.sessionDateRaw === todayDateString || (s.sessionDate || "").includes("Today"))
      );

      // Compute status (Live, Upcoming, Completed, Attendance Taken)
      const parseToMins = (t?: string, fallbackH = 9) => {
        if (!t) return fallbackH * 60;
        const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!m) return fallbackH * 60;
        let h = parseInt(m[1], 10);
        const mins = m[2] ? parseInt(m[2], 10) : 0;
        const mer = m[3]?.toUpperCase();
        if (mer === "PM" && h < 12) h += 12;
        if (mer === "AM" && h === 12) h = 0;
        return h * 60 + mins;
      };

      const startH = ev.startHour ?? 9;
      const durH = ev.durationHours || 1;
      const startMins = parseToMins(ev.startTime, startH);
      const endMins = ev.endTime ? parseToMins(ev.endTime, startH + durH) : startMins + durH * 60;
      const nowMins = currentHour * 60 + currentMinute;

      let status: "LIVE" | "UPCOMING" | "RECORDED" | "OVERDUE" = "UPCOMING";
      if (isRecorded) {
        status = "RECORDED";
      } else if (nowMins >= startMins && nowMins <= endMins) {
        status = "LIVE";
      } else if (nowMins > endMins) {
        status = "OVERDUE";
      }

      return {
        id: ev.id,
        courseCode: ev.courseCode || "",
        courseName: ev.courseName || ev.courseCode || "Class",
        className: ev.className || "",
        section: ev.section || "A",
        startTime: ev.startTime || "09:00",
        endTime: ev.endTime || "10:00",
        startHour: startH,
        room: ev.room || "Room not assigned",
        building: ev.building || "Academic Block",
        lectureTitle: ev.lectureTitle || `Lecture ${ev.lectureNumber || 1}`,
        type: ev.type || "LECTURE",
        colorBadge: ev.colorBadge || "#2563EB",
        isRecorded,
        status,
      };
    });
  }, [calendarSchedules, currentDayIndex, facultyName, courses, attendanceSessions, todayDateString, currentHour, currentMinute]);

  const activeLiveSlot = useMemo(() => {
    return todaysSchedule.find((s) => s.status === "LIVE" && !s.isRecorded) || null;
  }, [todaysSchedule]);

  // 2. Compute Missing Attendance / Overdue Roll Calls (Within the 48-hour Grace Period)
  const missingAttendanceList = useMemo(() => {
    // Find all today's overdue slots or past scheduled slots that don't have attendance
    const overdueToday = todaysSchedule.filter((s) => s.status === "OVERDUE" && !s.isRecorded);

    // Calculate hours remaining for each item
    return overdueToday.map((item) => {
      const slotTime = new Date();
      slotTime.setHours(item.startHour, 0, 0, 0);
      const elapsedMs = Date.now() - slotTime.getTime();
      const totalWindowMs = attendanceWindowHours * 3600 * 1000;
      const remainingMs = Math.max(0, totalWindowMs - elapsedMs);
      const remainingHours = Math.floor(remainingMs / (3600 * 1000));
      const remainingMins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));

      return {
        ...item,
        remainingHours,
        remainingMins,
        isExpiringSoon: remainingHours <= 12,
      };
    });
  }, [todaysSchedule, attendanceWindowHours]);

  // 3. Class Attendance Analytics & Comparison Across Cohorts/Sections
  const classAnalytics = useMemo(() => {
    const studentUsers = users.filter((u) => u.role === "STUDENT");
    const myCourseCodes = new Set(
      courses.map((c) => (((c as any).course_code || (c as any).code || "") as string).toLowerCase().trim()).filter(Boolean)
    );

    // Filter sessions to only those relevant to this faculty's courses
    const relevantSessions = attendanceSessions.filter((s) => {
      const cCode = (s.courseCode || "").toLowerCase().trim();
      return myCourseCodes.size === 0 || myCourseCodes.has(cCode);
    });

    // Group real sessions by class / section
    const sectionGroups: Record<string, { totalPresent: number; totalPossible: number; sessionsCount: number }> = {};

    relevantSessions.forEach((s) => {
      // Exclude unrelated lower-semester test cohorts if faculty teaches higher semester
      const key = s.className || `${s.courseCode} (Sec A)`;
      if (!sectionGroups[key]) {
        sectionGroups[key] = { totalPresent: 0, totalPossible: 0, sessionsCount: 0 };
      }
      sectionGroups[key].totalPresent += s.presentCount || 0;
      sectionGroups[key].totalPossible += s.totalCount || 0;
      sectionGroups[key].sessionsCount += 1;
    });



    const comparison = Object.entries(sectionGroups).map(([sectionName, stats]) => {
      const pct = stats.totalPossible > 0 ? Math.round((stats.totalPresent / stats.totalPossible) * 100) : 100;
      return {
        sectionName,
        pct,
        sessionsCount: stats.sessionsCount,
        isWarning: pct < 75,
      };
    });

    // Students at risk (<75% attendance)
    const atRiskStudents = studentUsers
      .filter((s) => (s as any).historicalAttendancePct && (s as any).historicalAttendancePct < 75)
      .slice(0, 3);

    return {
      comparison,
      atRiskCount: atRiskStudents.length,
      totalSessionsConducted: relevantSessions.length,
      windowHours: attendanceWindowHours,
    };
  }, [attendanceSessions, users, attendanceWindowHours, courses]);

  return (
    <div className="space-y-6">
      {/* Top faculty welcome hero banner (Professional Luminous University LMS Design) */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-50/90 via-sky-50/80 to-indigo-50/50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-200/70 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl z-10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Good {currentHour < 12 ? "Morning" : currentHour < 17 ? "Afternoon" : "Evening"},</span>
            <span className="text-base">👋</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {(facultyName || "").startsWith("Prof.") || (facultyName || "").startsWith("Dr.") ? (facultyName || "Faculty Member") : `Prof. ${facultyName || "Faculty Member"}`}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
            Manage your classes, track student progress, create assessments and stay connected with your academic community.
          </p>

          <div className="pt-2 flex items-center gap-2.5 flex-wrap">
            {activeLiveSlot && (
              <button
                onClick={() =>
                  router.push(
                    `/faculty/attendance/take?courseCode=${encodeURIComponent(activeLiveSlot.courseCode)}&topic=${encodeURIComponent(
                      activeLiveSlot.lectureTitle
                    )}`
                  )
                }
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Take Attendance ({activeLiveSlot.courseCode})</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            )}

            {onOpenAiGeneratorModal && (
              <button
                onClick={onOpenAiGeneratorModal}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Create Quiz &amp; Notes</span>
              </button>
            )}

            {onOpenCaseStudyModal && (
              <button
                onClick={onOpenCaseStudyModal}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI Case Study</span>
              </button>
            )}

            <button
              onClick={onOpenBroadcastModal}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Megaphone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Post Notice</span>
            </button>

            {onOpenQuestionPaperModal && (
              <button
                onClick={onOpenQuestionPaperModal}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Upload Question Paper</span>
              </button>
            )}

            <button
              onClick={() => router.push("/faculty?tab=modules")}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Course Modules</span>
            </button>

            <button
              onClick={() => router.push("/faculty?tab=module-feedback")}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Module Feedback</span>
            </button>

            <button
              onClick={() => router.push("/faculty?tab=consultations")}
              className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <CalendarCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>1:1 Consultations</span>
            </button>
          </div>
        </div>

        {/* Right Column: Academic Quote Card (Image 1 Style) */}
        <div className="hidden lg:flex flex-col justify-center items-end text-right z-10 pl-6 border-l border-blue-200/50 dark:border-slate-800/80 max-w-xs shrink-0">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-blue-100 dark:border-slate-700 shadow-2xs space-y-1.5">
            <p className="text-xs italic font-medium text-slate-700 dark:text-slate-200 leading-snug">
              &ldquo;Education is not preparation for life; education is life itself.&rdquo;
            </p>
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
              — John Dewey
            </p>
          </div>
        </div>

        {/* Decorative soft atmospheric shapes */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-sky-200/25 dark:bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 4 Interactive Stat Tiles (Unified Blue/Slate Corporate Design) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Assigned Courses */}
        <button
          onClick={() => {
            const el = document.getElementById("courses-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all group flex items-center justify-between cursor-pointer min-h-[95px]"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">My Courses</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono block">{totalCourses}</span>
              <span className="text-[11px] text-slate-400 block">Active courses</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Card 2: Enrolled Students */}
        <button
          onClick={onOpenRosterModal}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all group flex items-center justify-between cursor-pointer min-h-[95px]"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Students</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono block">{totalStudents}</span>
              <span className="text-[11px] text-slate-400 block">In your classes</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Card 3: Avg Attendance */}
        <button
          onClick={() => router.push("/faculty?tab=attendance")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all group flex items-center justify-between cursor-pointer min-h-[95px]"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Attendance</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono block">{avgAttendance}</span>
              <span className="text-[11px] text-slate-400 block">Class average</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Card 4: Grading Queue */}
        <button
          onClick={() => router.push("/faculty?tab=speedgrader")}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all group flex items-center justify-between cursor-pointer min-h-[95px]"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Submissions</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono block">
                {pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} Pending` : "0 Pending"}
              </span>
              <span className="text-[11px] text-slate-400 block">Awaiting grading</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* ─── CLASSROOM ANALYTICS & TEACHING DELIVERY ─── */}
      <FacultyClassroomAnalyticsView
        courses={courses}
        facultyName={facultyName}
      />

      {/* ─── TODAY'S TEACHING SCHEDULE & CLASSROOM VENUES (Real-Time Live Tracker) ─── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEFF5] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAEFF5] pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E2438] flex items-center gap-2">
                <span>Today&apos;s Class Schedule &amp; Venues</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {currentDayName}, {now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </h2>
              <p className="text-xs text-[#717C9B]">
                Know where your classes are scheduled and record attendance on time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/faculty?tab=timetable"
              className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:underline inline-flex items-center gap-1"
            >
              <span>Full Week Timetable</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {todaysSchedule.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8E0EA] bg-[#F8FAFD] p-6 text-center space-y-2">
            <Clock className="h-7 w-7 mx-auto text-[#717C9B]" />
            <p className="text-xs font-bold text-[#1E2438]">No Teaching Slots Scheduled for Today</p>
            <p className="text-[11px] text-[#717C9B]">
              You have no assigned lectures or labs on {currentDayName}. Check your full timetable for other days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysSchedule.map((slot) => {
              const isRecorded = slot.isRecorded;
              const isLive = slot.status === "LIVE";
              const isOverdue = slot.status === "OVERDUE" && !isRecorded;

              return (
                <div
                  key={slot.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 relative ${
                    isLive
                      ? "bg-red-50/40 border-red-300 shadow-sm ring-2 ring-red-400/20"
                      : isOverdue
                      ? "bg-amber-50/40 border-amber-300"
                      : isRecorded
                      ? "bg-emerald-50/30 border-emerald-200"
                      : "bg-[#F8FAFD] border-[#EAEFF5] hover:border-slate-400"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#EAEFF5] text-[#1E2438] shadow-2xs">
                        {slot.courseCode}
                      </span>

                      {/* Status Badges */}
                      {isRecorded ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>Attendance Recorded</span>
                        </span>
                      ) : isLive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                          <span>LIVE NOW</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Roll Call Pending</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Upcoming</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#1E2438] line-clamp-1">{slot.courseName}</h3>
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{slot.className}</p>
                    </div>

                    {/* Venue & Room Details */}
                    <div className="bg-white rounded-xl p-2.5 border border-[#EAEFF5] space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[#1E2438]">
                        <span className="text-[#717C9B] flex items-center gap-1 text-[11px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
                          <span>Venue:</span>
                        </span>
                        <span className="font-bold text-[11px]">{slot.room}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#1E2438]">
                        <span className="text-[#717C9B] flex items-center gap-1 text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-[#0284C7]" />
                          <span>Time:</span>
                        </span>
                        <span className="font-mono font-bold text-[11px]">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#EAEFF5]/60 flex items-center justify-between gap-2">
                    {isRecorded ? (
                      <button
                        onClick={() => router.push("/faculty?tab=attendance")}
                        className="w-full py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>View Logged Session</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : isLive ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/faculty/attendance/take?courseCode=${slot.courseCode}&topic=${encodeURIComponent(
                              slot.lectureTitle
                            )}`
                          )
                        }
                        className="w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Take Attendance Now</span>
                      </button>
                    ) : isOverdue ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/faculty/attendance/take?courseCode=${slot.courseCode}&topic=${encodeURIComponent(
                              slot.lectureTitle
                            )}`
                          )
                        }
                        className="w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Take Pending Attendance (Today)</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        title={`Attendance opens when class commences at ${slot.startTime}`}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Opens at {slot.startTime}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CLASS-BY-CLASS ATTENDANCE ANALYTICS & SECTION COMPARISON ─── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEFF5] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAEFF5] pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E2438] flex items-center gap-2">
                <span>Class Attendance Comparison &amp; Absenteeism Analytics</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">
                  75% Mandatory Policy
                </span>
              </h2>
              <p className="text-xs text-[#717C9B]">
                Compare section-by-section student attendance and identify attendance shortage risks.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/faculty?tab=attendance")}
            className="text-xs font-bold text-[#16A34A] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Full Attendance Register</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Section-by-Section Comparison Bars */}
          <div className="md:col-span-2 space-y-3.5">
            <h3 className="text-xs font-bold text-[#717C9B] uppercase tracking-wider">
              Section Attendance Rate Benchmark
            </h3>

            {classAnalytics.comparison.length > 0 ? (
              <div className="space-y-3">
                {classAnalytics.comparison.map((c) => (
                  <div key={c.sectionName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1E2438]">{c.sectionName}</span>
                      <span
                        className={`font-mono font-bold ${
                          c.pct >= 85 ? "text-emerald-600" : c.pct >= 75 ? "text-blue-600" : "text-red-600"
                        }`}
                      >
                        {c.pct}% Average ({c.sessionsCount} Sessions Conducted)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#F0F3F8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.pct >= 85 ? "bg-emerald-500" : c.pct >= 75 ? "bg-blue-500" : "bg-red-500"
                        }`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                <BarChart3 className="h-7 w-7 mx-auto text-slate-400 opacity-60" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Attendance Sessions Logged Yet</p>
                <p className="text-[11px] text-slate-500">Record roll call for your classes to view section-by-section analytics and attendance benchmarks.</p>
              </div>
            )}
          </div>

          {/* Compliance & Policy Summary */}
          <div className="bg-[#F8FAFD] rounded-xl p-4 border border-[#EAEFF5] flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#717C9B] uppercase tracking-wider block">
                Policy Parameters
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#717C9B]">Updation Window:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{attendanceWindowHours} Hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#717C9B]">Min Required:</span>
                  <span className="font-bold text-[#16A34A]">75.0% Minimum</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#717C9B]">Total Logged Sessions:</span>
                  <span className="font-mono font-bold text-[#1E2438]">
                    {classAnalytics.totalSessionsConducted}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-900 text-[11px] leading-tight flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>All roll call records sync in real time across the student mobile and web portal.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Courses) + Right 1 Col (Quick Actions) */}
      <div id="courses-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Course Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1E2438]">My Courses</h2>
              <p className="text-xs text-[#717C9B]">Lessons, materials, attendance, and results for each class</p>
            </div>
            <button
              onClick={() => onOpenUploadModal()}
              className="btn-saas-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Add Material</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No courses assigned yet</p>
                <p className="text-xs text-slate-500 mt-1">Courses assigned to you by the department will appear here.</p>
              </div>
            ) : (
              courses.map((c, idx) => {
              const pastelBadge = [
                "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
                "bg-[#E0F2FE] text-[#0284C7]",
                "bg-[#DCFCE7] text-[#16A34A]",
                "bg-[#FCE7F3] text-[#DB2777]",
              ][idx % 4];

              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/faculty/courses/${c.course_code}`)}
                  className="bg-white rounded-2xl border border-[#EAEFF5] shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-400 hover:shadow-md transition-all group p-5 space-y-4 cursor-pointer relative"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] ${pastelBadge}`}>
                        {c.course_code}
                      </span>
                      <span className="text-xs font-semibold text-[#717C9B]">
                        {c.credits} Credits
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#1E2438] group-hover:text-slate-900 dark:group-hover:text-white transition-colors line-clamp-1 flex items-center justify-between">
                      <span>{c.name}</span>
                      <ArrowRight className="h-4 w-4 text-[#717C9B] group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </h3>

                    <p className="text-xs text-[#717C9B] line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-[#717C9B] pt-2 border-t border-[#EAEFF5]">
                      <span>Students: <strong className="text-[#1E2438] font-mono">{c.enrolled_count || 0}</strong></span>
                      <span>Attendance Window: <strong className="text-[#16A34A] font-mono">{attendanceWindowHours}h</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCourseForGradebook(c);
                        }}
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        title="Open During-Semester Assessment Book"
                      >
                        <Award className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>DSA Book</span>
                      </button>
                      {isSemesterSeeUnlocked(currentSemester || 3) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/faculty?tab=semester-results");
                          }}
                          className="font-semibold text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer text-[11px]"
                          title="View Semester Results"
                        >
                          <span>SEE Result</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/faculty/courses/${c.course_code}`);
                        }}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Manage</span>
                      </button>

                      <Link
                        href={`/courses/${c.course_code}/learn`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-[#717C9B] hover:text-[#1E2438] inline-flex items-center gap-1"
                      >
                        <span>Preview</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right 1 Col: Calendar Widget, Deadlines, Notices & Quick Actions */}
        <div className="space-y-6">
          <DashboardRightSidebar
            role="FACULTY"
            facultyName={facultyName}
            userCourseCodes={courses.map((c) => c.course_code)}
          />

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEFF5] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#1E2438] border-b border-[#EAEFF5] pb-3">
              Quick Actions
            </h3>

            <div className="space-y-2">
              {activeLiveSlot ? (
                <button
                  onClick={() =>
                    router.push(
                      `/faculty/attendance/take?courseCode=${encodeURIComponent(activeLiveSlot.courseCode)}&topic=${encodeURIComponent(
                        activeLiveSlot.lectureTitle
                      )}`
                    )
                  }
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors text-xs font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Take Live Attendance ({activeLiveSlot.courseCode})</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </button>
              ) : (
                <button
                  onClick={() => router.push("/faculty?tab=timetable")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] hover:bg-blue-50/60 dark:hover:bg-slate-800 text-[#1E2438] border border-[#EAEFF5] transition-colors text-xs font-semibold cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>View Teaching Timetable</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9AA3B8]" />
                </button>
              )}

              <button
                onClick={onOpenCreateAssignmentModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#1E2438] hover:text-slate-900 dark:hover:text-white border border-[#EAEFF5] transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                  <span>Create Assignment</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#9AA3B8]" />
              </button>

              <button
                onClick={() => router.push("/faculty?tab=modules")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#1E2438] hover:text-slate-900 dark:hover:text-white border border-[#EAEFF5] transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                  <span>Add Lesson</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#9AA3B8]" />
              </button>

              <button
                onClick={onOpenBroadcastModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#1E2438] hover:text-slate-900 dark:hover:text-white border border-[#EAEFF5] transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                  <span>Send Class Notice</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#9AA3B8]" />
              </button>
            </div>
          </div>

          {/* Academic Governance Badge */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-900 dark:text-slate-100" />
              <h4 className="font-bold text-xs text-[#1E2438]">Institutional Attendance Policy</h4>
            </div>
            <p className="text-[11px] text-[#717C9B] leading-relaxed">
              Faculty may update or correct recorded attendance within <strong>{attendanceWindowHours} hours</strong> from session conclusion. Beyond this window, attendance is locked permanently for audit compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

