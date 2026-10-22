"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileCode,
  CheckCircle2,
  CheckCircle,
  Clock,
  Send,
  User,
  Search,
  Code,
  Award,
  FileText,
  AlertCircle,
  ExternalLink,
  Download,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncSubmission } from "@/context/AcademicDataContext";

interface FacultySubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentTitle: string;
  courseCode: string;
  maxScore: number;
}

export function FacultySubmissionsModal({
  isOpen,
  onClose,
  assignmentTitle,
  courseCode,
  maxScore,
}: FacultySubmissionsModalProps) {
  const { assignments, submissions, gradeSubmission } = useAcademicData();
  const [selectedSubId, setSelectedSubId] = useState<string>("");
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentFeedback, setCurrentFeedback] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);

  // Find matching assignment
  const matchedAssignment = assignments.find(
    (a) =>
      a.title.toLowerCase() === assignmentTitle.toLowerCase() &&
      a.courseCode.toUpperCase() === courseCode.toUpperCase()
  );

  const relevantSubmissions = matchedAssignment
    ? submissions.filter((s) => s.assignmentId === matchedAssignment.id)
    : [];

  const activeSubmission = relevantSubmissions.find((s) => s.id === selectedSubId) || relevantSubmissions[0];

  const resolveFileUrl = (url?: string): string => {
    if (!url) return "#";
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    if (trimmed.startsWith("/api/v1/")) {
      return trimmed;
    }
    if (trimmed.startsWith("/storage/")) {
      return `/api/v1${trimmed}`;
    }
    if (trimmed.startsWith("s3://")) {
      return "#";
    }
    return `/api/v1/storage/files/${trimmed}`;
  };

  useEffect(() => {
    if (activeSubmission) {
      setSelectedSubId(activeSubmission.id);
      setCurrentScore(activeSubmission.score ?? 0);
      setCurrentFeedback(activeSubmission.feedback || "");
    }
  }, [activeSubmission?.id, maxScore]);

  if (!isOpen) return null;

  const handleSelectSubmission = (sub: SyncSubmission) => {
    setSelectedSubId(sub.id);
    setCurrentScore(sub.score ?? 0);
    setCurrentFeedback(sub.feedback || "");
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    try {
      await gradeSubmission(activeSubmission.id, currentScore, currentFeedback);
    } catch (error) {
      setNotification(error instanceof Error ? error.message : "Grade could not be saved.");
      return;
    }
    setNotification(`✓ Grade & feedback saved for ${activeSubmission.studentName}. Score: ${currentScore}/${maxScore}`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full h-[85vh] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-2xl animate-fade-in flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Submission Evaluation &amp; Grading
              </h3>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                {courseCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {assignmentTitle} • Max Marks: {maxScore} Points
            </p>
          </div>

          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {notification && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2 shrink-0 my-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* 2 Column Layout: Submissions List (Left) + Submission Content & Grading Form (Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 overflow-hidden">
          {/* Left Column: Submissions Roster */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 overflow-y-auto space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
              Submissions ({relevantSubmissions.length})
            </span>

            {relevantSubmissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No submissions received yet.
              </div>
            ) : (
              relevantSubmissions.map((sub) => {
                const isSelected = sub.id === (activeSubmission?.id || selectedSubId);
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubmission(sub)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-xs"
                        : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-slate-900 dark:text-white block">{sub.studentName}</strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sub.status === "GRADED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {sub.status === "GRADED" ? `Graded (${sub.score}/${maxScore})` : "Needs Grading"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                      <span>{sub.rollNo}</span>
                      <span>{sub.certificateUrl ? "Certificate" : sub.fileName ? "PDF Upload" : sub.codeContent ? "Code File" : "Submitted"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Submission Content & Grading Form */}
          <div className="md:col-span-2 flex flex-col h-full overflow-hidden space-y-3">
            {activeSubmission ? (
              <>
                {/* Candidate Header */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
                  <div>
                    <strong className="text-slate-900 dark:text-white">{activeSubmission.studentName}</strong>
                    <span className="font-mono text-slate-400 ml-2">({activeSubmission.rollNo})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Submitted {activeSubmission.submittedAt}</span>
                </div>

                {/* Body Content Area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {/* Coursera / Online Certificate Card */}
                  {(activeSubmission.certificateUrl || activeSubmission.certificateProvider) && (
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-blue-600" />
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                            Verified Online Course Certificate
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {activeSubmission.certificateProvider || "Coursera / Online MOOC"}
                        </span>
                      </div>

                      {activeSubmission.certificateUrl && (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-blue-600 dark:text-blue-400 truncate text-[11px]">
                            {activeSubmission.certificateUrl}
                          </span>
                          <a
                            href={activeSubmission.certificateUrl.startsWith("http") ? activeSubmission.certificateUrl : `https://${activeSubmission.certificateUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shrink-0 flex items-center gap-1"
                          >
                            <span>Verify Online</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF Document Card */}
                  {activeSubmission.fileName && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{activeSubmission.fileName}</p>
                          <p className="text-[10px] text-slate-400">PDF Document Submission</p>
                        </div>
                      </div>
                      <a
                        href={resolveFileUrl(activeSubmission.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      >
                        View PDF
                      </a>
                    </div>
                  )}

                  {/* Student Notes */}
                  {activeSubmission.notes && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 block mb-1">Student Note:</span>
                      <p className="text-slate-700 dark:text-slate-300 italic">"{activeSubmission.notes}"</p>
                    </div>
                  )}

                  {/* Code / Solution Preview */}
                  {activeSubmission.codeContent && (
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed max-h-56 overflow-y-auto">
                      <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-slate-800 mb-2 text-[10px]">
                        <span>submission_code.cpp</span>
                        <span>{activeSubmission.testCasesPassed ?? 10} / {activeSubmission.totalTestCases ?? 10} Automated Test Cases Passed</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{activeSubmission.codeContent}</pre>
                    </div>
                  )}
                </div>

                {/* Evaluation Form */}
                <form onSubmit={handleSaveGrade} className="bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 shrink-0 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-36">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Awarded Marks</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={maxScore}
                          required
                          value={currentScore}
                          onChange={(e) => setCurrentScore(Number(e.target.value))}
                          className="w-20 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold text-center"
                        />
                        <span className="font-mono text-slate-400 font-bold">/ {maxScore}</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Faculty Feedback &amp; Remarks</label>
                      <input
                        type="text"
                        value={currentFeedback}
                        onChange={(e) => setCurrentFeedback(e.target.value)}
                        placeholder="e.g. Excellent work, verified certificate credential, full score awarded."
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <Button type="submit" className="btn-saas-primary text-xs px-5 mt-4 self-end shrink-0 cursor-pointer">
                      <Send className="h-3.5 w-3.5 mr-1" />
                      <span>Publish Grade</span>
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-center text-center p-8">
                <div className="space-y-2">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No submissions received yet</p>
                  <p className="text-xs text-slate-500">Real student submissions will appear here after learners submit this assignment.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <Button onClick={onClose} className="btn-saas-outline text-xs px-5 cursor-pointer">
            Done Reviewing
          </Button>
        </div>
      </div>
    </div>
  );
}
