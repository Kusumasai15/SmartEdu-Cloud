"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Building2, CalendarCheck, Download, Search, Users } from "lucide-react";
import { VCInstitutionAttendanceAnalytics } from "@/types";
import { exportToExcel } from "@/lib/excel-utils";

interface Props { analytics: VCInstitutionAttendanceAnalytics | null; loading: boolean; }

export function VcAttendanceTab({ analytics, loading }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "BELOW_THRESHOLD" | "ON_TRACK">("ALL");
  const departments = useMemo(() => (analytics?.department_breakdown || []).filter((department) => {
    const matches = `${department.department_name} ${department.department_code}`.toLowerCase().includes(search.trim().toLowerCase());
    if (!matches) return false;
    if (filter === "BELOW_THRESHOLD") return department.average_attendance < 75;
    if (filter === "ON_TRACK") return department.average_attendance >= 75;
    return true;
  }), [analytics, filter, search]);

  const exportReport = () => {
    if (!analytics?.department_breakdown.length) return;
    exportToExcel(analytics.department_breakdown.map((department) => ({
      Department: department.department_name,
      Code: department.department_code,
      Courses: department.total_courses,
      "Average Attendance (%)": department.average_attendance,
      Status: department.average_attendance < 75 ? "Below threshold" : "On track",
    })), `UniFlow_Attendance_${new Date().toISOString().slice(0, 10)}`);
  };

  if (loading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading attendance analytics...</div>;
  if (!analytics) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">Attendance analytics could not be loaded. Refresh the page to try again.</div>;

  const metrics = [
    { label: "Average attendance", value: `${analytics.institution_average_percentage.toFixed(1)}%`, icon: CalendarCheck },
    { label: "Recorded sessions", value: analytics.total_sessions_conducted.toLocaleString(), icon: Building2 },
    { label: "Students monitored", value: analytics.total_students.toLocaleString(), icon: Users },
    { label: "Below 75%", value: analytics.total_below_threshold.toLocaleString(), icon: AlertTriangle },
  ];

  return <div className="space-y-5 animate-fade-in">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-lg font-semibold text-slate-950">Attendance overview</h2><p className="text-xs text-slate-500">Institution and department attendance from recorded sessions.</p></div>
      <button type="button" onClick={exportReport} disabled={!analytics.department_breakdown.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" /> Export</button>
    </div>

    <section aria-label="Attendance metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{metric.label}</p><Icon className="h-4 w-4 text-blue-700" /></div><p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p></div>; })}
    </section>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
        <div><h3 className="text-sm font-semibold text-slate-950">Department attendance</h3><p className="text-xs text-slate-500">{analytics.total_departments} departments in the current report</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative"><span className="sr-only">Search departments</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search departments" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64" /></label>
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Attendance status" className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="ALL">All departments</option><option value="BELOW_THRESHOLD">Below 75%</option><option value="ON_TRACK">75% and above</option></select>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Department</th><th className="px-3 py-3 text-right font-medium">Courses</th><th className="px-3 py-3 text-right font-medium">Average</th><th className="px-4 py-3 text-right font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">
        {departments.map((department) => <tr key={department.department_id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><p className="font-medium text-slate-900">{department.department_name}</p><p className="text-xs text-slate-500">{department.department_code}</p></td><td className="px-3 py-3 text-right text-slate-700">{department.total_courses}</td><td className="px-3 py-3 text-right font-medium text-slate-950">{department.average_attendance.toFixed(1)}%</td><td className="px-4 py-3 text-right"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${department.average_attendance < 75 ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>{department.average_attendance < 75 ? "Below threshold" : "On track"}</span></td></tr>)}
        {!departments.length && <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">No departments match the selected filters.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
