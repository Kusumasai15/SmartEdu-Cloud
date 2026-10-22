"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Users,
  Plus,
  GitBranch,
  ExternalLink,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  FileCode,
  Layers,
  ChevronRight,
  X,
  Code2,
  Calendar,
  AlertCircle,
  Eye,
  Check,
  Send,
  Trash2,
  FileSpreadsheet,
  Printer,
  Download,
  Loader2,
  BookOpen,
  Briefcase,
  SlidersHorizontal,
  Copy,
  Edit2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { FacultyCourse } from "@/types";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api-client";
import {
  AssessmentFilterBar,
  AssessmentFilterStatus,
  AssessmentSortOption,
  AssessmentViewMode,
} from "@/components/common/AssessmentFilterBar";

export interface StudentTeamMember {
  id: string;
  name: string;
  rollNumber: string;
  isLead?: boolean;
}

export interface StudentProjectTeam {
  id: string;
  name: string;
  leadStudentId: string;
  members: StudentTeamMember[];
  githubRepoUrl?: string;
  liveDemoUrl?: string;
  pitchDeckUrl?: string;
  deliverablesNotes?: string;
  subjectiveAnswer?: string;
  approach?: string;
  codeSnippet?: string;
  complexityAnalysis?: string;
  submissionStatus: "NOT_SUBMITTED" | "SUBMITTED" | "GRADED";
  submittedAt?: string;
  score?: number;
  maxScore?: number;
  feedback?: string;
  rubricScores?: {
    architecture: number; // max 30
    codeQuality: number;  // max 40
    demoAndPitch: number; // max 30
  };
}

export interface FacultyProjectItem {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  sections?: string[]; // e.g. ["Section A", "Section B"]
  format: "IDEATHON" | "CAPSTONE_PROJECT" | "LAB_PROJECT";
  status: "ACTIVE" | "SUBMISSIONS_OPEN" | "EVALUATING" | "CLOSED";
  description: string;
  problemStatement: string;
  problemDomain?: string;
  minTeamSize: number;
  maxTeamSize: number;
  totalMarks: number;
  weightagePct: number;
  dueDate: string;
  starterRepoUrl?: string;
  teams: StudentProjectTeam[];
  createdAt: string;
  facultyId?: string;
  facultyEmail?: string;
}

// Strictly zero hardcoded dummy data per user instruction
const DEFAULT_PROJECTS: FacultyProjectItem[] = [];

const AVAILABLE_SECTIONS = [
  "Section A",
  "Section B",
  "Section C",
  "Section D",
  "Batch 1",
  "Batch 2",
];

const PROBLEM_DOMAINS = [
  "Data Structures & Algorithmic Optimization",
  "Distributed Cloud Architecture & Fault Tolerance",
  "Database Query Optimization & Concurrency",
  "Full-Stack Web Systems & High-Throughput APIs",
  "Machine Learning & Graph Analytics",
  "Cybersecurity & Zero-Trust Architecture",
];

interface FacultyProjectsIdeathonsViewProps {
  courses?: FacultyCourse[];
}

export function FacultyProjectsIdeathonsView({ courses = [] }: FacultyProjectsIdeathonsViewProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<FacultyProjectItem[]>(DEFAULT_PROJECTS);
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const facultyCourseCodes = useMemo(() => {
    return new Set(
      (courses || [])
        .map((c) => (c.course_code || (c as any).code || "").toUpperCase().trim())
        .filter(Boolean)
    );
  }, [courses]);

  const scopedProjects = useMemo(() => {
    const roleName = typeof user?.role === "string" ? user.role : user?.role?.name;
    const isPrivileged = roleName === "ADMINISTRATOR" || roleName === "HOD";
    if (isPrivileged) return projects;

    const filtered = projects.filter((p) => {
      const pCode = (p.courseCode || "").toUpperCase().trim();
      const isMyCourse = Boolean(pCode && facultyCourseCodes.has(pCode));
      const isMyCreated =
        Boolean((p as any).facultyId && (p as any).facultyId === user?.id) ||
        Boolean(user?.email && (p as any).facultyEmail?.toLowerCase() === user.email.toLowerCase());
      return isMyCourse || isMyCreated;
    });
    if (filtered.length > 0) return filtered;
    return projects;
  }, [projects, user, facultyCourseCodes]);

  useEffect(() => {
    let cancelled = false;
    apiClient.get<Record<string, unknown>>("/admin/operational-state")
      .then((state) => {
        if (cancelled) return;
        setProjects(Array.isArray(state.facultyProjects) ? state.facultyProjects as FacultyProjectItem[] : []);
        setProjectsError(null);
      })
      .catch((error) => {
        if (!cancelled) {
          setProjects([]);
          setProjectsError(error instanceof Error ? error.message : "Projects could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setProjectsHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!projectsHydrated) return;
    apiClient.patch("/admin/operational-state", { facultyProjects: projects })
      .then(() => setProjectsError(null))
      .catch((error) => setProjectsError(error instanceof Error ? error.message : "Project changes could not be saved."));
  }, [projects, projectsHydrated]);

  // Primary subtab: Ideathons vs Capstones/Projects
  const [primaryTab, setPrimaryTab] = useState<"IDEATHONS" | "PROJECTS">("IDEATHONS");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeProjectForDetails, setActiveProjectForDetails] = useState<FacultyProjectItem | null>(null);

  // Review & Grading Modal State
  const [gradingTeam, setGradingTeam] = useState<{
    project: FacultyProjectItem;
    team: StudentProjectTeam;
  } | null>(null);
  const [rubricArch, setRubricArch] = useState<number>(25);
  const [rubricCode, setRubricCode] = useState<number>(35);
  const [rubricDemo, setRubricDemo] = useState<number>(25);
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);

  const { departments = [], assignments = [] } = useAcademicData();

  const availableCohortClasses = useMemo(() => {
    const list: string[] = [];
    departments.forEach((dept) => {
      dept.cohorts?.forEach((cohort) => {
        if (cohort.name && !list.includes(cohort.name)) list.push(cohort.name);
      });
    });
    return list;
  }, [departments]);

  // Merge any squads formed by students in assignments.teams or projectTeams
  const projectsWithFormedTeams = useMemo(() => {
    return scopedProjects.map((p) => {
      const existingTeamIds = new Set((p.teams || []).map((t) => t.id));
      const mergedTeams = [...(p.teams || [])];

      // Find matching assignments that have teams
      const matchingAssignments = assignments.filter(
        (a) =>
          a.id === p.id ||
          a.title.toLowerCase().trim() === p.title.toLowerCase().trim() ||
          a.courseCode.toLowerCase().trim() === p.courseCode.toLowerCase().trim()
      );

      matchingAssignments.forEach((a) => {
        (a.teams || []).forEach((at) => {
          if (!existingTeamIds.has(at.id)) {
            existingTeamIds.add(at.id);
            mergedTeams.push({
              id: at.id,
              name: at.name,
              leadStudentId: at.leaderStudentId,
              members: (at.memberStudentIds || []).map((mId, idx) => ({
                id: mId,
                name: at.memberNames?.[idx] || "Team Member",
                rollNumber: "Student",
                isLead: mId === at.leaderStudentId,
              })),
              submissionStatus: at.submissionStatus === "SUBMITTED" ? "SUBMITTED" : "NOT_SUBMITTED",
              submittedAt: (at as any).submittedAt,
            });
          }
        });
      });

      return {
        ...p,
        teams: mergedTeams,
      };
    });
  }, [projects, assignments]);

  // Create Project / Ideathon Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newCourseCode, setNewCourseCode] = useState<string>(courses[0]?.course_code || "");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => {
    if (availableCohortClasses.length > 0 && selectedSections.length === 0) {
      setSelectedSections([availableCohortClasses[0]]);
    }
  }, [availableCohortClasses, selectedSections.length]);

  const [newFormat, setNewFormat] = useState<"IDEATHON" | "CAPSTONE_PROJECT" | "LAB_PROJECT">("IDEATHON");
  const [newDomain, setNewDomain] = useState<string>(PROBLEM_DOMAINS[0]);
  const [newDescription, setNewDescription] = useState<string>("");
  const [newProblemStatement, setNewProblemStatement] = useState<string>("");
  const [newMinTeam, setNewMinTeam] = useState<number>(1);
  const [newMaxTeam, setNewMaxTeam] = useState<number>(1);
  const [newTotalMarks, setNewTotalMarks] = useState<number>(100);
  const [newWeightage, setNewWeightage] = useState<number>(20);
  const [newDueDate, setNewDueDate] = useState<string>("2026-11-30");
  const [newStarterRepo, setNewStarterRepo] = useState<string>("");
  const [isAiGeneratingProblem, setIsAiGeneratingProblem] = useState<boolean>(false);
  const [projectFilterStatus, setProjectFilterStatus] = useState<AssessmentFilterStatus>("ALL");
  const [projectSortOption, setProjectSortOption] = useState<AssessmentSortOption>("DUE_NEWEST");
  const [projectViewMode, setProjectViewMode] = useState<AssessmentViewMode>("grid");

  const projectFilterCounts = useMemo(() => {
    let upcoming = 0;
    let inProgress = 0;
    let submitted = 0;
    let locked = 0;
    const now = Date.now();

    projectsWithFormedTeams.forEach((p) => {
      const matchFormat =
        primaryTab === "IDEATHONS"
          ? p.format === "IDEATHON"
          : p.format === "CAPSTONE_PROJECT" || p.format === "LAB_PROJECT";
      if (!matchFormat) return;

      const dueTime = p.dueDate ? new Date(p.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;
      const teams = p.teams || [];
      const hasSubmissions = teams.some((t) => t.submissionStatus === "SUBMITTED" || t.submissionStatus === "GRADED");
      const isFullyGraded = teams.length > 0 && teams.every((t) => t.submissionStatus === "GRADED");

      if (isFullyGraded) {
        submitted++;
      } else if (isPast) {
        locked++;
      } else if (hasSubmissions) {
        inProgress++;
      } else {
        upcoming++;
      }
    });

    const totalRelevant = projectsWithFormedTeams.filter((p) =>
      primaryTab === "IDEATHONS"
        ? p.format === "IDEATHON"
        : p.format === "CAPSTONE_PROJECT" || p.format === "LAB_PROJECT"
    ).length;

    return {
      all: totalRelevant,
      upcoming,
      inProgress,
      submitted,
      locked,
    };
  }, [projectsWithFormedTeams, primaryTab]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    const now = Date.now();
    let list = projectsWithFormedTeams.filter((p) => {
      const matchFormat =
        primaryTab === "IDEATHONS"
          ? p.format === "IDEATHON"
          : p.format === "CAPSTONE_PROJECT" || p.format === "LAB_PROJECT";
      const matchCourse = selectedCourseFilter === "ALL" || p.courseCode === selectedCourseFilter;
      const matchQuery =
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchFormat || !matchCourse || !matchQuery) return false;

      const dueTime = p.dueDate ? new Date(p.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;
      const teams = p.teams || [];
      const hasSubmissions = teams.some((t) => t.submissionStatus === "SUBMITTED" || t.submissionStatus === "GRADED");
      const isFullyGraded = teams.length > 0 && teams.every((t) => t.submissionStatus === "GRADED");

      if (projectFilterStatus === "UPCOMING") return !isFullyGraded && !isPast && !hasSubmissions;
      if (projectFilterStatus === "IN_PROGRESS") return !isFullyGraded && !isPast && hasSubmissions;
      if (projectFilterStatus === "SUBMITTED") return isFullyGraded;
      if (projectFilterStatus === "LOCKED") return !isFullyGraded && isPast;
      return true;
    });

    list.sort((a, b) => {
      if (projectSortOption === "TITLE") return a.title.localeCompare(b.title);
      if (projectSortOption === "COURSE") return a.courseCode.localeCompare(b.courseCode);
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (projectSortOption === "DUE_OLDEST") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [projectsWithFormedTeams, primaryTab, selectedCourseFilter, searchQuery, projectFilterStatus, projectSortOption]);

  // Aggregate Metrics
  const totalProjectsCount = projectsWithFormedTeams.length;
  const totalSubmissionsCount = useMemo(() => {
    return projectsWithFormedTeams.reduce(
      (acc, p) =>
        acc +
        (p.teams?.filter((t) => t.submissionStatus === "SUBMITTED" || t.submissionStatus === "GRADED").length || 0),
      0
    );
  }, [projectsWithFormedTeams]);
  const totalGradedCount = useMemo(() => {
    return projectsWithFormedTeams.reduce(
      (acc, p) => acc + (p.teams?.filter((t) => t.submissionStatus === "GRADED").length || 0),
      0
    );
  }, [projectsWithFormedTeams]);

  // Open Grading Modal
  const handleOpenGrading = (project: FacultyProjectItem, team: StudentProjectTeam) => {
    setGradingTeam({ project, team });
    setRubricArch(team.rubricScores?.architecture || 25);
    setRubricCode(team.rubricScores?.codeQuality || 35);
    setRubricDemo(team.rubricScores?.demoAndPitch || 25);
    setGradingFeedback(team.feedback || "");
  };

  // AI Auto-Evaluate Handler (NEVER mentions "Gemini" on UI)
  const handleAiAutoEvaluate = async () => {
    if (!gradingTeam) return;
    setIsAiEvaluating(true);

    try {
      const submissionContent =
        gradingTeam.team.subjectiveAnswer ||
        gradingTeam.team.deliverablesNotes ||
        `Code Repository: ${gradingTeam.team.githubRepoUrl || "N/A"}\nDemo: ${gradingTeam.team.liveDemoUrl || "N/A"}`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "IDEATHON_EVALUATE",
          courseCode: gradingTeam.project.courseCode,
          topic: gradingTeam.project.title,
          problemStatement: gradingTeam.project.problemStatement,
          submissionText: submissionContent,
          points: gradingTeam.project.totalMarks,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.rubricScores) {
          setRubricArch(Math.min(d.rubricScores.architecture ?? 25, 30));
          setRubricCode(Math.min(d.rubricScores.codeQuality ?? 35, 40));
          setRubricDemo(Math.min(d.rubricScores.demoAndPitch ?? 25, 30));
        }
        if (d.feedback) {
          setGradingFeedback(d.feedback);
        }
      }
    } catch (e) {
      console.error("AI evaluation failed:", e);
    } finally {
      setIsAiEvaluating(false);
    }
  };

  // Submit Grade
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingTeam) return;

    const totalCalculated = Math.round(rubricArch + rubricCode + rubricDemo);
    const scaledScore = Math.min(totalCalculated, gradingTeam.project.totalMarks);

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== gradingTeam.project.id) return proj;
        return {
          ...proj,
          teams: proj.teams.map((t) => {
            if (t.id !== gradingTeam.team.id) return t;
            return {
              ...t,
              submissionStatus: "GRADED",
              score: scaledScore,
              feedback: gradingFeedback,
              rubricScores: {
                architecture: rubricArch,
                codeQuality: rubricCode,
                demoAndPitch: rubricDemo,
              },
            };
          }),
        };
      })
    );

    setGradingTeam(null);
  };

  // AI Generate Problem Statement Handler
  const handleAiGenerateProblemStatement = async () => {
    setIsAiGeneratingProblem(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "IDEATHON_PROBLEM",
          courseCode: newCourseCode,
          topic: newDomain,
          difficulty: "HARD",
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.title) setNewTitle(d.title);
        if (d.description) setNewDescription(d.description);
        if (d.problemStatement) {
          const fullStatement = `${d.problemStatement}\n\nConstraints:\n${d.constraints || "Strict O(N log N) runtime complexity. Zero auxiliary memory allocation."}\n\nExpected Approach:\n${d.expectedApproach || "Modular implementation with edge-case proofs."}`;
          setNewProblemStatement(fullStatement);
        }
        if (d.totalMarks) setNewTotalMarks(Number(d.totalMarks) || 100);
      }
    } catch (e) {
      console.error("Failed to generate AI problem statement:", e);
    } finally {
      setIsAiGeneratingProblem(false);
    }
  };

  // Toggle Section Checkbox
  const handleToggleSection = (section: string) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.length > 1
          ? prev.filter((s) => s !== section)
          : prev
        : [...prev, section]
    );
  };

  // Handle Create Project / Ideathon
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const matchingCourse = courses.find((c) => c.course_code === newCourseCode);

    const newProject: FacultyProjectItem = {
      id: `proj-${Date.now()}`,
      title: newTitle.trim(),
      courseCode: newCourseCode,
      courseName: matchingCourse?.name || (matchingCourse as any)?.course_name || "Course Subject",
      sections: selectedSections.length > 0 ? selectedSections : ["Section A"],
      format: newFormat,
      status: "SUBMISSIONS_OPEN",
      description: newDescription.trim() || "Subjective challenge and coursework milestone.",
      problemStatement: newProblemStatement.trim(),
      problemDomain: newDomain,
      minTeamSize: Math.max(1, newMinTeam || 1),
      maxTeamSize: Math.max(Math.max(1, newMinTeam || 1), newMaxTeam || 1),
      totalMarks: newTotalMarks,
      weightagePct: newWeightage,
      dueDate: newDueDate,
      starterRepoUrl: newStarterRepo.trim() || undefined,
      teams: [],
      createdAt: new Date().toISOString().split("T")[0],
      facultyId: user?.id,
      facultyEmail: user?.email,
    };

    setProjects((prev) => [newProject, ...prev]);
    setIsCreateModalOpen(false);

    // Reset Form
    setNewTitle("");
    setNewDescription("");
    setNewProblemStatement("");
    setSelectedSections(["Section A"]);
  };

  // Delete Project / Ideathon
  const handleDeleteProject = (projectId: string) => {
    if (confirm("Are you sure you want to delete this challenge? All student submissions will be removed.")) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectForDetails?.id === projectId) setActiveProjectForDetails(null);
    }
  };

  const [editingProject, setEditingProject] = useState<FacultyProjectItem | null>(null);

  // Duplicate Project / Ideathon Challenge
  const handleDuplicateProject = (project: FacultyProjectItem) => {
    const copy: FacultyProjectItem = {
      ...project,
      id: `proj-${Date.now()}`,
      title: `${project.title} (Copy)`,
      createdAt: new Date().toISOString().split("T")[0],
      teams: [], // Reset teams for duplicated challenge
    };
    setProjects((prev) => [copy, ...prev]);
  };

  // Reassign / Save Edit Project Challenge
  const handleSaveEditedProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === editingProject.id ? editingProject : p))
    );
    if (activeProjectForDetails?.id === editingProject.id) {
      setActiveProjectForDetails(editingProject);
    }
    setEditingProject(null);
  };

  // Export Results via Excel (.xlsx)
  const handleExportExcel = (project: FacultyProjectItem) => {
    const rows = (project.teams || []).map((t) => {
      const leadMember = t.members?.find((m) => m.isLead) || t.members?.[0];
      return {
        "Student / Team Name": t.name,
        "Lead Roll Number": leadMember?.rollNumber || "N/A",
        "Course Code": project.courseCode,
        "Course Name": project.courseName,
        "Assigned Sections": project.sections?.join(", ") || "Section A",
        "Format": project.format === "IDEATHON" ? "Ideathon Challenge" : "Project",
        "Submission Status": t.submissionStatus,
        "Submitted At": t.submittedAt || "Not Submitted",
        "Score Obtained": t.score !== undefined ? t.score : "Pending",
        "Max Marks": project.totalMarks,
        "Percentage": t.score !== undefined ? `${Math.round((t.score / project.totalMarks) * 100)}%` : "N/A",
        "Faculty Feedback": t.feedback || "No feedback recorded",
      };
    });

    if (rows.length === 0) {
      rows.push({
        "Student / Team Name": "No Submissions Yet",
        "Lead Roll Number": "N/A",
        "Course Code": project.courseCode,
        "Course Name": project.courseName,
        "Assigned Sections": project.sections?.join(", ") || "Section A",
        "Format": project.format === "IDEATHON" ? "Ideathon Challenge" : "Project",
        "Submission Status": "NOT_SUBMITTED",
        "Submitted At": "N/A",
        "Score Obtained": "N/A" as any,
        "Max Marks": project.totalMarks,
        "Percentage": "N/A",
        "Faculty Feedback": "N/A",
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 14 },
      { wch: 32 },
      { wch: 24 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 45 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Evaluation_Results");
    XLSX.writeFile(wb, `${project.courseCode}_${project.format}_Results.xlsx`);
  };

  // Export Results via PDF / Print
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      {projectsError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{projectsError}</span>
        </div>
      )}
      {/* ─── 1. TOP HEADER BANNER ─── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Department Academic Assessment Studio
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Projects &amp; Ideathons Hub
          </h1>
          <p className="text-xs text-slate-500">
            Publish subjective ideathon challenges, assign multi-class cohorts, evaluate submissions, and auto-rate with AI rubrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setNewFormat("IDEATHON");
              setNewMinTeam(1);
              setNewMaxTeam(1);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>New Ideathon Challenge</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewFormat("CAPSTONE_PROJECT");
              setNewMinTeam(2);
              setNewMaxTeam(4);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all"
          >
            <FolderKanban className="h-4 w-4 text-blue-600" />
            <span>New Capstone Project</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRICS TILES ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Challenges
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalProjectsCount}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Ideathon Problems
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {projects.filter((p) => p.format === "IDEATHON").length}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Submissions Received
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalSubmissionsCount}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Graded &amp; Released
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalGradedCount}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. PRIMARY TABS & FILTER BAR ─── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Distinct Mode Tabs: Ideathons vs Projects */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setPrimaryTab("IDEATHONS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              primaryTab === "IDEATHONS"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Ideathon Challenges ({projects.filter((p) => p.format === "IDEATHON").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPrimaryTab("PROJECTS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              primaryTab === "PROJECTS"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Student Projects ({projects.filter((p) => p.format !== "IDEATHON").length})</span>
          </button>
        </div>

        {/* Course Filter */}
        {courses.length > 0 && (
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Assigned Courses</option>
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} · {c.name || (c as any).course_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Unified Assessment Filter Bar */}
      <AssessmentFilterBar
        filter={projectFilterStatus}
        onFilterChange={setProjectFilterStatus}
        counts={projectFilterCounts}
        sortBy={projectSortOption}
        onSortChange={setProjectSortOption}
        viewMode={projectViewMode}
        onViewModeChange={setProjectViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ─── 4. CARDS LISTING OR EMPTY STATE ─── */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            {primaryTab === "IDEATHONS" ? (
              <Code2 className="h-7 w-7" />
            ) : (
              <FolderKanban className="h-7 w-7" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {primaryTab === "IDEATHONS"
                ? "No Ideathon Challenges Published Yet"
                : "No Student Projects Published Yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {primaryTab === "IDEATHONS"
                ? "Create an in-depth subjective ideathon problem for your classes. You can author your own or use our Smart AI Problem Generator."
                : "Create capstone team projects, assign multi-class cohorts, and manage submission milestones."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewFormat(primaryTab === "IDEATHONS" ? "IDEATHON" : "CAPSTONE_PROJECT");
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>
              {primaryTab === "IDEATHONS" ? "Create First Ideathon" : "Create First Project"}
            </span>
          </button>
        </div>
      ) : (
        <div className={projectViewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredProjects.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                      {item.courseCode}
                    </span>

                    {/* Course - Section Display */}
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                      {item.sections && item.sections.length > 0
                        ? item.sections.join(", ")
                        : "Section A"}
                    </span>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      item.format === "IDEATHON"
                        ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    }`}>
                      {item.format === "IDEATHON" ? "Ideathon Challenge" : item.format === "CAPSTONE_PROJECT" ? "Capstone Project" : "Lab Project"}
                    </span>

                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {item.status.replace("_", " ")}
                    </span>

                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span>
                        {item.minTeamSize === item.maxTeamSize
                          ? item.minTeamSize === 1
                            ? "Solo (1 Student)"
                            : `${item.minTeamSize} Members`
                          : `${item.minTeamSize}–${item.maxTeamSize} Members Squad`}
                      </span>
                    </span>
                  </div>

                  <h2
                    onClick={() => setActiveProjectForDetails(item)}
                    className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2 group/title"
                  >
                    <span>{item.title}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover/title:translate-x-1 group-hover/title:text-blue-600 transition-all" />
                  </h2>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* View All Submissions & Teams Modal Button */}
                  <button
                    type="button"
                    onClick={() => setActiveProjectForDetails(item)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Open Submissions & Squads Page"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Formed Teams & Submissions ({item.teams?.length || 0})</span>
                  </button>

                  {/* Copy / Duplicate Button */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateProject(item)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                    title="Copy / Duplicate Challenge"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  {/* Reassign / Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingProject({ ...item })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                    title="Reassign / Edit Challenge"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {/* Export Excel Button */}
                  <button
                    type="button"
                    onClick={() => handleExportExcel(item)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                    title="Export Results to Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    title="Delete Challenge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Problem Statement Snippet */}
              {item.problemStatement && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {item.problemStatement}
                </div>
              )}

              {/* Submissions Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    Formed Student Squads & Deliverables ({item.teams?.length || 0})
                  </span>

                  <span className="text-[11px] font-mono text-slate-400">
                    Due: {item.dueDate} • Total Marks: {item.totalMarks}
                  </span>
                </div>

                {(!item.teams || item.teams.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Awaiting student submissions from assigned classes ({item.sections?.join(", ") || "Section A"}).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {item.teams.map((team) => (
                      <div
                        key={team.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {team.name}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              team.submissionStatus === "GRADED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
                                : team.submissionStatus === "SUBMITTED"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200"
                            }`}>
                              {team.submissionStatus === "GRADED"
                                ? "✓ Graded"
                                : team.submissionStatus === "SUBMITTED"
                                ? "✓ Deliverable Submitted"
                                : "● Squad Formed (In Progress)"}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500">
                            {team.members?.map((m) => `${m.name} (${m.rollNumber})`).join(", ")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {team.score !== undefined ? (
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-200">
                              {team.score} / {item.totalMarks} Marks
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenGrading(item, team)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>Evaluate &amp; Rate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 5. REVIEW & GRADING MODAL (WITH AI AUTO-RATE) ─── */}
      <AnimatePresence>
        {gradingTeam && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Submission Evaluation &amp; Rubric Rating
                    </h3>
                    <p className="text-xs text-slate-500">
                      {gradingTeam.team.name} • {gradingTeam.project.courseCode} ({gradingTeam.project.sections?.join(", ") || "Section A"})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGradingTeam(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* AI Auto-Evaluate Action Button (NO "Gemini" keyword) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200/80 dark:border-purple-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Automated AI Rubric Evaluator</span>
                    <span className="text-slate-500 text-[11px]">Analyze subjective code/architecture against problem constraints.</span>
                  </div>
                  <button
                    type="button"
                    disabled={isAiEvaluating}
                    onClick={handleAiAutoEvaluate}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {isAiEvaluating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Auto-Rate with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subjective Submission Text or Deliverables */}
                {gradingTeam.team.subjectiveAnswer ? (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase tracking-wider">
                      Student Subjective Assessment Answer:
                    </span>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-800 dark:text-slate-200">
                      {gradingTeam.team.subjectiveAnswer}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase tracking-wider">
                      Project Deliverables:
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {gradingTeam.team.githubRepoUrl && (
                        <a
                          href={gradingTeam.team.githubRepoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          <GitBranch className="h-3.5 w-3.5" /> Repository
                        </a>
                      )}
                      {gradingTeam.team.liveDemoUrl && (
                        <a
                          href={gradingTeam.team.liveDemoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Rubric Sliders */}
                <div className="space-y-3 pt-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase tracking-wider">
                    Evaluation Rubric Breakdown
                  </span>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        1. Architecture &amp; Solution Approach (Max 30)
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {rubricArch} / 30
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={rubricArch}
                      onChange={(e) => setRubricArch(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        2. Implementation, Code &amp; Algorithms (Max 40)
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {rubricCode} / 40
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={rubricCode}
                      onChange={(e) => setRubricCode(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        3. Complexity Proofs &amp; Edge Cases (Max 30)
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {rubricDemo} / 30
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={rubricDemo}
                      onChange={(e) => setRubricDemo(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between font-bold">
                  <span className="text-slate-800 dark:text-slate-200">Total Computed Score:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-base">
                    {rubricArch + rubricCode + rubricDemo} / {gradingTeam.project.totalMarks} Marks
                  </span>
                </div>

                {/* Feedback */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Written Feedback &amp; Review Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    placeholder="Enter architectural observations, rubric justifications, or feedback..."
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradingTeam(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrade}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Grade &amp; Feedback</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── 6. CREATE PROJECT / IDEATHON MODAL ─── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                    <Plus className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Publish {newFormat === "IDEATHON" ? "Ideathon Challenge" : "Student Project"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* Format Selection (Clean labels without chatgpt emojis) */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Assessment Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewFormat("IDEATHON");
                        setNewMinTeam(1);
                        setNewMaxTeam(1);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        newFormat === "IDEATHON"
                          ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Ideathon Challenge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFormat("CAPSTONE_PROJECT");
                        setNewMinTeam(2);
                        setNewMaxTeam(4);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        newFormat === "CAPSTONE_PROJECT"
                          ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Capstone Project
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFormat("LAB_PROJECT");
                        setNewMinTeam(2);
                        setNewMaxTeam(2);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        newFormat === "LAB_PROJECT"
                          ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Team Lab Project
                    </button>
                  </div>
                </div>

                {/* AI Problem Generator Banner for Ideathons (NO "Gemini" keyword) */}
                {newFormat === "IDEATHON" && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        AI Subjective Problem Generator
                      </span>
                      <button
                        type="button"
                        disabled={isAiGeneratingProblem}
                        onClick={handleAiGenerateProblemStatement}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {isAiGeneratingProblem ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            <span>Generate Problem Statement</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <select
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="w-full p-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-200 text-xs font-medium"
                      >
                        {PROBLEM_DOMAINS.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Course Selection */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Assigned Course Subject
                  </label>
                  <select
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {courses.map((c) => (
                      <option key={c.course_code} value={c.course_code}>
                        {c.course_code} · {c.name || (c as any).course_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multiple Class / Section Multi-selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800 dark:text-slate-200">
                      Assigned Class Cohorts / Sections (Multi-Select)
                    </label>
                    <span className="text-[10px] text-blue-600 font-bold">
                      {selectedSections.length} Sections Selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableCohortClasses.map((sec) => {
                      const isSelected = selectedSections.includes(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => handleToggleSection(sec)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          <span>{sec}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    {newFormat === "IDEATHON" ? "Challenge Title" : "Project Title"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Distributed Consensus Engine with Raft Algorithm"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Brief Summary / Objective
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Short description displayed on student cards..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Problem Statement */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Full Problem Statement, Constraints &amp; Evaluation Rubric
                  </label>
                  <textarea
                    rows={4}
                    value={newProblemStatement}
                    onChange={(e) => setNewProblemStatement(e.target.value)}
                    placeholder="Detailed problem description, constraints, input/output specifications, or benchmarks..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>

                {/* Team Formation & Size Settings */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>Team Formation &amp; Permitted Size</span>
                    </label>
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60">
                      {newMinTeam === newMaxTeam ? (newMinTeam === 1 ? "Solo (1 Member)" : `${newMinTeam} Members Squad`) : `${newMinTeam} to ${newMaxTeam} Members Squad`}
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewMinTeam(1);
                        setNewMaxTeam(1);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        newMinTeam === 1 && newMaxTeam === 1
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                      }`}
                    >
                      Individual (1 Student)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMinTeam(2);
                        setNewMaxTeam(4);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        newMinTeam === 2 && newMaxTeam === 4
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                      }`}
                    >
                      Team (2–4 Students)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMinTeam(3);
                        setNewMaxTeam(6);
                      }}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        newMinTeam === 3 && newMaxTeam === 6
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                      }`}
                    >
                      Group (3–6 Students)
                    </button>
                  </div>

                  {/* Custom Numerical Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                        Min Team Members
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={newMinTeam}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                          setNewMinTeam(val);
                          if (newMaxTeam < val) setNewMaxTeam(val);
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                        Max Team Members
                      </label>
                      <input
                        type="number"
                        min={newMinTeam}
                        max={10}
                        value={newMaxTeam}
                        onChange={(e) => {
                          const val = Math.max(newMinTeam, Math.min(10, Number(e.target.value) || newMinTeam));
                          setNewMaxTeam(val);
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Enforces squad limits during student roster registration. Teams below minimum cannot submit final milestone deliverables.
                  </p>
                </div>

                {/* Marks, Weightage, Deadline */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Total Marks
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      value={newTotalMarks}
                      onChange={(e) => setNewTotalMarks(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Weightage (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newWeightage}
                      onChange={(e) => setNewWeightage(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Submission Deadline
                    </label>
                    <input
                      type="date"
                      required
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Publish to {selectedSections.length} Class Sections</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* ─── 6. DEDICATED ALL SUBMISSIONS & SQUADS PAGE / MODAL ─── */}
        {activeProjectForDetails && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {activeProjectForDetails.courseCode}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {activeProjectForDetails.sections?.join(", ") || "All Sections"}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {activeProjectForDetails.format.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {activeProjectForDetails.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Due: {activeProjectForDetails.dueDate} • Total: {activeProjectForDetails.totalMarks} Marks
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExportExcel(activeProjectForDetails)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Export to Excel"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject({ ...activeProjectForDetails });
                      setActiveProjectForDetails(null);
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Edit / Reassign"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectForDetails(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Submissions List Container */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {(!activeProjectForDetails.teams || activeProjectForDetails.teams.length === 0) ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <Users className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Submissions Recorded Yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Student teams from {activeProjectForDetails.sections?.join(", ") || "assigned classes"} have not finalized their deliverables yet.
                    </p>
                  </div>
                ) : (
                  activeProjectForDetails.teams.map((team) => (
                    <div
                      key={team.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {team.name}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              team.submissionStatus === "GRADED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {team.submissionStatus === "GRADED" ? "✓ Graded" : "Submitted"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              {team.members?.map((m) => `${m.name} (${m.rollNumber})`).join(", ") || "Solo"}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {team.score !== undefined && (
                            <span className="font-mono font-black text-sm px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200">
                              {team.score} / {activeProjectForDetails.totalMarks} Marks
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenGrading(activeProjectForDetails, team)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Award className="h-3.5 w-3.5" />
                            <span>{team.score !== undefined ? "Re-evaluate" : "Evaluate & Rate"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Deliverable URLs */}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        {team.githubRepoUrl && (
                          <a
                            href={team.githubRepoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 font-semibold"
                          >
                            <Code2 className="w-3 h-3 text-slate-500" />
                            <span>Source Code</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        )}
                        {team.liveDemoUrl && (
                          <a
                            href={team.liveDemoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                            <span>Live Deployment</span>
                          </a>
                        )}
                        {team.pitchDeckUrl && (
                          <a
                            href={team.pitchDeckUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 font-semibold"
                          >
                            <BookOpen className="w-3 h-3 text-purple-600" />
                            <span>Slide Deck</span>
                          </a>
                        )}
                      </div>

                      {/* Technical Summary / Notes */}
                      {(team.approach || team.subjectiveAnswer) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">Technical Approach:</span>
                          <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-pre-wrap">
                            {team.approach || team.subjectiveAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* ─── 7. EDIT / REASSIGN CHALLENGE MODAL ─── */}
        {editingProject && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Edit2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit / Reassign Challenge</h3>
                    <p className="text-[11px] text-slate-500">Update parameters, classes, and due dates</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedProject} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editingProject.title}
                    onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Marks</label>
                    <input
                      type="number"
                      required
                      value={editingProject.totalMarks}
                      onChange={(e) => setEditingProject({ ...editingProject, totalMarks: parseInt(e.target.value, 10) || 100 })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={editingProject.dueDate}
                      onChange={(e) => setEditingProject({ ...editingProject, dueDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Problem Statement</label>
                  <textarea
                    rows={4}
                    value={editingProject.problemStatement}
                    onChange={(e) => setEditingProject({ ...editingProject, problemStatement: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
