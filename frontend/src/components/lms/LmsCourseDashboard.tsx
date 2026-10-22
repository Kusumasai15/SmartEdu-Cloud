"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Search,
  CheckCircle2,
  FileText,
  BrainCircuit,
  Clock,
  Award,
  MessageSquare,
} from "lucide-react";
import { useAcademicData, SyncCourse } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";

interface Props {
  enrolledCourses?: SyncCourse[];
  onSelectCourse?: (courseCode: string) => void;
  onNavigateTab?: (tab: string) => void;
  onBack?: () => void;
}

export function LmsCourseDashboard({ enrolledCourses, onSelectCourse, onNavigateTab, onBack }: Props) {
  const { user } = useAuth();
  const {
    courses: syncCourses,
    currentSemester,
    activeSemesterFilter,
    setActiveSemesterFilter,
    semesterHistory,
    studentAttendancePct,
    attendanceSessions,
    studentLeaves,
  } = useAcademicData();

  const getCourseAttendanceInfo = useCallback(
    (courseCode: string) => {
      const codeClean = (courseCode || "").toLowerCase().trim();
      const codeCleanNoDash = codeClean.replace(/[^a-z0-9]/g, "");
      const sessions = (attendanceSessions || []).filter((s) => {
        const sc = (s.courseCode || "").toLowerCase().trim();
        const scNoDash = sc.replace(/[^a-z0-9]/g, "");
        return sc === codeClean || (scNoDash && scNoDash === codeCleanNoDash);
      });

      if (sessions.length === 0) {
        return {
          hasSessions: false,
          conducted: 0,
          attended: 0,
          percentage: 100,
          isEligible: true,
          label: "0 Sessions Conducted",
        };
      }

      let attended = 0;
      sessions.forEach((s) => {
        if (Array.isArray(s.records) && s.records.length > 0) {
          const myRec = s.records.find((r: any) => {
            const rId = r.studentId || r.student_id;
            const rRoll = (r.rollNo || r.student_identifier || "").toLowerCase().trim();
            const myRoll = (user?.student_identifier || "").toLowerCase().trim();
            const rName = (r.name || r.studentName || "").toLowerCase().trim();
            const myName = `${user?.first_name || ""} ${user?.last_name || ""}`.toLowerCase().trim();
            return (
              (user?.id && rId === user.id) ||
              (myRoll && rRoll === myRoll) ||
              (myName && rName && (rName.includes(myName) || myName.includes(rName)))
            );
          });
          if (myRec) {
            const st = (myRec.status || "").toUpperCase();
            if (
              st === "PRESENT" ||
              st === "P" ||
              st === "APPROVED_LEAVE" ||
              st === "ON_DUTY" ||
              st === "OD" ||
              st === "LEAVE"
            ) {
              attended++;
            }
            return;
          }
        }

        // Check if student has an authorized sanctioned leave covering this course
        const hasApprovedLeave = (studentLeaves || []).some((l) => {
          const isMine =
            (user?.id && l.studentId === user.id) ||
            (user?.email && l.studentEmail && l.studentEmail.toLowerCase().trim() === user.email.toLowerCase().trim());
          if (!isMine || l.status !== "APPROVED") return false;
          const affected = l.affectedCourseCodes;
          const coversCourse = !affected || affected.length === 0 || affected.some((c) => c.toLowerCase().trim() === codeClean);
          return coversCourse;
        });

        if (hasApprovedLeave || s.studentIsPresent !== false) attended++;
      });

      const pct = Math.round((attended / sessions.length) * 1000) / 10;
      const isEligible = pct >= 75;

      return {
        hasSessions: true,
        conducted: sessions.length,
        attended,
        percentage: pct,
        isEligible,
        label: `${pct}% (${attended}/${sessions.length} attended)`,
      };
    },
    [attendanceSessions, user, studentLeaves]
  );

  const studentSemMatch = (user?.className || (user as any)?.class_name || "").match(/Sem(?:ester)?\s*(\d+)/i) ||
    (user?.className || (user as any)?.class_name || "").match(/(\d+)(?:st|nd|rd|th)\s*Sem/i);
  const effectiveCurrentSemester = studentSemMatch
    ? parseInt(studentSemMatch[1], 10)
    : ((user as any)?.semester || (currentSemester && currentSemester > 1 ? currentSemester : 5));

  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    if (activeSemesterFilter && activeSemesterFilter > 1) return activeSemesterFilter;
    return effectiveCurrentSemester || 5;
  });
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (activeSemesterFilter && activeSemesterFilter > 1 && activeSemesterFilter !== selectedSemester) {
      setSelectedSemester(activeSemesterFilter);
    }
  }, [activeSemesterFilter]);

  // Ensure default matches student's active semester
  useEffect(() => {
    if (effectiveCurrentSemester && (!activeSemesterFilter || activeSemesterFilter === 1)) {
      setSelectedSemester(effectiveCurrentSemester);
      if (setActiveSemesterFilter) {
        setActiveSemesterFilter(effectiveCurrentSemester);
      }
    }
  }, [effectiveCurrentSemester, activeSemesterFilter, setActiveSemesterFilter]);

  const handleSelectSemester = (sem: number) => {
    setSelectedSemester(sem);
    if (setActiveSemesterFilter) {
      setActiveSemesterFilter(sem);
    }
  };

  const baseCourses = Array.isArray(enrolledCourses) ? enrolledCourses : [];

  const displayedCourses = useMemo(() => {
    // 1. If viewing the student's current active semester, show all their enrolled subjects
    if (selectedSemester === effectiveCurrentSemester) {
      return baseCourses;
    }

    const filtered = baseCourses.filter((c) => {
      if (c.semester) {
        const match = String(c.semester).match(/\d+/);
        if (match && parseInt(match[0], 10) === selectedSemester) return true;
      }
      if (Array.isArray(c.assignedClasses)) {
        for (const cls of c.assignedClasses) {
          const match = String(cls).match(/Sem(?:ester)?\s*(\d+)/i);
          if (match && parseInt(match[1], 10) === selectedSemester) return true;
        }
      }
      return false;
    });

    return filtered;
  }, [baseCourses, selectedSemester, effectiveCurrentSemester]);

  const pastSemesterRecord = useMemo(() => {
    return semesterHistory?.find((sh) => sh.semesterNumber === selectedSemester);
  }, [semesterHistory, selectedSemester]);

  const filteredCurrentCourses = useMemo(() => {
    if (!searchQuery.trim()) return displayedCourses;
    const q = searchQuery.toLowerCase().trim();
    return displayedCourses.filter((c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.instructor || "").toLowerCase().includes(q)
    );
  }, [displayedCourses, searchQuery]);

  const isCurrentTerm = selectedSemester === effectiveCurrentSemester;
  const totalSemestersToShow = Math.min(8, Math.max(effectiveCurrentSemester, 5));

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* Editorial Header */}
      <div className="flex items-start gap-4 pt-1">
        <button
          onClick={() => {
            if (onBack) onBack();
            else if (onNavigateTab) onNavigateTab("overview");
          }}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 mt-0.5"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-slate-900 dark:text-white">
            My courses
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your subjects this semester — and a record of earlier ones
          </p>
        </div>
      </div>

      {/* Semester Pills Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
        <span className="text-[11px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mr-1">
          SEMESTER
        </span>

        {Array.from({ length: totalSemestersToShow }, (_, i) => i + 1).map((sem) => {
          const isThisCurrent = sem === effectiveCurrentSemester;
          const isSelected = sem === selectedSemester;

          return (
            <button
              key={sem}
              onClick={() => handleSelectSemester(sem)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm transition-all shadow-2xs cursor-pointer ${
                isSelected
                  ? "bg-[#8B5CF6] text-white shadow-purple-500/20"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span>Semester {sem}</span>
              {isThisCurrent && (
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                  }`}
                >
                  CURRENT
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {isCurrentTerm || displayedCourses.length > 0 || !pastSemesterRecord ? (
        <div className="space-y-5">
          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered subjects, code, or professor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab?.("module-feedback")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Module Feedback</span>
              </button>

              <button
                onClick={() => onNavigateTab?.("case-studies")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <BrainCircuit className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>AI Case Studies</span>
              </button>

              <button
                onClick={() => onNavigateTab?.("gradebook")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Award className="h-3.5 w-3.5 text-amber-600" />
                <span>Internal Marks</span>
              </button>
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCurrentCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCurrentCourses.map((c) => {
                const attInfo = getCourseAttendanceInfo(c.code);
                const isEligible = attInfo.isEligible;
                const attVal = attInfo.percentage;

                return (
                  <div
                    key={c.id || c.code}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Top Tag Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                          {c.code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {c.credits || 4} Credits
                        </span>
                      </div>

                      {/* Course Title & Faculty */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {c.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.instructor || (c as any).faculty || "Faculty Instructor"}
                        </p>
                      </div>

                      {/* Metrics Progress */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Attendance</span>
                          {attInfo.hasSessions ? (
                            <span
                              className={`font-mono font-bold ${
                                isEligible ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {attVal}% {isEligible ? "(Eligible)" : "(Shortage)"}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium text-[11px]">
                              0 Sessions Conducted
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              !attInfo.hasSessions
                                ? "bg-slate-300 dark:bg-slate-600"
                                : isEligible
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${attInfo.hasSessions ? Math.min(attVal, 100) : 0}%` }}
                          />
                        </div>
                        {attInfo.hasSessions && (
                          <div className="text-[10px] text-slate-400 font-mono text-right">
                            {attInfo.attended} / {attInfo.conducted} classes recorded
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (onSelectCourse) onSelectCourse(c.code);
                          if (onNavigateTab) onNavigateTab("assignments");
                        }}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Tasks &amp; Labs
                      </button>

                      <Link
                        href={`/courses/${c.code || c.id}/learn`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <span>Open Course</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Courses Found for Semester {selectedSemester}
              </p>
              <p className="text-xs text-slate-400">
                Registered curriculum subjects for Semester {selectedSemester} will appear here.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Past Semesters Archive Record from Transcript */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Semester {selectedSemester} Academic Transcript Record
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Archived course completions, credits earned, and awarded grade points
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Term Completed</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Course Code</th>
                    <th className="py-2.5 px-4">Subject Title</th>
                    <th className="py-2.5 px-3 text-center">Credits</th>
                    <th className="py-2.5 px-4 text-center">Grade Awarded</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pastSemesterRecord.courses.map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                        {row.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {row.name}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{row.credits}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        ✓ Passed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
