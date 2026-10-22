"use client";

import React, { useMemo } from "react";
import { Activity, ArrowRight, Award, BookOpen, Building2, CalendarCheck, Download, GraduationCap, ShieldAlert, Users } from "lucide-react";
import { LeadershipOverview, VCInstitutionAttendanceAnalytics, VCInstitutionResultAnalytics } from "@/types";
import { exportToExcel } from "@/lib/excel-utils";
import { VcAnalyticsView } from "@/components/vc/VcAnalyticsView";

interface VcOverviewTabProps {
  vcName: string;
  overview: LeadershipOverview | null;
  results: VCInstitutionResultAnalytics | null;
  attendance: VCInstitutionAttendanceAnalytics | null;
  onSelectTab: (tabId: string) => void;
  onOpenDirectiveModal: () => void;
}

const showMetric = (value: number | null | undefined, suffix = "") =>
  value === null || value === undefined ? "Not available" : `${value.toLocaleString()}${suffix}`;

export function VcOverviewTab({ vcName, overview, results, attendance, onSelectTab, onOpenDirectiveModal }: VcOverviewTabProps) {
  const totals = overview?.totals;
  const studentFacultyRatio = totals?.faculty ? Number((totals.students / totals.faculty).toFixed(1)) : null;
  const enrollmentsPerCourse = totals?.courses ? Number((totals.enrollments / totals.courses).toFixed(1)) : null;
  const evaluatedCoverage = totals?.students
    ? Number((((results?.total_students_evaluated || 0) / totals.students) * 100).toFixed(1))
    : null;

  const departmentRows = useMemo(() => {
    const resultByDepartment = new Map((results?.department_rankings || []).map((row) => [row.department_id, row]));
    const attendanceByDepartment = new Map((attendance?.department_breakdown || []).map((row) => [row.department_id, row]));
    return (overview?.departments || []).map((department) => {
      const result = resultByDepartment.get(department.id);
      const attendanceRow = attendanceByDepartment.get(department.id);
      return {
        ...department,
        averageGpa: result?.average_gpa ?? null,
        passRate: result?.pass_rate ?? null,
        attendance: attendanceRow?.average_attendance ?? null,
      };
    });
  }, [overview, results, attendance]);

  const attentionRows = useMemo(() => departmentRows.map((department) => {
    const signals: string[] = [];
    if (department.pending_result_courses > 0) signals.push(`${department.pending_result_courses} result approvals`);
    if (department.attendance !== null && department.attendance < 75) signals.push(`${department.attendance}% attendance`);
    if (department.passRate !== null && department.passRate < 70) signals.push(`${department.passRate}% pass rate`);
    return { ...department, signals };
  }).filter((department) => department.signals.length > 0), [departmentRows]);

  const handleExport = () => {
    exportToExcel(departmentRows.map((department) => ({
      Department: department.name,
      Code: department.code,
      School: department.school || "",
      Students: department.students,
      Faculty: department.faculty,
      Courses: department.courses,
      Enrollments: department.enrollments,
      "Average GPA": department.averageGpa ?? "Not available",
      "Pass Rate": department.passRate ?? "Not available",
      Attendance: department.attendance ?? "Not available",
      "Pending Result Approvals": department.pending_result_courses,
    })), `UniFlow_Institutional_Overview_${new Date().toISOString().slice(0, 10)}`);
  };

  const metrics = [
    { label: "Students", value: showMetric(totals?.students), detail: `${totals?.enrollments || 0} active enrollments`, icon: GraduationCap, tab: "students" },
    { label: "Faculty", value: showMetric(totals?.faculty), detail: studentFacultyRatio === null ? "Ratio not available" : `1:${studentFacultyRatio} student ratio`, icon: Users, tab: "faculty" },
    { label: "Active courses", value: showMetric(totals?.courses), detail: enrollmentsPerCourse === null ? "Utilization not available" : `${enrollmentsPerCourse} enrollments per course`, icon: BookOpen, tab: "curriculum" },
    { label: "Average attendance", value: showMetric(attendance?.institution_average_percentage, "%"), detail: `${attendance?.total_below_threshold || 0} students below threshold`, icon: CalendarCheck, tab: "attendance" },
    { label: "Institution GPA", value: showMetric(results?.institution_average_gpa), detail: `${results?.total_students_evaluated || 0} evaluated students`, icon: Award, tab: "results" },
    { label: "Pass rate", value: showMetric(results?.institution_pass_rate, "%"), detail: `${results?.total_at_risk_students || 0} students at academic risk`, icon: Activity, tab: "intelligence" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-700">Office of the Vice-Chancellor</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Institution overview</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Welcome, {vcName}. Review current academic performance, participation, staffing, and items requiring university-level attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="btn-saas-secondary min-h-10 gap-2 text-xs"><Download className="h-4 w-4" /> Export report</button>
            <button onClick={onOpenDirectiveModal} className="btn-saas-primary min-h-10 gap-2 text-xs"><ShieldAlert className="h-4 w-4" /> Issue directive</button>
          </div>
        </div>
      </section>

      <section aria-label="Institution metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button key={metric.label} onClick={() => onSelectTab(metric.tab)} className="group flex min-h-28 items-start justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-blue-300 hover:shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{metric.detail}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></span>
            </button>
          );
        })}
      </section>

      {/* Executive Institutional Analytics & Department Governance Matrix */}
      <VcAnalyticsView
        overview={overview}
        results={results}
        attendance={attendance}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div><h3 className="text-sm font-semibold text-slate-950">Department performance</h3><p className="text-xs text-slate-500">Current student, staffing, result, and attendance measures</p></div>
            <button onClick={() => onSelectTab("curriculum")} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">View departments <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          {departmentRows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No department records are available.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-2.5 font-medium">Department</th><th className="px-3 py-2.5 text-right font-medium">Students</th><th className="px-3 py-2.5 text-right font-medium">Faculty</th><th className="px-3 py-2.5 text-right font-medium">GPA</th><th className="px-3 py-2.5 text-right font-medium">Pass rate</th><th className="px-4 py-2.5 text-right font-medium">Attendance</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{departmentRows.map((department) => (
                  <tr key={department.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{department.name}</p><p className="text-[11px] text-slate-500">{department.code}{department.school ? ` · ${department.school}` : ""}</p></td>
                    <td className="px-3 py-3 text-right text-slate-700">{department.students}</td><td className="px-3 py-3 text-right text-slate-700">{department.faculty}</td><td className="px-3 py-3 text-right font-medium text-slate-900">{department.averageGpa ?? "—"}</td><td className="px-3 py-3 text-right text-slate-700">{department.passRate === null ? "—" : `${department.passRate}%`}</td><td className="px-4 py-3 text-right text-slate-700">{department.attendance === null ? "—" : `${department.attendance}%`}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-semibold text-slate-950">Needs attention</h3><p className="text-xs text-slate-500">Measured exceptions requiring review</p></div>
          <div className="divide-y divide-slate-100">
            {attentionRows.length === 0 ? <div className="p-6 text-sm text-slate-500">No measured department exceptions are currently available.</div> : attentionRows.slice(0, 6).map((department) => (
              <button key={department.id} onClick={() => onSelectTab("curriculum")} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" /><span className="min-w-0"><span className="block truncate text-xs font-medium text-slate-900">{department.name}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{department.signals.join(" · ")}</span></span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Departments", value: showMetric(totals?.departments), icon: Building2 },
          { label: "Completed courses", value: showMetric(results?.total_courses_completed), icon: BookOpen },
          { label: "Attendance sessions", value: showMetric(attendance?.total_sessions_conducted), icon: CalendarCheck },
          { label: "Evaluation coverage", value: evaluatedCoverage === null ? "Not available" : `${evaluatedCoverage}%`, icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          return <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><Icon className="h-4 w-4 text-blue-700" /><p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p><p className="text-xs text-slate-500">{item.label}</p></div>;
        })}
      </section>
    </div>
  );
}
