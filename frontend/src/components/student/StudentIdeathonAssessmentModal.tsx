"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Maximize2,
  Minimize2,
  Clock,
  Send,
  X,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lock,
  Sparkles,
  Eye,
  Layers,
} from "lucide-react";

interface StudentIdeathonAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    courseCode: string;
    courseName?: string;
    sections?: string[];
    description: string;
    problemStatement: string;
    totalMarks: number;
    dueDate?: string;
    problemDomain?: string;
  };
  studentName: string;
  studentRollNumber: string;
  onSubmitSuccess: (deliverables: {
    subjectiveAnswer: string;
    approach: string;
    codeSnippet: string;
    complexityAnalysis: string;
  }) => void;
}

export function StudentIdeathonAssessmentModal({
  isOpen,
  onClose,
  project,
  studentName,
  studentRollNumber,
  onSubmitSuccess,
}: StudentIdeathonAssessmentModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"APPROACH" | "CODE" | "ANALYSIS">("APPROACH");
  const [approach, setApproach] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [complexityAnalysis, setComplexityAnalysis] = useState("");
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);
  const [securityStrikes, setSecurityStrikes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Time remaining tracker (e.g. 90 minutes assessment)
  const [secondsRemaining, setSecondsRemaining] = useState(90 * 60);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 1. Fullscreen Enforcement
  const enterFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (e) {
      console.warn("Fullscreen request error:", e);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Exit fullscreen error:", e);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && isOpen) {
        setIntegrityWarning("Assessment must be conducted in full-screen mode. Please re-enter full screen.");
        setSecurityStrikes((s) => s + 1);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isOpen]);

  // 2. Anti-Cheat: Intercept Window Blur & Tab Switching
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowBlur = () => {
      setIntegrityWarning("Window focus lost! Navigating away or opening external applications is logged as a security event.");
      setSecurityStrikes((s) => s + 1);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIntegrityWarning("Tab switch detected! Your assessment session has recorded an out-of-focus violation.");
        setSecurityStrikes((s) => s + 1);
      }
    };

    // 3. Prevent Zoom & Screenshot Hotkeys (PrintScreen, Ctrl+P, Ctrl+Wheel, Ctrl+/-)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        setIntegrityWarning("Screen capture actions are disabled during subjective assessment.");
        setSecurityStrikes((s) => s + 1);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setIntegrityWarning("Print actions are restricted during assessment.");
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=")) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen]);

  // 4. Submit Assessment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approach.trim() && !codeSnippet.trim()) {
      alert("Please provide your solution approach or implementation before submitting.");
      return;
    }

    setIsSubmitting(true);
    const combinedAnswer = `=== 1. SOLUTION APPROACH & SYSTEM DESIGN ===\n${approach.trim()}\n\n=== 2. IMPLEMENTATION / ALGORITHM CODE ===\n${codeSnippet.trim()}\n\n=== 3. COMPLEXITY & CONSTRAINTS ANALYSIS ===\n${complexityAnalysis.trim()}`;

    setTimeout(() => {
      onSubmitSuccess({
        subjectiveAnswer: combinedAnswer,
        approach: approach.trim(),
        codeSnippet: codeSnippet.trim(),
        complexityAnalysis: complexityAnalysis.trim(),
      });
      setIsSubmitting(false);
      exitFullscreen();
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col justify-between text-slate-900 select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => {
        e.preventDefault();
        setIntegrityWarning("Clipboard copying is disabled in Secure Assessment mode.");
      }}
      onCut={(e) => e.preventDefault()}
    >
      <div className="h-full w-full bg-slate-50 flex flex-col justify-between overflow-hidden">
        {/* ─── TOP SECURE HEADER BAR (LIGHT THEME) ─── */}
        <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{project.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {project.courseCode} {project.sections && project.sections.length > 0 ? `• ${project.sections.join(", ")}` : ""}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Candidate: <span className="text-slate-900 font-semibold">{studentName}</span> ({studentRollNumber}) • Total Marks: <span className="font-mono text-blue-600 font-bold">{project.totalMarks}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 font-mono text-xs font-bold text-amber-800">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Time Left: {formatTime(secondsRemaining)}</span>
            </div>

            {/* Security Strikes Pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              securityStrikes === 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{securityStrikes} Integrity Flags</span>
            </div>

            {/* Fullscreen Toggle Button */}
            {!isFullscreen ? (
              <button
                type="button"
                onClick={enterFullscreen}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Full Screen</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={exitFullscreen}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Exit Full Screen"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}

            {/* Exit / Cancel Modal */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Exit Assessment"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Security Warning Notification */}
        <AnimatePresence>
          {integrityWarning && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{integrityWarning}</span>
              </div>
              <button
                onClick={() => setIntegrityWarning(null)}
                className="underline hover:opacity-80 text-[11px] cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── MAIN WORKSPACE GRID (LIGHT THEME) ─── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left 5 Cols: Problem Statement & Constraints (Non-copyable) */}
          <div className="lg:col-span-5 bg-white border-r border-slate-200 p-6 overflow-y-auto space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                Problem Statement
              </span>
              <h2 className="text-lg font-black text-slate-900">{project.title}</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-slate-900 block">Executive Overview:</span>
              <p>{project.description}</p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                Detailed Architecture &amp; Challenge Description:
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                {project.problemStatement || "Design and implement a robust subjective solution complying with algorithmic performance standards and system reliability."}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2 text-xs text-blue-900">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Evaluation Guidelines:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                <li>Correctness of algorithmic data structures and edge case handling.</li>
                <li>Cleanliness, modular decomposition, and variable naming.</li>
                <li>Formal asymptotic complexity bounds (Big-O time and space).</li>
              </ul>
            </div>
          </div>

          {/* Right 7 Cols: Student Subjective Response & Code Editor */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50 p-6 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("APPROACH")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "APPROACH"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  1. System Design &amp; Approach
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("CODE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "CODE"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  2. Implementation / Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ANALYSIS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "ANALYSIS"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  3. Complexity &amp; Constraints
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                Total Words: {`${approach} ${codeSnippet} ${complexityAnalysis}`.trim().split(/\s+/).filter(Boolean).length}
              </span>
            </div>

            {/* Active Tab Textarea */}
            <div className="flex-1 min-h-0 mb-4">
              {activeTab === "APPROACH" && (
                <div className="h-full flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Explain your high-level approach, algorithmic breakdown, and data structures used:
                  </label>
                  <textarea
                    value={approach}
                    onChange={(e) => setApproach(e.target.value)}
                    placeholder="Outline your step-by-step reasoning, trade-offs evaluated, and component responsibilities..."
                    className="flex-1 w-full p-4 rounded-2xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none text-slate-900 text-xs sm:text-sm font-sans leading-relaxed resize-none shadow-2xs"
                  />
                </div>
              )}

              {activeTab === "CODE" && (
                <div className="h-full flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Write your complete implementation, pseudocode, or algorithm logic:
                  </label>
                  <textarea
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    placeholder="// Paste or write your implementation in Python, Java, C++, Go, or TypeScript...&#10;class Solution:&#10;    def solve(self, input_data):&#10;        pass"
                    className="flex-1 w-full p-4 rounded-2xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none text-slate-900 font-mono text-xs sm:text-sm leading-relaxed resize-none shadow-2xs"
                  />
                </div>
              )}

              {activeTab === "ANALYSIS" && (
                <div className="h-full flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Analyze Asymptotic Time Complexity, Space Complexity, and Edge Case Proofs:
                  </label>
                  <textarea
                    value={complexityAnalysis}
                    onChange={(e) => setComplexityAnalysis(e.target.value)}
                    placeholder="Time Complexity: O(N log N) because...&#10;Space Complexity: O(N) auxiliary due to...&#10;Edge Cases: Handled null inputs, overflow boundaries, and empty arrays."
                    className="flex-1 w-full p-4 rounded-2xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none text-slate-900 text-xs sm:text-sm font-sans leading-relaxed resize-none shadow-2xs"
                  />
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Autosaving answer buffer to local browser storage
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "APPROACH") setActiveTab("CODE");
                    else if (activeTab === "CODE") setActiveTab("ANALYSIS");
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  {activeTab === "ANALYSIS" ? "Review Sections" : "Next Section"}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || (!approach.trim() && !codeSnippet.trim())}
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Final Ideathon"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Exit Ideathon Assessment?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Any unsaved answers or unsubmitted work will not be graded. Are you sure you want to close?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Continue Working
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  exitFullscreen();
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
