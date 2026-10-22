"use client";

import React from "react";
import { Award, TrendingUp, Users, AlertTriangle, Building2 } from "lucide-react";
import { VCInstitutionResultAnalytics } from "@/types";

interface VCResultsOverviewProps {
  analytics: VCInstitutionResultAnalytics | null;
  loading: boolean;
}

export const VCResultsOverview: React.FC<VCResultsOverviewProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Loading institutional academic results & rankings...
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Level Institutional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Institution Avg GPA</span>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900">{analytics.institution_average_gpa.toFixed(2)}</span>
          <span className="text-xs text-slate-400 block mt-1">University-wide average</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">University Pass Rate</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-600">{analytics.institution_pass_rate.toFixed(1)}%</span>
          <span className="text-xs text-emerald-600 block mt-1">Across all faculties</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Evaluated</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900">{analytics.total_students_evaluated}</span>
          <span className="text-xs text-slate-400 block mt-1">Active student class roster</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">At-Risk Students</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <span className="text-3xl font-extrabold text-rose-600">{analytics.total_at_risk_students}</span>
          <span className="text-xs text-rose-600 block mt-1">GPA &lt; 5.0 or backlogs</span>
        </div>
      </div>

      {/* Department Comparative Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">Departmental Academic Performance & Rankings</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3 text-center">Active Courses</th>
                <th className="py-3 px-3 text-center">Average GPA</th>
                <th className="py-3 px-3 text-center">Pass Rate</th>
                <th className="py-3 px-4 text-center">Academic Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.department_rankings.map((dept) => (
                <tr key={dept.department_id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{dept.department_name}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{dept.department_code}</td>
                  <td className="py-3 px-3 text-center text-slate-700 font-semibold">{dept.total_courses}</td>
                  <td className="py-3 px-3 text-center font-bold text-blue-700 text-sm">{dept.average_gpa.toFixed(2)}</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600 text-sm">{dept.pass_rate.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        dept.pass_rate >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : dept.pass_rate >= 60
                          ? "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {dept.pass_rate >= 80 ? "EXCELLING" : dept.pass_rate >= 60 ? "SATISFACTORY" : "NEEDS_INTERVENTION"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
