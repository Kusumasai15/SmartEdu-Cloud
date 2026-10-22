"use client";

import React, { useState, useMemo } from "react";
import {
  Zap,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Bot,
  Trophy,
  Loader2,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleLearningNode } from "@/types";

export interface AdaptiveMcq {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
  concept_tested: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface AdaptivePracticePlayerProps {
  courseCode: string;
  courseTitle: string;
  modules: ModuleLearningNode[];
  onOpenAiTutor?: (topic: string, prompt?: string) => void;
}

export function AdaptivePracticePlayer({
  courseCode,
  courseTitle,
  modules,
  onOpenAiTutor,
}: AdaptivePracticePlayerProps) {
  // Topic selector
  const allTopics = useMemo(() => {
    return modules.flatMap((m) =>
      m.topics.map((t) => ({
        id: t.id,
        title: t.title,
        moduleTitle: m.title,
      }))
    );
  }, [modules]);

  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    allTopics[0]?.id || "ALL"
  );

  const activeTopic = allTopics.find((t) => t.id === selectedTopicId) || null;

  const [questions, setQuestions] = useState<AdaptiveMcq[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Switch questions when topic selection changes
  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    const t = allTopics.find((x) => x.id === topicId);
    setQuestions([]);
    setUserAnswers({});
    setIsSubmitted(false);
  };

  // Answer selection
  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    if (isSubmitted) return; // Locked once checked
    setUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  // Score Computation
  const score = useMemo(() => {
    let s = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_index) s++;
    });
    return s;
  }, [questions, userAnswers]);

  // Weak Topics Detection
  const weakTopics = useMemo(() => {
    if (!isSubmitted) return [];
    const missed = questions.filter(
      (q, idx) => userAnswers[idx] !== undefined && userAnswers[idx] !== q.correct_index
    );
    // Unanswered questions also flagged
    const unanswered = questions.filter((_, idx) => userAnswers[idx] === undefined);
    const combined = [...missed, ...unanswered];
    const uniqueMap = new Map<string, { concept: string; question: string }>();
    combined.forEach((q) => {
      if (!uniqueMap.has(q.concept_tested)) {
        uniqueMap.set(q.concept_tested, {
          concept: q.concept_tested,
          question: q.prompt,
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [isSubmitted, questions, userAnswers]);

  // Check Answers
  const handleCheckAnswers = () => {
    setIsSubmitted(true);
    setNotification(`Practice checked. Score: ${score}/${questions.length}.`);
    setTimeout(() => setNotification(null), 4500);
  };

  // Reset / Try Again
  const handleReset = () => {
    setUserAnswers({});
    setIsSubmitted(false);
  };

  // Generate New AI Questions via Backend
  const handleGenerateNewQuestions = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/v1/intelligence/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: courseCode,
          course_title: courseTitle,
          topic_title: activeTopic?.title || "Curriculum Synthesis",
          count: 5,
        }),
      });
      const data = await res.json();
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setUserAnswers({});
        setIsSubmitted(false);
        setNotification("✓ 5 New Adaptive Questions loaded!");
        setTimeout(() => setNotification(null), 3000);
      } else {
        setQuestions([]);
        setNotification("Practice questions are not available for this topic.");
      }
    } catch {
      setQuestions([]);
      setNotification("Practice generation failed. No substitute questions were added.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Header Card (Matching Image 1: ⚡ Adaptive Syllabus Practice Questions) ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
              <Zap className="h-5 w-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Adaptive Syllabus Practice Questions
              </h2>
              <p className="text-xs text-slate-400">
                Curriculum-grounded adaptive MCQs with instant explanations &amp; weak topic detection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateNewQuestions}
              disabled={isGenerating || allTopics.length === 0}
              className="text-xs h-8 px-3 rounded-xl border-purple-200 text-[#582C64] dark:text-purple-300 hover:bg-purple-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-600" />
                  <span>New Questions</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Topic Selector Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Practice Drill:
          </span>
          <select
            value={selectedTopicId}
            onChange={(e) => handleSelectTopic(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-xs max-w-xs truncate"
          >
            {allTopics.length === 0 && <option value="ALL">No course topics available</option>}
            {allTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.moduleTitle})
              </option>
            ))}
          </select>

          {isSubmitted && (
            <span className="ml-auto font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
              Score: {score} / {questions.length} (
              {Math.round((score / questions.length) * 100)}%)
            </span>
          )}
        </div>

        {notification && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <Trophy className="h-4 w-4 text-emerald-600" />
          </div>
        )}
      </div>

      {/* ─── Questions List (Multiple MCQs) ─── */}
      <div className="space-y-5">
        {questions.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No practice questions loaded</h3>
            <p className="mt-1 text-xs text-slate-500">Select a published topic and generate questions from the course service.</p>
          </div>
        )}
        {questions.map((q, qIdx) => {
          const selectedOpt = userAnswers[qIdx];
          const isAnswered = selectedOpt !== undefined;
          const isCorrect = isAnswered && selectedOpt === q.correct_index;

          return (
            <div
              key={q.id || qIdx}
              className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 space-y-4 shadow-2xs transition-all ${
                isSubmitted
                  ? isCorrect
                    ? "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20"
                    : "border-rose-300 dark:border-rose-800/80 bg-rose-50/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950 text-[#582C64] dark:text-purple-300">
                      Question {qIdx + 1} of {questions.length}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {q.difficulty}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {qIdx + 1}. {q.prompt}
                  </h3>
                </div>

                {isSubmitted && (
                  <div className="shrink-0">
                    {isCorrect ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                        <X className="h-3.5 w-3.5" /> Incorrect
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Options A, B, C, D */}
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => {
                  const isThisSelected = selectedOpt === oIdx;
                  const isThisCorrect = oIdx === q.correct_index;

                  let optionStyle =
                    "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300";

                  if (isSubmitted) {
                    if (isThisCorrect) {
                      optionStyle =
                        "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold";
                    } else if (isThisSelected) {
                      optionStyle =
                        "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-semibold line-through";
                    } else {
                      optionStyle =
                        "border-slate-200 dark:border-slate-800 opacity-60 text-slate-500";
                    }
                  } else if (isThisSelected) {
                    optionStyle =
                      "border-[#582C64] bg-purple-50 dark:bg-purple-950/40 text-[#582C64] dark:text-purple-300 font-bold shadow-xs";
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectAnswer(qIdx, oIdx)}
                      disabled={isSubmitted}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-6 w-6 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                            isThisSelected
                              ? "bg-[#582C64] text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>

                      {isSubmitted && isThisCorrect && (
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (Shown when submitted) */}
              {isSubmitted && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <strong className="text-slate-900 dark:text-white font-bold block">
                      Conceptual Explanation:
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {q.explanation}
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300">
                      <span className="font-semibold">Concept Tested:</span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 font-mono">
                        {q.concept_tested}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Bottom Actions Bar ─── */}
      {questions.length > 0 && <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center justify-between">
        {!isSubmitted ? (
          <>
            <span className="text-xs text-slate-400">
              {Object.keys(userAnswers).length} of {questions.length} questions answered
            </span>
            <Button
              onClick={handleCheckAnswers}
              disabled={Object.keys(userAnswers).length === 0}
              className="bg-[#582C64] hover:bg-[#4A235A] text-white font-bold text-xs px-6 py-2 rounded-xl cursor-pointer shadow-xs"
            >
              Check Answers
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="text-xs font-bold rounded-xl cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Retake Drill</span>
              </Button>

              <Button
                onClick={handleGenerateNewQuestions}
                disabled={isGenerating}
                className="bg-[#582C64] hover:bg-[#4A235A] text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                <span>Next Practice Drill</span>
              </Button>
            </div>
          </>
        )}
      </div>}

      {/* ─── Weak Topics Analysis & 1-Click "Teach Me with AI Tutor" ─── */}
      {isSubmitted && weakTopics.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-200 dark:border-amber-900/50 p-6 space-y-4 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Needs Review: Weak Topics Detected ({weakTopics.length})
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                These concepts need more review based on the submitted answers. Open the course learning assistant for a guided explanation.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {weakTopics.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Syllabus Diagnostic Focus
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.concept}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    Related to: {item.question}
                  </p>
                </div>

                {onOpenAiTutor && (
                  <Button
                    size="sm"
                    onClick={() =>
                      onOpenAiTutor(
                        item.concept,
                        `I missed a question on "${item.concept}" in ${courseCode}. Can you teach me this concept clearly from first principles with exam points and an architectural example?`
                      )
                    }
                    className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold h-8 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>⚡ Teach Me with AI Tutor</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
