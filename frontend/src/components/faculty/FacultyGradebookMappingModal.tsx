"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  CheckCircle2,
  Sliders,
  Calculator,
  Users,
  Info,
  Check,
  FileSpreadsheet,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import * as XLSX from "xlsx";

export interface FacultyGradebookMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudy: any; // CaseStudyAssessment or Assignment
  courses: FacultyCourse[];
  onSuccess: (message: string) => void;
}

export type GradebookComponentKey = "assignments" | "classTest" | "midTerm" | "labPractical";

interface StudentCalculationRow {
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentEmail?: string;
  teamName: string;
  roleTitle?: string;
  isSubmitted: boolean;
  rawScore: number;
  maxScore: number;
  calculatedScore: number;
  currentGradebookScore: number;
}

export function FacultyGradebookMappingModal({
  isOpen,
  onClose,
  caseStudy,
  courses,
  onSuccess,
}: FacultyGradebookMappingModalProps) {
  if (!isOpen || !caseStudy) return null;

  const courseCode = caseStudy.courseCode || "CS-301";
  const courseObj = courses.find((c) => c.course_code === courseCode);
  const targetId = courseObj?.id || courseCode;

  // Gradebook Component options
  const componentOptions: Array<{
    key: GradebookComponentKey;
    label: string;
    defaultMax: number;
    badge: string;
  }> = [
    {
      key: "assignments",
      label: "Continuous Evaluation / Assignments",
      defaultMax: 25,
      badge: "Assignments",
    },
    {
      key: "classTest",
      label: "Class Tests & Sessional Quizzes",
      defaultMax: 25,
      badge: "Class Test",
    },
    {
      key: "midTerm",
      label: "Mid-Term Examination",
      defaultMax: 25,
      badge: "Midterm",
    },
    {
      key: "labPractical",
      label: "Practical & Hands-On Lab Work",
      defaultMax: 25,
      badge: "Lab / Practical",
    },
  ];

  const [selectedComponent, setSelectedComponent] = useState<GradebookComponentKey>("assignments");
  const [componentMaxMarks, setComponentMaxMarks] = useState<number>(25);
  const [scalingMethod, setScalingMethod] = useState<"proportional" | "direct" | "best_of">("proportional");
  const [unsubmittedPolicy, setUnsubmittedPolicy] = useState<"keep" | "zero">("keep");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [editedScores, setEditedScores] = useState<Record<string, number>>({});

  // Load existing gradebook records from localStorage
  const existingMarks = useMemo<Record<string, any>>(() => {
    try {
      const raw =
        localStorage.getItem(`smartedu_dsa_marks_${targetId}`) ||
        localStorage.getItem(`smartedu_dsa_marks_${courseCode}`) ||
        localStorage.getItem(`smartedu_dsa_marks_${courseCode.replace("-", "")}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }, [targetId, courseCode]);

  // Extract all students across teams or cohort in this assessment
  const initialStudentRows = useMemo<StudentCalculationRow[]>(() => {
    const rows: StudentCalculationRow[] = [];
    const csTotalPoints =
      caseStudy.totalPoints || caseStudy.maxScore || caseStudy.totalMarks || caseStudy.max_marks || 50;

    if (Array.isArray(caseStudy.teams) && caseStudy.teams.length > 0) {
      caseStudy.teams.forEach((team: any, teamIdx: number) => {
        const isSub = Boolean(team.isSubmitted);
        const teamRaw = isSub
          ? (team.evaluationScore ?? Math.round(csTotalPoints * 0.9))
          : Math.round(csTotalPoints * 0.85);

        (team.members || []).forEach((m: any, mIdx: number) => {
          const sKey = m.studentId || m.id || m.studentRoll || m.rollNo || `std-${teamIdx}-${mIdx}`;
          const sName = m.studentName || m.name || `Student ${teamIdx + 1}-${mIdx + 1}`;
          const sRoll = m.studentRoll || m.rollNo || m.studentRollNo || `2024-CSE-00${teamIdx * 4 + mIdx + 1}`;
          const curRecord = existingMarks[sKey] || existingMarks[sRoll] || {};
          const curScore =
            typeof curRecord[selectedComponent] === "number"
              ? Math.min(componentMaxMarks, curRecord[selectedComponent])
              : 18;

          let calc = 0;
          if (isSub) {
            if (scalingMethod === "proportional") {
              calc = Math.min(
                componentMaxMarks,
                Math.max(0, Math.round((teamRaw / csTotalPoints) * componentMaxMarks))
              );
            } else if (scalingMethod === "direct") {
              calc = Math.min(componentMaxMarks, Math.max(0, teamRaw));
            } else {
              // best_of
              const prop = Math.min(
                componentMaxMarks,
                Math.max(0, Math.round((teamRaw / csTotalPoints) * componentMaxMarks))
              );
              calc = Math.min(componentMaxMarks, Math.max(curScore, prop));
            }
          } else {
            calc = unsubmittedPolicy === "zero" ? 0 : curScore;
          }

          rows.push({
            studentId: sKey,
            studentName: sName,
            studentRoll: sRoll,
            studentEmail: m.studentEmail || m.email,
            teamName: team.teamName || `Squad ${teamIdx + 1}`,
            roleTitle: m.assignedRole || m.roleTitle || "Squad Member",
            isSubmitted: isSub,
            rawScore: teamRaw,
            maxScore: csTotalPoints,
            calculatedScore: calc,
            currentGradebookScore: curScore,
          });
        });
      });
    }

    return rows;
  }, [
    caseStudy,
    existingMarks,
    selectedComponent,
    componentMaxMarks,
    scalingMethod,
    unsubmittedPolicy,
  ]);

  const handleScoreChange = (studentId: string, val: number) => {
    setEditedScores((prev) => ({
      ...prev,
      [studentId]: Math.min(componentMaxMarks, Math.max(0, val)),
    }));
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return initialStudentRows;
    const q = searchQuery.toLowerCase();
    return initialStudentRows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentRoll.toLowerCase().includes(q) ||
        r.teamName.toLowerCase().includes(q)
    );
  }, [initialStudentRows, searchQuery]);

  // Export Results to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredRows.map((r, idx) => {
      const finalMapped = Math.min(
        componentMaxMarks,
        Math.max(
          0,
          typeof editedScores[r.studentId] === "number"
            ? editedScores[r.studentId]
            : r.calculatedScore
        )
      );
      const delta = finalMapped - r.currentGradebookScore;

      return {
        "Sl. No": idx + 1,
        "Student Roll No": r.studentRoll,
        "Student Name": r.studentName,
        "Squad / Group": r.teamName,
        "Submission Status": r.isSubmitted ? "Submitted" : "Pending",
        "Raw Assessment Marks": r.rawScore,
        "Assessment Max Marks": r.maxScore,
        "Target Component": componentOptions.find((c) => c.key === selectedComponent)?.label || selectedComponent,
        "Calculation Formula":
          scalingMethod === "proportional"
            ? `(${r.rawScore}/${r.maxScore}) × ${componentMaxMarks}`
            : scalingMethod === "best_of"
            ? "Best of Scores"
            : "Direct Capped",
        "Previous Gradebook Marks": r.currentGradebookScore,
        "Mapped Gradebook Marks": finalMapped,
        "Max Component Marks": componentMaxMarks,
        "Delta Difference": delta > 0 ? `+${delta}` : String(delta),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-fit column widths
    const colWidths = [
      { wch: 8 },  // Sl
      { wch: 18 }, // Roll
      { wch: 22 }, // Name
      { wch: 20 }, // Squad
      { wch: 15 }, // Status
      { wch: 12 }, // Raw
      { wch: 12 }, // Max Raw
      { wch: 28 }, // Component
      { wch: 22 }, // Formula
      { wch: 14 }, // Prev
      { wch: 14 }, // Mapped
      { wch: 12 }, // Max
      { wch: 10 }, // Delta
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Marks Calculation");
    const safeTitle = (caseStudy.title || "Assessment").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${courseCode}_${safeTitle}_Gradebook_Mapping.xlsx`);
  };

  // Confirm mapping & publish to Gradebook
  const handleConfirmMapping = async () => {
    setIsApplying(true);
    try {
      const updatedMarks: Record<string, any> = { ...existingMarks };
      let updatedCount = 0;

      initialStudentRows.forEach((row) => {
        // Enforce strict clamp: never exceed componentMaxMarks
        const finalScore = Math.min(
          componentMaxMarks,
          Math.max(
            0,
            typeof editedScores[row.studentId] === "number"
              ? editedScores[row.studentId]
              : row.calculatedScore
          )
        );

        const currentRec = updatedMarks[row.studentId] ||
          updatedMarks[row.studentRoll] || {
            assignments: 18,
            classTest: 18,
            midTerm: 18,
            labPractical: 20,
          };

        const studentPayload = {
          ...currentRec,
          [selectedComponent]: finalScore,
          studentName: row.studentName,
          studentRoll: row.studentRoll,
          studentId: row.studentId,
          studentEmail: row.studentEmail,
          isPublished: true,
          publishedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };

        // Index under multiple keys to guarantee student portal lookup succeeds
        updatedMarks[row.studentId] = studentPayload;
        if (row.studentRoll) {
          updatedMarks[row.studentRoll] = studentPayload;
          updatedMarks[`std-cse-${row.studentRoll}`] = studentPayload;
        }
        if (row.studentEmail) {
          updatedMarks[row.studentEmail] = studentPayload;
        }

        updatedCount++;
      });

      // Save across possible course identifier variants
      const cleanCode = courseCode.replace("-", "");
      localStorage.setItem(`smartedu_dsa_marks_${targetId}`, JSON.stringify(updatedMarks));
      localStorage.setItem(`smartedu_dsa_marks_${courseCode}`, JSON.stringify(updatedMarks));
      localStorage.setItem(`smartedu_dsa_marks_${cleanCode}`, JSON.stringify(updatedMarks));
      window.dispatchEvent(new Event("storage"));

      const activeCompObj = componentOptions.find((c) => c.key === selectedComponent);
      onSuccess(
        `✓ Successfully mapped & published ${updatedCount} student marks to "${activeCompObj?.label}" (${componentMaxMarks} Max Marks) for ${courseCode}.`
      );
      onClose();
    } catch (e: any) {
      alert(`Mapping failed: ${e?.message || "Unknown error"}`);
    } finally {
      setIsApplying(false);
    }
  };

  const activeCompObj = componentOptions.find((c) => c.key === selectedComponent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Compact Clean Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {courseCode}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {caseStudy.title || "Assessment"} &bull; {caseStudy.totalPoints || 50} Raw Marks
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Map Assessment Marks to Gradebook Calculation
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              className="text-xs h-8 px-2.5 font-bold flex items-center gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:border-emerald-300 cursor-pointer"
              title="Download results in Excel (.xlsx) format"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compact Controls Toolbar (Streamlined, Non-Bulky) */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-end">
            {/* Target Component */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Target Component
              </label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value as GradebookComponentKey)}
                className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {componentOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.badge} (Default {opt.defaultMax})
                  </option>
                ))}
              </select>
            </div>

            {/* Max Marks Scale & Quick Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Scale Max Marks
                </label>
                <span className="font-mono text-[11px] font-bold text-blue-600">{componentMaxMarks} pts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={componentMaxMarks}
                  onChange={(e) => setComponentMaxMarks(Math.max(1, parseInt(e.target.value) || 25))}
                  className="w-16 h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200"
                />
                <div className="flex gap-1">
                  {[20, 25, 30, 50].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setComponentMaxMarks(quick)}
                      className={`px-2 h-8 text-[11px] font-mono rounded-lg border cursor-pointer transition-colors ${
                        componentMaxMarks === quick
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculation Formula */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Calculation Rule
              </label>
              <select
                value={scalingMethod}
                onChange={(e) => setScalingMethod(e.target.value as any)}
                className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="proportional">
                  Proportional: (Score / {caseStudy.totalPoints || 50}) × {componentMaxMarks}
                </option>
                <option value="best_of">Best of Scores: Keep Higher</option>
                <option value="direct">Direct Score: Capped at {componentMaxMarks}</option>
              </select>
            </div>

            {/* Student Search */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Filter Roster
              </label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Student Marks Table Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3">Student &amp; Squad</th>
                    <th className="py-2 px-2.5">Roll No</th>
                    <th className="py-2 px-2.5">Status</th>
                    <th className="py-2 px-2.5 text-right">Raw Score</th>
                    <th className="py-2 px-2.5 text-center">Formula</th>
                    <th className="py-2 px-2.5 text-right">Mapped Marks ({componentMaxMarks})</th>
                    <th className="py-2 px-2.5 text-right">Current Book</th>
                    <th className="py-2 px-3 text-right">New Gradebook Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row) => {
                    // Strictly enforce upper bound clamping
                    const finalMapped = Math.min(
                      componentMaxMarks,
                      Math.max(
                        0,
                        typeof editedScores[row.studentId] === "number"
                          ? editedScores[row.studentId]
                          : row.calculatedScore
                      )
                    );
                    const delta = finalMapped - row.currentGradebookScore;

                    return (
                      <tr
                        key={row.studentId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {row.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {row.teamName}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.studentRoll}
                        </td>
                        <td className="py-2 px-2.5">
                          {row.isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              <Check className="h-3 w-3" /> Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.rawScore} / {row.maxScore}
                        </td>
                        <td className="py-2 px-2.5 text-center text-[10px] text-slate-400 font-mono">
                          {scalingMethod === "proportional"
                            ? `(${row.rawScore}/${row.maxScore})×${componentMaxMarks}`
                            : scalingMethod === "best_of"
                            ? "BestOf"
                            : "Direct"}
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min={0}
                              max={componentMaxMarks}
                              value={finalMapped}
                              onChange={(e) =>
                                handleScoreChange(
                                  row.studentId,
                                  Math.min(componentMaxMarks, Math.max(0, parseInt(e.target.value) || 0))
                                )
                              }
                              className="w-12 h-6 text-right px-1 font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-blue-600"
                              title="Click to adjust mapped mark"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">
                              /{componentMaxMarks}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-500 text-[11px]">
                          {row.currentGradebookScore}/{componentMaxMarks}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-mono">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {finalMapped}
                            </span>
                            {delta > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.5 rounded">
                                +{delta}
                              </span>
                            ) : delta < 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1 py-0.5 rounded">
                                {delta}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                =
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-[11px] truncate">
              Mapping <strong>{initialStudentRows.length}</strong> evaluations into{" "}
              <strong>{activeCompObj?.label}</strong> ({componentMaxMarks} max).
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              className="text-xs h-8 px-3 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Download Excel</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isApplying}
              className="text-xs h-8 px-3 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmMapping}
              disabled={isApplying}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Confirm &amp; Publish Marks</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
