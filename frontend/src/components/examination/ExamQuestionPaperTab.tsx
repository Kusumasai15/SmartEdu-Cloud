"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Upload,
  Eye,
  Download,
  Search,
  ShieldCheck,
  Building2,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";

interface QuestionPaperVaultItem {
  id: string;
  series: "MIDTERM" | "SEMESTER";
  courseCode: string;
  courseName: string;
  submittedBy: string;
  submittedAt: string;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "VAULT_SEALED";
  duration: string;
  maxMarks: number;
  fileName: string;
}

interface Props {
  showToast: (msg: string) => void;
}

export function ExamQuestionPaperTab({ showToast }: Props) {
  const { courses } = useAcademicData();

  const [activeSeries, setActiveSeries] = useState<"ALL" | "MIDTERM" | "SEMESTER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Real Courses (Filtering out any legacy dummy codes)
  const realCourses = useMemo(() => {
    return (courses || []).filter((c) => {
      const code = (c.code || (c as any).course_code || "").toUpperCase();
      return code.startsWith("CS-") || code.startsWith("IT-");
    });
  }, [courses]);

  const [papers, setPapers] = useState<QuestionPaperVaultItem[]>([]);

  useEffect(() => {
    let active = true;
    apiClient.get<{ exams?: any[] }>("/assessments/scheduled-exams").then((response) => {
      if (!active) return;
      setPapers((response.exams || []).filter((exam) => Array.isArray(exam.questions) && exam.questions.length > 0).map((exam) => ({
        id: exam.id,
        series: exam.series === "MIDTERM" ? "MIDTERM" : "SEMESTER",
        courseCode: exam.courseCode || "",
        courseName: exam.courseName || exam.title || "",
        submittedBy: exam.facultyName || exam.createdBy || "Assigned faculty",
        submittedAt: exam.createdAt ? new Date(exam.createdAt).toISOString().slice(0, 10) : "",
        status: exam.paperStatus === "VAULT_SEALED" ? "VAULT_SEALED" : exam.paperStatus === "UNDER_REVIEW" ? "UNDER_REVIEW" : "APPROVED",
        duration: `${Number(exam.timeLimitMinutes || 0)} minutes`,
        maxMarks: Number(exam.totalPoints || exam.maxMarks || 0),
        fileName: exam.paperFileName || "Question bank assessment",
      })));
    }).catch(() => active && setPapers([]));
    return () => { active = false; };
  }, []);

  // Upload Form State
  const [formSeries, setFormSeries] = useState<"MIDTERM" | "SEMESTER">("SEMESTER");
  const [formCourseCode, setFormCourseCode] = useState<string>("");
  const [formDuration, setFormDuration] = useState<string>("3 Hours");
  const [formMaxMarks, setFormMaxMarks] = useState<number>(100);
  const [formFileName, setFormFileName] = useState<string>("");

  const handleOpenUpload = () => {
    if (realCourses.length > 0 && !formCourseCode) setFormCourseCode(realCourses[0].code);
    setIsUploadOpen(true);
  };

  const handleCreatePaper = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Create and submit question papers from the assigned faculty course workspace. Only saved papers appear here.");
    setIsUploadOpen(false);
  };

  const handleSealPaper = async (id: string) => {
    const paper = papers.find((item) => item.id === id);
    if (!paper) return;
    const nextStatus = paper.status === "VAULT_SEALED" ? "APPROVED" : "VAULT_SEALED";
    try {
      await apiClient.patch(`/assessments/scheduled-exams/${id}`, { paperStatus: nextStatus });
      setPapers(papers.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
      showToast("Question paper status updated.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Question paper status could not be updated.");
    }
  };

  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (activeSeries !== "ALL" && p.series !== activeSeries) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.courseCode.toLowerCase().includes(q) ||
          p.courseName.toLowerCase().includes(q) ||
          p.submittedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [papers, activeSeries, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              QUESTION PAPER WORKFLOW
            </span>
            <span className="text-xs text-slate-500 font-semibold">Dual Midterm &amp; SEE Storage</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Secure Question Paper Repository
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review authored question papers, approval status, and controlled release from saved assessment records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setActiveSeries("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSeries === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All ({papers.length})
            </button>
            <button
              onClick={() => setActiveSeries("MIDTERM")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSeries === "MIDTERM"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Midterm
            </button>
            <button
              onClick={() => setActiveSeries("SEMESTER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSeries === "SEMESTER"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Semester End
            </button>
          </div>

          <button
            onClick={handleOpenUpload}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Deposit Question Paper</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{filteredPapers.length} question papers verified in vault</span>
        </div>
      </div>

      {/* Papers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Series &amp; Code</th>
                <th className="py-3.5 px-4">Course Title</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4">Duration &amp; Marks</th>
                <th className="py-3.5 px-4">Vault Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPapers.length > 0 ? (
                filteredPapers.map((p) => {
                  const isMidterm = p.series === "MIDTERM";
                  const isSealed = p.status === "VAULT_SEALED";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isMidterm
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200"
                            }`}
                          >
                            {isMidterm ? "MIDTERM" : "SEE"}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {p.courseCode}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {p.courseName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {p.submittedBy}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Deposited: {p.submittedAt}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {p.maxMarks} Marks
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Duration: {p.duration}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isSealed
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200"
                              : p.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                          }`}
                        >
                          {isSealed ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                          <span>{isSealed ? "VAULT SEALED" : p.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSealPaper(p.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition-colors ${
                            isSealed
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
                          }`}
                        >
                          {isSealed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          <span>{isSealed ? "Unseal" : "Seal in Vault"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No question papers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: DEPOSIT QUESTION PAPER ─── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  PAPER INGESTION
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  Deposit Encrypted Question Paper
                </h3>
                <p className="text-xs text-slate-400">
                  Store official paper for Midterm or Semester End Examination.
                </p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePaper} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. Examination Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormSeries("MIDTERM");
                      setFormMaxMarks(50);
                      setFormDuration("1.5 Hours");
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      formSeries === "MIDTERM"
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Midterm Exam (50 M)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormSeries("SEMESTER");
                      setFormMaxMarks(100);
                      setFormDuration("3 Hours");
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      formSeries === "SEMESTER"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Semester End Exam (100 M)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. Select Course Subject:
                </label>
                <select
                  value={formCourseCode}
                  onChange={(e) => setFormCourseCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {realCourses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.instructor || "Faculty"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    3. Duration:
                  </label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    4. Max Marks:
                  </label>
                  <input
                    type="number"
                    value={formMaxMarks}
                    onChange={(e) => setFormMaxMarks(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  5. Upload Encrypted PDF / Document:
                </label>
                <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-1">
                  <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Drag and drop or select encrypted question paper
                  </p>
                  <p className="text-[10px] text-slate-400">Supported: .pdf, .docx, .enc (Max: 25 MB)</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                >
                  Deposit into Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
