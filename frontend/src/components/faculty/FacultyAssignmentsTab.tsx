"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  FileCode,
  CheckCircle2,
  Clock,
  Award,
  Search,
  Code,
  FileText,
  ChevronRight,
  ChevronLeft,
  Eye,
  Sliders,
  Sparkles,
  Users,
  Send,
  X,
  Layers,
  ExternalLink,
  Download,
  Check,
  Trophy,
  HelpCircle,
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  RefreshCw,
  FileSpreadsheet,
  BrainCircuit,
  FileCheck,
  ShieldCheck,
  Trash2,
  Copy,
  Edit2,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import { useAcademicData, SyncAssignment, SyncSubmission } from "@/context/AcademicDataContext";
import { FacultyAiGeneratorModal } from "@/components/faculty/FacultyAiGeneratorModal";
import { apiClient } from "@/lib/api-client";
import { FacultyGradebookMappingModal } from "@/components/faculty/FacultyGradebookMappingModal";
import { useAuth } from "@/context/AuthContext";
import {
  AssessmentFilterBar,
  AssessmentFilterStatus,
  AssessmentSortOption,
  AssessmentViewMode,
} from "@/components/common/AssessmentFilterBar";

interface FacultyAssignmentsTabProps {
  courses?: FacultyCourse[];
  activeTabKey?: string;
  onOpenCaseStudyModal?: () => void;
}

export function FacultyAssignmentsTab({ courses = [], activeTabKey, onOpenCaseStudyModal }: FacultyAssignmentsTabProps) {
  const {
    assignments,
    submissions,
    quizzes = [],
    caseStudies = [],
    users = [],
    createAssignment,
    gradeSubmission,
    extendAssignmentDueDate,
    loadAssignmentSubmissions,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    deleteCaseStudy,
    duplicateCaseStudy,
    updateCaseStudy,
  } = useAcademicData();
  const { user } = useAuth();

  // Sub-tabs: Individual Coursework vs Quizzes & Tests vs Case Studies
  const [subTab, setSubTab] = useState<"ASSIGNMENTS" | "QUIZZES" | "CASE_STUDIES">(() => {
    if (activeTabKey === "quizzes" || activeTabKey === "quiz-analytics") return "QUIZZES";
    if (activeTabKey === "case-studies") return "CASE_STUDIES";
    return "ASSIGNMENTS";
  });

  useEffect(() => {
    if (activeTabKey === "quizzes" || activeTabKey === "quiz-analytics") setSubTab("QUIZZES");
    else if (activeTabKey === "case-studies") setSubTab("CASE_STUDIES");
    else if (activeTabKey === "assignments") setSubTab("ASSIGNMENTS");
  }, [activeTabKey]);

  // Quiz Analytics modal state
  const [selectedQuizForAnalytics, setSelectedQuizForAnalytics] = useState<any | null>(null);
  const [syncingGradebook, setSyncingGradebook] = useState<boolean>(false);

  // Main view state: "LIST" | "CREATE" | "GRADING"
  const [currentView, setCurrentView] = useState<"LIST" | "CREATE" | "GRADING">("LIST");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [asgFilterStatus, setAsgFilterStatus] = useState<AssessmentFilterStatus>("ALL");
  const [asgSortOption, setAsgSortOption] = useState<AssessmentSortOption>("DUE_NEWEST");
  const [asgViewMode, setAsgViewMode] = useState<AssessmentViewMode>("grid");
  const [notification, setNotification] = useState<string | null>(null);
  const [submissionTotal, setSubmissionTotal] = useState(0);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Extend Due Date Modal State
  const [extendingAssignment, setExtendingAssignment] = useState<SyncAssignment | null>(null);
  const [extendNewDate, setExtendNewDate] = useState<string>("");
  const [extendReason, setExtendReason] = useState<string>("");

  // Quiz Extension Modal State
  const [extendingQuiz, setExtendingQuiz] = useState<any | null>(null);
  const [extendQuizMinutes, setExtendQuizMinutes] = useState<number>(20);
  const [extendQuizDueDate, setExtendQuizDueDate] = useState<string>("");

  // Quiz Duplicate Modal State
  const [duplicatingQuiz, setDuplicatingQuiz] = useState<any | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState<string>("");
  const [duplicateTargetCourse, setDuplicateTargetCourse] = useState<string>("");

  // Quiz Reassign Modal State
  const [reassigningQuiz, setReassigningQuiz] = useState<any | null>(null);
  const [reassignCourseCode, setReassignCourseCode] = useState<string>("");

  // Quiz Questions Viewer & Delete Confirmation State
  const [viewingQuestionsQuiz, setViewingQuestionsQuiz] = useState<any | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<any | null>(null);

  const handleSaveExtendQuiz = () => {
    if (!extendingQuiz) return;
    updateQuiz(extendingQuiz.id, {
      timeLimitMinutes: extendQuizMinutes,
      dueDate: extendQuizDueDate || extendingQuiz.dueDate,
    });
    setNotification(`Timing and window updated for "${extendingQuiz.title}".`);
    setExtendingQuiz(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExecuteDuplicateQuiz = () => {
    if (!duplicatingQuiz) return;
    const targetCourseObj = effectiveFacultyCourses.find((c) => c.course_code === duplicateTargetCourse) || courses[0];
    const newQuizTitle = duplicateTitle.trim() || `${duplicatingQuiz.title} (Copy)`;
    createQuiz({
      courseCode: duplicateTargetCourse || duplicatingQuiz.courseCode,
      courseName: targetCourseObj?.name || duplicatingQuiz.courseName,
      title: newQuizTitle,
      description: duplicatingQuiz.description || `Assessment for ${duplicateTargetCourse}`,
      timeLimitMinutes: duplicatingQuiz.timeLimitMinutes || 20,
      totalPoints: duplicatingQuiz.totalPoints || 25,
      weightPercentage: duplicatingQuiz.weightPercentage || 25,
      dueDate: duplicatingQuiz.dueDate,
      isCameraProctored: duplicatingQuiz.isCameraProctored,
      isFullscreenRequired: duplicatingQuiz.isFullscreenRequired,
      isTabSwitchBlocked: duplicatingQuiz.isTabSwitchBlocked,
      isCopyPasteBlocked: duplicatingQuiz.isCopyPasteBlocked,
      questions: (duplicatingQuiz.questions || []).map((q: any, idx: number) => ({
        id: `q-dup-${idx + 1}-${Date.now()}`,
        prompt: q.prompt,
        options: [...q.options],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        points: q.points || 5,
      })),
      attempts: {},
      createdBy: user?.id || user?.email,
      facultyId: user?.id,
    });
    setNotification(`Duplicated quiz as "${newQuizTitle}" assigned to ${duplicateTargetCourse || duplicatingQuiz.courseCode}.`);
    setDuplicatingQuiz(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExecuteReassignQuiz = () => {
    if (!reassigningQuiz || !reassignCourseCode) return;
    const targetCourseObj = effectiveFacultyCourses.find((c) => c.course_code === reassignCourseCode);
    updateQuiz(reassigningQuiz.id, {
      courseCode: reassignCourseCode,
      courseName: targetCourseObj?.name || reassignCourseCode,
    });
    setNotification(`Reassigned "${reassigningQuiz.title}" to ${reassignCourseCode}.`);
    setReassigningQuiz(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const [selectedAsgForGrading, setSelectedAsgForGrading] = useState<SyncAssignment | null>(assignments[0] || null);
  const [activeSubId, setActiveSubId] = useState<string>("");
  const [awardedScore, setAwardedScore] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [previewDocSubId, setPreviewDocSubId] = useState<string | null>(null);
  const [assignmentDisplayMode, setAssignmentDisplayMode] = useState<"CLASSES" | "ALL">("CLASSES");
  const [activeCourseCardCode, setActiveCourseCardCode] = useState<string | null>(null);

  const formatDueDate = (rawDate?: string): string => {
    if (!rawDate) return "No due date set";
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return rawDate;
    }
  };

  const effectiveFacultyCourses = useMemo(() => {
    return courses || [];
  }, [courses]);

  const getCourseCohortBadge = (course?: FacultyCourse | null): string => {
    if (!course) return "No class assigned";
    const direct = (course as any).assigned_classes?.[0] || (course as any).assignedClasses?.[0];
    if (direct && direct !== "Section A" && direct !== "No class assigned") {
      return direct;
    }

    return "No class assigned";
  };

  // Create Assignment Form State
  const [newCourseCode, setNewCourseCode] = useState<string>(courses[0]?.course_code || "");
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newType, setNewType] = useState<"CODING" | "IDEATHON" | "WRITTEN" | "LAB_PROJECT" | "TERM_PAPER" | "PDF_DOCUMENT" | "CERTIFICATE_UPLOAD">("PDF_DOCUMENT");
  const [newPoints, setNewPoints] = useState<number>(50);
  const [newWeight, setNewWeight] = useState<number>(15);
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newProctoringMode, setNewProctoringMode] = useState<"PROCTORED" | "UNPROCTORED">("UNPROCTORED");
  const [newStarterCode, setNewStarterCode] = useState<string>(
`# Python 3 / C++ Starter Template
def solve(arr, target):
    # Write your solution here
    return -1

if __name__ == "__main__":
    pass`
  );

  // Security & Assessment configuration
  const [newDisableCopyPaste, setNewDisableCopyPaste] = useState<boolean>(true);
  const [newDisableContextMenu, setNewDisableContextMenu] = useState<boolean>(true);
  const [newDetectDevToolsAndExtensions, setNewDetectDevToolsAndExtensions] = useState<boolean>(true);
  const [newDetectTabSwitch, setNewDetectTabSwitch] = useState<boolean>(true);

  // Team Assignment configuration
  const [newIsTeamAssignment, setNewIsTeamAssignment] = useState<boolean>(false);
  const [newMinTeamSize, setNewMinTeamSize] = useState<number>(2);
  const [newMaxTeamSize, setNewMaxTeamSize] = useState<number>(4);

  // Ideathon configuration
  const [newIdeathonTheme, setNewIdeathonTheme] = useState<string>("Artificial Intelligence & Scalable Cloud Solutions");
  const [newProblemStatement, setNewProblemStatement] = useState<string>("");

  // Coding Test Cases
  const [newTestCases, setNewTestCases] = useState<Array<{ id: string; input: string; expectedOutput: string; isHidden: boolean; points: number; explanation?: string }>>([
    {
      id: "tc-1",
      input: "[4, 5, 6, 7, 0, 1, 2], Target: 0",
      expectedOutput: "Index: 4",
      isHidden: false,
      points: 10,
      explanation: "Standard rotated array search",
    },
    {
      id: "tc-2",
      input: "[1], Target: 0",
      expectedOutput: "Index: -1",
      isHidden: false,
      points: 10,
      explanation: "Element not found",
    },
    {
      id: "tc-3",
      input: "[5, 1, 2, 3, 4], Target: 1",
      expectedOutput: "Index: 1",
      isHidden: true,
      points: 15,
      explanation: "Hidden edge test case with small pivot",
    },
    {
      id: "tc-4",
      input: "[], Target: 5",
      expectedOutput: "Index: -1",
      isHidden: true,
      points: 15,
      explanation: "Hidden boundary test case with empty input",
    },
  ]);

  // Submissions filtered for the selected assignment
  const currentAssignmentSubmissions = useMemo(() => {
    if (!selectedAsgForGrading) return [];
    return submissions.filter((s) => s.assignmentId === selectedAsgForGrading.id);
  }, [submissions, selectedAsgForGrading]);

  const activeSubmission = currentAssignmentSubmissions.find((s) => s.id === activeSubId) || currentAssignmentSubmissions[0];

  useEffect(() => {
    if (currentView !== "GRADING" || !selectedAsgForGrading) return;
    let cancelled = false;
    setSubmissionLoading(true);
    setActiveSubId("");
    loadAssignmentSubmissions(selectedAsgForGrading.id)
      .then(({ total }) => { if (!cancelled) setSubmissionTotal(total); })
      .catch((error) => { if (!cancelled) setNotification(error instanceof Error ? error.message : "Student work could not be loaded."); })
      .finally(() => { if (!cancelled) setSubmissionLoading(false); });
    return () => { cancelled = true; };
  }, [currentView, selectedAsgForGrading?.id, loadAssignmentSubmissions]);

  const buildInlineSubmissionPdfDataUrl = (sub?: SyncSubmission | null): string => {
    const sanitizePdfText = (txt: string) =>
      (txt || "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const docTitle = sanitizePdfText(selectedAsgForGrading?.title || "Academic Coursework Submission");
    const courseLabel = sanitizePdfText(
      `${selectedAsgForGrading?.courseCode || "Course"} - ${selectedAsgForGrading?.courseName || "Coursework"}`
    );
    const studentLine = sanitizePdfText(`Student: ${sub?.studentName || "Student"} (${sub?.rollNo || "N/A"})`);
    const fileLine = sanitizePdfText(`Submitted File: ${sub?.fileName || "Submission_Document.pdf"}`);
    const timeLine = sanitizePdfText(`Timestamp: ${sub?.submittedAt || "Submitted on Portal"}`);
    const statusLine = sanitizePdfText(`Status: ${sub?.status || "SUBMITTED"} | Max Marks: ${selectedAsgForGrading?.totalPoints || 50} pts`);
    const rawBody = sanitizePdfText(
      sub?.notes ||
        sub?.codeContent ||
        "No text response was included with this submission. Open the uploaded attachment to review the student's work."
    );

    // Wrap body text into lines of ~78 chars
    const bodyLines: string[] = [];
    for (let i = 0; i < rawBody.length && bodyLines.length < 16; i += 78) {
      bodyLines.push(rawBody.slice(i, i + 78));
    }

    const contentLines = [
      "BT",
      "/F1 16 Tf",
      "50 760 Td",
      `(UNIFLOW INSTITUTIONAL SUBMISSION RECORD) Tj`,
      "/F1 12 Tf",
      "0 -26 Td",
      `(${courseLabel}) Tj`,
      "0 -20 Td",
      `(${docTitle}) Tj`,
      "/F1 10 Tf",
      "0 -28 Td",
      `(${studentLine}) Tj`,
      "0 -16 Td",
      `(${fileLine}) Tj`,
      "0 -16 Td",
      `(${timeLine}) Tj`,
      "0 -16 Td",
      `(${statusLine}) Tj`,
      "0 -28 Td",
      "(--------------------------------------------------------------------------------) Tj",
      "0 -22 Td",
      "(SUBMITTED DOCUMENT CONTENT & SUMMARY:) Tj",
      ...bodyLines.flatMap((line) => ["0 -16 Td", `(${line}) Tj`]),
      "ET",
    ].join("\n");

    const streamLen = contentLines.length;
    const pdfStr = [
      "%PDF-1.4",
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
      `4 0 obj << /Length ${streamLen} >> stream\n${contentLines}\nendstream endobj`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      "xref",
      "0 6",
      "0000000000 65535 f ",
      "0000000009 00000 n ",
      "0000000058 00000 n ",
      "0000000115 00000 n ",
      "0000000229 00000 n ",
      `0000000${(282 + streamLen).toString().padStart(3, "0")} 00000 n `,
      `trailer << /Size 6 /Root 1 0 R >>`,
      "startxref",
      `${352 + streamLen}`,
      "%%EOF",
    ].join("\n");

    if (typeof window !== "undefined") {
      return `data:application/pdf;base64,${window.btoa(pdfStr)}`;
    }
    return "";
  };

  const getEmbeddablePdfUrl = (sub?: SyncSubmission | null): string => {
    if (!sub) return "";
    const raw = (sub.fileUrl || sub.certificateUrl || "").trim();
    if (raw.startsWith("data:application/pdf") || raw.startsWith("blob:")) {
      return raw;
    }
    return buildInlineSubmissionPdfDataUrl(sub);
  };

  const resolveFileUrl = (url?: string): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    return "";
  };

  const handleOpenAttachment = async (fileUrl: string, sub?: SyncSubmission | null) => {
    const targetUrl = fileUrl.startsWith("data:") || fileUrl.startsWith("blob:") || fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
      ? fileUrl
      : buildInlineSubmissionPdfDataUrl(sub || activeSubmission);

    if (!targetUrl) return;

    if (targetUrl.startsWith("data:")) {
      try {
        const [header, base64] = targetUrl.split(",");
        const mime = header.match(/:(.*?);/)?.[1] || "application/pdf";
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        return;
      } catch {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadAttachment = (fileUrl: string, fileName?: string, sub?: SyncSubmission | null) => {
    const targetUrl = fileUrl.startsWith("data:") || fileUrl.startsWith("blob:") || fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
      ? fileUrl
      : buildInlineSubmissionPdfDataUrl(sub || activeSubmission);
    if (!targetUrl) return;
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = fileName || "submission.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (activeSubmission) {
      setActiveSubId(activeSubmission.id);
      const maxPts = selectedAsgForGrading?.totalPoints || 50;
      setAwardedScore(activeSubmission.score ?? 0);
      setFeedbackText(activeSubmission.feedback || "");
    }
  }, [selectedAsgForGrading, activeSubmission?.id]);

  const totalExpectedSubmissions = assignments.reduce((sum, a) => sum + (a.totalEnrolled || 0), 0);
  const turnoutRate =
    totalExpectedSubmissions > 0 ? Math.round((submissions.length / totalExpectedSubmissions) * 100) : 0;
  const gradedSubmissions = submissions.filter((s) => s.status === "GRADED" && typeof s.score === "number");
  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length
        )
      : 0;

  const handleSelectSubmission = (sub: SyncSubmission) => {
    setActiveSubId(sub.id);
    const maxPts = selectedAsgForGrading?.totalPoints || 50;
    setAwardedScore(sub.score ?? 0);
    setFeedbackText(sub.feedback || "");
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    try {
      await gradeSubmission(activeSubmission.id, awardedScore, feedbackText);
    } catch (error) {
      setNotification(error instanceof Error ? error.message : "Grade could not be saved.");
      return;
    }
    setNotification(`✓ Grade & marks saved for ${activeSubmission.studentName}: ${awardedScore}/${selectedAsgForGrading?.totalPoints || 50} pts.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportSubmissionsCsv = () => {
    if (!selectedAsgForGrading || currentAssignmentSubmissions.length === 0) {
      setNotification("No submissions available to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Roll Number",
      "Assignment Title",
      "Course Code",
      "Submission Status",
      "Awarded Marks",
      "Maximum Marks",
      "Submitted At",
      "Document File Name",
      "File Attachment URL",
      "Student Notes / Remarks",
      "Faculty Feedback",
    ];

    const rows = currentAssignmentSubmissions.map((s) => [
      `"${(s.studentName || "").replace(/"/g, '""')}"`,
      `"${(s.rollNo || "").replace(/"/g, '""')}"`,
      `"${(selectedAsgForGrading.title || "").replace(/"/g, '""')}"`,
      `"${(selectedAsgForGrading.courseCode || "").replace(/"/g, '""')}"`,
      `"${s.status}"`,
      s.score ?? 0,
      s.maxScore || selectedAsgForGrading.totalPoints || 50,
      `"${(s.submittedAt || "").replace(/"/g, '""')}"`,
      `"${(s.fileName || "Submitted Document").replace(/"/g, '""')}"`,
      `"${(s.fileUrl || s.certificateUrl || "").replace(/"/g, '""')}"`,
      `"${(s.notes || "").replace(/"/g, '""')}"`,
      `"${(s.feedback || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedAsgForGrading.courseCode}_${selectedAsgForGrading.title.replace(/\s+/g, "_")}_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification("✓ Submissions exported to Excel (.csv) successfully.");
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const matchedCourse = courses.find((c) => c.course_code === newCourseCode);
    const resolvedName = matchedCourse ? matchedCourse.name : (newCourseCode || "Academic Course");

    let created: SyncAssignment;
    try {
      created = await createAssignment({
        courseCode: newCourseCode || "COURSE",
        courseName: resolvedName,
        title: newTitle,
        description: newDesc || "Complete the problem statement according to specifications.",
        type: newType,
        totalPoints: newPoints,
        weightPercentage: newWeight,
        dueDate: newDueDate,
        status: "ACTIVE",
        starterCode: newStarterCode,
        proctoringMode: newProctoringMode,
        disableCopyPaste: newDisableCopyPaste,
        disableContextMenu: newDisableContextMenu,
        detectDevToolsAndExtensions: newDetectDevToolsAndExtensions,
        detectTabSwitch: newDetectTabSwitch,
        isTeamAssignment: newIsTeamAssignment,
        minTeamSize: newMinTeamSize,
        maxTeamSize: newMaxTeamSize,
        ideathonTheme: newType === "IDEATHON" ? newIdeathonTheme : undefined,
        problemStatement: newProblemStatement || newDesc,
        testCases: newType === "CODING" ? newTestCases : undefined,
      });
    } catch (error) {
      setNotification(error instanceof Error ? error.message : "Assignment could not be created.");
      return;
    }

    setNotification(`Assignment "${created.title}" published.`);
    setCurrentView("LIST");
    setTimeout(() => setNotification(null), 4000);
  };

  const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim().toLowerCase();
  const userFirstName = (user?.first_name || "").trim().toLowerCase();
  const userEmail = (user?.email || "").toLowerCase().trim();
  const userId = user?.id || "";
  const userRoleStr = (
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || "FACULTY"
  ).toUpperCase();
  const isHodOrAdmin = userRoleStr === "HOD" || userRoleStr === "ADMIN";

  const myFacultyCourseCodes = useMemo(() => {
    return new Set(
      (courses || [])
        .map((c) => (c.course_code || (c as any).code || "").toLowerCase().trim())
        .filter(Boolean)
    );
  }, [courses]);

  const assignmentFilterCounts = useMemo(() => {
    let upcoming = 0;
    let inProgress = 0;
    let submitted = 0;
    let locked = 0;
    const now = Date.now();

    (assignments || []).forEach((a) => {
      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;
      const subs = (submissions || []).filter((s) => s.assignmentId === a.id);
      const isFullyGraded = subs.length > 0 && subs.every((s) => s.status === "GRADED");

      if (isFullyGraded) {
        submitted++;
      } else if (isPast) {
        locked++;
      } else if (subs.length > 0) {
        inProgress++;
      } else {
        upcoming++;
      }
    });

    return {
      all: (assignments || []).length,
      upcoming,
      inProgress,
      submitted,
      locked,
    };
  }, [assignments, submissions]);

  const filteredAssignments = useMemo(() => {
    const now = Date.now();
    let list = (assignments || []).filter((a) => {
      const aCode = (a.courseCode || "").toLowerCase().trim();
      if (courseFilter !== "ALL" && a.courseCode !== courseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !aCode.includes(q)) return false;
      }
      if (isHodOrAdmin && myFacultyCourseCodes.size === 0) {
        // match
      } else if (myFacultyCourseCodes.has(aCode)) {
        // match
      } else if (
        a.facultyName &&
        (a.facultyName.toLowerCase().includes(userFullName) || userFullName.includes(a.facultyName.toLowerCase()))
      ) {
        // match
      } else {
        return false;
      }

      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;
      const subs = (submissions || []).filter((s) => s.assignmentId === a.id);
      const isFullyGraded = subs.length > 0 && subs.every((s) => s.status === "GRADED");

      if (asgFilterStatus === "UPCOMING") return !isFullyGraded && !isPast && subs.length === 0;
      if (asgFilterStatus === "IN_PROGRESS") return !isFullyGraded && !isPast && subs.length > 0;
      if (asgFilterStatus === "SUBMITTED") return isFullyGraded;
      if (asgFilterStatus === "LOCKED") return !isFullyGraded && isPast;
      return true;
    });

    list.sort((a, b) => {
      if (asgSortOption === "TITLE") return a.title.localeCompare(b.title);
      if (asgSortOption === "COURSE") return (a.courseCode || "").localeCompare(b.courseCode || "");
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (asgSortOption === "DUE_OLDEST") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [assignments, courseFilter, searchQuery, isHodOrAdmin, myFacultyCourseCodes, userFullName, submissions, asgFilterStatus, asgSortOption]);

  const filteredQuizzes = useMemo(() => {
    return (quizzes || []).filter((quizItem) => {
      const qCode = (quizItem.courseCode || "").toLowerCase().trim();
      if (courseFilter !== "ALL" && quizItem.courseCode !== courseFilter) return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        if (!quizItem.title.toLowerCase().includes(term) && !qCode.includes(term)) return false;
      }
      if (isHodOrAdmin) return true;
      if (myFacultyCourseCodes.has(qCode)) return true;
      if (
        (quizItem.createdBy && (quizItem.createdBy === userId || quizItem.createdBy === userEmail || quizItem.createdBy.toLowerCase() === userFullName)) ||
        (quizItem.facultyId && (quizItem.facultyId === userId || quizItem.facultyId === userEmail)) ||
        (quizItem.facultyName && (quizItem.facultyName.toLowerCase().includes(userFullName) || userFullName.includes(quizItem.facultyName.toLowerCase())))
      ) {
        return true;
      }
      return false;
    });
  }, [quizzes, courseFilter, searchQuery, isHodOrAdmin, myFacultyCourseCodes, userId, userEmail, userFullName]);

  const filteredCaseStudies = useMemo(() => {
    return (caseStudies || []).filter((cs) => {
      const cCode = (cs.courseCode || "").toLowerCase().trim();
      if (courseFilter !== "ALL" && cs.courseCode !== courseFilter) return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        if (!cs.title.toLowerCase().includes(term) && !cCode.includes(term)) return false;
      }
      if (isHodOrAdmin) return true;
      if (myFacultyCourseCodes.has(cCode)) return true;
      if (
        cs.facultyName &&
        (cs.facultyName.toLowerCase().includes(userFullName) || userFullName.includes(cs.facultyName.toLowerCase()))
      ) {
        return true;
      }
      return false;
    });
  }, [caseStudies, courseFilter, searchQuery, isHodOrAdmin, myFacultyCourseCodes, userFullName]);

  const handleSyncQuizToGradebook = (quiz: any) => {
    if (!quiz) return;
    setSyncingGradebook(true);

    const courseCode = quiz.courseCode;
    const courseObj = effectiveFacultyCourses.find((c) => c.course_code === courseCode);
    const targetId = courseObj?.id || courseCode;

    let existingMarks: Record<string, any> = {};
    try {
      const raw =
        localStorage.getItem(`smartedu_dsa_marks_${targetId}`) ||
        localStorage.getItem(`smartedu_dsa_marks_${courseCode}`);
      if (raw) existingMarks = JSON.parse(raw);
    } catch {}

    const attempts: Record<string, any> = quiz.attempts || {};
    let syncedCount = 0;

    Object.values(attempts).forEach((att: any) => {
      const sKey = att.studentId || att.studentRoll;
      if (!sKey) return;
      const max = att.maxScore || quiz.totalPoints || (quiz as any).totalMarks || 20;
      const rawScore = att.score ?? 0;
      const normalizedClassTest = Math.min(25, Math.max(0, Math.round((rawScore / max) * 25)));

      const currentRec = existingMarks[sKey] || {
        assignments: 20,
        classTest: 20,
        midTerm: 20,
        labPractical: 22,
      };

      existingMarks[sKey] = {
        ...currentRec,
        classTest: normalizedClassTest,
      };
      syncedCount++;
    });

    try {
      localStorage.setItem(`smartedu_dsa_marks_${targetId}`, JSON.stringify(existingMarks));
      localStorage.setItem(`smartedu_dsa_marks_${courseCode}`, JSON.stringify(existingMarks));
      window.dispatchEvent(new Event("storage"));
    } catch {}

    setSyncingGradebook(false);
    setNotification(
      `✓ Synced ${syncedCount} student quiz score(s) to Class Test component in DSA Gradebook for ${courseCode}.`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  const [mappingCaseStudy, setMappingCaseStudy] = useState<any | null>(null);
  const [viewingCaseStudy, setViewingCaseStudy] = useState<any | null>(null);
  const [editingCaseStudy, setEditingCaseStudy] = useState<any | null>(null);

  const handleSyncCaseStudyToGradebook = (cs: any) => {
    if (!cs) return;
    setMappingCaseStudy(cs);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#22B573]" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── IN-PAGE VIEW 1: ASSIGNMENTS / QUIZZES / CASE STUDIES REGISTER ─── */}
      {currentView === "LIST" && (
        <div className="space-y-6">
          {/* Main Academic Section Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSubTab("ASSIGNMENTS")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                subTab === "ASSIGNMENTS"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Individual Coursework ({assignments.filter((a) => !a.isTeamAssignment && a.type !== "IDEATHON" && a.type !== "LAB_PROJECT").length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("QUIZZES")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                subTab === "QUIZZES"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileCheck className="h-4 w-4" />
              <span>Quizzes &amp; Tests ({quizzes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("CASE_STUDIES")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                subTab === "CASE_STUDIES"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>Case Studies ({caseStudies.length})</span>
            </button>
          </div>

          {/* ─── MODAL: DELETE QUIZ CONFIRMATION ─── */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Assessment Quiz</h3>
                <p className="text-xs text-slate-500 font-mono">{quizToDelete.courseCode}: {quizToDelete.title}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this quiz? All student attempts, questions, and proctoring logs will be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setQuizToDelete(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const id = quizToDelete.id;
                  deleteQuiz(id);
                  void apiClient.delete(`/assessments/scheduled-exams/${id}`).catch(() => {});
                  void apiClient.delete(`/exams/${id}`).catch(() => {});
                  setQuizToDelete(null);
                  setNotification("✓ Quiz successfully deleted.");
                  setTimeout(() => setNotification(null), 3000);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW QUIZ QUESTIONS ─── */}
      {viewingQuestionsQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {viewingQuestionsQuiz.title} — Questions ({viewingQuestionsQuiz.questions?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {viewingQuestionsQuiz.courseCode} &bull; Total Marks: {viewingQuestionsQuiz.totalPoints || 20} &bull; Time: {viewingQuestionsQuiz.timeLimitMinutes || 20}m
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingQuestionsQuiz(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(!viewingQuestionsQuiz.questions || viewingQuestionsQuiz.questions.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No questions currently recorded for this assessment.
                </div>
              ) : (
                viewingQuestionsQuiz.questions.map((q: any, qIdx: number) => {
                  const qText = q.prompt || q.questionText || q.question_text || q.text || q.title || `Question ${qIdx + 1}`;
                  const qMarks = q.marks || q.points || 1;
                  const options = q.options || [];

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs font-mono">
                            {qIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {qText}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {qMarks} pt{qMarks > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                        {options.map((opt: any, optIdx: number) => {
                          const optText = typeof opt === "string" ? opt : opt.text || opt.option_text || opt.optionText || "";
                          const isCorrect = typeof opt === "object"
                            ? (Boolean(opt.isCorrect || opt.is_correct) || optIdx === q.correctIndex || optIdx === q.correctAnswerIndex)
                            : (optIdx === q.correctIndex || optIdx === q.correctAnswerIndex);
                          const letter = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                                isCorrect
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              }`}>
                                {letter}
                              </span>
                              <span className="flex-1 truncate">{optText}</span>
                              {isCorrect && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                  ✓ Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 1: COURSEWORK & ASSIGNMENTS WORKFLOW                   */}
          {/* ══════════════════════════════════════════════════════════ */}
          {subTab === "ASSIGNMENTS" && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Header & Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <SectionHeader
                  title="Coursework & Submissions Hub"
                  description="Hierarchical academic workflow: select a teaching class to view its coursework, inspect student submissions, and grade."
                />

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Hierarchy View Switcher */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentDisplayMode("CLASSES");
                        setActiveCourseCardCode(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        assignmentDisplayMode === "CLASSES" && !activeCourseCardCode
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>My Classes ({effectiveFacultyCourses.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentDisplayMode("ALL");
                        setActiveCourseCardCode(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        assignmentDisplayMode === "ALL"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>All Tasks ({assignments.length})</span>
                    </button>
                  </div>

                  {onOpenCaseStudyModal && (
                    <Button
                      variant="outline"
                      onClick={onOpenCaseStudyModal}
                      className="text-xs px-3 py-2 flex items-center gap-1.5 font-bold border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer whitespace-nowrap"
                    >
                      <BrainCircuit className="h-3.5 w-3.5 text-blue-600" />
                      <span>AI Case Study</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setIsAiModalOpen(true)}
                    className="text-xs px-3 py-2 flex items-center gap-1.5 font-bold border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>AI Problem Generator</span>
                  </Button>

                  <Button
                    onClick={() => {
                      if (activeCourseCardCode) setNewCourseCode(activeCourseCardCode);
                      setCurrentView("CREATE");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Assignment</span>
                  </Button>
                </div>
              </div>

              {/* 4 Summary Metric Cards (Refined UniFlow SaaS Standard) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Teaching Classes</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{effectiveFacultyCourses.length}</p>
                    <span className="text-[11px] text-slate-400">Active cohorts</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Submissions</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{submissions.length}</p>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">{turnoutRate}% turnout rate</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileCheck className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Graded Tasks</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{gradedSubmissions.length}</p>
                    <span className="text-[11px] text-slate-400">{submissions.length - gradedSubmissions.length} pending review</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Class Average</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{averageScore}%</p>
                    <span className="text-[11px] text-slate-400">Across evaluated work</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>

          {/* ════════════════ LEVEL 1: CLASS / COURSE CARDS GRID ════════════════ */}
          {assignmentDisplayMode === "CLASSES" && !activeCourseCardCode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Teaching Classes &amp; Course Cohorts</h3>
                  <p className="text-xs text-slate-500">Select any class below to inspect its assignments and student submissions.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                {effectiveFacultyCourses.map((course) => {
                  const courseAsgs = assignments.filter((a) => a.courseCode === course.course_code);
                  const asgIds = new Set(courseAsgs.map((a) => a.id));
                  const courseSubs = submissions.filter((s) => asgIds.has(s.assignmentId));
                  const pendingGrading = courseSubs.filter((s) => s.status !== "GRADED").length;
                  const enrolled = course.enrolled_count || (users ? users.filter((u) => u.role === "STUDENT" && (u.department === (course as any).department || (u as any).department_id === (course as any).department_id)).length : 0);
                  const turnout = courseAsgs.length > 0 && enrolled > 0
                    ? Math.min(100, Math.round((courseSubs.length / (courseAsgs.length * enrolled)) * 100))
                    : 0;

                  return (
                    <div
                      key={course.id || course.course_code}
                      onClick={() => setActiveCourseCardCode(course.course_code)}
                      className="h-full bg-white dark:bg-[#181C2B] rounded-[24px] p-6 border border-[#E8EAF1] dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                            {course.course_code}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50/80 text-blue-800 dark:bg-slate-800 dark:text-blue-300 border border-blue-100 dark:border-slate-700 truncate max-w-[180px]">
                            {getCourseCohortBadge(course)}
                          </span>
                        </div>

                        <div className="min-h-[44px]">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                            {course.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {(course as any).department || "Academic Department"} • {enrolled} Enrolled Students
                          </p>
                        </div>

                        {/* Class Task Metrics */}
                        <div className="grid grid-cols-3 gap-2 p-3 bg-[#F7F8FC] dark:bg-slate-900/60 rounded-xl border border-[#E8EAF1] dark:border-slate-800 text-center">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tasks</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{courseAsgs.length}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Submitted</span>
                            <span className="text-sm font-black text-emerald-600 font-mono">{courseSubs.length}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">To Grade</span>
                            <span className={`text-sm font-black font-mono ${pendingGrading > 0 ? "text-amber-600" : "text-slate-400"}`}>
                              {pendingGrading}
                            </span>
                          </div>
                        </div>

                        {/* Turnout Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Student Turnout:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{turnout}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${turnout}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                        <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Open Class Coursework</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                        {pendingGrading > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                            {pendingGrading} pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {effectiveFacultyCourses.length === 0 && (
                  <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">No Teaching Classes Assigned</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      You are not currently assigned to any teaching courses. Courses assigned to your faculty profile by the Head of Department will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ LEVEL 2: SPECIFIC CLASS DRILLED-DOWN ASSIGNMENTS ════════════════ */}
          {assignmentDisplayMode === "CLASSES" && activeCourseCardCode && (
            <div className="space-y-5 animate-fade-in">
              {(() => {
                const currentCourseObj = effectiveFacultyCourses.find((c) => c.course_code === activeCourseCardCode);
                const classAsgs = assignments.filter((a) => a.courseCode === activeCourseCardCode);
                const asgIds = new Set(classAsgs.map((a) => a.id));
                const classSubs = submissions.filter((s) => asgIds.has(s.assignmentId));

                return (
                  <>
                    {/* Class Breadcrumb & Action Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveCourseCardCode(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Back to All Teaching Classes</span>
                        </button>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                            {activeCourseCardCode}
                          </span>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {currentCourseObj?.name || activeCourseCardCode}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {getCourseCohortBadge(currentCourseObj)} • {currentCourseObj?.enrolled_count ?? 0} Enrolled Students • {classAsgs.length} Active Tasks
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => {
                            setNewCourseCode(activeCourseCardCode);
                            setCurrentView("CREATE");
                          }}
                          className="btn-saas-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>New Assignment for this Class</span>
                        </Button>
                      </div>
                    </div>

                    {/* Class Assignments Grid */}
                    {classAsgs.length === 0 ? (
                      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <FileText className="h-10 w-10 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">No assignments created yet for this class</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Create problem sets, coding exercises, or certificate submissions to begin receiving student work.
                        </p>
                        <Button
                          onClick={() => {
                            setNewCourseCode(activeCourseCardCode);
                            setCurrentView("CREATE");
                          }}
                          className="btn-saas-primary text-xs px-4 py-2 cursor-pointer"
                        >
                          Create First Assignment
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {classAsgs.map((asg) => {
                          const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
                          const enrolled = asg.totalEnrolled || currentCourseObj?.enrolled_count || 45;
                          const pendingReview = asgSubs.filter((s) => s.status !== "GRADED").length;

                          return (
                            <div
                              key={asg.id}
                              className="bg-white dark:bg-[#181C2B] rounded-[20px] p-6 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all group"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                    {asg.type.replace(/_/g, " ")}
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      asg.status === "ACTIVE"
                                        ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                                        : "bg-slate-100 text-[#737A90] dark:bg-slate-800"
                                    }`}
                                  >
                                    ● {asg.status}
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-[#171A2B] dark:text-white line-clamp-2">
                                  {asg.title}
                                </h4>

                                <p className="text-xs text-[#737A90] line-clamp-2 leading-relaxed">
                                  {asg.description}
                                </p>

                                <div className="p-3 bg-[#F7F8FC] dark:bg-slate-900/60 rounded-xl border border-[#E8EAF1] dark:border-slate-800 text-xs space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-[#737A90]">Total Marks:</span>
                                    <strong className="text-[#171A2B] dark:text-white font-mono">{asg.totalPoints} pts ({asg.weightPercentage}%)</strong>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[#737A90]">Due Date:</span>
                                    <strong className="text-[#171A2B] dark:text-slate-300 font-mono text-[11px]">{formatDueDate(asg.dueDate)}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#737A90]">Submissions:</span>
                                    <strong className="text-[#22B573] font-mono font-bold">
                                      {asgSubs.length} / {enrolled} Students
                                    </strong>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtendingAssignment(asg);
                                    setExtendNewDate(asg.dueDate);
                                    setExtendReason("");
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Clock className="h-3 w-3 text-amber-500" />
                                  <span>Extend</span>
                                </button>
                                <Button
                                  onClick={() => {
                                    setSelectedAsgForGrading(asg);
                                    setCurrentView("GRADING");
                                  }}
                                  className="btn-saas-primary text-xs px-3.5 py-1.5 font-bold cursor-pointer"
                                >
                                  <span>Review ({asgSubs.length})</span>
                                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ════════════════ LEVEL 3 (OR FLAT MODE): ALL ASSIGNMENTS REGISTER ════════════════ */}
          {assignmentDisplayMode === "ALL" && (
            <div className="space-y-4">
              {/* Assessment Filter Bar with Status Pills, Counts, Sort by and View Toggle */}
              <AssessmentFilterBar
                filter={asgFilterStatus}
                onFilterChange={setAsgFilterStatus}
                counts={assignmentFilterCounts}
                sortBy={asgSortOption}
                onSortChange={setAsgSortOption}
                viewMode={asgViewMode}
                onViewModeChange={setAsgViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {/* Course filter pill subrow */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FC] dark:bg-slate-800 rounded-xl overflow-x-auto text-xs">
                {["ALL", ...Array.from(new Set(effectiveFacultyCourses.map((c) => c.course_code)))].map((code) => (
                  <button
                    key={code}
                    onClick={() => setCourseFilter(code)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                      courseFilter === code
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                    }`}
                  >
                    {code === "ALL" ? "All Course Codes" : code}
                  </button>
                ))}
              </div>

              {filteredAssignments.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#181C2B] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <FileCode className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">No Matching Assignments</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery ? `No tasks found matching "${searchQuery}".` : `No assignments in state "${asgFilterStatus}".`}
                  </p>
                </div>
              ) : (
                <div className={asgViewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-4"}>
                  {filteredAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="bg-white dark:bg-[#181C2B] rounded-[20px] p-6 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                          {asg.courseCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            asg.status === "ACTIVE"
                              ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                              : "bg-slate-100 text-[#737A90] dark:bg-slate-800"
                          }`}
                        >
                          ● {asg.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#171A2B] dark:text-white line-clamp-2 group-hover:text-slate-900 dark:text-slate-100 transition-colors">
                        {asg.title}
                      </h3>

                      <p className="text-xs text-[#737A90] line-clamp-2 leading-relaxed">
                        {asg.description}
                      </p>

                      <div className="p-3 bg-[#F7F8FC] dark:bg-slate-900/60 rounded-xl border border-[#E8EAF1] dark:border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[#737A90]">Total Marks:</span>
                          <strong className="text-[#171A2B] dark:text-white font-mono">{asg.totalPoints} pts ({asg.weightPercentage}%)</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#737A90]">Due Date:</span>
                          <div className="text-right">
                            <strong className="text-[#171A2B] dark:text-slate-300 font-mono text-[11px] block">{formatDueDate(asg.dueDate)}</strong>
                            {asg.isExtended && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-amber-200 dark:border-amber-800">
                                ✨ Extended
                              </span>
                            )}
                          </div>
                        </div>
                        {(() => {
                          const actualSubmitted = submissions.filter((s) => s.assignmentId === asg.id).length;
                          const matchedCourse = effectiveFacultyCourses.find((c) => c.course_code === asg.courseCode || c.id === asg.courseCode);
                          const enrolled = asg.totalEnrolled || matchedCourse?.enrolled_count || 45;
                          return (
                            <div className="flex justify-between">
                              <span className="text-[#737A90]">Submissions:</span>
                              <strong className="text-[#22B573] font-mono font-bold">
                                {actualSubmitted} / {enrolled} Students
                              </strong>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExtendingAssignment(asg);
                          setExtendNewDate(asg.dueDate);
                          setExtendReason("");
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span>Extend Date</span>
                      </button>
                      <Button
                        onClick={() => {
                          setSelectedAsgForGrading(asg);
                          setCurrentView("GRADING");
                        }}
                        className="btn-saas-primary text-xs px-3.5 py-1.5 font-bold cursor-pointer"
                      >
                        <span>Check Work</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2: QUIZZES & ASSESSMENTS HUB (ANALYTICS & SYNC)        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === "QUIZZES" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <SectionHeader
              title="Quizzes & Assessments Hub"
              description="Proctored class quizzes, student attendee tracking, performance analytics, and 1-click sync to DSA Gradebook."
            />

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {/* Course Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs">
                <span className="text-slate-400 font-medium">Course:</span>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Enrolled Courses</option>
                  {effectiveFacultyCourses.map((c) => (
                    <option key={c.id || c.course_code} value={c.course_code}>
                      {c.course_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => setIsAiModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Create / Upload Quiz</span>
              </Button>
            </div>
          </div>

          {/* 4 Summary KPI Cards for Quizzes */}
          {(() => {
            const allAttempts = filteredQuizzes.flatMap((q) => Object.values(q.attempts || {}));
            const totalAttemptsCount = allAttempts.length;
            const avgQuizScore = totalAttemptsCount > 0
              ? Math.round(
                  (allAttempts.reduce((acc: number, a: any) => acc + (a.score / (a.maxScore || 20)), 0) /
                    totalAttemptsCount) *
                    100
                )
              : 0;
            const passQuizCount = allAttempts.filter((a: any) => (a.score / (a.maxScore || 20)) >= 0.5).length;
            const passRate = totalAttemptsCount > 0 ? Math.round((passQuizCount / totalAttemptsCount) * 100) : 0;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Active Quizzes</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{filteredQuizzes.length}</p>
                    <span className="text-[11px] text-slate-400">Published online</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileCheck className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Submissions</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{totalAttemptsCount}</p>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Total attendees</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Class Average</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {totalAttemptsCount > 0 ? `${avgQuizScore}%` : "—"}
                    </p>
                    <span className="text-[11px] text-slate-400">Score performance</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Pass Rate</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {totalAttemptsCount > 0 ? `${passRate}%` : "—"}
                    </p>
                    <span className="text-[11px] text-slate-400">Meeting threshold</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Trophy className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quizzes List Cards */}
          {filteredQuizzes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <FileCheck className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No quizzes published yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create an AI generated quiz, use the manual question builder, or upload a CSV/JSON question paper to start testing students.
              </p>
              <Button
                onClick={() => setIsAiModalOpen(true)}
                className="btn-saas-primary text-xs px-4 py-2 cursor-pointer"
              >
                Create First Quiz
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuizzes.map((quiz) => {
                const attemptsMap: Record<string, any> = { ...(quiz.attempts || {}) };
                if (typeof window !== "undefined") {
                  try {
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith(`smartedu_quiz_attempt_${quiz.id}_`)) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                          const parsed = JSON.parse(raw);
                          if (parsed && parsed.studentId) {
                            attemptsMap[parsed.studentId] = parsed;
                          }
                        }
                      }
                    }
                  } catch {}
                }
                const attemptsCount = Object.keys(attemptsMap).length;
                const matchedCourse = effectiveFacultyCourses.find((c) => c.course_code === quiz.courseCode);
                const enrolled = matchedCourse?.enrolled_count || 48;

                return (
                  <div
                    key={quiz.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                          {quiz.courseCode}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Published
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuizToDelete(quiz)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete assessment quiz"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {quiz.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {quiz.description || "Curriculum based assessment"}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 border-y border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Questions</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{quiz.questions?.length || 5}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Marks</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{quiz.totalPoints || (quiz as any).totalMarks || 20}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Time</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{quiz.timeLimitMinutes || (quiz as any).durationMinutes || 20}m</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={() => setSelectedQuizForAnalytics(quiz)}
                          className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          title="Click to view who attended vs absent"
                        >
                          <Users className="h-3.5 w-3.5 text-blue-600" />
                          <span>{attemptsCount} of {enrolled} Attended</span>
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Due: {formatDueDate(quiz.dueDate || (quiz as any).deadline)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedQuizForAnalytics(quiz)}
                          className="flex-1 text-xs py-1.5 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <BarChart2 className="h-3.5 w-3.5 text-blue-600" />
                          <span>View Analytics</span>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setViewingQuestionsQuiz(quiz)}
                          className="text-xs py-1.5 px-2.5 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                          title="View all questions & answer keys"
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Questions</span>
                        </Button>

                        <Button
                          onClick={() => handleSyncQuizToGradebook(quiz)}
                          disabled={syncingGradebook}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                          title="Sync quiz marks directly into DSA Gradebook Class Test component"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>Sync Book</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setExtendingQuiz(quiz);
                            setExtendQuizMinutes(quiz.timeLimitMinutes || 20);
                            setExtendQuizDueDate(quiz.dueDate ? quiz.dueDate.substring(0, 16) : "");
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Extend quiz duration or submission window"
                        >
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>Extend Time</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDuplicatingQuiz(quiz);
                            setDuplicateTitle(`${quiz.title} (Copy)`);
                            setDuplicateTargetCourse(quiz.courseCode);
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Duplicate questions and MCQs to another class"
                        >
                          <Copy className="h-3 w-3 text-blue-500" />
                          <span>Copy Quiz</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReassigningQuiz(quiz);
                            setReassignCourseCode(quiz.courseCode);
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Reassign target course or section"
                        >
                          <Users className="h-3 w-3 text-indigo-500" />
                          <span>Reassign</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuizToDelete(quiz)}
                          className="px-1.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Delete this assessment quiz"
                        >
                          <Trash2 className="h-3 w-3 text-rose-500" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 3: CASE STUDIES HUB (ANALYTICS & SYNC)                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === "CASE_STUDIES" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <SectionHeader
              title="Collaborative Case Studies Hub"
              description="Role-based Socratic case study scenarios, multi-role squads, transcripts review, and Gradebook integration."
            />

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {onOpenCaseStudyModal && (
                <Button
                  onClick={onOpenCaseStudyModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create AI Case Study</span>
                </Button>
              )}
            </div>
          </div>

          {/* 4 Summary KPI Cards for Case Studies */}
          {(() => {
            const allTeams = filteredCaseStudies.flatMap((cs) => cs.teams || []);
            const submittedTeams = allTeams.filter((t: any) => t.isSubmitted);
            const subRate = allTeams.length > 0 ? Math.round((submittedTeams.length / allTeams.length) * 100) : 0;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Active Studies</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{filteredCaseStudies.length}</p>
                    <span className="text-[11px] text-slate-400">Assigned topics</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <BrainCircuit className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Assigned Squads</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{allTeams.length}</p>
                    <span className="text-[11px] text-slate-400">Cross-functional</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Submissions</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{submittedTeams.length}</p>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">{subRate}% completion</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Average Score</span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">90%</p>
                    <span className="text-[11px] text-slate-400">AI Socratic Rubric</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Trophy className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Case Studies List */}
          {filteredCaseStudies.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <BrainCircuit className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Case Study Assessments Created</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Generate real-world engineering scenarios and assign collaborative roles (System Architect, QA, DevOps) to your students.
              </p>
              {onOpenCaseStudyModal && (
                <Button
                  onClick={onOpenCaseStudyModal}
                  className="btn-saas-primary text-xs px-4 py-2 cursor-pointer"
                >
                  Create Case Study
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCaseStudies.map((cs) => {
                const teams = cs.teams || [];
                const submittedCount = teams.filter((t: any) => t.isSubmitted).length;

                return (
                  <div
                    key={cs.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                          {cs.courseCode}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {cs.totalPoints || 50} Marks
                        </span>
                      </div>

                      <div>
                        <h4
                          onClick={() => setViewingCaseStudy(cs)}
                          className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{cs.title}</span>
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {cs.scenarioBrief || cs.topic || "Academic Case Study Scenario"}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                          <span>Assigned Squads:</span>
                          <span className="font-bold">{teams.length} Squads</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                          <span>Evaluations Completed:</span>
                          <span className="font-bold text-blue-600">{submittedCount} Submitted</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Due: {formatDueDate(cs.dueDate)}
                      </span>

                      <div className="flex items-center gap-1">
                        {/* View Submissions & Teams Button */}
                        <button
                          type="button"
                          onClick={() => setViewingCaseStudy(cs)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Squad Submissions & Transcripts"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Copy / Duplicate Button */}
                        <button
                          type="button"
                          onClick={() => duplicateCaseStudy(cs.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Duplicate Case Study"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit / Reassign Button */}
                        <button
                          type="button"
                          onClick={() => setEditingCaseStudy({ ...cs })}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit / Reassign Case Study"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Sync to Gradebook Button */}
                        <Button
                          onClick={() => handleSyncCaseStudyToGradebook(cs)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] py-1 px-2.5 font-bold flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                          title="Sync case study scores into DSA Gradebook Assignments component"
                        >
                          <Award className="h-3 w-3" />
                          <span>Sync</span>
                        </Button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete case study "${cs.title}"?`)) {
                              deleteCaseStudy(cs.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete Case Study"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: QUIZ ATTENDEES, LEADERBOARD & ANALYTICS ROSTER      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedQuizForAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {selectedQuizForAnalytics.courseCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedQuizForAnalytics.title} &bull; Attendees &amp; Performance
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Track who took the quiz, who did not attend, review scores, and sync to Gradebook.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedQuizForAnalytics(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {(() => {
                const activeQuiz = quizzes.find((q) => q.id === selectedQuizForAnalytics.id) || selectedQuizForAnalytics;
                const attemptsMap: Record<string, any> = { ...(activeQuiz.attempts || {}) };

                if (typeof window !== "undefined") {
                  try {
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith(`smartedu_quiz_attempt_${activeQuiz.id}_`)) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                          const parsed = JSON.parse(raw);
                          if (parsed && parsed.studentId) {
                            attemptsMap[parsed.studentId] = {
                              ...attemptsMap[parsed.studentId],
                              ...parsed,
                            };
                          }
                        }
                      }
                    }
                  } catch {}
                }

                const attemptsList = Object.values(attemptsMap);
                const matchedCourse = effectiveFacultyCourses.find(
                  (c) => c.course_code === activeQuiz.courseCode
                );
                // Candidate students from enrolled list or department
                const studentUsers = users.filter((u) => u.role === "STUDENT");
                const baseRoster = studentUsers.length > 0
                  ? studentUsers
                  : [
                      { id: "s-1", first_name: "Rahul", last_name: "Sharma", student_identifier: "23CSE001" },
                      { id: "s-2", first_name: "Priya", last_name: "Verma", student_identifier: "23CSE002" },
                      { id: "s-3", first_name: "Aman", last_name: "Gupta", student_identifier: "23CSE003" },
                      { id: "s-4", first_name: "Sneha", last_name: "Patel", student_identifier: "23CSE004" },
                    ];

                // Ensure all students who submitted an attempt are present in the roster
                const roster = [...baseRoster];
                attemptsList.forEach((att: any) => {
                  const alreadyInRoster = roster.some(
                    (s) => s.id === att.studentId || (s.student_identifier && s.student_identifier === att.studentRoll)
                  );
                  if (!alreadyInRoster && (att.studentId || att.studentName)) {
                    const sNameParts = (att.studentName || "Student Candidate").split(" ");
                    roster.push({
                      id: att.studentId || `stu-${Date.now()}`,
                      first_name: sNameParts[0] || "Student",
                      last_name: sNameParts.slice(1).join(" ") || "",
                      student_identifier: att.studentRoll || "Verified",
                      role: "STUDENT",
                    } as any);
                  }
                });

                const totalMax = activeQuiz.totalPoints || (activeQuiz as any).totalMarks || 20;
                const attendedStudents = roster.filter((s) => {
                  return attemptsList.some(
                    (a: any) =>
                      a.studentId === s.id ||
                      a.studentRoll === (s.student_identifier || s.id) ||
                      a.studentName?.toLowerCase() === `${s.first_name} ${s.last_name}`.toLowerCase()
                  );
                });

                const absentStudents = roster.filter((s) => !attendedStudents.some((att) => att.id === s.id));
                const scores = attemptsList.map((a: any) => a.score ?? 0);
                const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                const topScore = scores.length > 0 ? Math.max(...scores) : totalMax;

                // Sort top performers
                const sortedAttempts = [...attemptsList].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

                return (
                  <div className="space-y-6">
                    {/* 4 Performance Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Enrolled</span>
                        <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{roster.length}</p>
                        <span className="text-[11px] text-slate-500">Cohort students</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Attended</span>
                        <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono mt-0.5">{attendedStudents.length}</p>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Submitted quiz</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                        <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">Absent / Pending</span>
                        <p className="text-xl font-black text-amber-800 dark:text-amber-200 font-mono mt-0.5">{absentStudents.length}</p>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">Did not attend</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                        <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 block">Class Average</span>
                        <p className="text-xl font-black text-blue-800 dark:text-blue-200 font-mono mt-0.5">{avgScore} / {totalMax}</p>
                        <span className="text-[11px] text-blue-600 dark:text-blue-400">{Math.round((avgScore / totalMax) * 100)}% average</span>
                      </div>
                    </div>

                    {/* Top Performers Leaderboard (Podium) */}
                    {sortedAttempts.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-amber-500" />
                          <span>Top Performers Leaderboard</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {sortedAttempts.slice(0, 3).map((att: any, idx) => (
                            <div
                              key={att.studentId || idx}
                              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center shrink-0">
                                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                                    {att.studentName || `Student ${idx + 1}`}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">{att.studentRoll || "Verified"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-emerald-600 font-mono">
                                  {att.score} / {totalMax}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {Math.round((att.score / totalMax) * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Student Roster Table (Who Attended vs Who Did Not) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Complete Cohort Roster ({roster.length} Students)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {attendedStudents.length} Attended &bull; {absentStudents.length} Absent
                        </span>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="p-3 pl-4">Student Name</th>
                              <th className="p-3">Roll Number</th>
                              <th className="p-3">Attendance Status</th>
                              <th className="p-3 text-right">Score</th>
                              <th className="p-3 text-right">Percentage</th>
                              <th className="p-3 text-center pr-4">DSA Book Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {roster.map((s) => {
                              const att = attemptsList.find(
                                (a: any) =>
                                  a.studentId === s.id ||
                                  a.studentRoll === (s.student_identifier || s.id) ||
                                  a.studentName?.toLowerCase() === `${s.first_name} ${s.last_name}`.toLowerCase()
                              );

                              return (
                                <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                  <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">
                                    {s.first_name} {s.last_name}
                                  </td>
                                  <td className="p-3 font-mono text-slate-500">
                                    {s.student_identifier || s.id}
                                  </td>
                                  <td className="p-3">
                                    {att ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Attended</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                                        <Clock className="h-3 w-3" />
                                        <span>Absent / Not Taken</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    {att ? `${att.score} / ${totalMax}` : "-"}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    {att ? `${Math.round((att.score / totalMax) * 100)}%` : "-"}
                                  </td>
                                  <td className="p-3 text-center pr-4">
                                    <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      Class Test Ready
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer with 1-Click Sync Button */}
            <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Syncing automatically updates the Class Test component (Max 25 pts) in the course DSA Gradebook.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedQuizForAnalytics(null)}
                  className="text-xs px-4 py-2 cursor-pointer font-bold"
                >
                  Close
                </Button>

                <Button
                  onClick={() => {
                    handleSyncQuizToGradebook(selectedQuizForAnalytics);
                    setSelectedQuizForAnalytics(null);
                  }}
                  disabled={syncingGradebook}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Award className="h-4 w-4" />
                  <span>1-Click Sync Entire Class to DSA Gradebook</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EXTEND QUIZ TIMING & WINDOW ─── */}
      {extendingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Extend Quiz Timing &amp; Window</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">{extendingQuiz.title}</p>
                </div>
              </div>
              <button
                onClick={() => setExtendingQuiz(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Examination Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={extendQuizMinutes}
                  onChange={(e) => setExtendQuizMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Extended Due Date / Window Close Time
                </label>
                <input
                  type="datetime-local"
                  value={extendQuizDueDate}
                  onChange={(e) => setExtendQuizDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setExtendingQuiz(null)}
                className="text-xs px-4 py-2 font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveExtendQuiz}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Save Extended Timing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DUPLICATE / COPY QUIZ & MCQS ─── */}
      {duplicatingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Copy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Duplicate Quiz &amp; Questions</h3>
                  <p className="text-[11px] text-slate-400">Clone all MCQs, options, and explanations to another class or section</p>
                </div>
              </div>
              <button
                onClick={() => setDuplicatingQuiz(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Source Quiz</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{duplicatingQuiz.title}</p>
                <p className="text-slate-500">{duplicatingQuiz.questions?.length || 0} Multiple-Choice Questions &bull; {duplicatingQuiz.timeLimitMinutes || 20}m duration</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Quiz Title
                </label>
                <input
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  placeholder="e.g., Data Structures Quiz (Sec B)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign To Target Course / Class
                </label>
                <select
                  value={duplicateTargetCourse}
                  onChange={(e) => setDuplicateTargetCourse(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {effectiveFacultyCourses.map((c) => (
                    <option key={c.id || c.course_code} value={c.course_code}>
                      {c.course_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setDuplicatingQuiz(null)}
                className="text-xs px-4 py-2 font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteDuplicateQuiz}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Create Duplicate Quiz</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REASSIGN QUIZ COHORT ─── */}
      {reassigningQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reassign Target Class / Course</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">{reassigningQuiz.title}</p>
                </div>
              </div>
              <button
                onClick={() => setReassigningQuiz(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select New Enrolled Course / Cohort
                </label>
                <select
                  value={reassignCourseCode}
                  onChange={(e) => setReassignCourseCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {effectiveFacultyCourses.map((c) => (
                    <option key={c.id || c.course_code} value={c.course_code}>
                      {c.course_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setReassigningQuiz(null)}
                className="text-xs px-4 py-2 font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteReassignQuiz}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Confirm Reassignment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── IN-PAGE VIEW 2: DEDICATED IN-PAGE ASSIGNMENT BUILDER ─── */}
      {currentView === "CREATE" && (
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("LIST")}
                className="p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 text-[#737A90] hover:text-[#171A2B] cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-[#171A2B] dark:text-white">Create Assignment</h2>
                <p className="text-xs text-[#737A90]">Add details, marks, due date, submission format, and instructions for students.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePublishAssignment} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course</label>
                <select
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold cursor-pointer"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.course_code}>
                      {c.course_code}: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Assessment Format</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold cursor-pointer"
                >
                  <option value="CODING">💻 Coding Assessment (Auto-Graded Test Cases)</option>
                  <option value="IDEATHON">💡 Ideathon / Real-World Solution Architecture</option>
                  <option value="PDF_DOCUMENT">📑 PDF Document / Problem Set</option>
                  <option value="CERTIFICATE_UPLOAD">🎓 Coursera / Online Certificate Upload</option>
                  <option value="WRITTEN">📝 Written Assignment</option>
                  <option value="LAB_PROJECT">🧪 Lab Work &amp; Project</option>
                  <option value="TERM_PAPER">📊 Project Report</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Assignment Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Assignment 4: Red-Black Tree Balancing & Asymptotic Proofs"
                className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Total Marks</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Weight (%)</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={newWeight}
                  onChange={(e) => setNewWeight(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Instructions &amp; Requirements</label>
              <textarea
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Provide problem specifications, time complexity constraints, required document format, or certificate verification criteria..."
                className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 leading-relaxed"
              />
            </div>

            {/* Ideathon Specific Fields */}
            {newType === "IDEATHON" && (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
                  <span>💡 Ideathon Problem Formulation &amp; Solution Architecture Challenge</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Theme / Industry Domain
                    </label>
                    <input
                      type="text"
                      value={newIdeathonTheme}
                      onChange={(e) => setNewIdeathonTheme(e.target.value)}
                      placeholder="e.g. Next-Gen Healthcare AI, Smart City Transit, FinTech Fraud Defense"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Real-World Problem Statement to Solve:
                    </label>
                    <textarea
                      rows={3}
                      value={newProblemStatement}
                      onChange={(e) => setNewProblemStatement(e.target.value)}
                      placeholder="Describe the real-life problem scenario. Students will architect an end-to-end blueprint, select tech stacks, and defend feasibility."
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Exam Protection & Anti-Cheating Controls */}
            <div>
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                Exam Protection &amp; Proctoring Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewProctoringMode("PROCTORED")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    newProctoringMode === "PROCTORED"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  <span className="text-base mt-0.5">🔒</span>
                  <div>
                    <strong className="block text-xs">Protected Exam / Proctored</strong>
                    <span className="text-[11px] text-slate-500">Camera, full screen, anti-cheating, and browser lockdown.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewProctoringMode("UNPROCTORED")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    newProctoringMode === "UNPROCTORED"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  <span className="text-base mt-0.5">🔓</span>
                  <div>
                    <strong className="block text-xs">Standard Assignment</strong>
                    <span className="text-[11px] text-slate-500">Open workspace submission without strict exam monitoring.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Coding Security Lockdown Controls */}
            {newType === "CODING" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Code Assessment Anti-Cheating &amp; Integrity Controls
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDisableCopyPaste}
                      onChange={(e) => setNewDisableCopyPaste(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Disable Copy, Cut &amp; Paste</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDisableContextMenu}
                      onChange={(e) => setNewDisableContextMenu(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Disable Right Click &amp; Menu</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDetectDevToolsAndExtensions}
                      onChange={(e) => setNewDetectDevToolsAndExtensions(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Detect DevTools &amp; Extensions</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDetectTabSwitch}
                      onChange={(e) => setNewDetectTabSwitch(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Detect Tab Switching &amp; Blur</span>
                  </label>
                </div>
              </div>
            )}

            {/* Coding Starter Code Template */}
            {newType === "CODING" && (
              <div className="space-y-1">
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                  Starter Code Template (Python / C++ / Java)
                </label>
                <textarea
                  rows={4}
                  value={newStarterCode}
                  onChange={(e) => setNewStarterCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-[#22B573]"
                />
              </div>
            )}

            {/* Coding Test Cases (Visible & Hidden) */}
            {newType === "CODING" && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                      Automated Evaluation Test Cases ({newTestCases.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Configure visible sample test cases for students and hidden evaluation test cases for final grading.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const id = `tc-${Date.now()}`;
                      setNewTestCases([
                        ...newTestCases,
                        {
                          id,
                          input: "Input parameters...",
                          expectedOutput: "Expected return value...",
                          isHidden: true,
                          points: 10,
                          explanation: "Edge case evaluation",
                        },
                      ]);
                    }}
                    className="btn-saas-outline text-xs px-3 py-1 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Test Case</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newTestCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            Case #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewTestCases(
                                newTestCases.map((t) =>
                                  t.id === tc.id ? { ...t, isHidden: !t.isHidden } : t
                                )
                              );
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              tc.isHidden
                                ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {tc.isHidden ? "🔒 Hidden Evaluation Case" : "👁️ Visible Sample Case"}
                          </button>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {tc.points} pts
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <input
                            type="text"
                            value={tc.input}
                            onChange={(e) =>
                              setNewTestCases(
                                newTestCases.map((t) =>
                                  t.id === tc.id ? { ...t, input: e.target.value } : t
                                )
                              )
                            }
                            placeholder="Input: e.g. [1, 2, 3], Target: 2"
                            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                          <input
                            type="text"
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              setNewTestCases(
                                newTestCases.map((t) =>
                                  t.id === tc.id ? { ...t, expectedOutput: e.target.value } : t
                                )
                              )
                            }
                            placeholder="Output: e.g. Index: 1"
                            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setNewTestCases(newTestCases.filter((t) => t.id !== tc.id))}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer self-end sm:self-center"
                        title="Remove test case"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#E8EAF1] dark:border-slate-800 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentView("LIST")} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="btn-saas-primary text-xs px-6 cursor-pointer">
                Publish Assignment
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── IN-PAGE VIEW 3: DEDICATED SUBMISSION EVALUATION & GRADING STUDIO ─── */}
      {currentView === "GRADING" && (
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 p-6 space-y-5 shadow-xs animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("LIST")}
                className="p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 text-[#737A90] hover:text-[#171A2B] cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#171A2B] dark:text-white">Check Submissions &amp; Grade</h2>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {selectedAsgForGrading?.courseCode}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedAsgForGrading?.type?.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-[#737A90]">
                  {selectedAsgForGrading?.title} • Maximum marks: {selectedAsgForGrading?.totalPoints || 50}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportSubmissionsCsv}
                className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Export submissions and marks to Excel (.csv)"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export to Excel (.csv)</span>
              </button>
            </div>
          </div>

          {/* 2-Column Split: Submissions Roster (Left) + Submission Preview & Grading (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Column: Submissions Roster */}
            <div className="border border-[#E8EAF1] dark:border-slate-800 rounded-2xl p-3 space-y-2 max-h-[560px] overflow-y-auto">
              <span className="text-[10px] font-bold text-[#737A90] uppercase tracking-wider block px-2 mb-1">
                Student Work ({submissionTotal})
              </span>

              {submissionLoading ? (
                <p className="p-6 text-xs text-slate-500">Loading student work...</p>
              ) : currentAssignmentSubmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs font-medium">No student submissions yet for this task.</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Waiting for student submissions</span>
                  </p>
                </div>
              ) : (
                currentAssignmentSubmissions.map((sub) => {
                  const isSelected = sub.id === activeSubId;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectSubmission(sub)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                        isSelected
                          ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 dark:bg-slate-800 shadow-xs"
                          : "border-[#E8EAF1] dark:border-slate-800 hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-[#171A2B] dark:text-white block">{sub.studentName}</strong>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.status === "GRADED"
                              ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                              : "bg-amber-50 text-[#F4B740] dark:bg-amber-950"
                          }`}
                        >
                          {sub.status === "GRADED" ? `Checked (${sub.score}/${sub.maxScore || selectedAsgForGrading?.totalPoints || 50})` : "Needs Checking"}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#737A90] font-mono flex items-center justify-between">
                        <span>{sub.rollNo}</span>
                        <span>{sub.certificateUrl ? "Certificate" : sub.fileName ? "PDF Attached" : sub.codeContent ? "Code File" : "Submitted"}</span>
                      </div>
                    </div>
                  );
                })
              )}
              {currentAssignmentSubmissions.length < submissionTotal && !submissionLoading && (
                <button
                  type="button"
                  onClick={async () => {
                    setSubmissionLoading(true);
                    try {
                      await loadAssignmentSubmissions(selectedAsgForGrading!.id, currentAssignmentSubmissions.length);
                    } catch (error) {
                      setNotification(error instanceof Error ? error.message : "More student work could not be loaded.");
                    } finally {
                      setSubmissionLoading(false);
                    }
                  }}
                  className="w-full p-2 text-xs font-semibold text-blue-700 hover:underline"
                >
                  Load more
                </button>
              )}
            </div>

            {/* Right Column: Submission Details, File/Certificate Preview & Grading Form */}
            <div className="md:col-span-2 space-y-3">
              {activeSubmission ? (
                <>
                  {/* Candidate Info Card */}
                  <div className="p-3.5 bg-[#F7F8FC] dark:bg-slate-900/60 rounded-xl border border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-[#171A2B] dark:text-white text-sm">{activeSubmission.studentName}</strong>
                      <span className="font-mono text-[#737A90] ml-2 font-bold">({activeSubmission.rollNo})</span>
                    </div>
                    <span className="text-[11px] text-[#737A90] font-mono">Submitted {activeSubmission.submittedAt}</span>
                  </div>

                  {/* 1. COURSERA / ONLINE CERTIFICATE SUBMISSION PREVIEW */}
                  {(activeSubmission.certificateUrl || activeSubmission.certificateProvider || selectedAsgForGrading?.type === "CERTIFICATE_UPLOAD") && (
                    <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                            Verified Online Course Certificate
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {activeSubmission.certificateProvider || "Coursera / Verified MOOC"}
                        </span>
                      </div>

                      {activeSubmission.certificateUrl ? (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between gap-3 text-xs">
                          <div className="truncate flex-1">
                            <span className="text-[10px] text-slate-400 block font-bold">Verification URL:</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold truncate block">
                              {activeSubmission.certificateUrl}
                            </span>
                          </div>
                          <a
                            href={activeSubmission.certificateUrl.startsWith("http") ? activeSubmission.certificateUrl : `https://${activeSubmission.certificateUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span>Open &amp; Verify</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No online verification link supplied.</p>
                      )}

                      {/* Attached Document / PDF Preview (Inline & Downloadable) */}
                      {(activeSubmission.fileUrl || activeSubmission.fileName) && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between text-xs p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="h-5 w-5 text-rose-600 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-900 dark:text-white block truncate">
                                  {activeSubmission.fileName || "Submitted Certificate / Document.pdf"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Academic PDF Document • Verified Upload
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewDocSubId((prev) => (prev === activeSubmission.id ? null : activeSubmission.id))}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                                  previewDocSubId === activeSubmission.id
                                    ? "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>{previewDocSubId === activeSubmission.id ? "Hide Preview" : "Preview in App"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => activeSubmission.fileUrl && handleOpenAttachment(activeSubmission.fileUrl)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Open in Tab</span>
                              </button>
                              {activeSubmission.fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(activeSubmission.fileUrl!, activeSubmission.fileName)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download PDF</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* On-Demand Document Viewer (Only loaded when faculty clicks Preview) */}
                          {previewDocSubId === activeSubmission.id && activeSubmission.fileUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xs animate-fade-in">
                              {getEmbeddablePdfUrl(activeSubmission) ? (
                                <object
                                  data={getEmbeddablePdfUrl(activeSubmission)}
                                  type="application/pdf"
                                  className="w-full h-[460px] bg-white"
                                >
                                  <iframe
                                    src={getEmbeddablePdfUrl(activeSubmission)}
                                    className="w-full h-[460px] bg-white"
                                    title="Student PDF Viewer"
                                  />
                                </object>
                              ) : (
                                <div className="p-8 text-center space-y-3 bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-xl">
                                  <FileText className="h-10 w-10 text-blue-300 mx-auto" />
                                  <p className="font-bold text-xs text-blue-100">{activeSubmission.fileName || "Certificate Attachment"}</p>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAttachment(activeSubmission.fileUrl!, activeSubmission)}
                                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Open Document</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. PDF DOCUMENT SUBMISSION PREVIEW (WHEN NOT ONLINE CERTIFICATE) */}
                  {activeSubmission.fileUrl && !activeSubmission.certificateUrl && !selectedAsgForGrading?.type?.includes("CERTIFICATE") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {activeSubmission.fileName || "Student_Submission.pdf"}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              PDF Document • Ready for Review
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDocSubId((prev) => (prev === activeSubmission.id ? null : activeSubmission.id))}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                              previewDocSubId === activeSubmission.id
                                ? "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{previewDocSubId === activeSubmission.id ? "Hide Preview" : "Preview in App"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => activeSubmission.fileUrl && handleOpenAttachment(activeSubmission.fileUrl, activeSubmission)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open in Tab</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(activeSubmission.fileUrl!, activeSubmission.fileName, activeSubmission)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      </div>

                      {/* On-Demand Document Viewer (Only loaded when faculty clicks Preview) */}
                      {previewDocSubId === activeSubmission.id && activeSubmission.fileUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xs animate-fade-in">
                          {getEmbeddablePdfUrl(activeSubmission) ? (
                            <object
                              data={getEmbeddablePdfUrl(activeSubmission)}
                              type="application/pdf"
                              className="w-full h-[520px] bg-white"
                            >
                              <iframe
                                src={getEmbeddablePdfUrl(activeSubmission)}
                                className="w-full h-[520px] bg-white"
                                title="Submitted Student PDF Document"
                              />
                            </object>
                          ) : (
                            <div className="p-8 text-center space-y-3 bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-xl">
                              <FileText className="h-10 w-10 text-blue-300 mx-auto" />
                              <p className="font-bold text-xs text-blue-100">{activeSubmission.fileName || "Student Submission Document"}</p>
                              <button
                                type="button"
                                onClick={() => handleOpenAttachment(activeSubmission.fileUrl!, activeSubmission)}
                                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Open Document</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. STUDENT NOTES / REMARKS */}
                  {activeSubmission.notes && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                        Student Note / Explanation:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 italic">"{activeSubmission.notes}"</p>
                    </div>
                  )}

                  {/* 4. CODE SUBMISSION PREVIEW (ONLY FOR CODING TASKS) */}
                  {activeSubmission.codeContent && selectedAsgForGrading?.type === "CODING" && (
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs text-[#22B573] leading-relaxed max-h-56 overflow-y-auto">
                      <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-slate-800 mb-2 text-[10px]">
                        <span>submission_artifact.cpp</span>
                        <span>{activeSubmission.testCasesPassed ?? 10} / {activeSubmission.totalTestCases ?? 10} Automated Tests Passed</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{activeSubmission.codeContent}</pre>
                    </div>
                  )}

                  {/* 5. FACULTY EVALUATION & MARKS AWARD FORM */}
                  <form onSubmit={handleSaveGrade} className="bg-[#F7F8FC] dark:bg-slate-900/60 p-4 rounded-2xl border border-[#E8EAF1] dark:border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      <div className="w-40 shrink-0">
                        <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                          Awarded Marks
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={selectedAsgForGrading?.totalPoints || 50}
                            required
                            value={awardedScore}
                            onChange={(e) => setAwardedScore(Number(e.target.value))}
                            className="w-20 p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-mono font-bold text-center text-sm"
                          />
                          <span className="font-mono text-[#737A90] font-bold">
                            / {selectedAsgForGrading?.totalPoints || 50} pts
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                          Faculty Feedback &amp; Remarks
                        </label>
                        <input
                          type="text"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="e.g. Excellent solution, Coursera credential verified, full marks awarded."
                          className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                        />
                      </div>

                      <Button type="submit" className="btn-saas-primary text-xs px-5 mt-4 sm:mt-5 self-end shrink-0 cursor-pointer">
                        <Send className="h-3.5 w-3.5 mr-1" />
                        <span>Publish Marks</span>
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="p-12 text-center text-[#737A90] text-xs space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No submission selected</p>
                  <p className="text-[11px] text-slate-400">Select a student submission from the left list to review and enter marks.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Assignment Generator Modal */}
      <FacultyAiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        defaultCourseCode={selectedAsgForGrading?.courseCode || courses[0]?.course_code}
        defaultMode="ASSIGNMENT"
      />

      {/* Extend Due Date Modal */}
      {extendingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Extend Due Date</h3>
                  <p className="text-[11px] text-slate-400">{extendingAssignment.courseCode}: {extendingAssignment.title}</p>
                </div>
              </div>
              <button
                onClick={() => setExtendingAssignment(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Due Date:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{extendingAssignment.dueDate}</strong>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Quick Presets:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "+1 Day", days: 1 },
                    { label: "+3 Days", days: 3 },
                    { label: "+1 Week", days: 7 },
                    { label: "+2 Weeks", days: 14 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const baseDate = new Date(extendingAssignment.dueDate || Date.now());
                        const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
                        validBase.setDate(validBase.getDate() + preset.days);
                        setExtendNewDate(validBase.toISOString().split("T")[0]);
                      }}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">New Extended Due Date</label>
                <input
                  type="date"
                  required
                  value={extendNewDate}
                  onChange={(e) => setExtendNewDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reason for Extension (Optional)</label>
                <input
                  type="text"
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g. Student requests / campus tech symposium extension"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
              <Button variant="outline" onClick={() => setExtendingAssignment(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!extendNewDate) return;
                  try {
                    await extendAssignmentDueDate(extendingAssignment.id, extendNewDate, extendReason);
                  } catch (error) {
                    setNotification(error instanceof Error ? error.message : "Deadline could not be updated.");
                    return;
                  }
                  setNotification(`✓ Deadline for "${extendingAssignment.title}" extended to ${extendNewDate}.`);
                  setExtendingAssignment(null);
                  setTimeout(() => setNotification(null), 4000);
                }}
                className="btn-saas-primary px-5 font-bold"
              >
                Apply Extension
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gradebook Calculation & Component Mapping Modal */}
      {mappingCaseStudy && (
        <FacultyGradebookMappingModal
          isOpen={Boolean(mappingCaseStudy)}
          onClose={() => setMappingCaseStudy(null)}
          caseStudy={mappingCaseStudy}
          courses={effectiveFacultyCourses}
          onSuccess={(msg) => {
            setNotification(msg);
            setTimeout(() => setNotification(null), 6000);
          }}
        />
      )}

      {/* ─── CASE STUDY SQUAD SUBMISSIONS & ROSTER REVIEW MODAL ─── */}
      {viewingCaseStudy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 max-w-5xl w-full max-h-[92vh] flex flex-col space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {viewingCaseStudy.courseCode}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {viewingCaseStudy.targetClass || "All Assigned Sections"}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Max: {viewingCaseStudy.totalPoints || 50} Marks
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {viewingCaseStudy.title} &bull; Squad Results &amp; AI Socratic Transcripts
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {viewingCaseStudy.scenarioBrief || viewingCaseStudy.topic || "Review squad deliverables, assigned student roles, and AI Socratic viva responses."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => handleSyncCaseStudyToGradebook(viewingCaseStudy)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Sync to Gradebook</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setViewingCaseStudy(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Squads List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {(!viewingCaseStudy.teams || viewingCaseStudy.teams.length === 0) ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <Users className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No Squads Formed Yet</p>
                  <p className="text-slate-500 text-[11px]">Students will appear here as soon as they form squads or begin their case assessment.</p>
                </div>
              ) : (
                viewingCaseStudy.teams.map((team: any, idx: number) => {
                  const isSub = team.isSubmitted || Boolean(team.submission?.submittedAt);
                  const content = team.submissionContent || team.submission?.content;
                  const score = team.score ?? team.submission?.grade;

                  return (
                    <div
                      key={team.id || `team-${idx}`}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4 hover:border-blue-400 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                              {team.teamName || `Squad ${idx + 1}`}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isSub
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"
                              }`}
                            >
                              {isSub ? "✓ Evaluated & Submitted" : "Pending Submission"}
                            </span>
                          </div>
                          {team.submittedAt && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Submitted: {new Date(team.submittedAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {score !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Final Grade:</span>
                            <div className="font-mono font-black text-sm sm:text-base px-3.5 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                              {score} / {viewingCaseStudy.totalPoints || 50} Marks
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Squad Members & Assigned Roles */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Squad Members &amp; Role Breakdown:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {(team.members || []).map((m: any, mIdx: number) => (
                            <div
                              key={m.studentId || mIdx}
                              className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                                  {m.studentName || "Student Member"}
                                </span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block truncate">
                                  {m.roleTitle || m.assignedRole || "Analyst"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Submitted Socratic Viva Transcript */}
                      {content && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span>AI Socratic Viva Transcript &amp; Student Responses:</span>
                          </span>
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                            {content}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CASE STUDY EDIT / REASSIGN MODAL ─── */}
      {editingCaseStudy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit / Reassign Case Study</h3>
              <button
                type="button"
                onClick={() => setEditingCaseStudy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updateCaseStudy(editingCaseStudy);
                setEditingCaseStudy(null);
                setNotification(`✓ Case study "${editingCaseStudy.title}" updated.`);
                setTimeout(() => setNotification(null), 4000);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingCaseStudy.title}
                  onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Points</label>
                  <input
                    type="number"
                    required
                    value={editingCaseStudy.totalPoints}
                    onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, totalPoints: parseInt(e.target.value, 10) || 50 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editingCaseStudy.dueDate}
                    onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, dueDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Class</label>
                <input
                  type="text"
                  required
                  value={editingCaseStudy.targetClass}
                  onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, targetClass: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setEditingCaseStudy(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
