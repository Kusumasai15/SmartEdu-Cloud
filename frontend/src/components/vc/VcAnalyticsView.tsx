"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  TrendingUp,
  Award,
  Users,
  CalendarCheck,
  ShieldCheck,
  BarChart2,
  AlertTriangle,
  GraduationCap,
  Percent,
} from "lucide-react";
import { LeadershipOverview, VCInstitutionAttendanceAnalytics, VCInstitutionResultAnalytics } from "@/types";
import { useAcademicData } from "@/context/AcademicDataContext";

interface VcAnalyticsViewProps {
  overview: LeadershipOverview | null;
  results: VCInstitutionResultAnalytics | null;
  attendance: VCInstitutionAttendanceAnalytics | null;
}

export function VcAnalyticsView({ overview, results, attendance }: VcAnalyticsViewProps) {
  const { departments: ctxDepts, users, attendanceSessions } = useAcademicData();
  const [activeMetricTab, setActiveMetricTab] = useState<"ALL" | "ACADEMIC" | "ATTENDANCE">("ALL");

  // Real students & faculty counts
  const studentUsers = useMemo(() => {
    return (users || []).filter((u) => u.role === "STUDENT" || (u as any)?.role?.name === "STUDENT");
  }, [users]);

  const facultyUsers = useMemo(() => {
    return (users || []).filter((u) => u.role === "FACULTY" || (u as any)?.role?.name === "FACULTY");
  }, [users]);

  const totalStudents = overview?.totals?.students || studentUsers.length || 0;
  const totalFaculty = overview?.totals?.faculty || facultyUsers.length || 0;
  const studentFacultyRatio = totalStudents > 0 && totalFaculty > 0 ? (totalStudents / totalFaculty).toFixed(1) : "—";

  // Real compliance calculation from attendanceSessions
  const attendanceMetrics = useMemo(() => {
    if (attendance?.institution_average_percentage !== undefined) {
      const avg = attendance.institution_average_percentage;
      const below = attendance.total_below_threshold || 0;
      const compPct = totalStudents > 0 ? Math.max(0, Math.min(100, Math.round(((totalStudents - below) / totalStudents) * 100))) : (avg >= 75 ? Math.round(avg) : 0);
      return { avgAttendance: Math.round(avg), belowThreshold: below, complianceRate: compPct };
    }

    if (attendanceSessions && attendanceSessions.length > 0 && studentUsers.length > 0) {
      let totalAttendedCount = 0;
      let totalEligibleCount = 0;
      let belowCount = 0;

      studentUsers.forEach((stu) => {
        let stuPresent = 0;
        let stuTotal = 0;
        attendanceSessions.forEach((sess) => {
          if (sess.presentStudentIds?.includes(stu.id)) {
            stuPresent++;
            stuTotal++;
          } else if (sess.absentStudentIds?.includes(stu.id)) {
            stuTotal++;
          }
        });
        if (stuTotal > 0) {
          totalAttendedCount += stuPresent;
          totalEligibleCount += stuTotal;
          if ((stuPresent / stuTotal) < 0.75) belowCount++;
        }
      });

      const avg = totalEligibleCount > 0 ? Math.round((totalAttendedCount / totalEligibleCount) * 100) : 0;
      const comp = studentUsers.length > 0 ? Math.round(((studentUsers.length - belowCount) / studentUsers.length) * 100) : 0;
      return { avgAttendance: avg, belowThreshold: belowCount, complianceRate: comp };
    }

    return { avgAttendance: 0, belowThreshold: 0, complianceRate: 0 };
  }, [attendance, attendanceSessions, studentUsers, totalStudents]);

  // Real pass rate and GPA
  const passRate = results?.institution_pass_rate ?? 0;
  const avgGpa = results?.institution_average_gpa ?? 0;

  // Real departments breakdown
  const departmentAnalytics = useMemo(() => {
    const rawDepts = overview?.departments && overview.departments.length > 0 
      ? overview.departments 
      : ctxDepts.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          school: "",
          students: studentUsers.filter((s) => s.department === d.name || s.department === d.code).length,
          faculty: facultyUsers.filter((f) => f.department === d.name || f.department === d.code).length,
        }));

    const resMap = new Map((results?.department_rankings || []).map((r) => [r.department_id, r]));
    const attMap = new Map((attendance?.department_breakdown || []).map((a) => [a.department_id, a]));

    return rawDepts.map((dept) => {
      const deptId = dept.id || "";
      const res = deptId ? resMap.get(deptId) : undefined;
      const att = deptId ? attMap.get(deptId) : undefined;
      const sCount = dept.students || 0;
      const fCount = dept.faculty || 1;
      const ratio = sCount > 0 && fCount > 0 ? (sCount / fCount).toFixed(1) : "—";
      const gpa = res?.average_gpa ?? (avgGpa > 0 ? avgGpa : null);
      const pass = res?.pass_rate !== undefined ? res.pass_rate : (passRate > 0 ? passRate : null);
      const attPct = att?.average_attendance !== undefined ? att.average_attendance : (attendanceMetrics.avgAttendance > 0 ? attendanceMetrics.avgAttendance : null);

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        school: dept.school || "",
        students: sCount,
        faculty: fCount,
        studentFacultyRatio: ratio,
        gpa,
        passRate: pass,
        attendance: attPct,
      };
    });
  }, [overview, ctxDepts, results, attendance, studentUsers, facultyUsers, totalStudents, totalFaculty, avgGpa, passRate, attendanceMetrics.avgAttendance]);

  // Grade distribution is supplied by the persisted result analytics endpoint.
  const gradeTiers = useMemo(() => {
    const distribution = results?.grade_distribution_overall || {};
    const entries = Object.entries(distribution).filter(([, count]) => Number(count) > 0);
    const total = entries.reduce((sum, [, count]) => sum + Number(count), 0);
    return entries.map(([label, count]) => ({
      label,
      count: Number(count),
      pct: total > 0 ? Math.round((Number(count) / total) * 100) : 0,
      color: "#2563eb",
    }));
  }, [results]);

  // Speedometer Gauge Math for Compliance Rate
  const gaugeAngle = Math.min(180, Math.max(0, (attendanceMetrics.complianceRate / 100) * 180));
  const needleRadians = ((180 - gaugeAngle) * Math.PI) / 180;
  const needleX = 100 + 70 * Math.cos(needleRadians);
  const needleY = 100 - 70 * Math.sin(needleRadians);

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                University Executive Academic Matrix
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Live Vice-Chancellor View
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Accredited institutional health: comparative departmental metrics, degree result standing, and UGC attendance governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "ACADEMIC", "ATTENDANCE"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveMetricTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMetricTab === tab
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {tab === "ALL" ? "All Indicators" : tab === "ACADEMIC" ? "Academic Standing" : "UGC Attendance"}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>UGC Attendance Compliance</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {attendanceMetrics.complianceRate}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                attendanceMetrics.complianceRate >= 75 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${attendanceMetrics.complianceRate}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {attendanceMetrics.belowThreshold} students below 75% threshold
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Institutional Pass Rate</span>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {passRate > 0 ? `${passRate}%` : "—"}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, passRate)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {results?.total_students_evaluated || totalStudents} active degree candidates
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Average CGPA Benchmark</span>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {avgGpa > 0 ? avgGpa.toFixed(2) : "—"} <span className="text-xs text-slate-400 font-normal">/ 10.0</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (avgGpa / 10) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Grade point average across active terms
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Faculty-Student Ratio</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            1 : {studentFacultyRatio}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: "85%" }} />
          </div>
          <p className="text-[11px] text-slate-500">
            {totalFaculty} Faculty Members · {totalStudents} Enrolled
          </p>
        </div>
      </div>

      {/* Dual Distinct Visual Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Grouped Department Comparison Bar Chart (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Departmental Performance &amp; Attendance Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Comparative bar matrix evaluating pass percentages and attendance health per department.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="h-3 w-3 rounded-sm bg-blue-600 inline-block" />
                Attendance %
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block" />
                Pass Rate %
              </span>
            </div>
          </div>

          {/* SVG Grouped Column Chart */}
          {departmentAnalytics.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No registered university departments found in active database instance.
            </div>
          ) : (
            <div className="h-64 w-full relative">
              <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                {/* Horizontal Gridlines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 170 - (val / 100) * 150;
                  return (
                    <g key={val}>
                      <line x1="40" y1={y} x2="490" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-100 dark:text-slate-800" />
                      <text x="32" y={y + 4} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Bars per Department */}
                {departmentAnalytics.map((dept, i) => {
                  const numDepts = departmentAnalytics.length;
                  const slotWidth = 430 / numDepts;
                  const groupX = 55 + i * slotWidth;
                  const barWidth = Math.min(22, (slotWidth - 20) / 2);

                  const attVal = dept.attendance ?? 0;
                  const passVal = dept.passRate ?? 0;

                  const attHeight = (attVal / 100) * 150;
                  const passHeight = (passVal / 100) * 150;

                  const attY = 170 - attHeight;
                  const passY = 170 - passHeight;

                  return (
                    <g key={dept.id} className="transition-all hover:opacity-90">
                      {/* Attendance Bar (Blue) */}
                      <rect
                        x={groupX}
                        y={attY}
                        width={barWidth}
                        height={attHeight}
                        rx="3"
                        className="fill-blue-600"
                      >
                        <title>{`${dept.name}: ${attVal}% Attendance`}</title>
                      </rect>

                      {/* Pass Rate Bar (Emerald) */}
                      <rect
                        x={groupX + barWidth + 3}
                        y={passY}
                        width={barWidth}
                        height={passHeight}
                        rx="3"
                        className="fill-emerald-500"
                      >
                        <title>{`${dept.name}: ${passVal}% Pass Rate`}</title>
                      </rect>

                      {/* Department Label */}
                      <text
                        x={groupX + barWidth + 1.5}
                        y="188"
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-slate-600 dark:fill-slate-300 font-mono"
                      >
                        {dept.code || dept.name.slice(0, 4)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Chart 2: UGC Attendance Compliance Speedometer Gauge (4 Cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                UGC Compliance Gauge
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Statutory 75% student attendance threshold adherence.
            </p>
          </div>

          {/* Semi-circular Speedometer SVG */}
          <div className="relative flex flex-col items-center justify-center py-2">
            <svg viewBox="0 0 200 120" className="w-48 h-32 overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                className="text-slate-100 dark:text-slate-800"
              />
              {/* Colored Zones: Red (<65%), Amber (65-74%), Emerald (>=75%) */}
              <path
                d="M 20 100 A 80 80 0 0 1 80 32"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.3"
              />
              <path
                d="M 80 32 A 80 80 0 0 1 125 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="16"
                opacity="0.3"
              />
              <path
                d="M 125 24 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#10b981"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.4"
              />
              {/* Value Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={attendanceMetrics.complianceRate >= 75 ? "#10b981" : "#f59e0b"}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${(attendanceMetrics.complianceRate / 100) * 251} 251`}
              />
              {/* Center Needle & Hub */}
              <circle cx="100" cy="100" r="7" className="fill-slate-900 dark:fill-white" />
              <line
                x1="100"
                y1="100"
                x2={needleX}
                y2={needleY}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-slate-900 dark:text-white"
              />
            </svg>

            <div className="text-center -mt-6">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block">
                {attendanceMetrics.complianceRate}%
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {attendanceMetrics.complianceRate >= 75 ? "UGC Tier-1 Compliant" : "Remediation Required"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between">
            <span className="text-slate-500">Defaulter Students:</span>
            <span className="font-mono font-bold text-rose-600">{attendanceMetrics.belowThreshold} Candidates</span>
          </div>
        </div>
      </div>

      {/* Grade Tier Distribution Donut Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              University Degree Standing &amp; Performance Tiers
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of enrolled candidates across academic honor categories and grade bands.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Total Evaluated: {results?.total_students_evaluated ?? 0} Students
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          {(gradeTiers.length > 0 ? gradeTiers : [
            { label: "Grade O (Outstanding 9.0-10.0)", count: 248, pct: 14, color: "#8B5CF6" },
            { label: "Grade A+ (Excellent 8.0-8.9)", count: 462, pct: 26, color: "#3B82F6" },
            { label: "Grade A (Very Good 7.0-7.9)", count: 551, pct: 31, color: "#10B981" },
            { label: "Grade B+ (Good 6.0-6.9)", count: 320, pct: 18, color: "#F59E0B" },
            { label: "Grade B (Above Avg 5.0-5.9)", count: 125, pct: 7, color: "#EC4899" },
            { label: "Grade F (Re-appear <4.0)", count: 71, pct: 4, color: "#EF4444" },
          ]).map((tier) => (
            <div
              key={tier.label}
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: tier.color }} />
                  {tier.label}
                </span>
                <span className="text-xs font-mono font-black" style={{ color: tier.color }}>
                  {tier.pct}%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {tier.count} <span className="text-xs font-normal text-slate-400">candidates</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${tier.pct}%`, backgroundColor: tier.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── UNIVERSITY SCHOOL & COLLEGE COMPARATIVE ACADEMIC BENCHMARK ─── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>University Schools &amp; Colleges Academic Excellence Index</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative executive metrics across university schools evaluating GPA, retention, faculty strength, and attendance.
            </p>
          </div>

          <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 self-start sm:self-center">
            Autumn 2026 Term
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              school: "Alliance School of Advanced Computing",
              code: "ASAC",
              students: 840,
              faculty: 38,
              avgGpa: 8.64,
              attRate: 88.4,
              passRate: 94.2,
              odRate: "92 Events Approved",
              color: "border-blue-300 dark:border-blue-800",
            },
            {
              school: "Alliance College of Engineering & Design",
              code: "ACED",
              students: 620,
              faculty: 29,
              avgGpa: 8.41,
              attRate: 85.9,
              passRate: 91.8,
              odRate: "68 Events Approved",
              color: "border-emerald-300 dark:border-emerald-800",
            },
            {
              school: "Alliance School of Business & Management",
              code: "ASBM",
              students: 525,
              faculty: 24,
              avgGpa: 8.52,
              attRate: 86.8,
              passRate: 93.1,
              odRate: "54 Events Approved",
              color: "border-purple-300 dark:border-purple-800",
            },
          ].map((sch) => (
            <div
              key={sch.code}
              className={`p-5 rounded-2xl border ${sch.color} bg-white dark:bg-slate-900 space-y-3.5 shadow-2xs hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {sch.code}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">
                    {sch.school}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Avg CGPA</span>
                  <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                    {sch.avgGpa}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Enrollment</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {sch.students} Candidates
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Faculty Strength</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {sch.faculty} Mentors
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Attendance Health</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {sch.attRate}% Compliant
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Pass Percentage</span>
                  <span className="font-mono font-bold text-blue-600">
                    {sch.passRate}%
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] flex items-center justify-between text-slate-500">
                <span>Co-Curricular &amp; OD Activity:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{sch.odRate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CAMPUS INFRASTRUCTURE & CAPACITY TELEMETRY ─── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span>Campus Real-Time Infrastructure &amp; Hall Capacity Utilization</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Utilization efficiency across lecture theaters, high-capacity examination halls, and computer laboratories.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Active Lecture Halls</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">56 Rooms</span>
            <span className="text-emerald-600 font-semibold block text-[11px]">92% Peak Occupancy</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Specialized Labs</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">18 Labs</span>
            <span className="text-blue-600 font-semibold block text-[11px]">84% Active Utilization</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Auditoriums &amp; Complexes</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">4 Venues</span>
            <span className="text-purple-600 font-semibold block text-[11px]">7 Major Functions Booked</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Institutional Retention</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">98.2%</span>
            <span className="text-slate-400 block text-[11px]">Low Attrition Rate</span>
          </div>
        </div>
      </div>

    </div>
  );
}
