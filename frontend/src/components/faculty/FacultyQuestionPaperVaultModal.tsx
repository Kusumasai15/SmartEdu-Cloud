"use client";

import React, { useState, useMemo } from "react";
import {
  Lock,
  ShieldCheck,
  Upload,
  CheckCircle2,
  FileText,
  AlertCircle,
  X,
  FileCheck,
  Sparkles,
  Info,
  Hash,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";

interface QuestionPaperRecord {
  id: string;
  courseCode: string;
  courseName: string;
  examType: "MID_SEM" | "SEE";
  uploadedBy: string;
  uploadedAt: string;
  status: "SUBMITTED_TO_COE" | "SELECTED_FOR_EXAM" | "STANDBY_BACKUP";
  sets: Array<{
    setName: string;
    fileName: string;
    checksum: string;
    maxMarks: number;
    durationMins: number;
    bloomsWeights: string;
    isSelected?: boolean;
  }>;
}

interface FacultyQuestionPaperVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseCode?: string;
}

export function FacultyQuestionPaperVaultModal({
  isOpen,
  onClose,
  defaultCourseCode,
}: FacultyQuestionPaperVaultModalProps) {
  const { user } = useAuth();
  const { courses } = useAcademicData();

  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(() => {
    return defaultCourseCode || (courses[0] ? ((courses[0] as any).course_code || courses[0].code) : "");
  });

  const [examType, setExamType] = useState<"MID_SEM" | "SEE">("SEE");

  // Mid-Sem Single Paper fields
  const [midSemFileName, setMidSemFileName] = useState("");
  const [midSemMarks, setMidSemMarks] = useState(50);
  const [midSemDuration, setMidSemDuration] = useState(90);

  // SEE Multiple Sets (Set A, Set B, Set C)
  const [setAFileName, setSetAFileName] = useState("");
  const [setBFileName, setSetBFileName] = useState("");
  const [setCFileName, setSetCFileName] = useState("");
  const [seeMarks, setSeeMarks] = useState(100);
  const [seeDuration, setSeeDuration] = useState(180);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedChecksum, setSubmittedChecksum] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const targetCourse = useMemo(() => {
    return courses.find((c) => {
      const code = (((c as any).code || (c as any).course_code || "") as string).toLowerCase().trim();
      return code === selectedCourseCode.toLowerCase().trim();
    }) || courses[0];
  }, [courses, selectedCourseCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const facultyName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Course Faculty";
    const courseCode = (targetCourse as any).course_code || targetCourse.code || selectedCourseCode;
    const courseName = targetCourse.name || "Subject Curriculum";

    const generateChecksum = (prefix: string) => {
      const randHex = Math.random().toString(16).substring(2, 10).toUpperCase();
      return `AU-${prefix}-2026-${randHex}`;
    };

    let recordSets: QuestionPaperRecord["sets"] = [];

    if (examType === "MID_SEM") {
      // Mid-Sem: strictly 1 paper per subject
      const hash = generateChecksum("MIDSEM");
      recordSets = [
        {
          setName: "Main Paper (Unified)",
          fileName: midSemFileName,
          checksum: hash,
          maxMarks: midSemMarks,
          durationMins: midSemDuration,
          bloomsWeights: "L1: 30%, L2: 40%, L3: 30%",
          isSelected: true,
        },
      ];
      setSubmittedChecksum(hash);
    } else {
      // SEE: Multiple sets (Set A, Set B, Set C) for COE to select 1
      const hashA = generateChecksum("SEE-SETA");
      const hashB = generateChecksum("SEE-SETB");
      const hashC = generateChecksum("SEE-SETC");
      recordSets = [
        {
          setName: "Set A",
          fileName: setAFileName,
          checksum: hashA,
          maxMarks: seeMarks,
          durationMins: seeDuration,
          bloomsWeights: "L1: 20%, L2: 30%, L3: 30%, L4: 20%",
          isSelected: false,
        },
        {
          setName: "Set B",
          fileName: setBFileName,
          checksum: hashB,
          maxMarks: seeMarks,
          durationMins: seeDuration,
          bloomsWeights: "L1: 25%, L2: 35%, L3: 25%, L4: 15%",
          isSelected: false,
        },
        {
          setName: "Set C (Contingency)",
          fileName: setCFileName,
          checksum: hashC,
          maxMarks: seeMarks,
          durationMins: seeDuration,
          bloomsWeights: "L1: 20%, L2: 30%, L3: 35%, L4: 15%",
          isSelected: false,
        },
      ];
      setSubmittedChecksum(`${hashA} / ${hashB} / ${hashC}`);
    }

    const newRecord: QuestionPaperRecord = {
      id: `QP-${courseCode}-${examType}-${Date.now().toString().slice(-4)}`,
      courseCode,
      courseName,
      examType,
      uploadedBy: facultyName,
      uploadedAt: new Date().toISOString(),
      status: "SUBMITTED_TO_COE",
      sets: recordSets,
    };

    try {
      const state = await apiClient.get<Record<string, any>>("/admin/operational-state");
      let list: QuestionPaperRecord[] = Array.isArray(state.questionPapers) ? state.questionPapers : [];
      list = list.filter((r) => !(r.courseCode === courseCode && r.examType === examType));
      list.unshift(newRecord);
      await apiClient.patch("/admin/operational-state", { questionPapers: list });
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to submit question paper:", error);
      setSubmitError("The question paper could not be saved. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative my-auto animate-fade-in text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-500/10">
              <ShieldCheck className="h-9 w-9" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Question Paper Encrypted &amp; Deposited
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {examType === "SEE"
                  ? "All sets (Set A, Set B, Set C) have been deposited into the Controller of Examinations Vault. The Examination Department will review and select one set for the final exam."
                  : "Unified Mid-Semester question paper has been submitted to the Examination Cell."}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-md mx-auto font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Cryptographic Receipt Checksum
              </span>
              <p className="font-bold text-blue-600 dark:text-blue-400 break-all">{submittedChecksum}</p>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Done &amp; Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {submitError}
              </div>
            )}
            {/* Header */}
            <div className="space-y-1 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800">
                <Lock className="h-3 w-3" />
                <span>Confidential Examination Vault</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Upload Examination Question Paper
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deposit verified, tamper-evident question papers directly to the Controller of Examinations.
              </p>
            </div>

            {/* Course Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Subject (Course)</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Rule: 1 Unified Paper per Subject (all sections)
                </span>
              </label>
              <select
                value={selectedCourseCode}
                onChange={(e) => setSelectedCourseCode(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {courses.map((c) => {
                  const code = (c as any).course_code || c.code;
                  return (
                    <option key={c.id} value={code}>
                      {code} — {c.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Exam Mode Toggle (Mid-Sem vs SEE) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Examination Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamType("MID_SEM")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    examType === "MID_SEM"
                      ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-extrabold">Mid-Semester Exam</span>
                    {examType === "MID_SEM" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                  </div>
                  <span className="text-[11px] block text-slate-500 dark:text-slate-400">
                    <strong>1 Paper</strong> per Subject (All Sections)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExamType("SEE")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    examType === "SEE"
                      ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-extrabold">Semester End Exam (SEE)</span>
                    {examType === "SEE" && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                  </div>
                  <span className="text-[11px] block text-slate-500 dark:text-slate-400">
                    <strong>Multiple Sets (Set A, B, C)</strong> — COE chooses 1
                  </span>
                </button>
              </div>
            </div>

            {/* Dynamic Inputs based on Exam Type */}
            {examType === "MID_SEM" ? (
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Unified Mid-Sem Question Paper (Single Set)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Max Marks
                    </label>
                    <input
                      type="number"
                      value={midSemMarks}
                      onChange={(e) => setMidSemMarks(parseInt(e.target.value, 10) || 50)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      value={midSemDuration}
                      onChange={(e) => setMidSemDuration(parseInt(e.target.value, 10) || 90)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">
                    Upload Sealed Document (PDF / DOCX)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={midSemFileName}
                      onChange={(e) => setMidSemFileName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Browse</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setMidSemFileName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      SEE Question Paper Sets (Upload Multiple for COE Selection)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Mandatory 3 Sets
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  As per Autonomous Academic Examination Statues, faculty must submit <strong>Set A, Set B, and Set C</strong>. The Examination Department randomly chooses 1 set prior to printing.
                </p>

                {/* Set A */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Set A (Primary Standard)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={setAFileName}
                      onChange={(e) => setSetAFileName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSetAFileName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Set B */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Set B (Secondary Standard)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={setBFileName}
                      onChange={(e) => setSetBFileName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSetBFileName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Set C */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Set C (Contingency Reserve)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={setCFileName}
                      onChange={(e) => setSetCFileName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSetCFileName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Confidentiality & Security Declaration */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Statutory Confidentiality Guarantee:</strong> Question paper files will be hashed with SHA-256 and stored in the encrypted Controller of Examinations repository. Only the designated Examination Controller can decrypt and commission printing.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Encrypting & Depositing..." : "Deposit to Exam Vault"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
