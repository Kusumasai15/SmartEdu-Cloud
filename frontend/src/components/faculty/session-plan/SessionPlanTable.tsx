"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CourseSessionPlan, SessionPlanLecture, SessionPlanModule } from "@/types/sessionPlan";

interface SessionPlanTableProps {
  sessionPlan: CourseSessionPlan;
  onEditLecture?: (lecture: SessionPlanLecture) => void;
  onDeleteLecture?: (lectureId: string) => void;
  onAddLectureToModule?: (moduleNumber: number) => void;
  onOpenTakeAttendance?: (lecture: SessionPlanLecture) => void;
}

export function SessionPlanTable({
  sessionPlan,
  onEditLecture,
  onDeleteLecture,
  onAddLectureToModule,
  onOpenTakeAttendance,
}: SessionPlanTableProps) {
  const getMethodologyBadge = (methodology: string) => {
    switch (methodology.toLowerCase()) {
      case "practical":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "tutorial":
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "seminar":
      case "case study":
        return "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      default:
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  const getBloomsBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case "creating":
      case "evaluating":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold";
      case "analyzing":
        return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold";
      case "applying":
        return "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Top Academic Header Banner (matching institutional style with green accent) */}
      <div className="border-t-4 border-[#16A34A] px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-[#16A34A]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Session Plan Details
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>Academic Cycle: <strong>{sessionPlan.academicYear}</strong></span>
          <span>•</span>
          <span>Course: <strong>{sessionPlan.courseCode}</strong></span>
          <span>•</span>
          <span>Modules: <strong>{sessionPlan.modules.length}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          {/* Main Table Column Headers */}
          <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
            <tr>
              <th className="p-3 w-16 text-center border-r border-slate-200 dark:border-slate-700">Lecture No.</th>
              <th className="p-3 w-28 border-r border-slate-200 dark:border-slate-700">Proposed Date</th>
              <th className="p-3 min-w-[280px] border-r border-slate-200 dark:border-slate-700">Topic (Points to Cover)</th>
              <th className="p-3 w-32 border-r border-slate-200 dark:border-slate-700">Methodology/Activity</th>
              <th className="p-3 w-28 text-center border-r border-slate-200 dark:border-slate-700">Course Outcome Mapping</th>
              <th className="p-3 w-28 border-r border-slate-200 dark:border-slate-700">Bloom&apos;s Level</th>
              <th className="p-3 min-w-[180px] border-r border-slate-200 dark:border-slate-700">Study Material Ref.</th>
              <th className="p-3 w-28 border-r border-slate-200 dark:border-slate-700">Conducted Date</th>
              <th className="p-3 w-20 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
            {sessionPlan.modules.map((mod) => (
              <React.Fragment key={`mod-${mod.moduleNumber}`}>
                {/* Module Separator Banner (Matches Exact University Format from Screenshot) */}
                <tr className="bg-slate-100 dark:bg-slate-800/90 font-bold text-slate-800 dark:text-slate-200">
                  <td colSpan={9} className="p-3 text-center border-y border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col items-center justify-center space-y-0.5">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        {mod.moduleNumber}. Module {mod.moduleNumber}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-normal">
                        {mod.title}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Lecture Rows for this Module */}
                {mod.lectures.map((lec) => {
                  const isConducted = !!lec.conductedDate;

                  return (
                    <tr
                      key={lec.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isConducted ? "bg-emerald-50/20 dark:bg-emerald-950/10" : ""
                      }`}
                    >
                      {/* Lecture No */}
                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        {lec.lectureNo}
                      </td>

                      {/* Proposed Date */}
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {lec.proposedDate}
                      </td>

                      {/* Topic */}
                      <td className="p-3 font-medium text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                        <div className="flex items-start gap-1.5">
                          {isConducted && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          )}
                          <span className="leading-snug">{lec.topic}</span>
                        </div>
                      </td>

                      {/* Methodology */}
                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getMethodologyBadge(
                            lec.methodology
                          )}`}
                        >
                          {lec.methodology}
                        </span>
                      </td>

                      {/* Course Outcome */}
                      <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {lec.courseOutcome}
                      </td>

                      {/* Bloom's Level */}
                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md ${getBloomsBadge(lec.bloomsLevel)}`}>
                          {lec.bloomsLevel}
                        </span>
                      </td>

                      {/* Study Material Ref */}
                      <td className="p-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 leading-snug">
                        {lec.studyMaterialRef || "—"}
                      </td>

                      {/* Conducted Date */}
                      <td className="p-3 font-mono font-bold border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {isConducted ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
                            {lec.conductedDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Pending</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isConducted && onOpenTakeAttendance && (
                            <button
                              onClick={() => onOpenTakeAttendance(lec)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Conduct this lecture and mark attendance"
                            >
                              <span>Conduct</span>
                            </button>
                          )}
                          {onEditLecture && (
                            <button
                              onClick={() => onEditLecture(lec)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              title="Edit lecture details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDeleteLecture && (
                            <button
                              onClick={() => onDeleteLecture(lec.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Remove lecture"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Module Quick Add Row */}
                {onAddLectureToModule && (
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                    <td colSpan={9} className="p-2 text-center border-b border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => onAddLectureToModule(mod.moduleNumber)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] hover:underline cursor-pointer py-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Lecture to Module {mod.moduleNumber}</span>
                      </button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
