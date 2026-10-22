"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  Search,
  Filter,
  GraduationCap,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { exportToExcel } from "@/lib/excel-utils";

export function AdminAnalyticsView() {
  const {
    courses,
    departments,
    users,
    attendanceSessions,
    calendarSchedules,
    currentSemester,
  } = useAcademicData();

  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Key Institutional Metrics
  const studentUsers = useMemo(() => users.filter((u) => u.role === "STUDENT"), [users]);
  const facultyUsers = useMemo(() => users.filter((u) => u.role === "FACULTY" || u.role === "HOD"), [users]);

  const totalEnrollments = studentUsers.length * 6; // ~6 courses per student
  const totalConductedSessions = attendanceSessions.length;

  const avgAttendance = useMemo(() => {
    if (attendanceSessions.length === 0) return 0;
    const totalPres = attendanceSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
    const totalPoss = attendanceSessions.reduce((acc, s) => acc + (s.totalCount || 0), 0);
    return totalPoss > 0 ? Math.round((totalPres / totalPoss) * 1000) / 10 : 0;
  }, [attendanceSessions]);

  // Departmental distribution
  const departmentStats = useMemo(() => {
    return departments.map((dept) => {
      const deptCourses = courses.filter((c) => (c as any).department_id === dept.id || (c as any).department_code === dept.code || (c as any).department === dept.name);
      const studentCount = studentUsers.filter((u) => u.department === dept.name || u.department === dept.code || (u as any).department_id === dept.id).length;
      const facultyCount = facultyUsers.filter((u) => u.department === dept.name || u.department === dept.code || (u as any).department_id === dept.id).length;

      const deptCourseIds = new Set(deptCourses.map((c) => c.id));
      const deptCourseCodes = new Set(deptCourses.map((c) => (c.code || (c as any).course_code || "").toLowerCase()));
      const deptSessions = attendanceSessions.filter((s) => deptCourseCodes.has((s.courseCode || "").toLowerCase()) || deptCourseIds.has((s as any).courseId));
      let attendanceRate = 0;
      if (deptSessions.length > 0) {
        const pres = deptSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
        const poss = deptSessions.reduce((acc, s) => acc + (s.totalCount || 0), 0);
        attendanceRate = poss > 0 ? Math.round((pres / poss) * 1000) / 10 : 0;
      }

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        courseCount: deptCourses.length,
        studentCount,
        facultyCount,
        attendanceRate,
        avgGpa: "—",
        status: "ACTIVE",
      };
    });
  }, [departments, courses, studentUsers, facultyUsers, attendanceSessions]);

  const filteredDepts = useMemo(() => {
    return departmentStats.filter((d) => {
      if (selectedDept !== "ALL" && d.code !== selectedDept) return false;
      if (searchQuery.trim() && !d.name.toLowerCase().includes(searchQuery.toLowerCase()) && !d.code.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [departmentStats, selectedDept, searchQuery]);

  const handleExportData = () => {
    const exportRows = filteredDepts.map((d) => ({
      Department: d.name,
      Code: d.code,
      Courses: d.courseCount,
      Students: d.studentCount,
      Faculty: d.facultyCount,
      "Attendance %": `${d.attendanceRate}%`,
      "Mean GPA": d.avgGpa,
    }));
    exportToExcel(exportRows, "Institutional_Academic_Analytics_Report");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── HEADER BAR ─── */}
      <div className="p-6 sm:p-7 rounded-2xl bg-blue-50 border border-blue-200 text-slate-900 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-semibold">
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              <span>Campus Intelligence &amp; Institutional Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Academic Operations &amp; Performance Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Comprehensive telemetry across student enrollments, faculty workloads, attendance compliance, and departmental performance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportData}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Analytics (Excel)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TOP KPI TILES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Enrolled Students</span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {studentUsers.length}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            <span>Active Admissions in Sem {currentSemester}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Active Faculty</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <GraduationCap className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {facultyUsers.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Professors &amp; Department HODs
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Classroom Attendance</span>
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {avgAttendance}%
          </div>
          <p className="text-[11px] text-sky-600 font-semibold">
            Institutional Roll Call Compliance
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Catalog Courses</span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {courses.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Across {departments.length} Departments
          </p>
        </div>
      </div>

      {/* ─── DEPARTMENTAL PERFORMANCE & LEAGUE TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Departmental Academic League &amp; Operational Analytics</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparative cohort metrics across constituent university departments
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Department / School</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-center">Courses</th>
                <th className="py-3 px-4 text-center">Students</th>
                <th className="py-3 px-4 text-center">Faculty</th>
                <th className="py-3 px-4 text-center">Avg Attendance</th>
                <th className="py-3 px-4 text-center">Mean GPA</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDepts.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {dept.code.slice(0, 2)}
                    </div>
                    <span>{dept.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                    {dept.code}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                    {dept.courseCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                    {dept.studentCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                    {dept.facultyCount}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                        dept.attendanceRate >= 85
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {dept.attendanceRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold font-mono text-blue-600 dark:text-blue-400">
                    {dept.avgGpa !== "—" ? `${dept.avgGpa} / 10` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                      ACCREDITED
                    </span>
                  </td>
                </tr>
              ))}
              {filteredDepts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No departmental data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
