"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  CheckCircle2,
  HelpCircle,
  Code,
  Sliders,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  BookOpen,
  Send,
  Plus,
  Trash2,
  Lightbulb,
  Users,
  ShieldCheck,
  Check,
  ChevronLeft,
  FileCheck,
  Upload,
  FileSpreadsheet,
  Edit3,
  AlertCircle,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api-client";
import {
  requestGeminiQuizGeneration,
  requestGeminiAssignmentGeneration,
  GeneratedQuizResult,
  GeneratedAssignmentResult,
} from "@/lib/gemini-ai";

interface FacultyAiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseCode?: string;
  defaultMode?: "QUIZ" | "ASSIGNMENT" | "LESSON";
  roleLabel?: string;
}

type PromptSuggestion = {
  label: string;
  mode: "QUIZ" | "ASSIGNMENT";
  course: string;
  prompt: string;
};

export function FacultyAiGeneratorModal({
  isOpen,
  onClose,
  defaultCourseCode,
  defaultMode = "QUIZ",
  roleLabel = "Faculty / HOD",
}: FacultyAiGeneratorModalProps) {
  const { createAssignment, createQuiz, courses } = useAcademicData();
  const { user } = useAuth();

  // Dynamic available courses
  const availableCourses = React.useMemo(() => {
    return courses || [];
  }, [courses]);

  // Dynamic Quick Templates matching real courses
  const dynamicSuggestions = React.useMemo(() => {
    if (courses && courses.length > 0) {
      return courses.slice(0, 6).map((c, i) => {
        const isQuiz = i % 2 === 0;
        return {
          label: isQuiz ? `${c.code}: Core Fundamentals (${c.name})` : `${c.code}: Practical Project Assignment`,
          mode: (isQuiz ? "QUIZ" : "ASSIGNMENT") as "QUIZ" | "ASSIGNMENT",
          course: c.code,
          prompt: isQuiz
            ? `Create 5 MCQs covering foundational concepts and key principles of ${c.name}`
            : `Create a comprehensive practical lab assignment and problem set for ${c.name}`,
        };
      });
    }
    return [];
  }, [courses]);

  // Wizard Step: 'CONFIG' (Prompt & Parameters) | 'REVIEW' (Faculty/HOD Review & Edit) | 'PUBLISHED'
  const [activeStep, setActiveStep] = useState<"CONFIG" | "REVIEW" | "PUBLISHED">("CONFIG");

  const [mode, setMode] = useState<"QUIZ" | "ASSIGNMENT">(defaultMode === "ASSIGNMENT" ? "ASSIGNMENT" : "QUIZ");
  const [courseCode, setCourseCode] = useState<string>(
    defaultCourseCode || availableCourses[0]?.code || ""
  );
  const [topic, setTopic] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [assignmentType, setAssignmentType] = useState<"CODING" | "WRITTEN" | "LAB_PROJECT">("CODING");
  const [totalPoints, setTotalPoints] = useState<number>(50);

  React.useEffect(() => {
    if (defaultCourseCode) {
      setCourseCode(defaultCourseCode);
    } else if (availableCourses.length > 0 && !availableCourses.some((c) => c.code === courseCode)) {
      setCourseCode(availableCourses[0].code);
    }
  }, [defaultCourseCode, availableCourses, courseCode]);

  // Drafting & review state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuizResult | null>(null);
  const [generatedAssignment, setGeneratedAssignment] = useState<GeneratedAssignmentResult | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [quizCloseDate, setQuizCloseDate] = useState("");
  const [isAiPowered, setIsAiPowered] = useState<boolean>(true);
  const [isApprovedByReviewer, setIsApprovedByReviewer] = useState<boolean>(false);
  const [creationSource, setCreationSource] = useState<"AI" | "MANUAL" | "UPLOAD">("AI");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProctored, setIsProctored] = useState<boolean>(true);
  const [isCameraRequired, setIsCameraRequired] = useState<boolean>(false);

  const handleStartManualQuiz = () => {
    const activeTopic = topic.trim() || `${courseCode} Quiz Assessment`;
    const count = Math.max(1, Math.min(10, questionCount));
    const initialQuestions = Array.from({ length: count }).map((_, idx) => ({
      prompt: `Question ${idx + 1}: Enter prompt here...`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      explanation: "Enter explanation / correct answer rationale.",
    }));

    setGeneratedQuiz({
      title: activeTopic,
      courseCode,
      description: `Comprehensive academic assessment covering ${activeTopic}`,
      difficulty,
      timeLimitMinutes: 20,
      totalPoints: initialQuestions.length * 5,
      questions: initialQuestions,
    });
    setIsAiPowered(false);
    setActiveStep("REVIEW");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error("File is empty.");

        let parsedQuestions: any[] = [];
        if (file.name.endsWith(".json")) {
          const json = JSON.parse(content);
          const list = Array.isArray(json) ? json : json.questions || [];
          parsedQuestions = list.map((item: any, i: number) => ({
            prompt: item.prompt || item.question || `Question ${i + 1}`,
            options: Array.isArray(item.options) && item.options.length >= 2 ? item.options : ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : (typeof item.answer === "number" ? item.answer : 0),
            explanation: item.explanation || "Correct choice as defined in paper.",
          }));
        } else {
          // CSV parsing
          const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
          const startIdx = lines[0].toLowerCase().includes("question") || lines[0].toLowerCase().includes("prompt") ? 1 : 0;
          for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
            if (parts.length >= 5) {
              const prompt = parts[0];
              const opts = [parts[1], parts[2], parts[3], parts[4]];
              let corrIdx = 0;
              if (parts[5]) {
                const c = parts[5].trim().toUpperCase();
                if (c === "A" || c === "1") corrIdx = 0;
                else if (c === "B" || c === "2") corrIdx = 1;
                else if (c === "C" || c === "3") corrIdx = 2;
                else if (c === "D" || c === "4") corrIdx = 3;
                else if (!isNaN(Number(c))) corrIdx = Math.max(0, Math.min(3, parseInt(c, 10)));
              }
              parsedQuestions.push({
                prompt,
                options: opts,
                correctIndex: corrIdx,
                explanation: parts[6] || "Explanation from question paper.",
              });
            }
          }
        }

        if (parsedQuestions.length === 0) {
          throw new Error("Could not parse questions. Ensure CSV format has (Question, Option A, Option B, Option C, Option D, Correct Option) or JSON format with prompt and options.");
        }

        const activeTopic = topic.trim() || file.name.replace(/\.[^/.]+$/, "");
        setGeneratedQuiz({
          title: activeTopic,
          courseCode,
          description: `Imported question paper from ${file.name}`,
          difficulty,
          timeLimitMinutes: Math.max(15, parsedQuestions.length * 3),
          totalPoints: parsedQuestions.length * 5,
          questions: parsedQuestions,
        });
        setIsAiPowered(false);
        setActiveStep("REVIEW");
      } catch (err: any) {
        setUploadError(err.message || "Failed to parse question paper.");
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const handleApplySuggestion = (sug: PromptSuggestion) => {
    setMode(sug.mode);
    setCourseCode(sug.course);
    setTopic(sug.label);
    setCustomPrompt(sug.prompt);
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !customPrompt.trim()) {
      alert("Please enter a topic or generation prompt.");
      return;
    }

    setIsGenerating(true);
    setPublishSuccess(null);
    setPublishError(null);

    const activeTopic = topic.trim() || customPrompt.trim().slice(0, 40);

    try {
      if (mode === "QUIZ") {
        const res = await requestGeminiQuizGeneration({
          courseCode,
          topic: activeTopic,
          prompt: customPrompt,
          count: questionCount,
          difficulty,
        });
        setGeneratedQuiz(res.data);
        setIsAiPowered(res.isAi);
        setActiveStep("REVIEW");
      } else {
        const res = await requestGeminiAssignmentGeneration({
          courseCode,
          topic: activeTopic,
          prompt: customPrompt,
          assignmentType,
          points: totalPoints,
        });
        setGeneratedAssignment(res.data);
        setIsAiPowered(res.isAi);
        setActiveStep("REVIEW");
      }
    } catch (err: any) {
      setPublishError(err instanceof Error ? err.message : "Content generation failed. Please try again.");
      setGeneratedQuiz(null);
      setGeneratedAssignment(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- QUESTION EDITING HELPERS FOR FACULTY/HOD REVIEW ---
  const handleUpdateQuestionPrompt = (qIdx: number, newPrompt: string) => {
    if (!generatedQuiz) return;
    const updated = [...generatedQuiz.questions];
    updated[qIdx] = { ...updated[qIdx], prompt: newPrompt };
    setGeneratedQuiz({ ...generatedQuiz, questions: updated });
  };

  const handleUpdateOption = (qIdx: number, oIdx: number, newOptionText: string) => {
    if (!generatedQuiz) return;
    const updated = [...generatedQuiz.questions];
    const opts = [...updated[qIdx].options];
    opts[oIdx] = newOptionText;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setGeneratedQuiz({ ...generatedQuiz, questions: updated });
  };

  const handleSetCorrectIndex = (qIdx: number, correctIdx: number) => {
    if (!generatedQuiz) return;
    const updated = [...generatedQuiz.questions];
    updated[qIdx] = { ...updated[qIdx], correctIndex: correctIdx };
    setGeneratedQuiz({ ...generatedQuiz, questions: updated });
  };

  const handleUpdateExplanation = (qIdx: number, explanation: string) => {
    if (!generatedQuiz) return;
    const updated = [...generatedQuiz.questions];
    updated[qIdx] = { ...updated[qIdx], explanation };
    setGeneratedQuiz({ ...generatedQuiz, questions: updated });
  };

  const handleDeleteQuestion = (qIdx: number) => {
    if (!generatedQuiz) return;
    if (generatedQuiz.questions.length <= 1) {
      alert("A quiz must contain at least 1 question.");
      return;
    }
    const updated = generatedQuiz.questions.filter((_, idx) => idx !== qIdx);
    setGeneratedQuiz({
      ...generatedQuiz,
      questions: updated,
      totalPoints: updated.length * 5,
    });
  };

  const handleAddNewQuestion = () => {
    if (!generatedQuiz) return;
    const newQ = {
      prompt: "Enter your question prompt here...",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      explanation: "Explanation of why this answer is correct.",
    };
    const updated = [...generatedQuiz.questions, newQ];
    setGeneratedQuiz({
      ...generatedQuiz,
      questions: updated,
      totalPoints: updated.length * 5,
    });
  };

  // --- ASSIGNMENT EDITING HELPERS ---
  const handleUpdateAssignmentField = (field: keyof GeneratedAssignmentResult, value: any) => {
    if (!generatedAssignment) return;
    setGeneratedAssignment({ ...generatedAssignment, [field]: value });
  };

  const handleAddRubricItem = () => {
    if (!generatedAssignment) return;
    const currentRubric = generatedAssignment.rubric || [];
    const updated = [...currentRubric, { criteria: "Code Quality & Documentation", points: 10 }];
    setGeneratedAssignment({ ...generatedAssignment, rubric: updated });
  };

  const handleUpdateRubricItem = (idx: number, criteria: string, points: number) => {
    if (!generatedAssignment || !generatedAssignment.rubric) return;
    const updated = [...generatedAssignment.rubric];
    updated[idx] = { criteria, points };
    setGeneratedAssignment({ ...generatedAssignment, rubric: updated });
  };

  const handleDeleteRubricItem = (idx: number) => {
    if (!generatedAssignment || !generatedAssignment.rubric) return;
    const updated = generatedAssignment.rubric.filter((_, i) => i !== idx);
    setGeneratedAssignment({ ...generatedAssignment, rubric: updated });
  };

  // --- PUBLISH HANDLERS ---
  const handlePublishQuiz = async () => {
    if (!generatedQuiz || !isApprovedByReviewer || isPublishing) return;
    const course = courses.find((item) => item.code === courseCode || item.id === courseCode);
    if (!course?.id) {
      setPublishError("Choose a saved course before publishing.");
      return;
    }
    const closeDate = new Date(quizCloseDate);
    if (Number.isNaN(closeDate.getTime()) || closeDate.getTime() <= Date.now()) {
      setPublishError("Choose a future quiz close date.");
      return;
    }
    if (!generatedQuiz.questions.length || generatedQuiz.questions.some((question) =>
      !question.prompt.trim() || question.options.length < 2 ||
      question.options.some((option) => !option.trim()) ||
      question.correctIndex < 0 || question.correctIndex >= question.options.length
    )) {
      setPublishError("Complete every question, answer choice, and correct answer.");
      return;
    }
    setPublishError(null);
    setIsPublishing(true);
    try {
      const questionIds: string[] = [];
      for (const question of generatedQuiz.questions) {
        const saved = await apiClient.post<{ id: string }>(`/courses/${course.id}/questions`, {
          question_type: "MCQ_SINGLE",
          question_text: question.prompt.trim(),
          points: generatedQuiz.totalPoints / generatedQuiz.questions.length,
          explanation: question.explanation,
          options: question.options.map((option, index) => ({
            option_text: option.trim(),
            is_correct: index === question.correctIndex,
            display_order: index + 1,
          })),
        });
        questionIds.push(saved.id);
      }
      const exam = await apiClient.post<{ id: string }>(`/courses/${course.id}/exams`, {
        title: generatedQuiz.title.trim(),
        description: generatedQuiz.description,
        exam_type: "QUIZ",
        duration_minutes: generatedQuiz.timeLimitMinutes,
        total_marks: generatedQuiz.totalPoints,
        passing_marks: 0,
        end_time: closeDate.toISOString(),
        question_ids: questionIds,
        is_published: false,
      });
      await apiClient.post(`/exams/${exam.id}/publish`);
    } catch (error) {
      console.warn("Backend quiz sync note:", error);
    }

    try {
      createQuiz({
        courseCode,
        courseName: course.name,
        title: generatedQuiz.title.trim(),
        description: generatedQuiz.description || `Assessment for ${courseCode}`,
        timeLimitMinutes: generatedQuiz.timeLimitMinutes || 20,
        totalPoints: generatedQuiz.totalPoints || (generatedQuiz.questions.length * 5),
        weightPercentage: 25,
        dueDate: closeDate.toISOString(),
        isCameraProctored: isProctored && isCameraRequired,
        isFullscreenRequired: isProctored,
        isTabSwitchBlocked: isProctored,
        isCopyPasteBlocked: isProctored,
        questions: generatedQuiz.questions.map((q, idx) => ({
          id: `q-${idx + 1}-${Date.now()}`,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          points: Math.round((generatedQuiz.totalPoints || (generatedQuiz.questions.length * 5)) / generatedQuiz.questions.length),
        })),
        attempts: {},
        createdBy: user?.id || user?.email,
        facultyId: user?.id,
      });
    } catch (err) {
      console.warn("Local quiz creation note:", err);
    } finally {
      setIsPublishing(false);
    }
    setPublishSuccess(`Quiz published to enrolled students in ${courseCode}.`);
    setActiveStep("PUBLISHED");
  };

  const handlePublishAssignment = async () => {
    if (!generatedAssignment || isPublishing) return;
    if (!isApprovedByReviewer) {
      alert("Please certify faculty review and approval before publishing to students.");
      return;
    }
    const courseObj = courses.find((c) => c.code === courseCode);
    const courseName = courseObj?.name || `${courseCode} Course`;

    setPublishError(null);
    setIsPublishing(true);
    try {
      await createAssignment({
      courseCode,
      courseName,
      title: generatedAssignment.title,
      description: generatedAssignment.description,
      type: generatedAssignment.type,
      dueDate: assignmentDueDate,
      totalPoints: generatedAssignment.totalPoints,
      weightPercentage: 15,
      status: "ACTIVE",
      starterCode: generatedAssignment.starterCode,
      proctoringMode: "PROCTORED",
      });
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Assignment could not be published.");
      return;
    } finally {
      setIsPublishing(false);
    }

    setActiveStep("PUBLISHED");
    setPublishSuccess(`Assignment published to enrolled students in ${courseCode}.`);
    setTimeout(() => {
      onClose();
      setActiveStep("CONFIG");
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Create Draft
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  Review Required
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create quizzes or assignments, review them, and publish to selected classes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-Step Breadcrumb Bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold">
            <span
              onClick={() => setActiveStep("CONFIG")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                activeStep === "CONFIG"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
              }`}
            >
              <span>1. Details</span>
              {activeStep !== "CONFIG" && <Check className="h-3.5 w-3.5" />}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                activeStep === "REVIEW"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : activeStep === "PUBLISHED"
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <span>2. Review</span>
              {activeStep === "PUBLISHED" && <Check className="h-3.5 w-3.5" />}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                activeStep === "PUBLISHED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <span>3. Publish</span>
            </span>
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Course: <strong className="text-indigo-600 dark:text-indigo-400">{courseCode}</strong>
          </span>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ══════════════════════════════════════════════════════ */}
              {/* STEP 1: CONFIGURATION & TOPIC INPUT                    */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeStep === "CONFIG" && (
            <>
              {/* Mode Switcher */}
              <div className="flex items-center justify-between gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                <button
                  onClick={() => {
                    setMode("QUIZ");
                    setPublishSuccess(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === "QUIZ"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Create Quiz</span>
                </button>
                <button
                  onClick={() => {
                    setMode("ASSIGNMENT");
                    setPublishSuccess(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === "ASSIGNMENT"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Code className="h-4 w-4" />
                  <span>Create Assignment</span>
                </button>
              </div>

              {/* Sub-Tabs: AI Generator vs Manual Question Builder vs File Upload */}
              {mode === "QUIZ" && (
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCreationSource("AI")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      creationSource === "AI"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Generator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationSource("MANUAL")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      creationSource === "MANUAL"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Manual Question Builder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationSource("UPLOAD")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      creationSource === "UPLOAD"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Paper (CSV / JSON)</span>
                  </button>
                </div>
              )}

              {/* VIEW A: MANUAL QUESTION BUILDER */}
              {mode === "QUIZ" && creationSource === "MANUAL" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                      <select
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {availableCourses.map((c) => (
                          <option key={c.code} value={c.code}>{c.code} : {c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quiz Title / Topic</label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Unit 1 Class Test Assessment"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Starting Questions</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={3}>3 Blank Questions</option>
                        <option value={5}>5 Blank Questions</option>
                        <option value={10}>10 Blank Questions</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Edit3 className="h-4 w-4 text-indigo-600" />
                        <span>Manual Question Builder Mode</span>
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Craft questions by typing prompts, adding 4 options (A/B/C/D), selecting the correct answer, and adding explanations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartManualQuiz}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-500/20 shrink-0"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Start Building Questions</span>
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW B: UPLOAD QUESTION PAPER (CSV / JSON) */}
              {mode === "QUIZ" && creationSource === "UPLOAD" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                      <select
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {availableCourses.map((c) => (
                          <option key={c.code} value={c.code}>{c.code} : {c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quiz Title (Optional)</label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Leave blank to use filename"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-8 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Upload Question Paper (.CSV or .JSON)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        CSV Headers: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Question, Option A, Option B, Option C, Option D, Correct Option, Explanation</code>
                      </p>
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-500/20 transition-all">
                        <Upload className="h-4 w-4" />
                        <span>Select File to Upload</span>
                        <input
                          type="file"
                          accept=".csv,.json"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {uploadError && (
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2">{uploadError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW C: AI GENERATOR (Default or Assignment Mode) */}
              {(creationSource === "AI" || mode === "ASSIGNMENT") && (
                <>
                  {/* Quick Topic Suggestions */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      <span>Quick Templates</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {dynamicSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleApplySuggestion(sug)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left cursor-pointer"
                        >
                          <span className="text-indigo-500 mr-1.5 font-bold">[{sug.course}]</span>
                          {sug.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Draft Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Course
                      </label>
                      <select
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {availableCourses.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} : {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Topic / Key Concept
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Fundamental Algorithms, System Design & Architecture"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {mode === "QUIZ" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Questions
                          </label>
                          <select
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value={3}>3 MCQs</option>
                            <option value={5}>5 MCQs</option>
                            <option value={10}>10 MCQs</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Difficulty
                          </label>
                          <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as any)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Assignment Type
                          </label>
                          <select
                            value={assignmentType}
                            onChange={(e) => setAssignmentType(e.target.value as any)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="CODING">Coding Lab</option>
                            <option value="WRITTEN">Written Problem Set</option>
                            <option value="LAB_PROJECT">Term Project</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Total Marks
                          </label>
                          <select
                            value={totalPoints}
                            onChange={(e) => setTotalPoints(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value={30}>30 Pts</option>
                            <option value={50}>50 Pts</option>
                            <option value={100}>100 Pts</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {mode === "QUIZ" && (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Proctoring &amp; Camera Monitoring Rules</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Proctoring Mode
                          </label>
                          <select
                            value={isProctored ? "PROCTORED" : "UNPROCTORED"}
                            onChange={(e) => {
                              const proct = e.target.value === "PROCTORED";
                              setIsProctored(proct);
                              if (!proct) setIsCameraRequired(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="PROCTORED">Proctored (Fullscreen lock &amp; tab switch blocked)</option>
                            <option value="UNPROCTORED">Unproctored (Standard open assessment)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Camera Proctoring
                          </label>
                          <select
                            disabled={!isProctored}
                            value={isCameraRequired ? "COMPULSORY" : "NOT_REQUIRED"}
                            onChange={(e) => setIsCameraRequired(e.target.value === "COMPULSORY")}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50"
                          >
                            <option value="NOT_REQUIRED">Camera Not Required (No webcam check)</option>
                            <option value="COMPULSORY">Camera Required (Compulsory webcam verification)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Custom Instructions or Pedagogical Constraints (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g., Include tricky edge-cases, avoid ambiguous distractors, and focus on practical engineering trade-offs."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  {publishError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                      <span>{isGenerating ? "Preparing draft..." : "Generate Draft"}</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Step 1 of 2 • Review &amp; verification will open next
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* STEP 2: FACULTY & HOD REVIEW, EDIT & VERIFICATION      */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeStep === "REVIEW" && (
            <div className="space-y-6 animate-fade-in">
              {/* Review Guidance Banner */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>Faculty &amp; HOD Pedagogical Verification Stage</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-semibold border border-border">
                      Review &amp; Edit Before Release
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Examine each question, adjust wording, set correct answers, remove unwanted items, or add new questions. No assessment is sent to students without your explicit sign-off.
                  </p>
                </div>
              </div>

              {/* ─── REVIEWING QUIZ MCQs ─── */}
              {mode === "QUIZ" && generatedQuiz && (
                <div className="space-y-5">
                  {/* Quiz Metadata Editor */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Quiz Title
                      </label>
                      <input
                        type="text"
                        value={generatedQuiz.title}
                        onChange={(e) => setGeneratedQuiz({ ...generatedQuiz, title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Time (Mins)
                        </label>
                        <input
                          type="number"
                          value={generatedQuiz.timeLimitMinutes}
                          onChange={(e) => setGeneratedQuiz({ ...generatedQuiz, timeLimitMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          value={generatedQuiz.totalPoints}
                          onChange={(e) => setGeneratedQuiz({ ...generatedQuiz, totalPoints: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Questions Header & Add Button */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-indigo-600" />
                      <span>MCQ Items ({generatedQuiz.questions.length} questions)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNewQuestion}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Custom MCQ</span>
                    </button>
                  </div>

                  {/* Question Cards with Inline Editing */}
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {generatedQuiz.questions.map((q, qIdx) => {
                      return (
                        <div
                          key={qIdx}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                                {qIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={q.prompt}
                                onChange={(e) => handleUpdateQuestionPrompt(qIdx, e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder={`Question ${qIdx + 1} prompt...`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(qIdx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                              title="Delete this question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Options 2x2 Grid with Correct Answer Selector */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-8">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctIndex;
                              const char = String.fromCharCode(65 + oIdx);
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                                    isCorrect
                                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-xs"
                                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSetCorrectIndex(qIdx, oIdx)}
                                    className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                      isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-200"
                                    }`}
                                    title={isCorrect ? "Correct Answer" : "Click to set as Correct Answer"}
                                  >
                                    {char}
                                  </button>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    placeholder={`Option ${char}`}
                                  />
                                  {isCorrect && (
                                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 shrink-0">
                                      Key ✓
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          <div className="pl-8 flex items-start gap-2">
                            <span className="text-xs font-bold text-indigo-500 mt-1">💡</span>
                            <textarea
                              rows={1}
                              value={q.explanation}
                              onChange={(e) => handleUpdateExplanation(qIdx, e.target.value)}
                              placeholder="Pedagogical explanation for students after submission..."
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── REVIEWING ASSIGNMENT ─── */}
              {mode === "ASSIGNMENT" && generatedAssignment && (
                <div className="space-y-4">
                  {/* Assignment Title & Meta */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Assignment Title
                        </label>
                        <input
                          type="text"
                          value={generatedAssignment.title}
                          onChange={(e) => handleUpdateAssignmentField("title", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          value={generatedAssignment.totalPoints}
                          onChange={(e) => handleUpdateAssignmentField("totalPoints", Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Problem Description &amp; Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={generatedAssignment.description}
                        onChange={(e) => handleUpdateAssignmentField("description", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Starter Code Editor */}
                  {generatedAssignment.starterCode !== undefined && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Starter Code Template
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">C++ / Python</span>
                      </div>
                      <textarea
                        rows={5}
                        value={generatedAssignment.starterCode}
                        onChange={(e) => handleUpdateAssignmentField("starterCode", e.target.value)}
                        className="w-full p-3 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Grading Rubric Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Grading Rubric Breakdown
                      </span>
                      <button
                        type="button"
                        onClick={handleAddRubricItem}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Criterion</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {generatedAssignment.rubric?.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <input
                            type="text"
                            value={r.criteria}
                            onChange={(e) => handleUpdateRubricItem(idx, e.target.value, r.points)}
                            className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent focus:outline-none"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={r.points}
                              onChange={(e) => handleUpdateRubricItem(idx, r.criteria, Number(e.target.value))}
                              className="w-12 px-1 py-0.5 rounded text-xs font-black text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-800 text-center"
                            />
                            <span className="text-[10px] text-slate-400">pts</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRubricItem(idx)}
                              className="text-rose-400 hover:text-rose-600 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === "QUIZ" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Quiz close date
                    <input
                      type="datetime-local"
                      required
                      value={quizCloseDate}
                      onChange={(event) => setQuizCloseDate(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 text-xs font-bold"
                    />
                  </label>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Proctoring Mode
                    </label>
                    <select
                      value={isProctored ? "PROCTORED" : "UNPROCTORED"}
                      onChange={(e) => {
                        const proct = e.target.value === "PROCTORED";
                        setIsProctored(proct);
                        if (!proct) setIsCameraRequired(false);
                      }}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value="PROCTORED">Proctored (Strict Lock)</option>
                      <option value="UNPROCTORED">Unproctored (Standard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Camera Requirement
                    </label>
                    <select
                      disabled={!isProctored}
                      value={isCameraRequired ? "COMPULSORY" : "NOT_REQUIRED"}
                      onChange={(e) => setIsCameraRequired(e.target.value === "COMPULSORY")}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 text-xs font-bold disabled:opacity-50"
                    >
                      <option value="NOT_REQUIRED">Camera Not Required</option>
                      <option value="COMPULSORY">Camera Required (Compulsory)</option>
                    </select>
                  </div>
                </div>
              )}
              {mode === "ASSIGNMENT" && (
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Due date
                  <input
                    type="datetime-local"
                    required
                    value={assignmentDueDate}
                    onChange={(event) => setAssignmentDueDate(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              )}
              {publishError && <p role="alert" className="text-xs text-rose-600">{publishError}</p>}

              {/* Reviewer Quality Sign-off Checkbox */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <input
                    type="checkbox"
                    checked={isApprovedByReviewer}
                    onChange={(e) => setIsApprovedByReviewer(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Pedagogical Sign-off: I certify that this assessment material aligns with the course syllabus and grading standards.
                  </span>
                </label>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase tracking-wider shrink-0">
                  Verified
                </span>
              </div>

              {/* Action Buttons in Review Stage */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveStep("CONFIG")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Adjust Topic / Settings</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    <span>Regenerate Draft</span>
                  </button>

                  {mode === "QUIZ" ? (
                    <button
                      type="button"
                      onClick={handlePublishQuiz}
                      disabled={!isApprovedByReviewer || !quizCloseDate || isPublishing}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Publish Quiz</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePublishAssignment}
                      disabled={!isApprovedByReviewer || !assignmentDueDate || isPublishing}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Publish Assignment</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* STEP 3: PUBLISHED SUCCESS CONFIRMATION                 */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeStep === "PUBLISHED" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                <FileCheck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Assessment Verified &amp; Published!
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                {publishSuccess}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
