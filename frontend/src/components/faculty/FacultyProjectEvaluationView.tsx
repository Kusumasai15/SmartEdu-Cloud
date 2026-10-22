"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Award,
  Github,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  User,
  Users,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Edit3,
  Check,
  X,
  Sparkles,
  Layers,
  Send,
  Sliders,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData, StudentProjectSubmission } from "@/context/AcademicDataContext";

interface RubricFormState {
  codeQuality: number;
  systemArchitecture: number;
  documentation: number;
  demoPresentation: number;
  vivaDefense: number;
  facultyFeedback: string;
}

export function FacultyProjectEvaluationView() {
  const { user } = useAuth();
  const { projectSubmissions, gradeProject, courses, addLeaderboardXp } = useAcademicData();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNDER_REVIEW" | "GRADED" | "SUBMITTED">("ALL");
  const [gradingProjectId, setGradingProjectId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Rubric Form State
  const [rubricForm, setRubricForm] = useState<RubricFormState>({
    codeQuality: 0,
    systemArchitecture: 0,
    documentation: 0,
    demoPresentation: 0,
    vivaDefense: 0,
    facultyFeedback: "",
  });

  const facultyName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Faculty";

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenGrading = (project: StudentProjectSubmission) => {
    setGradingProjectId(project.id);
    if (project.rubricScores) {
      setRubricForm({
        codeQuality: project.rubricScores.codeQuality,
        systemArchitecture: project.rubricScores.systemArchitecture,
        documentation: project.rubricScores.documentation,
        demoPresentation: project.rubricScores.demoPresentation,
        vivaDefense: project.rubricScores.vivaDefense,
        facultyFeedback: project.facultyFeedback || "",
      });
    } else {
      setRubricForm({
        codeQuality: 0,
        systemArchitecture: 0,
        documentation: 0,
        demoPresentation: 0,
        vivaDefense: 0,
        facultyFeedback: "",
      });
    }
  };

  const handleSaveGrade = (projectId: string, studentId: string) => {
    const total =
      rubricForm.codeQuality +
      rubricForm.systemArchitecture +
      rubricForm.documentation +
      rubricForm.demoPresentation +
      rubricForm.vivaDefense;

    gradeProject(
      projectId,
      {
        codeQuality: rubricForm.codeQuality,
        systemArchitecture: rubricForm.systemArchitecture,
        documentation: rubricForm.documentation,
        demoPresentation: rubricForm.demoPresentation,
        vivaDefense: rubricForm.vivaDefense,
      },
      rubricForm.facultyFeedback.trim(),
      facultyName
    );

    // Award bonus XP on project approval
    if (studentId) {
      addLeaderboardXp(studentId, 200, "Capstone Project Rubric Evaluated");
    }

    setGradingProjectId(null);
    triggerToast(`✓ Project evaluation saved! Total Score: ${total}/100 Marks. Student gradebook updated.`);
  };

  // Filtered submissions
  const filteredSubmissions = projectSubmissions.filter((p) => {
    const matchCourse = filterCourse === "ALL" || p.courseCode.toLowerCase() === filterCourse.toLowerCase();
    const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
    const matchSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCourse && matchStatus && matchSearch;
  });

  const totalCount = projectSubmissions.length;
  const gradedCount = projectSubmissions.filter((p) => p.status === "GRADED").length;
  const pendingCount = projectSubmissions.filter((p) => p.status !== "GRADED").length;
  const avgScore =
    gradedCount > 0
      ? Math.round(
          projectSubmissions
            .filter((p) => p.status === "GRADED" && p.totalScore !== undefined)
            .reduce((acc, curr) => acc + (curr.totalScore || 0), 0) / gradedCount
        )
      : 0;

  const currentTotalMarks =
    rubricForm.codeQuality +
    rubricForm.systemArchitecture +
    rubricForm.documentation +
    rubricForm.demoPresentation +
    rubricForm.vivaDefense;

  const getLetterGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", label: "Outstanding", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (score >= 80) return { grade: "A", label: "Very Good", color: "text-blue-600 bg-blue-50 border-blue-200" };
    if (score >= 70) return { grade: "B+", label: "Good", color: "text-slate-700 bg-slate-50 border-slate-200" };
    if (score >= 60) return { grade: "B", label: "Above Average", color: "text-slate-600 bg-slate-50 border-slate-200" };
    if (score >= 50) return { grade: "C", label: "Pass", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { grade: "F", label: "Needs Rework", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-2 border border-slate-700 animate-slide-in">
          <CheckCircle2 className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ─── EXECUTIVE BLUE & WHITE HERO ─── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide">
              <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
              <span>FACULTY ACADEMIC ASSESSMENT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Capstone &amp; Term Project Rubric Evaluations
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Assess student software repositories, architecture blueprints, live deployments, and viva defenses using the accredited 100-point institutional rubric.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Assessing As</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{facultyName}</span>
            </div>
          </div>
        </div>

        {/* ─── KPI STATS ROW ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-semibold text-slate-500 block">Total Submissions</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{totalCount}</div>
            <span className="text-[11px] text-slate-500 font-medium">All assigned courses</span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block">Pending Review</span>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 font-mono">{pendingCount}</div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Needs faculty evaluation</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-semibold text-slate-500 block">Evaluated &amp; Graded</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{gradedCount}</div>
            <span className="text-[11px] text-slate-500 font-medium">Synced with Gradebook</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-semibold text-slate-500 block">Average Class Mark</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {avgScore > 0 ? `${avgScore}%` : "—"}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Based on 100 max points</span>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by project title, student name, roll number, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Course filter */}
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} • {c.name.split(" ")[0]}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Status</option>
            <option value="UNDER_REVIEW">Needs Review</option>
            <option value="GRADED">Graded</option>
          </select>
        </div>
      </div>

      {/* ─── SUBMISSIONS LIST ─── */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FolderKanban className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No project submissions match your criteria</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or course filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((project) => {
            const isGraded = project.status === "GRADED";
            const isEditingThis = gradingProjectId === project.id;
            const letter = project.totalScore ? getLetterGrade(project.totalScore) : null;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-all hover:border-blue-200 dark:hover:border-blue-900/40"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {project.courseCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">• {project.courseName}</span>
                      <span className="text-xs text-slate-400">| Submitted {project.submittedAt}</span>

                      {/* Solo vs Team badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        {project.submissionType === "TEAM" ? (
                          <>
                            <Users className="h-3 w-3 text-blue-600" />
                            <span>Team ({project.teamMembers?.length || 2} members)</span>
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3 text-blue-600" />
                            <span>Individual</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-1">
                      {project.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span>
                        <strong className="text-slate-900 dark:text-white font-semibold">Student:</strong> {project.studentName} ({project.rollNo})
                      </span>
                      {project.submissionType === "TEAM" && project.teamMembers && (
                        <span>
                          <strong className="text-slate-900 dark:text-white font-semibold">Team Members:</strong> {project.teamMembers.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Grade Pill */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    {isGraded ? (
                      <div className="text-right flex items-center sm:flex-col gap-2 sm:gap-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                          <span>Graded: {project.totalScore}/100</span>
                        </span>
                        {letter && (
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${letter.color}`}>
                            Grade {letter.grade} ({letter.label})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Needs Evaluation</span>
                      </span>
                    )}

                    {!isEditingThis && (
                      <button
                        onClick={() => handleOpenGrading(project)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>{isGraded ? "Edit Marks" : "Evaluate Rubric"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Abstract */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Abstract &amp; Architectural Summary:</span>
                  {project.abstract}
                </div>

                {/* Tech Stack Chips */}
                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Stack:</span>
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Student Links (GitHub, Demo, Documentation) */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {project.githubUrl ? (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      <span>GitHub Repository</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No GitHub provided</span>
                  )}

                  {project.demoUrl ? (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Live Hosted Application</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No live URL provided</span>
                  )}

                  {project.fileName && (
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span>{project.fileName}</span>
                      {project.fileSize && <span className="text-slate-400 text-[11px]">({project.fileSize})</span>}
                    </span>
                  )}
                </div>

                {/* ─── EXISTING RUBRIC DISPLAY IF GRADED & NOT EDITING ─── */}
                {isGraded && !isEditingThis && project.rubricScores && (
                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-300">
                      <span className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-blue-600" />
                        <span>Official Rubric Breakdown ({project.totalScore}/100 Marks)</span>
                      </span>
                      <span className="text-slate-500 font-normal">Evaluated by {project.evaluatedBy || "Faculty"}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block font-semibold">Code Quality</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{project.rubricScores.codeQuality}/25</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block font-semibold">Architecture</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{project.rubricScores.systemArchitecture}/25</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block font-semibold">Docs &amp; Tests</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{project.rubricScores.documentation}/20</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block font-semibold">Live Demo</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{project.rubricScores.demoPresentation}/15</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block font-semibold">Viva Defense</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{project.rubricScores.vivaDefense}/15</strong>
                      </div>
                    </div>

                    {project.facultyFeedback && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-blue-100 dark:border-blue-900/30">
                        <span className="font-bold text-slate-900 dark:text-white">Remarks: </span>
                        &ldquo;{project.facultyFeedback}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* ─── INTERACTIVE RUBRIC GRADING DRAWER ─── */}
                <AnimatePresence>
                  {isEditingThis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-blue-600/30 space-y-5"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Accredited Institutional Evaluation Rubric (100 Marks Max)
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGradingProjectId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* 5 Rubric Criteria Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Code Quality */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              1. Code Quality &amp; Clean Syntax (Max 25)
                            </label>
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {rubricForm.codeQuality} / 25
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Modular separation, linting adherence, naming conventions, and algorithmic efficiency.
                          </p>
                          <input
                            type="range"
                            min="0"
                            max="25"
                            value={rubricForm.codeQuality}
                            onChange={(e) =>
                              setRubricForm({ ...rubricForm, codeQuality: Number(e.target.value) })
                            }
                            className="w-full accent-blue-600 cursor-pointer"
                          />
                        </div>

                        {/* 2. System Architecture */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              2. System Architecture &amp; Design (Max 25)
                            </label>
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {rubricForm.systemArchitecture} / 25
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Database schema design, state management, API contracts, and scalability headroom.
                          </p>
                          <input
                            type="range"
                            min="0"
                            max="25"
                            value={rubricForm.systemArchitecture}
                            onChange={(e) =>
                              setRubricForm({ ...rubricForm, systemArchitecture: Number(e.target.value) })
                            }
                            className="w-full accent-blue-600 cursor-pointer"
                          />
                        </div>

                        {/* 3. Documentation */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              3. Documentation &amp; Unit Tests (Max 20)
                            </label>
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {rubricForm.documentation} / 20
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            README setup instructions, architectural diagram, API docs, and automated test coverage.
                          </p>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            value={rubricForm.documentation}
                            onChange={(e) =>
                              setRubricForm({ ...rubricForm, documentation: Number(e.target.value) })
                            }
                            className="w-full accent-blue-600 cursor-pointer"
                          />
                        </div>

                        {/* 4. Live Demo */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              4. Live Demo &amp; UI/UX Execution (Max 15)
                            </label>
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {rubricForm.demoPresentation} / 15
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Hosted cloud responsiveness, visual aesthetics, error handling, and latency.
                          </p>
                          <input
                            type="range"
                            min="0"
                            max="15"
                            value={rubricForm.demoPresentation}
                            onChange={(e) =>
                              setRubricForm({ ...rubricForm, demoPresentation: Number(e.target.value) })
                            }
                            className="w-full accent-blue-600 cursor-pointer"
                          />
                        </div>

                        {/* 5. Viva Defense */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              5. Oral Defense &amp; Viva Q&amp;A Mastery (Max 15)
                            </label>
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {rubricForm.vivaDefense} / 15
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Knowledge of design trade-offs, security implications, and defense of architectural choices.
                          </p>
                          <input
                            type="range"
                            min="0"
                            max="15"
                            value={rubricForm.vivaDefense}
                            onChange={(e) =>
                              setRubricForm({ ...rubricForm, vivaDefense: Number(e.target.value) })
                            }
                            className="w-full accent-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Feedback remarks input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Faculty Written Feedback &amp; Recommendations for Improvement
                        </label>
                        <textarea
                          rows={2}
                          value={rubricForm.facultyFeedback}
                          onChange={(e) => setRubricForm({ ...rubricForm, facultyFeedback: e.target.value })}
                          placeholder="Provide constructive feedback for the student portfolio..."
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      {/* Summary Score Bar & Submit */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="text-center px-4 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Total Score</span>
                            <span className="text-xl font-black font-mono text-blue-700 dark:text-blue-300">
                              {currentTotalMarks} / 100
                            </span>
                          </div>

                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Grade Awarded: {getLetterGrade(currentTotalMarks).grade}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {getLetterGrade(currentTotalMarks).label} • Student will receive +200 Leaderboard XP
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGradingProjectId(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveGrade(project.id, project.studentId)}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            <span>Save Evaluation &amp; Publish Grade</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
