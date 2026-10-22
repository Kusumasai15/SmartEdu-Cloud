"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Globe, AlertCircle, BarChart3, Clock } from "lucide-react";
import { DepartmentResultAnalytics, CourseResult } from "@/types";

interface HODResultApprovalsViewProps {
  analytics: DepartmentResultAnalytics | null;
  loading: boolean;
  onApproveCourse: (courseId: string) => Promise<void>;
  onPublishCourse: (courseId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const HODResultApprovalsView: React.FC<HODResultApprovalsViewProps> = ({
  analytics,
  loading,
  onApproveCourse,
  onPublishCourse,
  onRefresh,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Loading departmental academic results & approval queue...
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const handleApprove = async (courseId: string) => {
    setActionLoading(`approve_${courseId}`);
    try {
      await onApproveCourse(courseId);
      setActionMsg("Course results successfully approved.");
      await onRefresh();
    } catch (e: any) {
      setActionMsg(e.message || "Failed to approve results.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (courseId: string) => {
    setActionLoading(`publish_${courseId}`);
    try {
      await onPublishCourse(courseId);
      setActionMsg("Course results successfully published for student access.");
      await onRefresh();
    } catch (e: any) {
      setActionMsg(e.message || "Failed to publish results.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Department Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">Department Average GPA</span>
          <span className="text-3xl font-extrabold text-slate-900">{analytics.department_average_gpa.toFixed(2)}</span>
          <span className="text-xs text-slate-400 block mt-1">out of 10.0 scale</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">Pass Rate</span>
          <span className="text-3xl font-extrabold text-emerald-600">{analytics.department_pass_rate.toFixed(1)}%</span>
          <span className="text-xs text-emerald-600 block mt-1">Department class standard</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">Total Evaluated Students</span>
          <span className="text-3xl font-extrabold text-blue-600">{analytics.total_students}</span>
          <span className="text-xs text-slate-400 block mt-1">Across {analytics.total_courses} courses</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">Pending Approvals</span>
          <span className={`text-3xl font-extrabold ${analytics.pending_approvals_count > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {analytics.pending_approvals_count}
          </span>
          <span className="text-xs text-slate-400 block mt-1">Requires HOD authorization</span>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-800">
          {actionMsg}
        </div>
      )}

      {/* Courses Results Breakdown & Review */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Course Results Oversight & Publication Status</span>
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {analytics.courses_analytics.map((ca) => (
            <div key={ca.course_id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{ca.course_name}</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                    {ca.course_code}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <span>Enrolled: <strong>{ca.total_students}</strong></span>
                  <span>Avg GPA: <strong>{ca.average_gpa.toFixed(2)}</strong></span>
                  <span>Pass Rate: <strong className="text-emerald-600">{ca.pass_percentage.toFixed(1)}%</strong></span>
                  <span>At-Risk: <strong className="text-rose-600">{ca.at_risk_students_count}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleApprove(ca.course_id)}
                  disabled={actionLoading === `approve_${ca.course_id}`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => handlePublish(ca.course_id)}
                  disabled={actionLoading === `publish_${ca.course_id}`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
