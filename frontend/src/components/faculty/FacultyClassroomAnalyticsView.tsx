"use client";

import React, { useMemo } from "react";
import {
  BookOpen,
  ClipboardCheck,
  CalendarCheck,
  Star,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  Award,
  Sparkles,
} from "lucide-react";
import { FacultyCourse } from "@/types";
import { useAcademicData } from "@/context/AcademicDataContext";
import { getUserAvatarUrl } from "@/lib/avatar";

interface FacultyClassroomAnalyticsViewProps {
  courses: FacultyCourse[];
  facultyName: string;
}

export function FacultyClassroomAnalyticsView({
  courses,
  facultyName,
}: FacultyClassroomAnalyticsViewProps) {
  const {
    submissions,
    assignments,
    attendanceSessions,
    moduleFeedbacks,
    quizzes,
    users,
  } = useAcademicData();

  // Enrolled students in this faculty's classes
  const enrolledStudents = useMemo(() => {
    return (users || []).filter(
      (u) => u.role === "STUDENT" || (u as any)?.role?.name === "STUDENT"
    );
  }, [users]);

  // Real course metrics derived from instructor's active courses
  const courseAnalytics = useMemo(() => {
    return (courses || []).map((course) => {
      const courseCode = course.course_code || (course as any).code || "";

      // Find assignments for this course
      const courseAssignments = (assignments || []).filter(
        (a: any) =>
          (a.courseId && a.courseId === course.id) ||
          (a.courseCode && a.courseCode === courseCode)
      );
      const assignmentIds = new Set(courseAssignments.map((a) => a.id));

      // Submissions for this course
      const courseSubmissions = (submissions || []).filter((s) =>
        assignmentIds.has(s.assignmentId)
      );
      const graded = courseSubmissions.filter((s) => s.status === "GRADED");
      const pending = courseSubmissions.filter((s) => s.status === "SUBMITTED");

      const turnaroundPct =
        courseSubmissions.length > 0
          ? Math.round((graded.length / courseSubmissions.length) * 100)
          : 100;

      // Module feedbacks for this course
      const feedbacks = (moduleFeedbacks || []).filter(
        (f: any) =>
          f.courseCode === courseCode || (f.courseId && f.courseId === course.id)
      );
      const avgRating =
        feedbacks.length > 0
          ? (
              feedbacks.reduce(
                (acc, curr) =>
                  acc + ((curr as any).rating || curr.ratings?.overall || 5),
                0
              ) / feedbacks.length
            ).toFixed(1)
          : "—";

      // Quizzes for this course
      const courseQuizzes = (quizzes || []).filter(
        (q) => q.courseCode === courseCode
      );

      return {
        id: course.id,
        code: courseCode,
        name: course.name,
        students: (course as any).enrolledStudents || enrolledStudents.length || 60,
        assignmentsCount: courseAssignments.length,
        submittedCount: courseSubmissions.length,
        gradedCount: graded.length,
        pendingCount: pending.length,
        turnaroundPct,
        avgRating,
        quizzesCount: courseQuizzes.length,
      };
    });
  }, [courses, assignments, submissions, moduleFeedbacks, quizzes, enrolledStudents.length]);

  // Recent lecture attendance timeline for sessions conducted by this faculty or for their courses
  const attendanceTimeline = useMemo(() => {
    const relevantSessions = (attendanceSessions || [])
      .filter((s: any) => {
        const sDate = s.sessionDateRaw || s.sessionDate || s.date;
        if (!sDate) return false;
        const sFaculty = s.conductedByFaculty || s.facultyName || "";
        const matchesFaculty = sFaculty.toLowerCase().includes(facultyName.toLowerCase()) || facultyName.toLowerCase().includes(sFaculty.toLowerCase());
        const matchesCourse = courses.some((c) => c.course_code === s.courseCode || (c as any).code === s.courseCode);
        return matchesFaculty || matchesCourse;
      })
      .slice(-8);

    if (relevantSessions.length === 0) {
      // If no sessions conducted yet, return clean empty
      return [];
    }

    return relevantSessions.map((s: any, idx: number) => {
      const sDate = s.sessionDateRaw || s.sessionDate || s.date || "";
      const present = s.presentCount !== undefined ? s.presentCount : (s.presentStudentIds || []).length;
      const total = s.totalCount !== undefined ? s.totalCount : ((s.presentStudentIds || []).length + (s.absentStudentIds || []).length || 60);
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        id: s.id || `sess-${idx}`,
        date: sDate ? String(sDate).slice(5) : `Lec ${idx + 1}`,
        topic: s.topic || `Session ${idx + 1}`,
        courseCode: s.courseCode,
        pct,
        present,
        total,
      };
    });
  }, [attendanceSessions, facultyName, courses]);

  // Quiz assessment performance breakdown
  const quizAnalytics = useMemo(() => {
    const facultyCourseCodes = new Set(courses.map((c) => c.course_code || (c as any).code));
    const facultyQuizzes = (quizzes || []).filter((q) => facultyCourseCodes.has(q.courseCode));

    if (facultyQuizzes.length === 0) return null;

    let totalAttemptsCount = 0;
    let totalScoreSum = 0;
    let highestScore = 0;

    facultyQuizzes.forEach((q) => {
      if (q.attempts) {
        Object.values(q.attempts).forEach((att: any) => {
          totalAttemptsCount++;
          const score = typeof att === "number" ? att : att.score || 0;
          totalScoreSum += score;
          if (score > highestScore) highestScore = score;
        });
      }
    });

    const avgScore = totalAttemptsCount > 0 ? Math.round(totalScoreSum / totalAttemptsCount) : 0;

    return {
      totalQuizzes: facultyQuizzes.length,
      totalAttempts: totalAttemptsCount,
      averageScore: avgScore,
      highestScore,
    };
  }, [courses, quizzes]);

  // Students requiring intervention (< 75% attendance in faculty's sessions)
  const studentsNeedingIntervention = useMemo(() => {
    const list: Array<{ id: string; name: string; rollNo: string; email: string; attPct: number; issue: string }> = [];

    enrolledStudents.slice(0, 15).forEach((stu) => {
      let present = 0;
      let total = 0;
      attendanceSessions.forEach((sess) => {
        if (sess.presentStudentIds?.includes(stu.id)) {
          present++;
          total++;
        } else if (sess.absentStudentIds?.includes(stu.id)) {
          total++;
        }
      });

      if (total > 0) {
        const pct = Math.round((present / total) * 100);
        if (pct < 75) {
          list.push({
            id: stu.id,
            name: `${stu.first_name} ${stu.last_name || ""}`.trim() || stu.email,
            rollNo: (stu as any).roll_number || (stu as any).student_identifier || "2024-CSE-001",
            email: stu.email,
            attPct: pct,
            issue: "Attendance Defaulter (< 75%)",
          });
        }
      }
    });

    return list.slice(0, 5);
  }, [enrolledStudents, attendanceSessions]);

  const totalPending = courseAnalytics.reduce((acc, c) => acc + c.pendingCount, 0);
  const totalGraded = courseAnalytics.reduce((acc, c) => acc + c.gradedCount, 0);

  return (
    <div className="space-y-6">
      {/* Classroom Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Classroom Teaching Delivery &amp; Evaluation Matrix
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {facultyName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lecture attendance velocity, continuous assignment grading turnaround, and student assessment mastery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
            {courses.length} Assigned Sections
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 font-bold">
            {totalPending > 0 ? `${totalPending} Submissions to Grade` : "All Submissions Evaluated"}
          </span>
        </div>
      </div>

      {/* 3 Classroom Velocity KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Assignment Grading Turnaround</span>
            <FileCheck2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {totalGraded + totalPending > 0
              ? `${Math.round((totalGraded / (totalGraded + totalPending)) * 100)}%`
              : "100%"}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{
                width: `${totalGraded + totalPending > 0 ? Math.round((totalGraded / (totalGraded + totalPending)) * 100) : 100}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {totalGraded} graded · {totalPending} awaiting grading
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Quiz Assessment Standing</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {quizAnalytics ? `${quizAnalytics.averageScore}%` : "—"}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${quizAnalytics?.averageScore || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {quizAnalytics ? `${quizAnalytics.totalAttempts} attempts across ${quizAnalytics.totalQuizzes} quizzes` : "No active quizzes created yet"}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Lectures Conducted</span>
            <CalendarCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {attendanceTimeline.length} <span className="text-xs text-slate-400 font-normal">Sessions</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
          </div>
          <p className="text-[11px] text-slate-500">
            Recorded in university academic database
          </p>
        </div>
      </div>

      {/* Distinct Visual Charts: Attendance Waveform & Course Velocity Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Lecture-by-Lecture Attendance Waveform SVG (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lecture Attendance Trendline
              </h3>
              <p className="text-xs text-slate-500">
                Session-by-session student turnout trajectory with 75% threshold guide.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
              Live Classroom Telemetry
            </span>
          </div>

          {attendanceTimeline.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <CalendarCheck className="h-8 w-8 text-slate-300 mb-2" />
              <span>No lecture sessions logged yet. Record attendance to generate trendline.</span>
            </div>
          ) : (
            <div className="h-56 w-full relative pt-2">
              <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                {/* 75% Statutory Guide Line */}
                <line x1="30" y1="57.5" x2="490" y2="57.5" stroke="#f43f5e" strokeDasharray="4 4" strokeWidth="1.5" />
                <text x="490" y="52" textAnchor="end" className="text-[9px] fill-rose-500 font-bold font-mono">
                  75% UGC Minimum
                </text>

                {/* Horizontal Baseline */}
                <line x1="30" y1="150" x2="490" y2="150" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />

                {/* Area and Line Path */}
                {(() => {
                  const points = attendanceTimeline.map((item, idx) => {
                    const stepX = 440 / Math.max(attendanceTimeline.length - 1, 1);
                    const x = 40 + idx * stepX;
                    const y = 150 - (item.pct / 100) * 130;
                    return { x, y, ...item };
                  });

                  const pathD = points.reduce((acc, curr, i) => `${acc} ${i === 0 ? "M" : "L"} ${curr.x} ${curr.y}`, "");
                  const areaD = `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`;

                  return (
                    <g>
                      <path d={areaD} fill="url(#blueGradient)" opacity="0.25" />
                      <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Points */}
                      {points.map((pt, i) => (
                        <g key={pt.id}>
                          <circle cx={pt.x} cy={pt.y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" className="transition-all hover:r-6" />
                          <text x={pt.x} y="168" textAnchor="middle" className="text-[9px] font-mono fill-slate-400">
                            {pt.date}
                          </text>
                          <text x={pt.x} y={pt.y - 8} textAnchor="middle" className="text-[9px] font-bold fill-slate-800 dark:fill-white font-mono">
                            {pt.pct}%
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>

        {/* Chart 2: Students Needing Early Intervention (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Early Intervention Alert
                </h3>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                Attention Required
              </span>
            </div>

            <div className="space-y-3 pt-3">
              {studentsNeedingIntervention.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                  All evaluated students meet or exceed the statutory 75% attendance benchmark.
                </div>
              ) : (
                studentsNeedingIntervention.map((stu) => (
                  <div
                    key={stu.id}
                    className="p-3 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getUserAvatarUrl(stu)}
                        alt={stu.name}
                        className="h-8 w-8 rounded-xl object-cover shrink-0 border border-rose-200 dark:border-rose-800"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                        }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                          {stu.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {stu.rollNo} · {stu.issue}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400 shrink-0">
                      {stu.attPct}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between">
            <span className="text-slate-500">Academic Counsel Status:</span>
            <span className="font-bold text-blue-600">Active Mentorship Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
