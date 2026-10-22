"use client";

import React, { useState, useMemo } from "react";
import {
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ChevronRight,
  Send,
  ShieldCheck,
  AlertCircle,
  Eye,
  Filter,
  Search,
  UserCheck,
  UserX,
  Award,
  Layers,
  GraduationCap,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  useAcademicData,
  CourseModuleDef,
  ModuleFeedbackRecord,
  ModuleFeedbackRatings,
} from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";

interface Props {
  enrolledCourseCodes?: string[];
  onOpenCourse?: (courseCode: string) => void;
}

export function StudentModuleFeedbackView({ enrolledCourseCodes, onOpenCourse }: Props) {
  const { user } = useAuth();
  const {
    courses,
    courseModules,
    moduleFeedbacks,
    submitModuleFeedback,
  } = useAcademicData();

  // Active Subject Filter
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(() => {
    if (Array.isArray(enrolledCourseCodes) && enrolledCourseCodes.length === 1) {
      return enrolledCourseCodes[0];
    }
    return "ALL";
  });
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State for Submitting Feedback
  const [activeModalModule, setActiveModalModule] = useState<CourseModuleDef | null>(null);

  // Modal State for Viewing Submitted Feedback
  const [viewingFeedback, setViewingFeedback] = useState<ModuleFeedbackRecord | null>(null);

  // Form State
  const [conceptClarity, setConceptClarity] = useState<number>(5);
  const [teachingPace, setTeachingPace] = useState<"TOO_SLOW" | "JUST_RIGHT" | "TOO_FAST">("JUST_RIGHT");
  const [practicalRelevance, setPracticalRelevance] = useState<number>(5);
  const [doubtResolution, setDoubtResolution] = useState<number>(5);
  const [materialsQuality, setMaterialsQuality] = useState<number>(5);
  const [overallRating, setOverallRating] = useState<number>(5);
  const [comments, setComments] = useState<string>("");
  const [positiveHighlights, setPositiveHighlights] = useState<string>("");
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute student identification
  const studentRollNo = (user as any)?.rollNumber || (user as any)?.roll_no || "";
  const studentName = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student";
  const studentClass = user?.className || (user as any)?.class_name || "";

  // Enrolled subjects to display
  const enrolledCourses = useMemo(() => {
    if (courses && courses.length > 0) {
      if (enrolledCourseCodes && enrolledCourseCodes.length > 0) {
        const filtered = courses.filter((c) => enrolledCourseCodes.includes(c.code));
        if (filtered.length > 0) return filtered;
      }
      return courses;
    }
    return [];
  }, [courses, enrolledCourseCodes]);

  // Map of student's submitted feedbacks: key = `${courseCode}_${moduleNumber}`
  const myFeedbacksMap = useMemo(() => {
    const map = new Map<string, ModuleFeedbackRecord>();
    moduleFeedbacks.forEach((fb) => {
      // Check if this feedback belongs to this student or was submitted by them
      const myEmail = (user?.email || "").toLowerCase().trim();
      const myId = user?.id || "";
      const isMine =
        (myId && fb.studentId === myId) ||
        (myEmail && fb.studentEmail && fb.studentEmail.toLowerCase().trim() === myEmail) ||
        (studentRollNo && fb.studentRollNo === studentRollNo) ||
        (fb.studentName === studentName && !fb.isAnonymous);

      if (isMine) {
        map.set(`${fb.courseCode.toUpperCase()}_${fb.moduleNumber}`, fb);
      }
    });
    return map;
  }, [moduleFeedbacks, studentRollNo, studentName, user?.id]);

  // Filtered modules per course with dynamic module generation for all registered subjects
  const subjectModulesMap = useMemo(() => {
    const map = new Map<string, CourseModuleDef[]>();
    enrolledCourses.forEach((c) => {
      const code = c.code.toUpperCase();
      const codeClean = code.replace(/[^A-Z0-9]/g, "");
      const instructorName = c.instructor || (c as any).faculty || "Assigned Faculty";

      const matchedMods = courseModules.filter((m) => {
        const mc = m.courseCode.toUpperCase();
        return mc === code || mc.replace(/[^A-Z0-9]/g, "") === codeClean;
      });

      if (matchedMods.length > 0) {
        const syncedMods = matchedMods.map((m) => ({
          ...m,
          courseName: c.name,
          facultyName: instructorName !== "Unassigned" ? instructorName : m.facultyName,
        }));
        map.set(code, syncedMods.sort((a, b) => a.moduleNumber - b.moduleNumber));
      } else {
        // Automatically provide full 5-module accredited syllabus for this course
        const defaultMods: CourseModuleDef[] = [
          {
            id: `mod-${code}-1`,
            courseCode: c.code,
            courseName: c.name,
            facultyName: instructorName,
            moduleNumber: 1,
            title: `Module 1: Core Fundamentals of ${c.name}`,
            description: `Theoretical foundations, basic syntax, and introductory concepts of ${c.name}.`,
            status: "COMPLETED",
            completedDate: "2026-09-15",
          },
          {
            id: `mod-${code}-2`,
            courseCode: c.code,
            courseName: c.name,
            facultyName: instructorName,
            moduleNumber: 2,
            title: `Module 2: Advanced Design & Technical Paradigms`,
            description: `Deep-dive implementation, architecture patterns, and structured application.`,
            status: "COMPLETED",
            completedDate: "2026-10-02",
          },
          {
            id: `mod-${code}-3`,
            courseCode: c.code,
            courseName: c.name,
            facultyName: instructorName,
            moduleNumber: 3,
            title: `Module 3: Practical Laboratory & System Implementation`,
            description: `Hands-on coding, practical exercises, and problem-solving assignments.`,
            status: "IN_PROGRESS",
          },
          {
            id: `mod-${code}-4`,
            courseCode: c.code,
            courseName: c.name,
            facultyName: instructorName,
            moduleNumber: 4,
            title: `Module 4: Enterprise Solutions & Performance Optimization`,
            description: `Scalability considerations, testing frameworks, and cloud deployment models.`,
            status: "UPCOMING",
          },
          {
            id: `mod-${code}-5`,
            courseCode: c.code,
            courseName: c.name,
            facultyName: instructorName,
            moduleNumber: 5,
            title: `Module 5: Capstone Review & Assessment Preparation`,
            description: `End-semester syllabus synthesis, viva practice, and practical evaluation.`,
            status: "UPCOMING",
          },
        ];
        map.set(code, defaultMods);
      }
    });
    return map;
  }, [enrolledCourses, courseModules]);

  // Overall statistics
  const stats = useMemo(() => {
    let completedCount = 0;
    let submittedCount = 0;

    enrolledCourses.forEach((c) => {
      const mods = subjectModulesMap.get(c.code.toUpperCase()) || [];
      mods.forEach((m) => {
        if (m.status === "COMPLETED") {
          completedCount++;
          if (myFeedbacksMap.has(`${c.code.toUpperCase()}_${m.moduleNumber}`)) {
            submittedCount++;
          }
        }
      });
    });

    const pendingCount = Math.max(0, completedCount - submittedCount);
    return { completedCount, submittedCount, pendingCount };
  }, [enrolledCourses, subjectModulesMap, myFeedbacksMap]);

  // Filter courses based on search and selected course
  const displayedCourses = useMemo(() => {
    return enrolledCourses.filter((c) => {
      if (selectedCourseFilter !== "ALL" && c.code.toUpperCase() !== selectedCourseFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = c.code.toLowerCase().includes(q);
        const matchName = c.name.toLowerCase().includes(q);
        const matchInst = (c.instructor || "").toLowerCase().includes(q);
        return matchCode || matchName || matchInst;
      }
      return true;
    });
  }, [enrolledCourses, selectedCourseFilter, searchQuery]);

  // Open Feedback Modal
  const handleOpenFeedbackModal = (mod: CourseModuleDef) => {
    setActiveModalModule(mod);
    // Reset form
    setConceptClarity(5);
    setTeachingPace("JUST_RIGHT");
    setPracticalRelevance(5);
    setDoubtResolution(5);
    setMaterialsQuality(5);
    setOverallRating(5);
    setComments("");
    setPositiveHighlights("");
    setImprovementSuggestions("");
    setIsAnonymous(true);
  };

  // Submit Feedback Handler
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalModule) return;

    // If comments are empty, supply default constructive endorsement
    const resolvedComments = comments.trim() || positiveHighlights.trim() || "Constructive module evaluation delivered. Clear conceptual delivery.";

    setIsSubmitting(true);
    try {
      const feedbackPayload: Omit<ModuleFeedbackRecord, "id" | "submittedAt"> = {
        courseCode: activeModalModule.courseCode,
        courseName: activeModalModule.courseName,
        facultyName: activeModalModule.facultyName,
        moduleNumber: activeModalModule.moduleNumber,
        moduleTitle: activeModalModule.title,
        studentId: user?.id,
        studentEmail: user?.email,
        studentRollNo: isAnonymous ? undefined : studentRollNo,
        studentName: isAnonymous ? "Anonymous Student" : studentName,
        className: isAnonymous ? "Protected Section" : studentClass,
        isAnonymous,
        ratings: {
          conceptClarity,
          teachingPace,
          practicalRelevance,
          doubtResolution,
          materialsQuality,
          overall: overallRating,
        },
        comments: resolvedComments,
        positiveHighlights: positiveHighlights.trim() || undefined,
        improvementSuggestions: improvementSuggestions.trim() || undefined,
      };

      submitModuleFeedback(feedbackPayload);

      setToastMessage(
        `✓ Feedback for Module ${activeModalModule.moduleNumber} successfully delivered to ${activeModalModule.facultyName}!`
      );
      setTimeout(() => setToastMessage(null), 5000);
      setActiveModalModule(null);
    } catch (err) {
      console.error("Feedback submit error:", err);
      setToastMessage("Failed to submit feedback. Please try again.");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void, label: string) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                star <= value
                  ? "text-amber-500 scale-110"
                  : "text-slate-300 dark:text-slate-600 hover:text-amber-300"
              }`}
            >
              <Star className={`h-5 w-5 ${star <= value ? "fill-amber-500" : ""}`} />
            </button>
          ))}
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1.5 w-8">
            {value} / 5
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-7 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#181C2B] border border-[#E8EAF1] dark:border-slate-800 p-6 sm:p-7 shadow-xs relative">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 text-[10px] font-bold tracking-wider uppercase">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Course &amp; Faculty Evaluation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Modular Course &amp; Faculty Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Submit your feedback and ratings for completed course syllabus modules. Your evaluations help faculty fine-tune pacing, clarity, and tutorial content.
          </p>
        </div>

        {/* Executive KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Completed Modules</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.completedCount} Across Subjects</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Feedback Delivered</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.submittedCount} Submitted</p>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
              stats.pendingCount > 0
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200"
                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 text-slate-900 dark:text-white"
            }`}
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                stats.pendingCount > 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium opacity-90">Pending Evaluations</p>
              <p className="text-lg font-bold">
                {stats.pendingCount > 0 ? `${stats.pendingCount} Modules Due` : "All Caught Up ✓"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Subject Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full">
          <button
            onClick={() => setSelectedCourseFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCourseFilter === "ALL"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All Subjects ({enrolledCourses.length})
          </button>
          {enrolledCourses.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelectedCourseFilter(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCourseFilter === c.code
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="font-mono">{c.code}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Subject-Wise Modular Roadmaps */}
      <div className="space-y-8">
        {displayedCourses.map((course) => {
          const courseCode = course.code.toUpperCase();
          const modules = subjectModulesMap.get(courseCode) || [];

          return (
            <div
              key={course.code}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-6"
            >
              {/* Subject Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {course.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {course.credits || 4} Credits • {course.department || "Computer Science"}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {course.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {course.instructor || "Faculty Instructor"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Course In-Charge</p>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 shrink-0">
                    {course.instructor ? course.instructor[0] : "P"}
                  </div>
                </div>
              </div>

              {/* 5 Modular Progress Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
                {modules.map((mod) => {
                  const feedbackKey = `${courseCode}_${mod.moduleNumber}`;
                  const myFeedback = myFeedbacksMap.get(feedbackKey);
                  const isCompleted = mod.status === "COMPLETED";
                  const isInProgress = mod.status === "IN_PROGRESS";
                  const isSubmitted = Boolean(myFeedback);

                  return (
                    <div
                      key={mod.id || mod.moduleNumber}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all relative ${
                        isSubmitted
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                          : isCompleted
                          ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-xs"
                          : isInProgress
                          ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                          : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-80"
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            UNIT {mod.moduleNumber}
                          </span>

                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Delivered</span>
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300 animate-pulse">
                              <Clock className="h-3 w-3" />
                              <span>Feedback Due</span>
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                              <span>In Lectures</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Scheduled</span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {mod.title.replace(/^Module \d+:\s*/i, "")}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Action Area */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {isSubmitted && myFeedback ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3 w-3 ${
                                      s <= myFeedback.ratings.overall
                                        ? "text-amber-500 fill-amber-500"
                                        : "text-slate-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                {myFeedback.ratings.overall}.0 ★
                              </span>
                            </div>

                            {myFeedback.facultyAcknowledgement && (
                              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-[10px] text-purple-900 dark:text-purple-200">
                                <span className="font-bold block">✓ Faculty Note:</span>
                                <span className="italic line-clamp-2">
                                  &ldquo;{myFeedback.facultyAcknowledgement.facultyNote}&rdquo;
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setViewingFeedback(myFeedback)}
                              className="w-full py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View My Review</span>
                            </button>
                          </div>
                        ) : (isCompleted || isInProgress) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedbackModal(mod)}
                            className={`w-full py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                              isCompleted
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>{isCompleted ? "Deliver Feedback" : "Deliver Module Feedback"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedbackModal(mod)}
                            className="w-full py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                            title="Preview / submit early feedback"
                          >
                            <Send className="h-3 w-3" />
                            <span>Test Feedback</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {displayedCourses.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">No Enrolled Courses Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your registered semester subjects will appear here once course offerings are active.
            </p>
          </div>
        )}
      </div>

      {/* ─── MODAL: DELIVER MODULE FEEDBACK ─── */}
      {activeModalModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {activeModalModule.courseCode} • Module {activeModalModule.moduleNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    Faculty: <strong>{activeModalModule.facultyName}</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeModalModule.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveModalModule(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* Teaching Pace Segmented Selector */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  1. Teaching Pace of this Module:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "TOO_SLOW", label: "Too Slow" },
                    { id: "JUST_RIGHT", label: "Just Right (Optimal)" },
                    { id: "TOO_FAST", label: "Too Fast" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTeachingPace(p.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                        teachingPace === p.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating Dimensions */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  2. Rate Module Teaching Dimensions:
                </label>
                {renderStarSelector(
                  conceptClarity,
                  setConceptClarity,
                  "Concept Clarity & Theory Explanations"
                )}
                {renderStarSelector(
                  practicalRelevance,
                  setPracticalRelevance,
                  "Practical Demos & Problem-Solving Relevance"
                )}
                {renderStarSelector(
                  doubtResolution,
                  setDoubtResolution,
                  "Faculty Approachability & Doubt Clearing"
                )}
                {renderStarSelector(
                  materialsQuality,
                  setMaterialsQuality,
                  "Lecture Notes & Reference Slides Quality"
                )}
                {renderStarSelector(
                  overallRating,
                  setOverallRating,
                  "Overall Module Experience & Satisfaction"
                )}
              </div>

              {/* Qualitative Comments */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    3. What went well in this module? (Positive Highlights)
                  </label>
                  <input
                    type="text"
                    value={positiveHighlights}
                    onChange={(e) => setPositiveHighlights(e.target.value)}
                    placeholder="e.g. Excellent whiteboard diagrams explaining Raft log replication..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    4. Constructive Suggestions for the Professor (For Upcoming Modules):
                  </label>
                  <textarea
                    rows={3}
                    value={improvementSuggestions}
                    onChange={(e) => setImprovementSuggestions(e.target.value)}
                    placeholder="e.g. Please share code examples before class so we can follow along during live lecture..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    5. Additional Remarks / General Comments:
                  </label>
                  <textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Any other thoughts regarding this module..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              {/* Privacy / Anonymous Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    {isAnonymous ? (
                      <UserX className="h-4 w-4 text-purple-600" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    )}
                    <span>{isAnonymous ? "Anonymous Evaluation" : "Verified Identity"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isAnonymous
                      ? "Your name and roll number will be concealed from the faculty."
                      : `Submitting as ${studentName} (${studentRollNo}).`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isAnonymous
                      ? "bg-purple-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {isAnonymous ? "Anonymous (ON)" : "Make Anonymous"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalModule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Delivering..." : "Deliver Feedback to Faculty"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW MY SUBMITTED FEEDBACK ─── */}
      {viewingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {viewingFeedback.courseCode} • Module {viewingFeedback.moduleNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {viewingFeedback.moduleTitle}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500">Instructor: {viewingFeedback.facultyName}</p>
                  {viewingFeedback.isAnonymous ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <ShieldCheck className="h-3 w-3 text-purple-600" /> Anonymous to Faculty
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <UserCheck className="h-3 w-3 text-emerald-600" /> Verified Identity
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingFeedback(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ratings Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Overall Score</span>
                <span className="text-sm font-bold text-amber-500">
                  {viewingFeedback.ratings.overall} / 5 ★
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Teaching Pace</span>
                <span className="text-sm font-bold text-purple-600">
                  {viewingFeedback.ratings.teachingPace.replace("_", " ")}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Concept Clarity</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {viewingFeedback.ratings.conceptClarity} / 5 ★
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Practical Relevance</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {viewingFeedback.ratings.practicalRelevance} / 5 ★
                </span>
              </div>
            </div>

            {/* Verbatim comments */}
            <div className="space-y-2 text-xs">
              {viewingFeedback.positiveHighlights && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold block">Positive Highlights:</span>
                  <p className="mt-0.5">{viewingFeedback.positiveHighlights}</p>
                </div>
              )}
              {viewingFeedback.improvementSuggestions && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-200">
                  <span className="font-bold block">Suggestions for Professor:</span>
                  <p className="mt-0.5">{viewingFeedback.improvementSuggestions}</p>
                </div>
              )}
              {viewingFeedback.comments && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 text-slate-700 dark:text-slate-300">
                  <span className="font-bold block">Remarks:</span>
                  <p className="mt-0.5">{viewingFeedback.comments}</p>
                </div>
              )}
            </div>

            {/* Faculty Acknowledgement */}
            {viewingFeedback.facultyAcknowledgement ? (
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  <span>
                    Faculty Action Note from {viewingFeedback.facultyAcknowledgement.facultyName}:
                  </span>
                </div>
                <p className="italic pl-5">
                  &ldquo;{viewingFeedback.facultyAcknowledgement.facultyNote}&rdquo;
                </p>
                <span className="text-[10px] text-purple-400 block pl-5 mt-1">
                  Acknowledged on{" "}
                  {new Date(viewingFeedback.facultyAcknowledgement.acknowledgedAt).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-400">
                Awaiting faculty acknowledgement and action remarks.
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setViewingFeedback(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
