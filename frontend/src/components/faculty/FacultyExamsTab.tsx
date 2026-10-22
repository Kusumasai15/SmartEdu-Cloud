"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Camera,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Eye,
  Download,
  Award,
  Ban,
  X,
  Lock,
  Unlock,
  Trash2,
  FileSpreadsheet,
  Check,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { useAcademicData, LmsQuiz, LmsQuizAttempt } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel, exportToCsv } from "@/lib/excel-utils";

export interface LiveExamTelemetryRecord {
  id: string;
  studentRollNo: string;
  studentName: string;
  examTitle: string;
  courseCode: string;
  cameraStatus: "ACTIVE" | "OFFLINE";
  fullscreenStatus: "LOCKED" | "BREACHED";
  strikeCount: number;
  lastViolation: string;
  status: "IN_PROGRESS" | "FLAGGED" | "CLEAN" | "DISQUALIFIED";
}

interface FacultyExamsTabProps {
  telemetryRecords: LiveExamTelemetryRecord[];
  onOpenCreateExamModal: () => void;
  onSelectTelemetryStudent: (student: LiveExamTelemetryRecord) => void;
  courses?: any[];
}

export function FacultyExamsTab({
  telemetryRecords,
  onOpenCreateExamModal,
  onSelectTelemetryStudent,
  courses = [],
}: FacultyExamsTabProps) {
  const { user } = useAuth();
  const { quizzes, courses: academicCourses, deleteQuiz, releaseQuizResults } = useAcademicData();

  // Scope quizzes strictly to current faculty's assigned courses or created assessments
  const scopedQuizzes = useMemo(() => {
    const facultyCoursesList = courses && courses.length > 0 ? courses : (academicCourses || []);
    const allowedCodes = new Set(
      facultyCoursesList.map((c: any) => (c.course_code || c.code || "").toUpperCase()).filter(Boolean)
    );
    const userEmail = (user?.email || "").toLowerCase();
    const userId = user?.id || "";
    const isLeadership = user?.role?.name === "ADMINISTRATOR" || user?.role?.name === "HOD";

    return (quizzes || []).filter((q) => {
      if (isLeadership) return true;
      if (q.facultyId === userId || (q.createdBy && q.createdBy.toLowerCase() === userEmail)) {
        return true;
      }
      if (q.courseCode && allowedCodes.has(q.courseCode.toUpperCase())) {
        return true;
      }
      return false;
    });
  }, [quizzes, courses, academicCourses, user]);

  const [activeSubTab, setActiveSubTab] = useState<"LIVE_PROCTOR" | "ASSESSMENTS">("ASSESSMENTS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [strikeFilter, setStrikeFilter] = useState<"ALL" | "CLEAN" | "FLAGGED" | "DISQUALIFIED">("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  // Selected Quiz for In-App Analytics & Excel Export Modal
  const [selectedQuizAnalytics, setSelectedQuizAnalytics] = useState<LmsQuiz | null>(null);
  const [selectedQuizQuestionsModal, setSelectedQuizQuestionsModal] = useState<LmsQuiz | null>(null);

  const filteredTelemetry = useMemo(() => {
    return telemetryRecords.filter((t) => {
      const matchSearch =
        t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (strikeFilter === "CLEAN") return t.strikeCount === 0;
      if (strikeFilter === "FLAGGED") return t.strikeCount > 0 && t.strikeCount < 3;
      if (strikeFilter === "DISQUALIFIED") return t.strikeCount >= 3 || t.status === "DISQUALIFIED";
      return true;
    });
  }, [telemetryRecords, searchQuery, strikeFilter]);

  const flaggedCount = telemetryRecords.filter((t) => t.strikeCount > 0).length;
  const disqualifiedCount = telemetryRecords.filter((t) => t.strikeCount >= 3).length;

  const handleDisqualify = (student: LiveExamTelemetryRecord) => {
    student.strikeCount = 3;
    student.status = "DISQUALIFIED";
    student.lastViolation = "Ended by faculty";
    setNotification(`Assessment attempt ended for ${student.studentName} (${student.studentRollNo}).`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper to determine time window status
  const getExamWindowStatus = (quiz: LmsQuiz) => {
    if (!quiz.scheduledDate || !quiz.startTime || !quiz.endTime) {
      return { status: "ACTIVE", label: "Active Window", color: "emerald" };
    }

    try {
      const now = new Date();
      const startDateTime = new Date(`${quiz.scheduledDate}T${quiz.startTime}:00`);
      const endDateTime = new Date(`${quiz.scheduledDate}T${quiz.endTime}:00`);

      if (now < startDateTime) {
        return { status: "UPCOMING", label: "Upcoming / Scheduled", color: "purple" };
      }
      if (now > endDateTime) {
        return { status: "CLOSED", label: "Window Concluded", color: "slate" };
      }
      return { status: "ACTIVE", label: "Live Exam Window", color: "emerald" };
    } catch {
      return { status: "ACTIVE", label: "Live Exam Window", color: "emerald" };
    }
  };

  // Export Quiz Submissions to Excel
  const handleExportExcel = (quiz: LmsQuiz) => {
    const attempts = quiz.attempts ? Object.values(quiz.attempts) : [];
    if (attempts.length === 0) {
      alert("No student attempts recorded yet for this examination.");
      return;
    }

    const exportData = attempts.map((att, idx) => ({
      "S.No": idx + 1,
      "Roll Number": att.studentRoll || "N/A",
      "Student Name": att.studentName,
      "Score Obtained": att.score,
      "Maximum Score": att.maxScore,
      "Percentage": `${((att.score / (att.maxScore || 1)) * 100).toFixed(1)}%`,
      "Correct Answers": `${att.correctCount} / ${att.totalQuestions}`,
      "Time Taken (Mins)": Math.round((att.timeTakenSeconds || 0) / 60),
      "Security Strikes": att.strikes || 0,
      "Status": att.status,
      "Submitted At": att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "Submitted",
    }));

    exportToExcel(
      exportData,
      `${quiz.courseCode}_${quiz.title.replace(/\s+/g, "_")}_Results`,
      "Submissions"
    );

    setNotification(`✓ Results exported to Excel for "${quiz.title}".`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Export Quiz Submissions to CSV
  const handleExportCsv = (quiz: LmsQuiz) => {
    const attempts = quiz.attempts ? Object.values(quiz.attempts) : [];
    if (attempts.length === 0) {
      alert("No student attempts recorded yet for this examination.");
      return;
    }

    const exportData = attempts.map((att, idx) => ({
      "S.No": idx + 1,
      "Roll Number": att.studentRoll || "N/A",
      "Student Name": att.studentName,
      "Score Obtained": att.score,
      "Maximum Score": att.maxScore,
      "Percentage": `${((att.score / (att.maxScore || 1)) * 100).toFixed(1)}%`,
      "Correct Answers": `${att.correctCount} / ${att.totalQuestions}`,
      "Time Taken (Mins)": Math.round((att.timeTakenSeconds || 0) / 60),
      "Security Strikes": att.strikes || 0,
      "Status": att.status,
      "Submitted At": att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "Submitted",
    }));

    exportToCsv(
      exportData,
      `${quiz.courseCode}_${quiz.title.replace(/\s+/g, "_")}_Results`
    );
  };

  // Toggle or Release Results
  const handleReleaseResults = (quizId: string) => {
    releaseQuizResults(quizId);
    setNotification("✓ Results, correct answers, and scorecards released to students!");
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <SectionHeader
          title="Scheduled Quizzes &amp; Examinations"
          description="Create class assessments with randomized questions, integrity controls, and scheduled result release."
        />
        <Button
          onClick={onOpenCreateExamModal}
          className="btn-saas-primary text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Create Scheduled Exam</span>
        </Button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-bold text-blue-800 dark:text-blue-200 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Exam summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Scheduled Exams</span>
          <p className="text-2xl font-black text-blue-600 font-mono">{scopedQuizzes.length}</p>
          <span className="text-xs text-slate-400 font-medium">Published in portal</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Submissions</span>
          <p className="text-2xl font-black text-emerald-600 font-mono">
            {scopedQuizzes.reduce((sum, q) => sum + Object.keys(q.attempts || {}).length, 0)}
          </p>
          <span className="text-xs text-emerald-600 font-bold">Recorded attempts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Active Monitoring</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {scopedQuizzes.filter((q) => q.isCameraProctored).length} Exams
          </p>
          <span className="text-xs text-blue-600 font-bold">Webcam surveillance</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Security Flags</span>
          <p className="text-2xl font-black text-amber-600 font-mono">{flaggedCount}</p>
          <span className="text-xs text-amber-600 font-bold">Integrity alerts</span>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveSubTab("ASSESSMENTS")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeSubTab === "ASSESSMENTS"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Published Class Exams &amp; Quizzes ({scopedQuizzes.length})
          </button>
          <button
            onClick={() => setActiveSubTab("LIVE_PROCTOR")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeSubTab === "LIVE_PROCTOR"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Live Proctoring Telemetry ({telemetryRecords.length})
          </button>
        </div>

        {activeSubTab === "LIVE_PROCTOR" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or roll no..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(["ALL", "CLEAN", "FLAGGED", "DISQUALIFIED"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStrikeFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    strikeFilter === f
                      ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {f === "ALL" ? "All" : f === "CLEAN" ? "Clean" : f === "FLAGGED" ? "⚠️ Flagged" : "🔴 Disqualified"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── SUB-VIEW 1: PUBLISHED CLASS EXAMS & RESULTS ─── */}
      {activeSubTab === "ASSESSMENTS" && (
        <div className="space-y-4">
          {scopedQuizzes.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm space-y-3">
              <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Published Class Exams</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create scheduled exams with customizable questions, assigned cohorts, integrity settings, and exportable gradebooks.
              </p>
              <Button onClick={onOpenCreateExamModal} className="btn-saas-primary text-xs font-bold mt-2">
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Create First Exam</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {scopedQuizzes.map((quiz) => {
                const windowStatus = getExamWindowStatus(quiz);
                const attemptsCount = Object.keys(quiz.attempts || {}).length;
                const attemptsList = quiz.attempts ? Object.values(quiz.attempts) : [];
                const averageScore =
                  attemptsList.length > 0
                    ? Math.round(attemptsList.reduce((acc, a) => acc + a.score, 0) / attemptsList.length)
                    : null;

                return (
                  <div
                    key={quiz.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                          {quiz.courseCode}
                        </span>
                        
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            windowStatus.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                              : windowStatus.status === "UPCOMING"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          ● {windowStatus.label}
                        </span>
                      </div>

                      {/* Title & Target Class */}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {quiz.title}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                          Cohort: <span className="text-blue-600 dark:text-blue-400">{quiz.targetClass || "CSE - Semester 1 (Sec A)"}</span>
                        </p>
                      </div>

                      {/* Time Window Notice */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>Schedule Window:</span>
                          </span>
                          <strong className="font-mono text-slate-900 dark:text-white">
                            {quiz.startTime || "15:00"} - {quiz.endTime || "17:00"}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Duration / Marks:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {quiz.timeLimitMinutes} Mins • {quiz.totalPoints} Marks
                          </span>
                        </div>
                      </div>

                      {/* Anti-Cheat Features Badges */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-1.5 text-slate-800 dark:text-slate-200 font-medium">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-blue-600" />
                            <span>Identity monitoring:</span>
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                              quiz.isCameraProctored
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {quiz.isCameraProctored ? "ON (Mandatory)" : "OFF (Disabled)"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            <span>Fullscreen &amp; Anti-Tab:</span>
                          </span>
                          <span className="font-bold text-emerald-600 text-[10px]">3 Strikes Limit</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                            <span>Questions Order:</span>
                          </span>
                          <span className="font-bold text-blue-600 text-[10px]">Randomized Per Student</span>
                        </div>
                      </div>

                      {/* Results Lock Status */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 font-medium">Results Status:</span>
                        <span
                          className={`font-bold inline-flex items-center gap-1 text-[11px] ${
                            quiz.resultsReleased
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {quiz.resultsReleased ? (
                            <>
                              <Unlock className="h-3 w-3" />
                              <span>Released to Students</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Locked until Window Closes</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => setSelectedQuizQuestionsModal(quiz)}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          View Question Bank ({quiz.questions?.length || 0})
                        </button>
                        <span className="font-mono text-slate-500">
                          Turnout: <strong className="text-emerald-600 font-bold">{attemptsCount} Submissions</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <Button
                          onClick={() => setSelectedQuizAnalytics(quiz)}
                          className="btn-saas-primary text-xs w-full py-1.5 font-bold flex items-center justify-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Scores &amp; Log</span>
                        </Button>

                        {!quiz.resultsReleased ? (
                          <Button
                            onClick={() => handleReleaseResults(quiz.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full py-1.5 font-bold flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span>Publish Results</span>
                          </Button>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs w-full py-1.5 font-bold flex items-center justify-center gap-1 rounded-xl">
                            <Check className="h-3.5 w-3.5" />
                            <span>Results Live</span>
                          </span>
                        )}

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete exam "${quiz.title}"?`)) {
                              deleteQuiz(quiz.id);
                            }
                          }}
                          className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center justify-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-VIEW 2: LIVE PROCTORING TELEMETRY ─── */}
      {activeSubTab === "LIVE_PROCTOR" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Exam Monitoring</h3>
              <p className="text-xs text-slate-400">Review active assessment sessions and recorded integrity events.</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{telemetryRecords.length ? "Monitoring Active" : "No Active Exam"}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Camera</th>
                  <th className="p-3">Screen</th>
                  <th className="p-3">Warnings</th>
                  <th className="p-3">Last Note</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTelemetry.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-blue-600">{t.studentRollNo}</td>
                    <td className="p-3 font-extrabold text-slate-900 dark:text-white">{t.studentName}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Camera className="h-3 w-3" />
                        <span>On</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          t.fullscreenStatus === "LOCKED"
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-rose-700 bg-rose-50 border-rose-200"
                        }`}
                      >
                        <Monitor className="h-3 w-3" />
                        <span>{t.fullscreenStatus}</span>
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.strikeCount === 0
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : t.strikeCount >= 3
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {t.strikeCount >= 3 ? "Ended" : `${t.strikeCount} / 3`}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {t.lastViolation}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => onSelectTelemetryStudent(t)}
                        className="btn-saas-outline text-xs px-2.5 py-1 text-blue-600 font-bold inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Review</span>
                      </button>

                      {t.strikeCount > 0 && t.strikeCount < 3 && (
                        <button
                          onClick={() => handleDisqualify(t)}
                          className="btn-saas-outline text-xs px-2.5 py-1 text-rose-600 font-bold inline-flex items-center gap-1"
                          title="End this exam attempt"
                        >
                          <Ban className="h-3 w-3" />
                          <span>End</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: EXAM SCORES & ANALYTICS MODAL (WITH EXCEL EXPORT) ─── */}
      {selectedQuizAnalytics && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 border border-slate-100 dark:border-slate-800 shadow-2xl my-auto max-h-[92vh] overflow-y-auto animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700">
                    {selectedQuizAnalytics.courseCode}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedQuizAnalytics.title} - Scorecard &amp; Submissions
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Target Cohort: <strong>{selectedQuizAnalytics.targetClass || "All"}</strong> • Window: {selectedQuizAnalytics.startTime} to {selectedQuizAnalytics.endTime}
                </p>
              </div>

              <button
                onClick={() => setSelectedQuizAnalytics(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Action Toolbar: Excel Export & Release Results */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleExportExcel(selectedQuizAnalytics)}
                  className="btn-saas-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 flex items-center gap-2 font-bold shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Download Excel (.xlsx)</span>
                </Button>

                <Button
                  onClick={() => handleExportCsv(selectedQuizAnalytics)}
                  variant="outline"
                  className="text-xs px-3 py-2 flex items-center gap-1.5 font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV</span>
                </Button>
              </div>

              <div>
                {!selectedQuizAnalytics.resultsReleased ? (
                  <Button
                    onClick={() => handleReleaseResults(selectedQuizAnalytics.id)}
                    className="btn-saas-primary bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-sm"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>Release Results to Students Now</span>
                  </Button>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>Results Released to Students</span>
                  </span>
                )}
              </div>
            </div>

            {/* Student Submissions Table */}
            <div className="space-y-3">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Student Attempts &amp; Proctoring Log ({Object.keys(selectedQuizAnalytics.attempts || {}).length} Submitted):
              </span>

              {Object.keys(selectedQuizAnalytics.attempts || {}).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  No submissions yet. Once students take this exam within the scheduled window ({selectedQuizAnalytics.startTime} - {selectedQuizAnalytics.endTime}), scores and integrity logs will populate automatically.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Roll No</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Percentage</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Strikes</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.values(selectedQuizAnalytics.attempts || {}).map((att) => (
                        <tr key={att.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-blue-600">{att.studentRoll || "STU-001"}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{att.studentName}</td>
                          <td className="p-3 font-mono font-bold text-emerald-600">
                            {att.score} / {att.maxScore}
                          </td>
                          <td className="p-3 font-mono font-semibold">
                            {((att.score / (att.maxScore || 1)) * 100).toFixed(1)}%
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {Math.round((att.timeTakenSeconds || 0) / 60)} mins
                          </td>
                          <td className="p-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                att.strikes === 0
                                  ? "bg-slate-100 text-slate-700"
                                  : att.strikes >= 3
                                  ? "bg-rose-600 text-white"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {att.strikes || 0} / 3
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                att.status === "DISQUALIFIED"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-400 font-mono text-[11px]">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={() => setSelectedQuizAnalytics(null)} variant="outline" className="text-xs">
                Close Scorecard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: QUESTIONS PREVIEW MODAL ─── */}
      {selectedQuizQuestionsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 border border-slate-100 dark:border-slate-800 shadow-2xl my-auto max-h-[92vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Question Bank: {selectedQuizQuestionsModal.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedQuizQuestionsModal.questions?.length || 0} Multiple-Choice Questions (Shuffled dynamically per student)
                </p>
              </div>
              <button
                onClick={() => setSelectedQuizQuestionsModal(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedQuizQuestionsModal.questions?.map((q, i) => (
                <div
                  key={q.id || i}
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
                >
                  <span className="font-bold text-slate-900 dark:text-white block">
                    <span className="text-blue-600 font-mono mr-1.5">Q{i + 1}.</span>
                    {q.prompt}
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-2 rounded-xl border flex items-center justify-between ${
                          optIdx === q.correctIndex
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>
                          <strong className="mr-1">{String.fromCharCode(65 + optIdx)}.</strong>
                          {opt}
                        </span>
                        {optIdx === q.correctIndex && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 italic pt-1">
                      💡 Correct Reason: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={() => setSelectedQuizQuestionsModal(null)} className="btn-saas-primary text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
