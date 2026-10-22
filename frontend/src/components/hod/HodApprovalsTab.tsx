"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle2, Check, Award, Eye, X, FileSpreadsheet, Send } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";

export interface GradeSheetRecord {
  id: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  enrolledCount: number;
  avgGpa: number;
  passPercentage: number;
  status: "SUBMITTED_FOR_REVIEW" | "APPROVED_BY_HOD" | "PUBLISHED_TO_TRANSCRIPT";
}

interface StudentGradeSample {
  rollNo: string;
  name: string;
  internal: number;
  midterm: number;
  lab: number;
  total: number;
  grade: string;
}

const gradeBreakdown: Record<string, StudentGradeSample[]> = {};

interface HodApprovalsTabProps {
  gradeSheets: GradeSheetRecord[];
  onApproveGradeSheet: (id: string) => void;
  onPublishGradeSheet: (id: string) => void;
  onApproveAll: () => void;
}

export function HodApprovalsTab({
  gradeSheets,
  onApproveGradeSheet,
  onPublishGradeSheet,
  onApproveAll,
}: HodApprovalsTabProps) {
  const [inspectSheet, setInspectSheet] = useState<GradeSheetRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const pendingCount = gradeSheets.filter((g) => g.status === "SUBMITTED_FOR_REVIEW").length;
  const approvedCount = gradeSheets.filter((g) => g.status === "APPROVED_BY_HOD").length;
  const publishedCount = gradeSheets.filter((g) => g.status === "PUBLISHED_TO_TRANSCRIPT").length;
  const averageDepartmentGpa = gradeSheets.length
    ? gradeSheets.reduce((sum, sheet) => sum + sheet.avgGpa, 0) / gradeSheets.length
    : 0;
  const averagePassRate = gradeSheets.length
    ? gradeSheets.reduce((sum, sheet) => sum + sheet.passPercentage, 0) / gradeSheets.length
    : 0;

  const filteredSheets = useMemo(() => {
    if (filterStatus === "ALL") return gradeSheets;
    return gradeSheets.filter((g) => g.status === filterStatus);
  }, [gradeSheets, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Grade Approvals</h2>
          <p className="text-xs text-slate-500">
            Review submitted continuous assessment scores, verify class performance, and approve for release to student transcripts.
          </p>
        </div>

        <Button
          onClick={onApproveAll}
          className="bg-black hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 rounded-lg"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Approve All Pending</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Average Department GPA</span>
          <p className="text-2xl font-bold text-slate-900 font-mono">{averageDepartmentGpa.toFixed(2)} / 10.0</p>
          <span className="text-xs text-slate-500">Evaluated across all active course sections</span>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Overall Pass Rate</span>
          <p className="text-2xl font-bold text-emerald-600 font-mono">{averagePassRate.toFixed(1)}%</p>
          <span className="text-xs text-emerald-600 font-medium">Standard academic standing</span>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Pending Approvals</span>
          <p className="text-2xl font-bold text-amber-600 font-mono">{pendingCount} Sheets</p>
          <span className="text-xs text-amber-600 font-medium">Awaiting Department Head signature</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        {[
          { id: "ALL", label: `All Sheets (${gradeSheets.length})` },
          { id: "SUBMITTED_FOR_REVIEW", label: `Pending Review (${pendingCount})` },
          { id: "APPROVED_BY_HOD", label: `Approved (${approvedCount})` },
          { id: "PUBLISHED_TO_TRANSCRIPT", label: `Published (${publishedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === tab.id
                ? "bg-black text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-black border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5">Course Code</th>
              <th className="p-3.5">Course Title</th>
              <th className="p-3.5">Lead Instructor</th>
              <th className="p-3.5">Students</th>
              <th className="p-3.5">Average GPA</th>
              <th className="p-3.5">Pass Rate</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSheets.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3.5 font-mono font-bold text-slate-900">{g.courseCode}</td>
                <td className="p-3.5 font-semibold text-slate-900">{g.courseName}</td>
                <td className="p-3.5 text-slate-600">{g.instructor}</td>
                <td className="p-3.5 font-mono text-slate-700">{g.enrolledCount} Students</td>
                <td className="p-3.5 font-mono font-bold text-slate-900">{g.avgGpa.toFixed(2)}</td>
                <td className="p-3.5 font-mono font-bold text-emerald-600">{g.passPercentage.toFixed(1)}%</td>
                <td className="p-3.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      g.status === "PUBLISHED_TO_TRANSCRIPT"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : g.status === "APPROVED_BY_HOD"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {g.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3.5 text-right space-x-2">
                  <button
                    onClick={() => setInspectSheet(g)}
                    className="px-2.5 py-1 rounded-md border border-slate-200 hover:border-black text-slate-700 hover:text-black font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Review Scores</span>
                  </button>

                  {g.status === "SUBMITTED_FOR_REVIEW" && (
                    <button
                      onClick={() => onApproveGradeSheet(g.id)}
                      className="px-3 py-1 rounded-md bg-black hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
                    >
                      Approve
                    </button>
                  )}

                  {g.status === "APPROVED_BY_HOD" && (
                    <button
                      onClick={() => onPublishGradeSheet(g.id)}
                      className="px-3 py-1 rounded-md border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs cursor-pointer"
                    >
                      Publish
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredSheets.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No grade sheets are available for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Roster Scores Inspection Modal */}
      {inspectSheet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-black">{inspectSheet.courseCode}</span>
                <h3 className="text-base font-bold text-slate-900">{inspectSheet.courseName}</h3>
                <span className="text-xs text-slate-500">Instructor: {inspectSheet.instructor} • Fall 2026</span>
              </div>
              <button onClick={() => setInspectSheet(null)} className="text-slate-400 hover:text-black cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Roll No</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Continuous (30)</th>
                    <th className="p-2.5">Midterm (50)</th>
                    <th className="p-2.5">Lab (40)</th>
                    <th className="p-2.5">Final Score</th>
                    <th className="p-2.5">Letter Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(gradeBreakdown[inspectSheet.courseCode] || []).map((s) => (
                    <tr key={s.rollNo} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">{s.rollNo}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-900">{s.name}</td>
                      <td className="p-2.5">{s.internal}</td>
                      <td className="p-2.5">{s.midterm}</td>
                      <td className="p-2.5">{s.lab}</td>
                      <td className="p-2.5 font-bold text-slate-900">{s.total} / 100</td>
                      <td className="p-2.5 font-bold text-emerald-600">{s.grade}</td>
                    </tr>
                  ))}
                  {!(gradeBreakdown[inspectSheet.courseCode] || []).length && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center font-sans text-slate-500">
                        Student score rows are not available yet for this sheet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Grades calculated from Continuous Assessments (30%), Midterms (50%), and Lab Practicals (20%).
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setInspectSheet(null)} className="text-xs">
                  Close
                </Button>
                {inspectSheet.status === "SUBMITTED_FOR_REVIEW" && (
                  <Button
                    onClick={() => {
                      onApproveGradeSheet(inspectSheet.id);
                      setInspectSheet(null);
                    }}
                    className="bg-black hover:bg-slate-800 text-white text-xs px-5"
                  >
                    Approve Sheet
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
