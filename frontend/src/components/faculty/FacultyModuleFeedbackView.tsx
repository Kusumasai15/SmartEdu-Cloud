"use client";

import React, { useState, useMemo } from "react";
import {
  Star,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ThumbsUp,
  AlertCircle,
  Filter,
  Search,
  MessageSquare,
  UserCheck,
  UserX,
  Send,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronDown,
  X,
  FileText,
  BarChart3,
} from "lucide-react";
import {
  useAcademicData,
  CourseModuleDef,
  ModuleFeedbackRecord,
} from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { FacultyCourse } from "@/types";

interface Props {
  courses?: FacultyCourse[];
  defaultCourseCode?: string;
}

export function FacultyModuleFeedbackView({ courses: propCourses, defaultCourseCode }: Props) {
  const { user } = useAuth();
  const {
    courses: syncCourses,
    courseModules,
    moduleFeedbacks,
    acknowledgeModuleFeedback,
    updateCourseModuleStatus,
  } = useAcademicData();

  // Compute Faculty Identity
  const rawFacultyName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const facultyName = rawFacultyName
    ? (rawFacultyName.toLowerCase().startsWith("dr") || rawFacultyName.toLowerCase().startsWith("prof")
        ? rawFacultyName
        : `Prof. ${rawFacultyName}`)
    : ((user as any)?.username || user?.email || "Faculty Member");

  // Determine active courses taught by this faculty
  const facultyAssignedCourses = useMemo(() => {
    if (propCourses && propCourses.length > 0) return propCourses;

    // Filter sync courses
    const userFullName = rawFacultyName.toLowerCase();
    const matched = syncCourses.filter((c) => {
      const inst = (c.instructor || "").toLowerCase();
      return inst.includes(userFullName) || userFullName.includes(inst);
    });

    if (matched.length > 0) return matched;
    return syncCourses;
  }, [propCourses, syncCourses, rawFacultyName]);

  // Selected Course - defaults to "ALL" so faculty sees all student feedback immediately
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(defaultCourseCode || "ALL");

  // Filter state for feedbacks
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<number | "ALL">("ALL");
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Acknowledgment Modal State
  const [activeAckFeedback, setActiveAckFeedback] = useState<ModuleFeedbackRecord | null>(null);
  const [ackNote, setAckNote] = useState<string>("");
  const [isSubmittingAck, setIsSubmittingAck] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected course object
  const activeCourse = useMemo(() => {
    return facultyAssignedCourses.find(
      (c) =>
        ((c as any).course_code || (c as any).code || "").toUpperCase() ===
        selectedCourseCode.toUpperCase()
    ) || facultyAssignedCourses[0];
  }, [facultyAssignedCourses, selectedCourseCode]);

  // Modules for current course
  const currentModules = useMemo(() => {
    const code = selectedCourseCode.toUpperCase();
    const mods = courseModules.filter(
      (m) =>
        m.courseCode.toUpperCase() === code ||
        m.courseCode.replace("-", "").toUpperCase() === code.replace("-", "")
    );

    if (mods.length > 0) {
      return [...mods].sort((a, b) => a.moduleNumber - b.moduleNumber);
    }
    return [];
  }, [courseModules, selectedCourseCode]);

  // Feedbacks for current course or all courses
  const courseFeedbacks = useMemo(() => {
    if (!selectedCourseCode || selectedCourseCode === "ALL") {
      return moduleFeedbacks;
    }
    const code = selectedCourseCode.toUpperCase();
    return moduleFeedbacks.filter(
      (fb) =>
        fb.courseCode.toUpperCase() === code ||
        fb.courseCode.replace("-", "").toUpperCase() === code.replace("-", "")
    );
  }, [moduleFeedbacks, selectedCourseCode]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    if (courseFeedbacks.length === 0) {
      return {
        totalResponses: 0,
        avgOverall: "—" as string | number,
        avgClarity: "—" as string | number,
        avgPractical: "—" as string | number,
        avgDoubts: "—" as string | number,
        avgMaterials: "—" as string | number,
        paceBreakdown: { justRight: 0, tooFast: 0, tooSlow: 0 },
        positivePercentage: 0,
      };
    }

    const count = courseFeedbacks.length;
    let sumOverall = 0;
    let sumClarity = 0;
    let sumPractical = 0;
    let sumDoubts = 0;
    let sumMaterials = 0;
    let justRightCount = 0;
    let tooFastCount = 0;
    let tooSlowCount = 0;
    let highRatingCount = 0;

    courseFeedbacks.forEach((fb) => {
      sumOverall += fb.ratings.overall;
      sumClarity += fb.ratings.conceptClarity;
      sumPractical += fb.ratings.practicalRelevance;
      sumDoubts += fb.ratings.doubtResolution;
      sumMaterials += fb.ratings.materialsQuality;

      if (fb.ratings.teachingPace === "JUST_RIGHT") justRightCount++;
      else if (fb.ratings.teachingPace === "TOO_FAST") tooFastCount++;
      else if (fb.ratings.teachingPace === "TOO_SLOW") tooSlowCount++;

      if (fb.ratings.overall >= 4) highRatingCount++;
    });

    return {
      totalResponses: count,
      avgOverall: Number((sumOverall / count).toFixed(1)),
      avgClarity: Number((sumClarity / count).toFixed(1)),
      avgPractical: Number((sumPractical / count).toFixed(1)),
      avgDoubts: Number((sumDoubts / count).toFixed(1)),
      avgMaterials: Number((sumMaterials / count).toFixed(1)),
      paceBreakdown: {
        justRight: Math.round((justRightCount / count) * 100),
        tooFast: Math.round((tooFastCount / count) * 100),
        tooSlow: Math.round((tooSlowCount / count) * 100),
      },
      positivePercentage: Math.round((highRatingCount / count) * 100),
    };
  }, [courseFeedbacks]);

  // Filtered feedbacks list
  const filteredFeedbacks = useMemo(() => {
    return courseFeedbacks.filter((fb) => {
      if (selectedModuleFilter !== "ALL" && fb.moduleNumber !== selectedModuleFilter) {
        return false;
      }
      if (selectedRatingFilter !== "ALL" && Math.round(fb.ratings.overall) !== selectedRatingFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inComments = fb.comments.toLowerCase().includes(q);
        const inPos = (fb.positiveHighlights || "").toLowerCase().includes(q);
        const inImp = (fb.improvementSuggestions || "").toLowerCase().includes(q);
        const inMod = fb.moduleTitle.toLowerCase().includes(q);
        return inComments || inPos || inImp || inMod;
      }
      return true;
    });
  }, [courseFeedbacks, selectedModuleFilter, selectedRatingFilter, searchQuery]);

  // Toggle Module Status (e.g. Mark completed so students can give feedback)
  const handleToggleModuleStatus = (moduleNumber: number, currentStatus: "COMPLETED" | "IN_PROGRESS" | "UPCOMING") => {
    const nextStatus = currentStatus === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    updateCourseModuleStatus(selectedCourseCode, moduleNumber, nextStatus);

    setToastMessage(
      `✓ Module ${moduleNumber} status updated to "${nextStatus}". ${
        nextStatus === "COMPLETED" ? "Student post-module feedback portal is now UNLOCKED." : ""
      }`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Submit Faculty Acknowledgment Note
  const handleSaveAcknowledgment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAckFeedback) return;

    setIsSubmittingAck(true);
    try {
      acknowledgeModuleFeedback(
        activeAckFeedback.id,
        ackNote.trim() || "Thank you for the constructive feedback. Noted for upcoming lectures and lab tutorials.",
        facultyName
      );

      setToastMessage(`✓ Response note saved! Students can now view your acknowledgement on their dashboard.`);
      setTimeout(() => setToastMessage(null), 5000);
      setActiveAckFeedback(null);
      setAckNote("");
    } catch (err) {
      console.error("Ack error:", err);
      alert("Failed to save acknowledgement.");
    } finally {
      setIsSubmittingAck(false);
    }
  };

  return (
    <div className="space-y-7 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#181C2B] border border-[#E8EAF1] dark:border-slate-800 p-6 sm:p-7 shadow-xs relative">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 text-[10px] font-bold tracking-wider uppercase">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Curriculum Quality &amp; Feedback</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Curriculum Module Feedback &amp; Student Insights
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Direct student evaluations submitted after each completed module. Review concept clarity, teaching pacing, and feedback remarks across your assigned courses.
          </p>
        </div>

        {/* Quick Subject Tabs */}
        {facultyAssignedCourses.length > 0 && (
          <div className="flex items-center gap-2 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
              Select Subject:
            </span>
            <button
              onClick={() => {
                setSelectedCourseCode("ALL");
                setSelectedModuleFilter("ALL");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                selectedCourseCode === "ALL"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Courses ({moduleFeedbacks.length} Submissions)</span>
            </button>
            {facultyAssignedCourses.map((c) => {
              const code = ((c as any).course_code || (c as any).code || "").toUpperCase();
              const isSelected = selectedCourseCode.toUpperCase() === code;
              return (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedCourseCode(code);
                    setSelectedModuleFilter("ALL");
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="font-mono">{code}</span>
                  <span className="opacity-80 font-normal">
                    • {((c as any).name || "").split("&")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Satisfaction */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Overall Student Rating</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.avgOverall}
            </span>
            {metrics.totalResponses > 0 && (
              <span className="text-xs font-bold text-slate-400">/ 5.0 ★</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            {metrics.totalResponses > 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600 font-bold">{metrics.positivePercentage}% positive student sentiment</span>
              </>
            ) : (
              <span>No evaluations received yet</span>
            )}
          </p>
        </div>

        {/* Responses Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Evaluations Received</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.totalResponses}
            </span>
            <span className="text-xs font-bold text-slate-400">Submissions</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Across {currentModules.filter((m) => m.status === "COMPLETED").length} Completed Modules
          </p>
        </div>

        {/* Teaching Pace Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Teaching Pacing Health</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.totalResponses > 0 ? `${metrics.paceBreakdown.justRight}%` : "—"}
            </span>
            <span className="text-xs font-bold text-slate-400">Just Right</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
            <span>Fast: {metrics.paceBreakdown.tooFast}%</span>
            <span>•</span>
            <span>Slow: {metrics.paceBreakdown.tooSlow}%</span>
          </div>
        </div>

        {/* Dimension Breakdown Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Core Criteria Breakdown</span>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Concept Clarity:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.avgClarity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Practical Application:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.avgPractical}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Doubt Resolution:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.avgDoubts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Course Modules Status & Feedback Toggles */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Syllabus Modules &amp; Student Feedback Gates ({selectedCourseCode})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &ldquo;Mark Completed&rdquo; on any module when finished to immediately open student feedback collection.
            </p>
          </div>
        </div>

        {currentModules.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <Layers className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Syllabus Modules Configured</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Syllabus modules for {selectedCourseCode || "this course"} will appear here once registered in curriculum settings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-2">
            {currentModules.map((m) => {
              const isCompleted = m.status === "COMPLETED";
              const isInProgress = m.status === "IN_PROGRESS";
              const modSubmissions = courseFeedbacks.filter((fb) => fb.moduleNumber === m.moduleNumber);
              const modAvg =
                modSubmissions.length > 0
                  ? (
                      modSubmissions.reduce((acc, f) => acc + f.ratings.overall, 0) /
                      modSubmissions.length
                    ).toFixed(1)
                  : null;

              return (
                <div
                  key={m.id || m.moduleNumber}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isCompleted
                      ? "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700"
                      : isInProgress
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                      : "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        UNIT {m.moduleNumber}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : isInProgress
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                      {m.title.replace(/^Module \d+:\s*/i, "")}
                    </h3>

                    {isCompleted && (
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{modSubmissions.length} Feedback(s)</span>
                        {modAvg && (
                          <span className="font-bold text-amber-500 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-500" />
                            <span>{modAvg}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Toggle Button */}
                  <div className="mt-4 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleToggleModuleStatus(m.moduleNumber, m.status)}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      }`}
                    >
                      {isCompleted ? "Revert to Teaching" : "Mark as Completed ✓"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verbatim Feedback Feed & Student Comments */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Student Evaluations &amp; Qualitative Remarks
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredFeedbacks.length} of {courseFeedbacks.length} submitted responses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Module */}
            <select
              value={selectedModuleFilter}
              onChange={(e) =>
                setSelectedModuleFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              }
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Modules</option>
              {currentModules.map((m) => (
                <option key={m.moduleNumber} value={m.moduleNumber}>
                  Module {m.moduleNumber}
                </option>
              ))}
            </select>

            {/* Filter by Rating */}
            <select
              value={selectedRatingFilter}
              onChange={(e) =>
                setSelectedRatingFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              }
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Ratings</option>
              <option value={5}>5 Stars ★★★★★</option>
              <option value={4}>4 Stars ★★★★</option>
              <option value={3}>3 Stars or below</option>
            </select>

            {/* Search Input */}
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Feedback Feed Cards */}
        {filteredFeedbacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Row: Student identity & Module Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                        {fb.isAnonymous ? "A" : fb.studentName ? fb.studentName[0] : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {fb.isAnonymous ? "Anonymous Student" : fb.studentName}
                          </span>
                          {fb.isAnonymous && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              ANONYMOUS
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {fb.studentRollNo && !fb.isAnonymous ? `${fb.studentRollNo} • ` : ""}
                          {new Date(fb.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Unit {fb.moduleNumber}
                    </span>
                  </div>

                  {/* Ratings Row */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= fb.ratings.overall
                              ? "text-amber-500 fill-amber-500"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                        {fb.ratings.overall}.0
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        fb.ratings.teachingPace === "JUST_RIGHT"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      Pacing: {fb.ratings.teachingPace.replace("_", " ")}
                    </span>
                  </div>

                  {/* Verbatim comments */}
                  <div className="space-y-2 text-xs">
                    {fb.positiveHighlights && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                        <span className="font-bold block text-[11px] text-emerald-700 dark:text-emerald-400">
                          ✓ Positive Highlights:
                        </span>
                        <p className="mt-0.5">{fb.positiveHighlights}</p>
                      </div>
                    )}

                    {fb.improvementSuggestions && (
                      <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                        <span className="font-bold block text-[11px] text-amber-700 dark:text-amber-400">
                          ⚡ Suggestions for Professor:
                        </span>
                        <p className="mt-0.5">{fb.improvementSuggestions}</p>
                      </div>
                    )}

                    {fb.comments && !fb.positiveHighlights && (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        &ldquo;{fb.comments}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Faculty Acknowledgment Action */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  {fb.facultyAcknowledgement ? (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs">
                      <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Acknowledged by You</span>
                        </span>
                        <button
                          onClick={() => {
                            setActiveAckFeedback(fb);
                            setAckNote(fb.facultyAcknowledgement?.facultyNote || "");
                          }}
                          className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        >
                          Edit Note
                        </button>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 italic">
                        &ldquo;{fb.facultyAcknowledgement.facultyNote}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAckFeedback(fb);
                        setAckNote("");
                      }}
                      className="w-full py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-700 dark:text-blue-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Acknowledge &amp; Leave Action Note</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No feedback submissions match the selected filters.
            </p>
            <p className="text-xs text-slate-400">
              When students complete and evaluate modules for {selectedCourseCode}, their ratings will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ─── MODAL: FACULTY ACKNOWLEDGMENT & ACTION NOTE ─── */}
      {activeAckFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {activeAckFeedback.courseCode} • Module {activeAckFeedback.moduleNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  Acknowledge Student Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Your note will be displayed back to students on their portal to show instructional responsiveness.
                </p>
              </div>
              <button
                onClick={() => setActiveAckFeedback(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Student remarks summary */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <span className="text-slate-500 font-bold block">Student Suggestion:</span>
              <p className="italic text-slate-800 dark:text-slate-200">
                &ldquo;
                {activeAckFeedback.improvementSuggestions ||
                  activeAckFeedback.comments ||
                  "Constructive feedback"}
                &rdquo;
              </p>
            </div>

            {/* Action Response Form */}
            <form onSubmit={handleSaveAcknowledgment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Faculty Action Note &amp; Calibration Plan:
                </label>
                <textarea
                  rows={4}
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="e.g. Thank you for pointing this out. In the upcoming module, I will include more live coding demonstrations and share code templates ahead of class..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAckFeedback(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAck}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmittingAck ? "Saving..." : "Publish Acknowledgment Note"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
