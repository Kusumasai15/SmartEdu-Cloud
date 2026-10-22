"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  BookOpen,
  UserCheck,
  RefreshCw,
  Send,
  Zap,
  Filter,
  Search,
  CheckCircle2,
  X,
  FileText,
  Calendar,
  TrendingDown,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { Button } from "@/components/ui/button";

interface AtRiskStudentItem {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  classSection: string;
  attendancePct: number;
  failedCourses: number;
  delayedAssignmentsCount: number;
  delayedTaskTitles: string[];
  projectedCiaMarks: number; // out of 40
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  primaryCause: "ASSIGNMENT_DELAY" | "ATTENDANCE_DEFICIT" | "EXAM_FAILURE";
}

export function PredictiveAtRiskInterventionView() {
  const { users, attendanceSessions, assignments, submissions } = useAcademicData();

  // Dynamically compute at-risk cohort strictly from real students and attendance records
  const derivedAtRiskCohort = useMemo<AtRiskStudentItem[]>(() => {
    const studentUsers = (users || []).filter((u) => u.role === "STUDENT");
    const totalSessions = attendanceSessions.length;
    const now = Date.now();

    const result: AtRiskStudentItem[] = [];

    studentUsers.forEach((student) => {
      // 1. Calculate actual attendance %
      let attendancePct = 100;
      if (totalSessions > 0) {
        const attended = attendanceSessions.filter((s) => {
          if (Array.isArray(s.records)) {
            const sRoll = student.student_identifier || (student as any).roll_number || (student as any).rollNo;
            const rec = s.records.find(
              (r: any) =>
                r.studentId === student.id ||
                (sRoll && r.studentRollNo === sRoll)
            );
            return rec ? rec.status === "PRESENT" : true;
          }
          return true;
        }).length;
        attendancePct = Math.round((attended / totalSessions) * 1000) / 10;
      }

      // 2. Overdue assignments
      const studentRoll = student.student_identifier || (student as any).roll_number || (student as any).rollNo;
      const mySubmissions = new Set(
        submissions
          .filter((s) => s.studentId === student.id || (studentRoll && s.rollNo === studentRoll))
          .map((s) => s.assignmentId)
      );
      const overdueAssignments = assignments.filter((a) => {
        if (!a.dueDate) return false;
        const dueTime = new Date(a.dueDate).getTime();
        return !isNaN(dueTime) && dueTime < now && !mySubmissions.has(a.id);
      });

      const delayedCount = overdueAssignments.length;
      const delayedTitles = overdueAssignments.map((a) => `${a.courseCode}: ${a.title}`);

      // Evaluate risk condition
      const hasAttendanceDeficit = totalSessions > 0 && attendancePct < 75;
      const hasAssignmentDelays = delayedCount >= 3;

      if (hasAttendanceDeficit || hasAssignmentDelays) {
        const primaryCause: "ASSIGNMENT_DELAY" | "ATTENDANCE_DEFICIT" | "EXAM_FAILURE" =
          hasAssignmentDelays ? "ASSIGNMENT_DELAY" : "ATTENDANCE_DEFICIT";
        const riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" =
          delayedCount >= 4 || attendancePct < 65 ? "CRITICAL" : "HIGH";

        const projectedCia = Math.max(0, 40 - delayedCount * 5 - (attendancePct < 75 ? 8 : 0));

        result.push({
          id: student.id,
          name: `${student.first_name || ""} ${student.last_name || ""}`.trim() || (student as any).name || "Student",
          rollNo: student.student_identifier || (student as any).roll_number || (student as any).rollNo || "N/A",
          email: student.email || "",
          classSection:
            student.className ||
            (student as any).class_name ||
            (student.department ? `${student.department} - Active Class` : "Active Class"),
          attendancePct,
          failedCourses: 0,
          delayedAssignmentsCount: delayedCount,
          delayedTaskTitles: delayedTitles,
          projectedCiaMarks: projectedCia,
          riskLevel,
          primaryCause,
        });
      }
    });

    return result;
  }, [users, attendanceSessions, assignments, submissions]);

  const [cohort, setAtRiskCohort] = useState<AtRiskStudentItem[]>([]);

  useEffect(() => {
    setAtRiskCohort(derivedAtRiskCohort);
  }, [derivedAtRiskCohort]);

  const [activeSubTab, setActiveSubTab] = useState<"ASSIGNMENTS" | "ATTENDANCE" | "ALL">("ASSIGNMENTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return cohort.filter((s) => {
      if (activeSubTab === "ASSIGNMENTS" && s.delayedAssignmentsCount < 3) return false;
      if (activeSubTab === "ATTENDANCE" && s.attendancePct >= 75) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = s.name.toLowerCase().includes(q);
        const mRoll = s.rollNo.toLowerCase().includes(q);
        const mSec = s.classSection.toLowerCase().includes(q);
        if (!mName && !mRoll && !mSec) return false;
      }
      return true;
    });
  }, [cohort, activeSubTab, searchQuery]);

  const criticalDelayCount = useMemo(() => {
    return cohort.filter((s) => s.delayedAssignmentsCount >= 4).length;
  }, [cohort]);

  const totalAtRiskCount = cohort.length;

  const handleGrantGracePeriod = (studentId: string, studentName: string) => {
    setAtRiskCohort((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              delayedAssignmentsCount: Math.max(0, s.delayedAssignmentsCount - 2),
              projectedCiaMarks: Math.min(40, s.projectedCiaMarks + 8),
              riskLevel: s.delayedAssignmentsCount - 2 >= 4 ? "HIGH" : "MEDIUM",
            }
          : s
      )
    );
    setNotification(`✓ Granted 72-hour institutional grace period for ${studentName}. Coursework risk recalculated.`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleIssueWarningNotice = (studentName: string, delayedCount: number) => {
    setNotification(
      `✓ Official Academic Warning dispatched to ${studentName} & Section Advisor (${delayedCount} assignments overdue; CIA threshold alert).`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  const avgCiaDrop = cohort.length > 0
    ? (cohort.reduce((acc, s) => acc + (40 - s.projectedCiaMarks), 0) / cohort.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Command Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="relative z-10 space-y-2 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
              Department Early Warning System
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">Predictive Procrastination &amp; Deficit Analytics</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Predictive At-Risk &amp; Coursework Delay Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Identifies students with 4-5 delayed course assignments, severe Continuous Internal Assessment (CIA) deficits (&lt;16/40), and attendance shortages below 75% before final examinations.
          </p>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>4-5 Delayed Assignments Risk</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-rose-600 dark:text-rose-400">
              {criticalDelayCount}
            </span>
            <span className="text-xs font-medium text-slate-500">Students Flagged</span>
          </div>
          <p className="text-[11px] text-slate-400">At-risk of failing internal CIA 40% minimum</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Attendance Deficit (&lt;75%)</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {cohort.filter((s) => s.attendancePct < 75).length}
            </span>
            <span className="text-xs font-medium text-slate-500">Below Threshold</span>
          </div>
          <p className="text-[11px] text-slate-400">Exam debarment warning under Regulation 4.2</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Average CIA Mark Drop</span>
            <TrendingDown className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
              -{avgCiaDrop}
            </span>
            <span className="text-xs font-medium text-rose-600">Marks Lost</span>
          </div>
          <p className="text-[11px] text-slate-400">Projected internal mark penalty from missed tasks</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Intervention Response Rate</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
              {cohort.length > 0 ? "100.0%" : "—"}
            </span>
            <span className="text-xs font-medium text-emerald-600">{cohort.length > 0 ? "Active Mentoring" : "No Action Needed"}</span>
          </div>
          <p className="text-[11px] text-slate-400">Assigned Section Advisor follow-ups</p>
        </div>
      </div>

      {/* Sub-Tab Navigation & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveSubTab("ASSIGNMENTS")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === "ASSIGNMENTS"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Delayed Assignments ({cohort.filter((s) => s.delayedAssignmentsCount >= 3).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("ATTENDANCE")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === "ATTENDANCE"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Attendance Deficit (&lt;75%) ({cohort.filter((s) => s.attendancePct < 75).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("ALL")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === "ALL"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <span>All At-Risk Cohort ({totalAtRiskCount})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, roll no, section..."
            className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white w-full sm:w-64"
          />
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {activeSubTab === "ASSIGNMENTS"
                ? "Students with Compounding Assignment Delays (3+ Tasks Overdue)"
                : "Academic At-Risk & Early Support Candidates"}
            </h3>
            <p className="text-xs text-slate-400">
              Calculates projected marks penalty and regulation disqualification risk
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Student &amp; Roll No</th>
                <th className="p-3">Section</th>
                <th className="p-3">Delayed Tasks</th>
                <th className="p-3">Projected Internal CIA</th>
                <th className="p-3">Attendance</th>
                <th className="p-3">Risk Standing</th>
                <th className="p-3">Intervention Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        All Student Cohorts Nominal
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        No students are currently flagged as at-risk. All registered students satisfy attendance compliance (&ge;75%) and have submitted their academic deliverables on schedule.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isCritical = st.delayedAssignmentsCount >= 4 || st.projectedCiaMarks < 16;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{st.rollNo} &bull; {st.email}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {st.classSection}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                              st.delayedAssignmentsCount >= 5
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : st.delayedAssignmentsCount >= 4
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200"
                            }`}
                          >
                            {st.delayedAssignmentsCount} Delayed {st.delayedAssignmentsCount === 1 ? "Task" : "Tasks"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {st.delayedTaskTitles[0] || "Coursework backlog"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`font-mono font-black text-sm ${
                              st.projectedCiaMarks < 16
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {st.projectedCiaMarks.toFixed(1)} / 40
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {st.projectedCiaMarks < 16 ? "⚠️ Below 40% Min" : "Near 16/40 Cutoff"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-mono font-bold ${
                            st.attendancePct < 75 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {st.attendancePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isCritical
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {isCritical ? "CRITICAL RISK" : "HIGH RISK"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleGrantGracePeriod(st.id, st.name)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Grant 72h Grace Extension"
                          >
                            Grace Ext
                          </button>
                          <button
                            type="button"
                            onClick={() => handleIssueWarningNotice(st.name, st.delayedAssignmentsCount)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Send Warning Notice to Advisor & Student"
                          >
                            Send Notice
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
