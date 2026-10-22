"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Sparkles,
  Wand2,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Camera,
  Monitor,
  AlertTriangle,
  HelpCircle,
  Loader2,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import { useAcademicData, LmsQuizQuestion } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { requestGeminiQuizGeneration } from "@/lib/gemini-ai";

interface FacultyCreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: FacultyCourse[];
  onCreateExam?: (examData: {
    title: string;
    courseCode: string;
    durationMinutes: number;
    fullscreenRequired: boolean;
    copyPastePrevention: boolean;
    tabSwitchDetection: boolean;
    strikeLimit: number;
    date?: string;
    timeSlot?: string;
    venue?: string;
    maxMarks?: number;
    assessmentType?: "DSA_CLASS_TEST" | "MID_TERM" | "LAB_PRACTICAL" | "QUIZ";
    targetClass?: string;
  }) => void;
}

export function FacultyCreateExamModal({
  isOpen,
  onClose,
  courses,
  onCreateExam,
}: FacultyCreateExamModalProps) {
  const { createQuiz, departments, courses: academicCourses, users } = useAcademicData();
  const { user } = useAuth();

  const availableTargetClasses = useMemo(() => {
    const list = new Set<string>();
    (departments || []).forEach((d) => {
      (d.cohorts || []).forEach((c) => {
        if (c.name) list.add(c.name);
      });
    });
    (academicCourses || []).forEach((crs) => {
      if (Array.isArray(crs.assignedClasses)) {
        crs.assignedClasses.forEach((cls: string) => list.add(cls));
      }
    });
    (courses || []).forEach((crs) => {
      if (Array.isArray((crs as any).assignedClasses)) {
        (crs as any).assignedClasses.forEach((cls: string) => list.add(cls));
      }
    });
    (users || []).forEach((u) => {
      if (u.className) list.add(u.className);
    });
    return Array.from(list);
  }, [departments, academicCourses, courses, users]);

  // Basic Information
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number>(0);
  const [targetClass, setTargetClass] = useState<string>("All Enrolled Classes");
  const [assessmentType, setAssessmentType] = useState<"DSA_CLASS_TEST" | "MID_TERM" | "LAB_PRACTICAL" | "QUIZ">("QUIZ");

  // Timing & Schedule Window
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState<string>("15:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [venue, setVenue] = useState<string>("Online / Computer Lab 3");

  // Proctoring Toggles
  const [cameraProctoring, setCameraProctoring] = useState<boolean>(true);
  const [fullscreenLock, setFullscreenLock] = useState<boolean>(true);
  const [tabSwitchLock, setTabSwitchLock] = useState<boolean>(true);
  const [copyPasteLock, setCopyPasteLock] = useState<boolean>(true);

  // Authoring Mode: "AI_GEN" vs "MANUAL"
  const [creationMode, setCreationMode] = useState<"AI_GEN" | "MANUAL">("AI_GEN");

  // AI Generation State
  const [aiTopic, setAiTopic] = useState<string>("");
  const [aiSlideMaterial, setAiSlideMaterial] = useState<string>("");
  const [aiMcqCount, setAiMcqCount] = useState<number>(10);
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Questions Bank
  const [questions, setQuestions] = useState<LmsQuizQuestion[]>([
    {
      id: "q-init-1",
      prompt: "Which data structure follows the Last-In First-Out (LIFO) order of execution?",
      options: ["Queue", "Stack", "Binary Search Tree", "Linked List"],
      correctIndex: 1,
      explanation: "A Stack utilizes LIFO semantics where elements are inserted and popped from the same top extremity.",
      points: 2,
    },
    {
      id: "q-init-2",
      prompt: "What is the worst-case time complexity of searching an element in a balanced AVL tree?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
      correctIndex: 2,
      explanation: "An AVL tree maintains a balance factor between -1 and +1, guaranteeing logarithmic height O(log n).",
      points: 2,
    },
  ]);

  // Manual Question Draft
  const [manualPrompt, setManualPrompt] = useState<string>("");
  const [manualOptions, setManualOptions] = useState<string[]>(["", "", "", ""]);
  const [manualCorrectIndex, setManualCorrectIndex] = useState<number>(0);
  const [manualExplanation, setManualExplanation] = useState<string>("");

  if (!isOpen) return null;

  const currentCourse = courses[selectedCourseIndex] || courses[0] || { course_code: "CS301", name: "Data Structures & Algorithms" };

  // AI Generator Handler
  const handleGenerateAiMcqs = async () => {
    if (!aiTopic.trim()) {
      setAiError("Please specify a topic or lecture concept.");
      return;
    }
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const combinedPrompt = `Generate exactly ${aiMcqCount} rigorous multiple choice questions for course ${currentCourse.course_code}: ${currentCourse.name}.
Topic: ${aiTopic}
${aiSlideMaterial.trim() ? `\nLecture Slides & Content Material:\n"""\n${aiSlideMaterial.trim()}\n"""\n` : ""}
Ensure questions are strictly factual, testing real problem solving, syntax, or theoretical analysis. Return 4 distinct options per question with 1 correct option index (0-3) and a comprehensive explanation.`;

      const result = await requestGeminiQuizGeneration({
        courseCode: currentCourse.course_code,
        topic: aiTopic,
        prompt: combinedPrompt,
        count: aiMcqCount,
        difficulty: aiDifficulty,
      });

      if (result.data && result.data.questions && result.data.questions.length > 0) {
        const generatedList: LmsQuizQuestion[] = result.data.questions.map((q, idx) => ({
          id: `q-ai-${Date.now()}-${idx + 1}`,
          prompt: q.prompt,
          options: q.options && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
          explanation: q.explanation || "Correct answer verified by curriculum analysis.",
          points: 2,
        }));

        setQuestions(generatedList);
        if (!title) {
          setTitle(`${aiTopic} - Scheduled Assessment`);
        }
        if (!description) {
          setDescription(`Scheduled ${aiDifficulty.toLowerCase()} proctored examination covering ${aiTopic}. Questions shuffled dynamically per student.`);
        }
      } else {
        throw new Error("No questions returned from AI service.");
      }
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      setAiError(err.message || "Failed to generate MCQs with AI. Please try again or author manually.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Add Manual Question
  const handleAddManualQuestion = () => {
    if (!manualPrompt.trim()) {
      alert("Please enter a question prompt.");
      return;
    }
    if (manualOptions.some((o) => !o.trim())) {
      alert("Please fill in all 4 options.");
      return;
    }

    const newQ: LmsQuizQuestion = {
      id: `q-man-${Date.now()}`,
      prompt: manualPrompt.trim(),
      options: [...manualOptions],
      correctIndex: manualCorrectIndex,
      explanation: manualExplanation.trim() || "Correct option validated by faculty author.",
      points: 2,
    };

    setQuestions([...questions, newQ]);
    setManualPrompt("");
    setManualOptions(["", "", "", ""]);
    setManualCorrectIndex(0);
    setManualExplanation("");
  };

  // Remove Question
  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Final Publish Handler
  const handlePublishQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter an assessment title.");
      return;
    }
    if (questions.length === 0) {
      alert("Please author or generate at least 1 MCQ question.");
      return;
    }

    const totalCalculatedPoints = questions.reduce((sum, q) => sum + (q.points || 2), 0);

    // Save directly into LMS Academic Data Context
    createQuiz({
      courseCode: currentCourse.course_code,
      courseName: currentCourse.name,
      title: title.trim(),
      description: description.trim() || `Proctored examination for ${targetClass}. Anti-cheat randomized questions.`,
      targetClass,
      assessmentType,
      scheduledDate,
      startTime,
      endTime,
      timeLimitMinutes: durationMinutes,
      totalPoints: totalCalculatedPoints,
      weightPercentage: assessmentType === "MID_TERM" ? 25 : 10,
      dueDate: `${scheduledDate} ${endTime}`,
      isCameraProctored: cameraProctoring,
      isFullscreenRequired: fullscreenLock,
      isTabSwitchBlocked: tabSwitchLock,
      isCopyPasteBlocked: copyPasteLock,
      resultsReleased: false,
      questions,
      createdBy: user?.id || user?.email,
      facultyId: user?.id,
    });

    // Notify parent if provided
    if (onCreateExam) {
      onCreateExam({
        title: title.trim(),
        courseCode: currentCourse.course_code,
        durationMinutes,
        fullscreenRequired: fullscreenLock,
        copyPastePrevention: copyPasteLock,
        tabSwitchDetection: tabSwitchLock,
        strikeLimit: 3,
        date: scheduledDate,
        timeSlot: `${startTime} - ${endTime}`,
        venue,
        maxMarks: totalCalculatedPoints,
        assessmentType,
        targetClass,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 border border-slate-100 dark:border-slate-800 shadow-2xl my-auto max-h-[92vh] overflow-y-auto animate-fade-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Create Class Quiz or Examination</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                  Anti-Cheat Shuffled
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Target specific class cohorts, set scheduled exam windows (e.g. 15:00 - 17:00), toggle webcam surveillance, and generate MCQs with AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handlePublishQuiz} className="space-y-6 text-xs">
          
          {/* Section 1: Target Class & Course */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Target Class Cohort</span>
              </label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              >
                <option value="All Enrolled Classes">All Enrolled Classes (Combined)</option>
                {availableTargetClasses.map((cls: string) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Course</label>
              <select
                value={selectedCourseIndex}
                onChange={(e) => setSelectedCourseIndex(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              >
                {courses.map((c, i) => (
                  <option key={c.id || i} value={i}>
                    {c.course_code}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Assessment Type</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              >
                <option value="QUIZ">⚡ Quick Assessment Quiz</option>
                <option value="DSA_CLASS_TEST">📝 DSA Class Test (Internal)</option>
                <option value="MID_TERM">🎓 Official Mid-Term Exam</option>
                <option value="LAB_PRACTICAL">💻 Lab Practical Exam</option>
              </select>
            </div>
          </div>

          {/* Section 2: Exam Meta, Scheduled Window & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Trees, Heaps & Graphs Scheduled Quiz"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Description / Instructions</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Read questions thoroughly. Do not exit fullscreen or switch tabs."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Schedule Window & Duration */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Scheduled Time Window &amp; Access Lock</span>
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                Results and answers stay locked until window closes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Exam Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Window Start (e.g. 15:00)</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Window End (e.g. 17:00)</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Time Limit (Mins)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Proctoring Controls & Camera Toggle */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="font-black text-slate-900 dark:text-white block">
              Assessment integrity settings
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Camera Proctoring Toggle */}
              <div
                onClick={() => setCameraProctoring(!cameraProctoring)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  cameraProctoring
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${cameraProctoring ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Identity monitoring</span>
                    <span className="text-[10px] opacity-80">
                      {cameraProctoring ? "Identity monitoring is required during this exam" : "Identity monitoring is not required"}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    cameraProctoring ? "bg-purple-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      cameraProctoring ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Fullscreen Lockdown Toggle */}
              <div
                onClick={() => setFullscreenLock(!fullscreenLock)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  fullscreenLock
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${fullscreenLock ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Fullscreen Lock</span>
                    <span className="text-[10px] opacity-80">Exit triggers security strike warning</span>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    fullscreenLock ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      fullscreenLock ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Tab Switch Detector */}
              <div
                onClick={() => setTabSwitchLock(!tabSwitchLock)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  tabSwitchLock
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${tabSwitchLock ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Tab-Switch Detector (3 Strikes)</span>
                    <span className="text-[10px] opacity-80">Window blur tracks multi-tab attempts</span>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    tabSwitchLock ? "bg-amber-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      tabSwitchLock ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Copy/Paste Blocking */}
              <div
                onClick={() => setCopyPasteLock(!copyPasteLock)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  copyPasteLock
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${copyPasteLock ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Copy/Paste &amp; DevTools Block</span>
                    <span className="text-[10px] opacity-80">Prevents copying questions or pasting code</span>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    copyPasteLock ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      copyPasteLock ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Authoring Mode Switcher */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white">MCQ Questions Bank</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold">
                  {questions.length} Questions
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCreationMode("AI_GEN")}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    creationMode === "AI_GEN"
                      ? "bg-white dark:bg-slate-900 text-purple-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Generate with Slides / Prompt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("MANUAL")}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    creationMode === "MANUAL"
                      ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Manual Authoring</span>
                </button>
              </div>
            </div>

            {/* MODE 1: AI GENERATION */}
            {creationMode === "AI_GEN" && (
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/60 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold">
                  <Wand2 className="h-4 w-4" />
                  <span>AI MCQ Generator (Slides &amp; Material Aware)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Topic or Concept
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. Binary Search Trees, AVL Balancing & Tree Rotations"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      MCQ Count
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[5, 10, 15, 20, 30].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setAiMcqCount(num)}
                          className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-[11px] transition-all ${
                            aiMcqCount === num
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Paste Lecture Slides / Content Material (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={aiSlideMaterial}
                    onChange={(e) => setAiSlideMaterial(e.target.value)}
                    placeholder="Paste slides text, lecture summaries, or textbook sections. The AI will extract key concepts and formulate MCQs tailored to this exact syllabus..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Difficulty:</span>
                    {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAiDifficulty(d)}
                        className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                          aiDifficulty === d
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={handleGenerateAiMcqs}
                    className="btn-saas-primary bg-purple-600 hover:bg-purple-700 text-white text-xs px-5 py-2 flex items-center gap-2 shadow-md shadow-purple-500/20"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating {aiMcqCount} MCQs...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate {aiMcqCount} MCQs with AI</span>
                      </>
                    )}
                  </Button>
                </div>

                {aiError && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px] font-medium">
                    ⚠️ {aiError}
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: MANUAL QUESTION AUTHORING */}
            {creationMode === "MANUAL" && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                <span className="font-bold text-slate-900 dark:text-white block">Add Question Manually</span>
                
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Question Prompt</label>
                  <input
                    type="text"
                    value={manualPrompt}
                    onChange={(e) => setManualPrompt(e.target.value)}
                    placeholder="Enter MCQ prompt..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {manualOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctManualOpt"
                        checked={manualCorrectIndex === i}
                        onChange={() => setManualCorrectIndex(i)}
                        className="text-blue-600"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...manualOptions];
                          next[i] = e.target.value;
                          setManualOptions(next);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={manualExplanation}
                      onChange={(e) => setManualExplanation(e.target.value)}
                      placeholder="Explanation (shown to student after exam window concludes)..."
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddManualQuestion}
                    className="btn-saas-primary text-xs w-full flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add to Exam</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Questions Bank List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-900 dark:text-white">
                      <span className="text-blue-600 font-mono mr-1.5">Q{idx + 1}.</span>
                      {q.prompt}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {q.options.map((opt, optI) => (
                      <div
                        key={optI}
                        className={`p-1.5 rounded-lg border flex items-center justify-between ${
                          optI === q.correctIndex
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold"
                            : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>
                          <strong className="mr-1">{String.fromCharCode(65 + optI)}.</strong>
                          {opt}
                        </span>
                        {optI === q.correctIndex && <Check className="h-3 w-3 text-emerald-600" />}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-[10px] text-slate-400 italic">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Exam will be published for <strong>{targetClass}</strong> with <strong>{questions.length} MCQs</strong>.
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={questions.length === 0}
                className="btn-saas-primary text-xs px-6 shadow-md shadow-blue-500/20 font-bold"
              >
                Schedule &amp; Publish Exam
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
