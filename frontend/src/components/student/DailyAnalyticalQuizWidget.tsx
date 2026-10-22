"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ArrowRight,
  RotateCcw,
  Zap,
  TrendingUp,
  BrainCircuit,
  Trophy,
  ChevronRight,
  Check,
  Calendar,
} from "lucide-react";
import { requestGeminiQuizGeneration } from "@/lib/gemini-ai";

interface DailyQuestion {
  id: string;
  topic: string;
  category: "Algorithms" | "System Architecture" | "Databases" | "Networking" | "Discrete Logic";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  analyticalInsight: string;
}

const BANK_DAILY_QUESTIONS: Record<number, DailyQuestion[]> = {
  // Day 0
  0: [
    {
      id: "dq-0-1",
      topic: "Amortized Analysis & Dynamic Arrays",
      category: "Algorithms",
      prompt: "When doubling dynamic array capacity upon reaching size N, what is the amortized cost per append operation over N insertions?",
      options: [
        "O(1) amortized time per insertion",
        "O(N) amortized time per insertion",
        "O(log N) amortized time per insertion",
        "O(N^2) amortized time per insertion",
      ],
      correctIndex: 0,
      explanation: "Although resizing takes O(N) time, it occurs only every N steps (powers of 2). The total cost across N insertions is ~3N operations, giving O(1) amortized time per append.",
      analyticalInsight: "Key for technical interviews: Doubling capacity achieves O(1) amortized, whereas increasing capacity by a constant c leads to quadratic O(N^2) total cost.",
    },
    {
      id: "dq-0-2",
      topic: "Database ACID & WAL Invariants",
      category: "Databases",
      prompt: "In the Write-Ahead Logging (WAL) protocol, why must the log record for a database modification reach non-volatile disk BEFORE the dirty page is written to disk?",
      options: [
        "To guarantee the Atomicity and Durability (WAL invariant) in the event of an immediate system crash",
        "To reduce RAM usage in the buffer pool manager",
        "To allow faster read queries without indexing",
        "To compress the relational tables automatically",
      ],
      correctIndex: 0,
      explanation: "If a dirty page was flushed first and the machine crashed before logging, the database engine would lose the uncommitted Undo/Redo trail, corrupting recovery.",
      analyticalInsight: "ARIES recovery relies fundamentally on WAL: Log Sequence Numbers (LSNs) ensure no state modification precedes its audit log.",
    },
    {
      id: "dq-0-3",
      topic: "TCP Congestion Avoidance",
      category: "Networking",
      prompt: "In TCP Reno, what happens to the congestion window (cwnd) upon entering the Congestion Avoidance phase after Slow Start?",
      options: [
        "cwnd increases linearly by 1 MSS per Round Trip Time (RTT)",
        "cwnd doubles every RTT exponentially",
        "cwnd resets immediately to 1 MSS",
        "cwnd freezes at ssthresh permanently",
      ],
      correctIndex: 0,
      explanation: "Once cwnd reaches the slow start threshold (ssthresh), TCP switches to additive increase (AIMD), growing by 1 MSS per RTT to probe capacity safely.",
      analyticalInsight: "Additive Increase Multiplicative Decrease (AIMD) guarantees fairness and efficiency convergence across competing flows.",
    },
  ],
  // Day 1
  1: [
    {
      id: "dq-1-1",
      topic: "AVL Tree Rotations",
      category: "Algorithms",
      prompt: "A node has balance factor +2 and its left child has balance factor -1. What rotation sequence restores strict AVL height balance?",
      options: [
        "Left-Right (LR) Double Rotation: Left-rotate left child, then Right-rotate root",
        "Single Right Rotation (RR) on root",
        "Single Left Rotation (LL) on root",
        "Right-Left (RL) Double Rotation",
      ],
      correctIndex: 0,
      explanation: "The LR imbalance occurs when the insertion happened in the inner right subtree of the left child. Left rotating the child converts it to a standard LL case, followed by a right rotation on root.",
      analyticalInsight: "Double rotations always make the newly inserted grandchild the new local subtree root.",
    },
    {
      id: "dq-1-2",
      topic: "Cache Coherence & Invalidation",
      category: "System Architecture",
      prompt: "Under the MESI cache coherence protocol, what state does a cache line transition to when another CPU core writes to the same memory block?",
      options: [
        "Invalid (I) state",
        "Modified (M) state",
        "Exclusive (E) state",
        "Shared (S) state",
      ],
      correctIndex: 0,
      explanation: "When a core issues a Write Invalidate broadcast over the interconnect, all other caches caching that memory address invalidate their copy (I state).",
      analyticalInsight: "Prevents stale reads across multi-core SMP architectures without requiring constant shared memory bus polling.",
    },
    {
      id: "dq-1-3",
      topic: "Relational Normalization",
      category: "Databases",
      prompt: "For a relational schema to be in Boyce-Codd Normal Form (BCNF), what condition must hold for every non-trivial functional dependency X -> Y?",
      options: [
        "X must be a Superkey of the relation",
        "Y must be a prime attribute",
        "X must be a foreign key in another table",
        "Relation must have no NULL values",
      ],
      correctIndex: 0,
      explanation: "BCNF strictly requires that every determinant X in non-trivial dependencies is a superkey, eliminating all redundancy from functional dependencies.",
      analyticalInsight: "3NF allows Y to be prime, whereas BCNF eliminates this loophole, occasionally at the cost of dependency preservation.",
    },
  ],
};

export function DailyAnalyticalQuizWidget() {
  const [todayQuestions, setTodayQuestions] = useState<DailyQuestion[]>(BANK_DAILY_QUESTIONS[0]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    // Pick questions based on day of year
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
    );
    const setKey = dayOfYear % 2;
    const questions = BANK_DAILY_QUESTIONS[setKey] || BANK_DAILY_QUESTIONS[0];
    setTodayQuestions(questions);

  }, [todayKey]);

  const currentQ = todayQuestions[currentIdx] || todayQuestions[0];
  const isSelected = selectedAnswers[currentQ?.id] !== undefined;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === todayQuestions.length;

  const correctCount = Object.entries(selectedAnswers).filter(([qId, ansIdx]) => {
    const q = todayQuestions.find((x) => x.id === qId);
    return q && q.correctIndex === ansIdx;
  }).length;

  const scorePct = Math.round((correctCount / todayQuestions.length) * 100);

  const handleSelectOption = (optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optIdx,
    }));
  };

  const handleSubmitDailyQuiz = () => {
    setIsSubmitted(true);
    const newStreak = streakCount + 1;
    setStreakCount(newStreak);
  };

  const handleFetchAiDiagnosticSet = async () => {
    setIsAiLoading(true);
    try {
      const res = await requestGeminiQuizGeneration({
        courseCode: "CS-ADV",
        topic: "Advanced Computer Science Analytical Concepts & System Design",
        count: 3,
        difficulty: "HARD",
      });

      if (res.data?.questions && res.data.questions.length > 0) {
        const formatted: DailyQuestion[] = res.data.questions.map((q, idx) => ({
          id: `dq-ai-${Date.now()}-${idx}`,
          topic: res.data.title || "Core CS Concept",
          category: idx === 0 ? "Algorithms" : idx === 1 ? "Databases" : "Networking",
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          analyticalInsight: "Study Insight: Focus on boundary invariants and optimal time-space trade-offs.",
        }));
        setTodayQuestions(formatted);
        setSelectedAnswers({});
        setIsSubmitted(false);
        setCurrentIdx(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-xs space-y-5 animate-fade-in relative overflow-hidden">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Daily Practice Quiz
              </h3>
              <span className="px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-xs font-semibold flex items-center gap-1 border border-border">
                <Flame className="h-3 w-3 text-primary" />
                {streakCount}-Day Streak
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              3 practice questions every day to review and test your concepts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleFetchAiDiagnosticSet}
            disabled={isAiLoading}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isAiLoading ? "animate-spin" : ""}`} />
            <span>{isAiLoading ? "Loading..." : "New Questions"}</span>
          </button>
        </div>
      </div>

      {/* Progress & Step Indicators */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5">
          {todayQuestions.map((q, idx) => {
            const isAnswered = selectedAnswers[q.id] !== undefined;
            const isCurrent = idx === currentIdx;
            const isCorrect = isSubmitted && selectedAnswers[q.id] === q.correctIndex;
            const isWrong = isSubmitted && isAnswered && !isCorrect;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                    : isCorrect
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : isWrong
                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                    : isAnswered
                    ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                    : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>Q{idx + 1}</span>
                {isSubmitted && (
                  isCorrect ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-rose-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200/60 dark:border-indigo-800">
            {currentQ.category}
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">
            {currentIdx + 1} / {todayQuestions.length}
          </span>
        </div>
      </div>

      {/* Active Question Card */}
      {currentQ && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 relative z-10">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
              {currentQ.topic}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
              {currentQ.prompt}
            </h4>
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, optIdx) => {
              const isPicked = selectedAnswers[currentQ.id] === optIdx;
              const isCorrectAnswer = optIdx === currentQ.correctIndex;

              let optionStyle = "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400";
              if (isPicked && !isSubmitted) {
                optionStyle = "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs";
              }
              if (isSubmitted) {
                if (isCorrectAnswer) {
                  optionStyle = "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs";
                } else if (isPicked && !isCorrectAnswer) {
                  optionStyle = "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold";
                }
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${optionStyle}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-black text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </div>

                  {isSubmitted && isCorrectAnswer && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Correct
                    </span>
                  )}
                  {isSubmitted && isPicked && !isCorrectAnswer && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Incorrect
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* In-depth Analytical Explanation (Visible upon submission) */}
          {isSubmitted && (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                <BrainCircuit className="h-4 w-4 text-indigo-600" />
                <span>Analytical Invariant Analysis:</span>
              </div>
              <p className="leading-relaxed">{currentQ.explanation}</p>
              {currentQ.analyticalInsight && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  💡 <strong>Interview Pro-Tip:</strong> {currentQ.analyticalInsight}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation & Submit Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 relative z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentIdx((prev) => Math.min(todayQuestions.length - 1, prev + 1))}
            disabled={currentIdx === todayQuestions.length - 1}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isSubmitted ? (
            <div className="flex items-center gap-2.5">
              <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span>Score: {correctCount} / {todayQuestions.length} ({scorePct}%) • +50 XP Awarded</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSubmitDailyQuiz}
              disabled={!allAnswered}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit Today&apos;s Quiz ({answeredCount}/{todayQuestions.length} Answered)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
