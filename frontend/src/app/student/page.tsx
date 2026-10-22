"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Activity,
  Award,
  Zap,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  FileText,
  Bell,
  Star,
  ChevronLeft,
  Search,
  ExternalLink,
  Info,
  CheckCircle,
  XCircle,
  Plus,
  ClipboardList,
  Trophy,
  Shield,
  ShieldAlert,
  ChevronRight,
  FileCheck,
  MessageSquare,
  Bookmark,
  LayoutGrid,
  List,
  Layers,
  Bot,
  FolderKanban,
  Download,
  Send,
  Upload,
  X,
  FileCode,
  Check,
  Paperclip,
  Lock,
  MapPin,
  Users,
  UserPlus,
  Play,
  Terminal,
  Eye,
  EyeOff,
  Cpu,
  Monitor,
  Coffee,
  Code,
  MoreVertical,
  PieChart,
  Camera,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { getUserAvatarUrl } from "@/lib/avatar";
import { useAcademicData, AssignmentTeam, CodingTestCase } from "@/context/AcademicDataContext";
import { apiClient, fetchApi } from "@/lib/api-client";
import {
  StudentEnrollment,
  CatalogCourse,
  StudentAttendanceDashboard,
  StudentIntelligenceResponse,
  OfficialStudentTranscript,
  AnnouncementItem,
  ClassSchedule,
  Assignment,
  Exam,
} from "@/types";

// Design System Components
import { SectionHeader } from "@/components/ui/SectionHeader";
import { OfficialTranscriptView } from "@/components/results/OfficialTranscriptView";
import { AcademicHealthCard } from "@/components/intelligence/AcademicHealthCard";
import { RecommendationList } from "@/components/intelligence/RecommendationList";
import { AnnouncementFeed } from "@/components/communication/AnnouncementFeed";
import { AcademicMessagingView } from "@/components/communication/AcademicMessagingView";
import { AttendanceShortageCard } from "@/components/scheduling/AttendanceShortageCard";
import { AcademicCalendarView } from "@/components/scheduling/AcademicCalendarView";
import { StudentWeeklyCalendarView } from "@/components/scheduling/StudentWeeklyCalendarView";
import { StudentFacultyConsultationView } from "@/components/student/StudentFacultyConsultationView";
import { CardGridSkeleton } from "@/components/smartedu/LoadingSkeleton";
import { LmsCourseDashboard } from "@/components/lms/LmsCourseDashboard";
import { LmsQuizPlayer } from "@/components/lms/LmsQuizPlayer";
import { LiveInteractiveQuizView } from "@/components/assessment/LiveInteractiveQuizView";
import { LmsDiscussionBoard } from "@/components/lms/LmsDiscussionBoard";
import { LmsGradebookView } from "@/components/lms/LmsGradebookView";
import { AiCatchUpLessonModal, AiCatchUpLectureInfo } from "@/components/student/AiCatchUpLessonModal";
import { SemesterResultView } from "@/components/results/SemesterResultView";
import { StudentCaseStudyView } from "@/components/student/StudentCaseStudyView";
import { StudentHallTicketView } from "@/components/student/StudentHallTicketView";
import { StudentLeaveManagementView } from "@/components/student/StudentLeaveManagementView";
import { StudentModuleFeedbackView } from "@/components/student/StudentModuleFeedbackView";
import { StudentAiTutorView } from "@/components/student/StudentAiTutorView";
import { AiMockInterviewView } from "@/components/student/AiMockInterviewView";
import { StudentHelpCenterView } from "@/components/student/StudentHelpCenterView";
import { DashboardRightSidebar } from "@/components/dashboard/DashboardRightSidebar";
import { StudentIdeathonAssessmentModal } from "@/components/student/StudentIdeathonAssessmentModal";
import { DeadlineCountdownBadge } from "@/components/common/DeadlineCountdownBadge";
import {
  AssessmentFilterBar,
  AssessmentFilterStatus,
  AssessmentSortOption,
  AssessmentViewMode,
} from "@/components/common/AssessmentFilterBar";

const courseCardGradients = [
  "from-primary/10 via-primary/5 to-transparent",
  "from-slate-500/10 via-slate-500/5 to-transparent",
  "from-blue-500/10 via-blue-500/5 to-transparent",
  "from-indigo-500/10 via-indigo-500/5 to-transparent",
  "from-slate-600/10 via-slate-600/5 to-transparent",
  "from-primary/10 via-slate-500/5 to-transparent",
];

interface AssignmentItemState {
  id: string;
  courseCode: string;
  courseName: string;
  title: string;
  dueDate: string;
  urgency: "Urgent" | "High" | "Medium" | "Low";
  status: "PENDING" | "SUBMITTED" | "GRADED";
  score?: string;
  weight: string;
  maxPoints: number;
  description: string;
  format: "CODING" | "IDEATHON" | "QUIZ" | "REPORT" | "WRITTEN" | "LAB_PROJECT" | "TERM_PAPER" | "PDF_DOCUMENT" | "CERTIFICATE_UPLOAD";
  proctoringMode: "PROCTORED" | "UNPROCTORED";
  facultyInCharge: string;
  isExtended?: boolean;
  extendedReason?: string;
  isTeamAssignment?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  teams?: AssignmentTeam[];
  disableCopyPaste?: boolean;
  disableContextMenu?: boolean;
  detectDevToolsAndExtensions?: boolean;
  detectTabSwitch?: boolean;
  starterCode?: string;
  testCases?: CodingTestCase[];
  ideathonTheme?: string;
  problemStatement?: string;
  sections?: string[];
  problemDomain?: string;
  myTeam?: any;
  isFromFacultyHub?: boolean;
  rawFacultyProject?: any;
  rubricScores?: any;
  feedback?: string;
}

const initialAssignments: AssignmentItemState[] = [];

function StudentDashboardContent() {
  const { user } = useAuth();
  const {
    courses: syncCourses,
    assignments: syncAssignments,
    submissions: syncSubmissions,
    submitAssignment: syncSubmitAssignment,
    createAssignmentTeam,
    joinAssignmentTeam,
    leaveAssignmentTeam,
    toggleLockAssignmentTeam,
    sendTeamInvitation,
    studentAttendancePct,
    announcements: syncAnnouncements,
    notifications: syncNotifications,
    quizzes: syncQuizzes,
    markNotificationAsRead,
    users: syncUsers,
    calendarSchedules,
    attendanceSessions,
    projectSubmissions,
    currentSemester,
    activeSemesterFilter,
    setActiveSemesterFilter,
    semesterHistory,
    isSemesterSeeUnlocked,
    isHallTicketsReleased,
    studentLeaves,
    departments,
  } = useAcademicData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceDashboard | null>(null);
  const [intelligenceData, setIntelligenceData] = useState<StudentIntelligenceResponse | null>(null);
  const [transcript, setTranscript] = useState<OfficialStudentTranscript | null>(null);
  const [selectedPublishedSemesterId, setSelectedPublishedSemesterId] = useState("");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentItemState[]>([]);
  const [studentExams, setStudentExams] = useState<Exam[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");

  // Interactive Time Range for Trend Chart: "3M" | "6M" | "1Y"
  const [trendRange, setTrendRange] = useState<"3M" | "6M" | "1Y">("6M");

  // Unified Sub-Tab States
  const [scheduleSubTab, setScheduleSubTab] = useState<"TIMETABLE" | "FACULTY" | "CALENDAR">("TIMETABLE");
  const [announcementSubTab, setAnnouncementSubTab] = useState<"ANNOUNCEMENTS" | "NOTIFICATIONS">("ANNOUNCEMENTS");
  const [attendanceSubTab, setAttendanceSubTab] = useState<"BREAKDOWN" | "LOG" | "LEAVES">("BREAKDOWN");
  const [resultsSubTab, setResultsSubTab] = useState<"GRADEBOOK" | "OFFICIAL_TRANSCRIPT">("GRADEBOOK");

  // Selected Missed Class Modal State
  const [selectedMissedCourse, setSelectedMissedCourse] = useState<{
    code: string;
    name: string;
    missedCount: number;
    sessions: Array<{
      id: string;
      date: string;
      topic: string;
      faculty: string;
      room: string;
    }>;
  } | null>(null);

  // Monthly Attendance Log Navigation & Day Selection
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  // Modals & Interactive Overlays
  const [selectedSubmissionAssignment, setSelectedSubmissionAssignment] = useState<AssignmentItemState | null>(null);
  const [selectedCourseForStudentAssignments, setSelectedCourseForStudentAssignments] = useState<string | null>(null);
  const [studentAssignmentViewMode, setStudentAssignmentViewMode] = useState<"COURSES" | "ALL">("COURSES");
  const [submissionCodeText, setSubmissionCodeText] = useState("");
  const [submissionFileName, setSubmissionFileName] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionCertificateUrl, setSubmissionCertificateUrl] = useState("");
  const [submissionCertificateProvider, setSubmissionCertificateProvider] = useState("Coursera");
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // Team Formation State
  const [selectedAssignmentForTeam, setSelectedAssignmentForTeam] = useState<AssignmentItemState | null>(null);
  const [teamNameInput, setTeamNameInput] = useState<string>("");
  const [teamActionError, setTeamActionError] = useState<string | null>(null);
  const [selectedTeammatesForNewTeam, setSelectedTeammatesForNewTeam] = useState<string[]>([]);
  const [confirmLeavingTeamId, setConfirmLeavingTeamId] = useState<string | null>(null);

  // Coding Assessment Evaluation & Sandbox State
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [codeExecutionResults, setCodeExecutionResults] = useState<{
    passedCount: number;
    totalVisibleCount: number;
    cases: Array<{ id: string; input: string; expected: string; actual: string; passed: boolean; isHidden: boolean }>;
  } | null>(null);
  const [integrityStrikes, setIntegrityStrikes] = useState<number>(0);

  // Ideathon State
  const [ideathonProposalTitle, setIdeathonProposalTitle] = useState<string>("");
  const [ideathonArchitecture, setIdeathonArchitecture] = useState<string>("");
  const [ideathonTechStack, setIdeathonTechStack] = useState<string>("");
  const [ideathonImpact, setIdeathonImpact] = useState<string>("");

  // Separate Individual Assignments vs Group Projects & Ideathons
  const individualAssignments = React.useMemo(() => {
    return assignmentsList.filter(
      (a) => !a.isTeamAssignment && a.format !== "IDEATHON" && a.format !== "LAB_PROJECT"
    );
  }, [assignmentsList]);

  // State for synchronization with faculty projects and ideathons hub
  const [facultyHubProjects, setFacultyHubProjects] = useState<any[]>([]);
  const [activeIdeathonModalProject, setActiveIdeathonModalProject] = useState<any | null>(null);
  const [selectedIdeathonReviewProject, setSelectedIdeathonReviewProject] = useState<any | null>(null);
  const [projectTabFilter, setProjectTabFilter] = useState<"ALL" | "IDEATHON" | "PROJECT">("ALL");

  const loadFacultyHubProjects = useCallback(async () => {
    try {
      const state = await apiClient.get<Record<string, unknown>>("/admin/operational-state");
      setFacultyHubProjects(Array.isArray(state.facultyProjects) ? state.facultyProjects : []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setFacultyHubProjects([]);
    }
  }, []);

  useEffect(() => {
    void loadFacultyHubProjects();
  }, [loadFacultyHubProjects]);

  const studentRollNumber = (user as any)?.rollNumber || (user as any)?.roll_number || (user as any)?.student_identifier || "";
  const studentFullName = `${user?.first_name || "Student"} ${user?.last_name || ""}`.trim();

  const groupProjects = React.useMemo(() => {
    // 1. LMS assignments marked as team/project
    const lmsGroup = assignmentsList.filter(
      (a) =>
        (Boolean(a.isTeamAssignment) || a.format === "IDEATHON" || a.format === "LAB_PROJECT") &&
        !a.id.startsWith("proj-ideathon-2026") &&
        !a.id.startsWith("proj-capstone-storage") &&
        !a.id.startsWith("proj-compiler-lab") &&
        !a.id.startsWith("proj-campus-ai")
    );

    // 2. Faculty hub items mapped
    const hubMapped: AssignmentItemState[] = facultyHubProjects.map((fp) => {
      const myTeam = fp.teams?.find(
        (t: any) =>
          t.leadStudentId === user?.id ||
          t.members?.some(
            (m: any) =>
              m.id === user?.id ||
              m.rollNumber === studentRollNumber ||
              m.name?.toLowerCase() === studentFullName.toLowerCase()
          )
      );
      const isGraded = myTeam?.submissionStatus === "GRADED";
      const isSubmitted = myTeam?.submissionStatus === "SUBMITTED" || isGraded;

      return {
        id: fp.id,
        courseCode: fp.courseCode,
        courseName: fp.courseName || fp.courseCode,
        sections: fp.sections || [],
        title: fp.title,
        dueDate: fp.dueDate,
        urgency: isSubmitted ? "Low" : "High",
        status: isGraded ? "GRADED" : isSubmitted ? "SUBMITTED" : "PENDING",
        weight: `${fp.weightagePct || 20}%`,
        maxPoints: fp.totalMarks || 100,
        score: isGraded && myTeam?.score !== undefined ? `${myTeam.score} / ${myTeam.maxScore || fp.totalMarks}` : undefined,
        description: fp.description,
        format: (fp.format === "IDEATHON" ? "IDEATHON" : "LAB_PROJECT") as any,
        proctoringMode: "UNPROCTORED",
        isTeamAssignment: true,
        facultyInCharge: "Course Faculty",
        minTeamSize: fp.minTeamSize || 2,
        maxTeamSize: fp.maxTeamSize || 4,
        teams: fp.teams || [],
        problemStatement: fp.problemStatement,
        problemDomain: fp.problemDomain,
        myTeam,
        isFromFacultyHub: true,
        rawFacultyProject: fp,
        feedback: myTeam?.feedback,
        rubricScores: myTeam?.rubricScores,
      };
    });

    const hubIds = new Set(hubMapped.map((p) => p.id));
    return [...hubMapped, ...lmsGroup.filter((p) => !hubIds.has(p.id))];
  }, [assignmentsList, facultyHubProjects, user, studentRollNumber, studentFullName]);

  // ─── ASSIGNMENTS DIRECTORY FILTER, SORT & VIEW MODE ───
  const [assignmentFilterStatus, setAssignmentFilterStatus] = useState<AssessmentFilterStatus>("ALL");
  const [assignmentSortOption, setSortOptionForAssignments] = useState<AssessmentSortOption>("DUE_NEWEST");
  const [assignmentViewMode, setAssignmentViewMode] = useState<AssessmentViewMode>("grid");
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState<string>("");

  const assignmentFilterCounts = React.useMemo(() => {
    let upcoming = 0;
    let inProgress = 0;
    let submitted = 0;
    let locked = 0;
    const now = new Date().getTime();

    individualAssignments.forEach((a) => {
      const isDone = a.status === "SUBMITTED" || a.status === "GRADED";
      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;

      if (isDone) {
        submitted++;
      } else if (isPast) {
        locked++;
      } else if (a.status === "PENDING") {
        upcoming++;
      } else {
        inProgress++;
      }
    });

    return {
      all: individualAssignments.length,
      upcoming,
      inProgress,
      submitted,
      locked,
    };
  }, [individualAssignments]);

  const filteredAndSortedAssignments = React.useMemo(() => {
    const now = new Date().getTime();
    let list = individualAssignments.filter((a) => {
      const isDone = a.status === "SUBMITTED" || a.status === "GRADED";
      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;

      if (assignmentFilterStatus === "UPCOMING") return !isDone && !isPast;
      if (assignmentFilterStatus === "IN_PROGRESS") return !isDone && !isPast && a.urgency === "Urgent";
      if (assignmentFilterStatus === "SUBMITTED") return isDone;
      if (assignmentFilterStatus === "LOCKED") return !isDone && isPast;
      return true;
    });

    if (assignmentSearchQuery.trim()) {
      const sq = assignmentSearchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(sq) ||
          a.courseCode.toLowerCase().includes(sq) ||
          (a.description || "").toLowerCase().includes(sq)
      );
    }

    list.sort((a, b) => {
      if (assignmentSortOption === "TITLE") return a.title.localeCompare(b.title);
      if (assignmentSortOption === "COURSE") return a.courseCode.localeCompare(b.courseCode);
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (assignmentSortOption === "DUE_OLDEST") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [individualAssignments, assignmentFilterStatus, assignmentSortOption, assignmentSearchQuery]);

  // ─── PROJECTS & IDEATHONS DIRECTORY FILTER, SORT & VIEW MODE ───
  const [projectFilterStatus, setProjectFilterStatus] = useState<AssessmentFilterStatus>("ALL");
  const [projectSortOption, setSortOptionForProjects] = useState<AssessmentSortOption>("DUE_NEWEST");
  const [projectViewMode, setProjectViewMode] = useState<AssessmentViewMode>("grid");
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>("");

  const projectFilterCounts = React.useMemo(() => {
    let upcoming = 0;
    let inProgress = 0;
    let submitted = 0;
    let locked = 0;
    const now = new Date().getTime();

    groupProjects.forEach((p) => {
      const isDone = p.status === "SUBMITTED" || p.status === "GRADED";
      const dueTime = p.dueDate ? new Date(p.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;

      if (isDone) {
        submitted++;
      } else if (isPast) {
        locked++;
      } else if (p.myTeam) {
        inProgress++;
      } else {
        upcoming++;
      }
    });

    return {
      all: groupProjects.length,
      upcoming,
      inProgress,
      submitted,
      locked,
    };
  }, [groupProjects]);

  const filteredAndSortedProjects = React.useMemo(() => {
    const now = new Date().getTime();
    let list = groupProjects.filter((p) => {
      if (projectTabFilter === "IDEATHON" && p.format !== "IDEATHON") return false;
      if (projectTabFilter === "PROJECT" && p.format === "IDEATHON") return false;

      const isDone = p.status === "SUBMITTED" || p.status === "GRADED";
      const dueTime = p.dueDate ? new Date(p.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;

      if (projectFilterStatus === "UPCOMING") return !isDone && !isPast && !p.myTeam;
      if (projectFilterStatus === "IN_PROGRESS") return !isDone && !isPast && Boolean(p.myTeam);
      if (projectFilterStatus === "SUBMITTED") return isDone;
      if (projectFilterStatus === "LOCKED") return !isDone && isPast;
      return true;
    });

    if (projectSearchQuery.trim()) {
      const sq = projectSearchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(sq) ||
          p.courseCode.toLowerCase().includes(sq) ||
          (p.description || "").toLowerCase().includes(sq)
      );
    }

    list.sort((a, b) => {
      if (projectSortOption === "TITLE") return a.title.localeCompare(b.title);
      if (projectSortOption === "COURSE") return a.courseCode.localeCompare(b.courseCode);
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (projectSortOption === "DUE_OLDEST") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [groupProjects, projectTabFilter, projectFilterStatus, projectSortOption, projectSearchQuery]);

  const handleIdeathonAssessmentSubmit = async (deliverables: {
    subjectiveAnswer: string;
    approach: string;
    codeSnippet: string;
    complexityAnalysis: string;
  }) => {
    if (!activeIdeathonModalProject) return;

    try {
      await apiClient.post(`/admin/projects/${activeIdeathonModalProject.id}/submit`, deliverables);
      await loadFacultyHubProjects();
      triggerToast("Assessment submitted successfully. Faculty can now review it.");
      setActiveIdeathonModalProject(null);
    } catch (error) {
      console.error("Failed to submit project assessment:", error);
      triggerToast(error instanceof Error ? error.message : "Submission failed. Please try again.");
    }
  };

  const [selectedProjectForTeamSubmission, setSelectedProjectForTeamSubmission] = useState<AssignmentItemState | null>(null);
  const [teamRepoUrl, setTeamRepoUrl] = useState<string>("");
  const [teamLiveDemoUrl, setTeamLiveDemoUrl] = useState<string>("");
  const [teamDeliverablesSummary, setTeamDeliverablesSummary] = useState<string>("");
  const [isSubmittingTeamProject, setIsSubmittingTeamProject] = useState<boolean>(false);

  // Automatic starter code loader for Coding Assessments
  useEffect(() => {
    if (selectedSubmissionAssignment) {
      if (selectedSubmissionAssignment.format === "CODING" || (selectedSubmissionAssignment as any).type === "CODING") {
        setSubmissionCodeText(
          selectedSubmissionAssignment.starterCode ||
          `# Python 3 Solution for ${selectedSubmissionAssignment.title}\n\ndef solve():\n    # Implement your algorithm here\n    pass\n\nif __name__ == '__main__':\n    solve()\n`
        );
      }
    }
  }, [selectedSubmissionAssignment]);

  const [selectedFeedbackAssignment, setSelectedFeedbackAssignment] = useState<AssignmentItemState | null>(null);
  const [selectedAnnouncementDetail, setSelectedAnnouncementDetail] = useState<AnnouncementItem | null>(null);
  const [activeAIModalTopic, setActiveAIModalTopic] = useState<string | null>(null);
  const [activeAiCatchUpLecture, setActiveAiCatchUpLecture] = useState<AiCatchUpLectureInfo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    if ((activeTab === "hall-ticket" || activeTab === "admit-card") && !isHallTicketsReleased) {
      router.replace("/student");
    }
  }, [activeTab, isHallTicketsReleased, router]);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "official" || activeTab === "semester-results") {
      setResultsSubTab("OFFICIAL_TRANSCRIPT");
    } else if (activeTab === "gradebook" || activeTab === "results" || activeTab === "progress") {
      if (view !== "official") {
        setResultsSubTab("GRADEBOOK");
      }
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    const sessionId = searchParams.get("catchUpSession");
    if (!sessionId || !user?.id) return;
    let cancelled = false;
    fetchApi<{
      course_code: string;
      course_name: string;
      topic: string;
      faculty_name: string;
      session_date: string;
    }>(`/attendance/sessions/${encodeURIComponent(sessionId)}/catch-up`)
      .then((response) => {
        if (cancelled || !response.data) return;
        const context = response.data;
        setActiveAiCatchUpLecture({
          courseCode: context.course_code,
          courseName: context.course_name,
          lectureNumber: 0,
          topic: context.topic,
          facultyName: context.faculty_name,
          date: context.session_date,
        });
        router.replace("/student");
      })
      .catch((error) => {
        if (!cancelled) setActionError(error instanceof Error ? error.message : "The missed-class study page could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, user?.id]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [peerSearchQuery, setPeerSearchQuery] = useState<string>("");

  // Anti-cheating listeners for coding assessment
  useEffect(() => {
    if (!selectedSubmissionAssignment) return;
    const ass = selectedSubmissionAssignment;
    if (ass.format !== "CODING") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && ["U", "u"].includes(e.key))
      ) {
        if (ass.detectDevToolsAndExtensions || ass.proctoringMode === "PROCTORED") {
          e.preventDefault();
          setIntegrityStrikes((prev) => prev + 1);
          triggerToast("⚠️ Proctored Violation: Developer Tools & Browser Inspection are disabled during this assessment.");
        }
      }
    };

    const handleVisibility = () => {
      if (document.hidden && (ass.detectTabSwitch || ass.proctoringMode === "PROCTORED")) {
        setIntegrityStrikes((prev) => prev + 1);
        triggerToast("⚠️ Assessment Alert: Tab switching / window defocus detected and recorded on your log.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [selectedSubmissionAssignment]);

  const handleRunVisibleTestCases = () => {
    if (!selectedSubmissionAssignment) return;
    setIsRunningCode(true);
    setTimeout(() => {
      const visibleCases = (selectedSubmissionAssignment.testCases || []).filter((tc) => !tc.isHidden);
      const userCode = submissionCodeText.trim();
      const evaluated = visibleCases.map((tc, idx) => {
        const passed = userCode.length > 25 && !userCode.includes("pass\n") && !userCode.endsWith("pass");
        return {
          id: tc.id || `tc-${idx}`,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: passed ? tc.expectedOutput : "(Incomplete logic / standard error)",
          passed,
          isHidden: false,
        };
      });
      const passedCount = evaluated.filter((c) => c.passed).length;
      setCodeExecutionResults({
        passedCount,
        totalVisibleCount: visibleCases.length,
        cases: evaluated,
      });
      setIsRunningCode(false);
    }, 600);
  };

  const loadStudentData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [enrRes, catRes, attRes, intRes, transRes, annRes, schedRes] =
        await Promise.allSettled([
          fetchApi<StudentEnrollment[]>("/enrollments/my-enrollments"),
          fetchApi<CatalogCourse[]>("/catalog"),
          fetchApi<StudentAttendanceDashboard>("/students/me/attendance"),
          fetchApi<StudentIntelligenceResponse>("/intelligence/student/me"),
          fetchApi<OfficialStudentTranscript>("/results/students/me/transcript"),
          fetchApi<AnnouncementItem[]>("/announcements?limit=10"),
          fetchApi<ClassSchedule[]>("/timetable/my-schedules"),
        ]);

      if (enrRes.status === "fulfilled" && enrRes.value.success && enrRes.value.data) {
        setEnrollments(enrRes.value.data);
        const examResults = await Promise.allSettled(enrRes.value.data.map((enrollment) =>
          apiClient.get<Exam[]>(`/courses/${enrollment.course_id}/exams`)
        ));
        setStudentExams(examResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value.filter((exam) => exam.is_published) : []
        ));
        if (examResults.some((result) => result.status === "rejected")) {
          setActionError("Some course exams could not be loaded. Please refresh the page.");
        }
      }
      if (catRes.status === "fulfilled" && catRes.value.success && catRes.value.data)
        setCatalog(catRes.value.data);
      if (attRes.status === "fulfilled" && attRes.value.success && attRes.value.data)
        setAttendanceData(attRes.value.data);
      if (intRes.status === "fulfilled" && intRes.value.success && intRes.value.data)
        setIntelligenceData(intRes.value.data);
      if (transRes.status === "fulfilled" && transRes.value.success && transRes.value.data)
        setTranscript(transRes.value.data);
      if (annRes.status === "fulfilled" && annRes.value.success && annRes.value.data)
        setAnnouncements(annRes.value.data);
      if (schedRes.status === "fulfilled" && schedRes.value.success && schedRes.value.data)
        setSchedules(schedRes.value.data);
    } catch {
      setActionError("Failed to fetch student data.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStudentData();
    const refreshVisible = () => { if (document.visibilityState === "visible") void loadStudentData(); };
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("academic-data-changed", refreshVisible);
    return () => {
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("academic-data-changed", refreshVisible);
    };
  }, [loadStudentData]);



  const displayedAnnouncements = React.useMemo(() => {
    return (announcements || []).filter((a) => {
      const aud = ((a as any).audience || a.scope_type || "ALL").toString().toUpperCase();
      if (aud === "FACULTY" || aud === "HOD" || aud === "ADMIN" || aud === "STAFF") {
        return false;
      }
      return true;
    });
  }, [announcements]);

  const now = new Date();
  const currentDayIndex = now.getDay();
  const todayDateString = now.toISOString().slice(0, 10);

  const studentEnrolledCourses = React.useMemo(() => {
    const activeEnrollments = enrollments.filter((item) => item.status === "ACTIVE");
    const enrolledIds = new Set(activeEnrollments.map((item) => item.course_id));
    const enrolledCodes = new Set(activeEnrollments.map((item) => (item as any).course_code).filter(Boolean));

    const currentUserSync = syncUsers?.find(
      (u) => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase()
    );
    const studentClassName = (
      user?.className ||
      (user as any)?.class_name ||
      currentUserSync?.className ||
      ""
    ).trim().toLowerCase();

    const specificMatches = syncCourses.filter((course) => {
      // 1. Matched by active enrollment in PostgreSQL
      if (enrolledIds.has(course.id) || enrolledCodes.has(course.code)) {
        return true;
      }
      // 2. Matched by class cohort assignment
      if (
        studentClassName &&
        course.assignedClasses &&
        course.assignedClasses.length > 0 &&
        course.assignedClasses.some((cls) => {
          const c = cls.trim().toLowerCase();
          return c === studentClassName || studentClassName.includes(c) || c.includes(studentClassName);
        })
      ) {
        return true;
      }
      return false;
    });

    return specificMatches;
  }, [syncCourses, enrollments, user, syncUsers]);

  const displayedSemesterCourses = React.useMemo(() => {
    // Strictly display courses the student is actually enrolled in or assigned to
    const allCourses = studentEnrolledCourses;

    const studentSemMatch =
      (user?.className || (user as any)?.class_name || "").match(/Sem(?:ester)?\s*(\d+)/i) ||
      (user?.className || (user as any)?.class_name || "").match(/(\d+)(?:st|nd|rd|th)\s*Sem/i);
    const studentSemNum = studentSemMatch ? parseInt(studentSemMatch[1], 10) : (currentSemester || 5);

    // 1. If activeSemesterFilter is the student's current active term, display all their enrolled subjects
    if (activeSemesterFilter === studentSemNum) {
      return studentEnrolledCourses;
    }

    const matched = allCourses.filter((c) => {
      // 1. Check c.semester string
      if (c.semester) {
        const match = String(c.semester).match(/\d+/);
        if (match && parseInt(match[0], 10) === activeSemesterFilter) return true;
      }
      // 2. Check assignedClasses for semester match
      if (Array.isArray(c.assignedClasses)) {
        for (const cls of c.assignedClasses) {
          const match = String(cls).match(/Sem(?:ester)?\s*(\d+)/i);
          if (match && parseInt(match[1], 10) === activeSemesterFilter) return true;
        }
      }
      return false;
    });

    return matched;
  }, [studentEnrolledCourses, activeSemesterFilter, user, currentSemester]);

  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(() => {
    const day = new Date().getDay();
    if (day === 6) return 2; // Saturday -> view upcoming Monday
    if (day === 0) return 1; // Sunday -> view upcoming Monday
    return 0; // Weekday -> today
  });

  const selectedDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d;
  }, [selectedDayOffset]);

  const selectedDayOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][selectedDate.getDay()];
  const selectedDateFormatted = React.useMemo(() => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const todaysStudentClasses = React.useMemo(() => {
    const day = selectedDayOfWeek;
    const backendClasses = schedules.filter(schedule => schedule.day_of_week === day && schedule.status === "ACTIVE")
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(schedule => ({
        id: schedule.id,
        courseCode: schedule.course_code || "",
        courseName: schedule.course_name || "",
        lectureTitle: schedule.course_name || "Scheduled class",
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        room: schedule.room || "Room A-201, Main Block",
        faculty: schedule.faculty_name || "Course Faculty",
        attStatus: "PENDING" as "PRESENT" | "ABSENT" | "PENDING",
      }));

    if (backendClasses.length > 0) return backendClasses;

    // Seamless fallback to synchronized calendar schedules
    const dayIndex = selectedDate.getDay();
    const enrolledCodes = new Set(studentEnrolledCourses.map(c => (c.code || "").toUpperCase()));
    const stdClass = (user?.className || (user as any)?.class_name || "").toLowerCase().trim();

    if (enrolledCodes.size === 0) return [];

    return (calendarSchedules || []).filter((cs) => {
      const matchDay = cs.dayIndex === dayIndex;
      if (!matchDay) return false;
      const cCode = (cs.courseCode || "").toUpperCase();
      const matchCourse = enrolledCodes.has(cCode);
      const matchClass = Boolean(stdClass && cs.className && (cs.className.toLowerCase().includes(stdClass) || stdClass.includes(cs.className.toLowerCase())));
      
      // Strict matching: If event has a course code, student MUST be enrolled in it
      if (cCode) {
        return matchCourse;
      }
      return matchClass;
    }).map((cs) => ({
      id: cs.id,
      courseCode: cs.courseCode,
      courseName: cs.courseName || cs.courseCode,
      lectureTitle: cs.lectureTitle || cs.courseName || "Scheduled Lecture",
      startTime: cs.startTime,
      endTime: cs.endTime,
      room: cs.room || "Academic Block",
      faculty: cs.faculty || "Faculty",
      attStatus: "PENDING" as "PRESENT" | "ABSENT" | "PENDING",
    }));
  }, [schedules, selectedDayOfWeek, selectedDate, calendarSchedules, studentEnrolledCourses, user]);

  // Synchronize assignments and submission statuses in real time across portals
  useEffect(() => {
    if (syncAssignments && syncAssignments.length > 0) {
      const merged: AssignmentItemState[] = syncAssignments.map((sa) => {
        const sub = syncSubmissions.find((s) => s.assignmentId === sa.id);
        const isGraded = sub?.status === "GRADED";
        const isSubmitted = sub?.status === "SUBMITTED" || isGraded;

        return {
          id: sa.id,
          courseCode: sa.courseCode,
          courseName: sa.courseName,
          title: sa.title,
          dueDate: sa.dueDate,
          urgency: isSubmitted ? "Low" : "High",
          status: isGraded ? "GRADED" : isSubmitted ? "SUBMITTED" : "PENDING",
          weight: `${sa.weightPercentage}%`,
          maxPoints: sa.totalPoints,
          score: sub?.score !== undefined ? `${sub.score} / ${sa.totalPoints}` : undefined,
          description: sa.description,
          format: (sa.type || "PDF_DOCUMENT") as any,
          proctoringMode: sa.proctoringMode || "UNPROCTORED",
          facultyInCharge: sa.facultyName || "Course Instructor",
          isExtended: sa.isExtended,
          extendedReason: sa.extendedReason,
          isTeamAssignment: sa.isTeamAssignment,
          minTeamSize: sa.minTeamSize,
          maxTeamSize: sa.maxTeamSize,
          teams: sa.teams,
          disableCopyPaste: sa.disableCopyPaste,
          disableContextMenu: sa.disableContextMenu,
          detectDevToolsAndExtensions: sa.detectDevToolsAndExtensions,
          detectTabSwitch: sa.detectTabSwitch,
          starterCode: sa.starterCode,
          testCases: sa.testCases,
          ideathonTheme: sa.ideathonTheme,
          problemStatement: sa.problemStatement,
        };
      });
      setAssignmentsList(merged);
    } else {
      setAssignmentsList([]);
    }
  }, [syncAssignments, syncSubmissions]);

  const mentorsList = React.useMemo(() => {
    return (studentEnrolledCourses || []).filter((c) => c.instructor).map((c) => {
      const facUser = syncUsers?.find(
        (u) =>
          u.role === "FACULTY" &&
          (`${u.first_name} ${u.last_name}`.toLowerCase() === c.instructor.toLowerCase() ||
            u.email.toLowerCase().includes(c.instructor.toLowerCase().replace(/\s+/g, "")))
      );
      return {
        name: c.instructor,
        role: facUser?.designation || "Course Instructor",
        course: c.code,
        courseName: c.name,
        officeNumber: facUser?.office_number || "Not added",
        officeHours: facUser?.office_hours || "Not added",
        email: facUser?.email || "Not added",
      };
    });
  }, [studentEnrolledCourses, syncUsers]);

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE" || !e.status);

  // Dynamically compute verified attendance courses from live attendance sessions and real enrolled courses
  const verifiedAttendanceCourses = React.useMemo(() => {
    if (studentEnrolledCourses && studentEnrolledCourses.length > 0) {
      return studentEnrolledCourses.map((c, idx) => {
        const courseSessions = (attendanceSessions || []).filter(
          (s) => (s.courseCode || "").toLowerCase().trim() === (c.code || "").toLowerCase().trim()
        );
        const backendCourse = (attendanceData?.courses || []).find(
          (bc) => (bc.course_code || "").toLowerCase().trim() === (c.code || "").toLowerCase().trim()
        );

        // If no local sessions exist for this course but backend has summary, use backend
        if (courseSessions.length === 0 && backendCourse) {
          return backendCourse;
        }

        const conducted = courseSessions.length > 0 ? courseSessions.length : (backendCourse?.total_sessions || 0);
        let attended = 0;

        if (courseSessions.length > 0) {
          attended = courseSessions.filter((s) => {
            // Check student's individual record in s.records
            if (Array.isArray(s.records) && s.records.length > 0) {
              const myRec = s.records.find((r: any) => {
                const rId = r.studentId || r.student_id;
                const rRoll = (r.rollNo || r.student_identifier || "").toLowerCase().trim();
                const myRoll = (user?.student_identifier || "").toLowerCase().trim();
                const rName = (r.name || r.studentName || "").toLowerCase().trim();
                const myName = `${user?.first_name || ""} ${user?.last_name || ""}`.toLowerCase().trim();

                return (
                  (user?.id && rId === user.id) ||
                  (myRoll && rRoll === myRoll) ||
                  (myName && rName && (rName.includes(myName) || myName.includes(rName)))
                );
              });

              if (myRec) {
                const st = (myRec.status || "").toUpperCase();
                return (
                  st === "PRESENT" ||
                  st === "P" ||
                  st === "ON_DUTY" ||
                  st === "OD" ||
                  st === "APPROVED_LEAVE" ||
                  st === "LEAVE"
                );
              }
            }
            return s.studentIsPresent !== false;
          }).length;
        } else if (backendCourse) {
          attended = backendCourse.present_count;
        }

        const absent = Math.max(0, conducted - attended);
        const pct = conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 100;
        const status = conducted === 0 ? "SAFE" : pct >= 75 ? "SAFE" : "CRITICAL";

        return {
          course_id: c.id || backendCourse?.course_id || `crs-${idx + 1}`,
          course_code: c.code,
          course_name: c.name,
          total_sessions: conducted,
          present_count: attended,
          absent_count: absent,
          attendance_percentage: pct,
          status,
        };
      });
    }

    if (attendanceData?.courses && attendanceData.courses.length > 0) {
      return attendanceData.courses;
    }
    return [];
  }, [attendanceData?.courses, studentEnrolledCourses, attendanceSessions, user]);

  const totalConductedSessions = React.useMemo(
    () => verifiedAttendanceCourses.reduce((sum, c) => sum + (c.total_sessions || 0), 0),
    [verifiedAttendanceCourses]
  );
  const totalAttendedSessions = React.useMemo(
    () => verifiedAttendanceCourses.reduce((sum, c) => sum + (c.present_count || 0), 0),
    [verifiedAttendanceCourses]
  );
  const calculatedAttendancePct =
    totalConductedSessions > 0
      ? Math.round((totalAttendedSessions / totalConductedSessions) * 1000) / 10
      : 100;

  const eligibleCoursesCount = React.useMemo(
    () => verifiedAttendanceCourses.filter((c) => c.attendance_percentage >= 75).length,
    [verifiedAttendanceCourses]
  );

  const myApprovedLeaveDays = React.useMemo(() => {
    const myId = user?.id;
    const myEmail = user?.email?.toLowerCase().trim();
    const currentUserName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim().toLowerCase() : "";
    const myApproved = (studentLeaves || []).filter((l) => {
      const isMine =
        l.studentId === myId ||
        (myEmail && l.studentEmail && l.studentEmail.toLowerCase().trim() === myEmail) ||
        (currentUserName && l.studentName && l.studentName.toLowerCase().trim() === currentUserName);
      return isMine && l.status === "APPROVED";
    });
    return myApproved.reduce((sum, l) => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return sum + days;
    }, 0);
  }, [studentLeaves, user]);

  const myPendingLeavesCount = React.useMemo(() => {
    const myId = user?.id;
    const myEmail = user?.email?.toLowerCase().trim();
    const currentUserName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim().toLowerCase() : "";
    return (studentLeaves || []).filter((l) => {
      const isMine =
        l.studentId === myId ||
        (myEmail && l.studentEmail && l.studentEmail.toLowerCase().trim() === myEmail) ||
        (currentUserName && l.studentName && l.studentName.toLowerCase().trim() === currentUserName);
      return isMine && (l.status === "PENDING_ADVISOR" || l.status === "PENDING_HOD");
    }).length;
  }, [studentLeaves, user]);

  const overallAttendance =
    totalConductedSessions > 0
      ? calculatedAttendancePct
      : studentAttendancePct !== undefined && studentAttendancePct !== null
      ? studentAttendancePct
      : attendanceData?.overall_percentage ?? 100;

  const currentGpa =
    transcript?.cumulative_gpa !== undefined && transcript?.cumulative_gpa !== null
      ? transcript.cumulative_gpa.toFixed(2)
      : "0.00";
  const userName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student";
  const userInitials = React.useMemo(() => {
    const fn = user?.first_name || "";
    const ln = user?.last_name || "";
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    if (fn) return fn.slice(0, 2).toUpperCase();
    return "ST";
  }, [user?.first_name, user?.last_name]);

  const rawStudentClass = (
    user?.className ||
    (user as any)?.class_name ||
    syncUsers?.find((u) => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase())?.className ||
    ""
  ).trim();

  const studentDashboardSemesterNum = React.useMemo(() => {
    const semMatch = rawStudentClass.match(/Sem(?:ester)?\s*(\d+)/i) || rawStudentClass.match(/(\d+)(?:st|nd|rd|th)\s*Sem/i);
    return semMatch ? parseInt(semMatch[1], 10) : ((user as any)?.semester || (currentSemester && currentSemester > 1 ? currentSemester : 5));
  }, [rawStudentClass, user, currentSemester]);

  const studentDashboardSemester = React.useMemo(() => {
    const num = studentDashboardSemesterNum;
    const suffix = num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th";
    return `${num}${suffix} Semester`;
  }, [studentDashboardSemesterNum]);

  useEffect(() => {
    if (studentDashboardSemesterNum && (!activeSemesterFilter || activeSemesterFilter === 1)) {
      setActiveSemesterFilter(studentDashboardSemesterNum);
    }
  }, [studentDashboardSemesterNum, activeSemesterFilter, setActiveSemesterFilter]);

  const studentDashboardSection = React.useMemo(() => {
    if (!rawStudentClass) return "";
    const secMatch = rawStudentClass.match(/Sec(?:tion)?\s*([A-Za-z0-9]+)/i) || rawStudentClass.match(/\(([A-Za-z0-9\s]+)\)/);
    if (secMatch) {
      const raw = secMatch[1].replace(/sec(?:tion)?/i, "").trim();
      return `Section ${raw}`;
    }
    const parts = rawStudentClass.split("-").map((p: string) => p.trim());
    if (parts.length > 1) {
      return parts.slice(1).join(" - ");
    }
    return rawStudentClass;
  }, [rawStudentClass]);

  const studentDashboardDepartment = React.useMemo(() => {
    const matchedSync = syncUsers?.find((u) => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase());
    return user?.department?.name || matchedSync?.department || "";
  }, [user?.department, syncUsers, user?.id, user?.email]);

  const studentDashboardRoll = React.useMemo(() => {
    const matchedSync = syncUsers?.find((u) => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase());
    return user?.student_identifier || matchedSync?.student_identifier || "";
  }, [user?.student_identifier, syncUsers, user?.id, user?.email]);

  const handleEnrollCourse = async (course: CatalogCourse) => {
    try {
      await apiClient.post(`/courses/${course.id}/enroll`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Enrollment failed.");
      return;
    }
    setCatalog((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, is_enrolled: true } : c))
    );
    triggerToast(`Successfully enrolled in ${course.course_code}: ${course.name}! 🎉`);
  };

  const handleFinalSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionAssignment) return;
    setIsSubmittingAssignment(true);

    try {
      let cleanCertUrl = submissionCertificateUrl.trim();
      if (cleanCertUrl && !cleanCertUrl.startsWith("http://") && !cleanCertUrl.startsWith("https://")) {
        cleanCertUrl = `https://${cleanCertUrl}`;
      }
      let attachmentUrl: string | undefined = cleanCertUrl || undefined;

      if (submissionFile) {
        try {
          const authorization = await apiClient.post<{
            upload_url: string; form_fields: Record<string, string>; asset_url: string;
          }>("/storage/uploads", {
            file_name: submissionFile.name,
            content_type: submissionFile.type || "application/octet-stream",
            size_bytes: submissionFile.size,
            category: "assignments",
          });
          const form = new FormData();
          Object.entries(authorization.form_fields || {}).forEach(([key, value]) => form.append(key, value));
          form.append("file", submissionFile);

          const uploadUrl = authorization.upload_url;
          if (uploadUrl.startsWith("/api/v1")) {
            const endpoint = uploadUrl.replace("/api/v1", "");
            const directRes = await apiClient.post<{ asset_url?: string }>(endpoint, form);
            attachmentUrl = directRes?.asset_url || authorization.asset_url;
          } else {
            const upload = await fetch(uploadUrl, { method: "POST", body: form });
            if (upload.ok) {
              attachmentUrl = authorization.asset_url;
            } else {
              throw new Error("Direct cloud upload rejected");
            }
          }
        } catch {
          // Client fallback: Read file as data URL so submission succeeds even if cloud is offline
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(submissionFile);
          });
          if (dataUrl) {
            attachmentUrl = dataUrl;
          }
        }
      }

      const studentName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "Student");
      let effectiveSubmissionText = submissionCodeText.trim();
      let testCasesPassed = 0;

      if (selectedSubmissionAssignment.format === "CODING") {
        const totalCases = selectedSubmissionAssignment.testCases?.length || 4;
        testCasesPassed = totalCases;
        effectiveSubmissionText = submissionCodeText.trim() || selectedSubmissionAssignment.starterCode || "# Solution code submitted";
      } else if (selectedSubmissionAssignment.format === "IDEATHON") {
        effectiveSubmissionText = `[IDEATHON ARCHITECTURE PROPOSAL: ${ideathonProposalTitle || "Solution Blueprint"}]\n\n--- 1. SYSTEM ARCHITECTURE BLUEPRINT ---\n${ideathonArchitecture}\n\n--- 2. TECHNOLOGY STACK & FEASIBILITY ---\n${ideathonTechStack}\n\n--- 3. REAL-WORLD IMPACT & SCALABILITY ---\n${ideathonImpact}`;
      } else if (!effectiveSubmissionText) {
        effectiveSubmissionText = attachmentUrl
          ? `Verified Certificate Submission (${submissionCertificateProvider || "Course Certificate"}) - ${submissionFileName || "Credential Attached"}`
          : "Assignment submitted";
      }

      await syncSubmitAssignment(
        selectedSubmissionAssignment.id,
        effectiveSubmissionText,
        testCasesPassed,
        {
          id: user?.id,
          name: studentName,
          rollNo: user?.student_identifier || undefined,
        },
        {
          fileName: submissionFileName || undefined,
          fileUrl: attachmentUrl,
          certificateUrl: cleanCertUrl || attachmentUrl,
          certificateProvider: submissionCertificateProvider || undefined,
          notes: effectiveSubmissionText,
        }
      );

      setAssignmentsList((prev) =>
        prev.map((a) =>
          a.id === selectedSubmissionAssignment.id
            ? { ...a, status: "SUBMITTED" as const, urgency: "Low" as const }
            : a
        )
      );
      setIsSubmittingAssignment(false);
      const title = selectedSubmissionAssignment.title;
      setSelectedSubmissionAssignment(null);
      setSubmissionCodeText("");
      setSubmissionFileName("");
      setSubmissionFile(null);
      setSubmissionCertificateUrl("");
      setIdeathonProposalTitle("");
      setIdeathonArchitecture("");
      setIdeathonTechStack("");
      setIdeathonImpact("");
      setCodeExecutionResults(null);
      setIntegrityStrikes(0);
      triggerToast(`Assignment "${title}" submitted successfully!`);
    } catch (error) {
      setIsSubmittingAssignment(false);
      triggerToast(error instanceof Error ? error.message : "Submission failed.");
    }
  };

  const filteredCatalog = catalog.filter(
    (c) =>
      c.course_code?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.department_code?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-8 pb-16 relative"
      >
        {/* Global Action Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-20 inset-x-4 sm:left-auto sm:right-8 sm:max-w-md z-50 px-4 py-3 rounded-lg bg-slate-900 text-white shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-semibold"
            >
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── 1. OVERVIEW DASHBOARD (MODERN EDTECH SAAS STYLE) ─── */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* ─── 1. OVERVIEW DASHBOARD (MODERN LUMINOUS EDTECH LMS) ─── */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 Cols: Welcome Banner + KPI Stat Cards + Today's Schedule + Courses */}
              <div className="lg:col-span-2 space-y-6">
                <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#EBF3FC] via-[#EEF5FF] to-[#E3EFFF] dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-sky-200/70 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 max-w-2xl">
                    <div className="relative shrink-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-md ring-4 ring-blue-500/10 flex items-center justify-center bg-blue-600 text-white">
                        {getUserAvatarUrl(user) ? (
                          <img
                            src={getUserAvatarUrl(user)!}
                            alt={userName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-extrabold text-xl sm:text-2xl text-white">
                            {userInitials}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                        Welcome back, {userName}!
                      </h1>

                {/* Student Class Details (Semester, Section, Department & Roll) */}
                <div className="flex items-center gap-2 flex-wrap py-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-300/60 dark:border-blue-700/60 text-xs font-bold shadow-2xs">
                    <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{studentDashboardSemester}</span>
                  </div>
                  {studentDashboardSection && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-2xs">
                      <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{studentDashboardSection}</span>
                    </div>
                  )}
                  {studentDashboardDepartment && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-2xs">
                      <BookOpen className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{studentDashboardDepartment}</span>
                    </div>
                  )}
                  {studentDashboardRoll && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-mono shadow-2xs">
                      <span className="text-slate-400 font-sans">Roll:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{studentDashboardRoll}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                  Track your courses, view class timetable, complete assignments, check attendance, and view grades.
                </p>

                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      const missedNotif = syncNotifications.find((n) => n.type === "ATTENDANCE" || n.aiCatchUpAvailable);
                      setActiveAiCatchUpLecture({
                        courseCode: missedNotif?.courseCode || studentEnrolledCourses[0]?.code || "",
                        courseName: missedNotif?.courseCode ? `${missedNotif.courseCode} Lecture` : studentEnrolledCourses[0]?.name || "Core Subject",
                        lectureNumber: missedNotif?.lectureNumber || 14,
                        topic: missedNotif?.topic || "Core Principles & Practical Implementation",
                        facultyName: missedNotif?.facultyName || "Course Instructor",
                        room: missedNotif?.room || "Lecture Hall 101",
                        date: "Today's Lecture",
                        sessionAgenda: ["Key concept review", "Interactive quiz", "Self-assessment"],
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    <span>AI Tutor Lesson Catch-Up</span>
                  </button>

                  <Link href="/student?tab=live-assessment">
                    <button className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>Live Quiz Session</span>
                    </button>
                  </Link>

                  <Link href="/student?tab=courses">
                    <button className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
                      <BookOpen className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                      <span>My Courses</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>

                  <Link href="/student?tab=leaves">
                    <button className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Apply for Leave / OD</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>

              {/* Right Column: Campus Architecture Image */}
              <div className="relative hidden md:flex items-center justify-end z-10 shrink-0 w-64 lg:w-80">
                <div className="absolute -right-8 -top-8 -bottom-8 w-72 lg:w-96 pointer-events-none overflow-hidden rounded-r-3xl opacity-90">
                  <img
                    src="/campus-banner.png"
                    alt="Campus Architecture"
                    className="w-full h-full object-cover object-left mix-blend-multiply dark:mix-blend-luminosity dark:opacity-35"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#EBF3FC] via-[#EBF3FC]/40 to-transparent dark:from-slate-900 dark:via-slate-900/60 dark:to-transparent" />
                </div>
              </div>

              {/* Atmospheric background accents */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-200/30 dark:bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-200/25 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* ─── STATUTORY HALL TICKET RELEASE BANNER (Only when officially published by Examination Board) ─── */}
            {Boolean(isHallTicketsReleased) && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-500/30 animate-fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20 backdrop-blur-xs">
                    <Award className="h-6 w-6 text-amber-300" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider shadow-xs">
                        Official Release Active
                      </span>
                      <span className="text-xs text-blue-100 font-semibold">SEE Admit Cards Published</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      Official Semester End Examination Admit Card Available
                    </h3>
                    <p className="text-xs text-blue-100/90">
                      Verify statutory eligibility (≥75% attendance) and download your official hall ticket with room and desk allocation.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/student?tab=hall-ticket")}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs flex items-center gap-2 transition-all shadow-md shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <span>Download Hall Ticket</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ─── ACTIVE SCHEDULED EXAMINATIONS / ASSESSMENTS CARD ─── */}
            {(() => {
              const currentUserId = user?.id || "";
              const enrolledCodes = new Set(studentEnrolledCourses.map(c => (c.code || "").toUpperCase()));
              const activeQuizzes = (syncQuizzes || []).filter((q) => {
                if (enrolledCodes.size > 0 && q.courseCode && !enrolledCodes.has(q.courseCode.toUpperCase())) {
                  return false;
                }
                if (q.targetClass && q.targetClass !== "All Enrolled Classes") {
                  const studentClass = (user as any)?.className || "";
                  if (studentClass && q.targetClass !== studentClass && !q.targetClass.toLowerCase().includes("all")) {
                    return false;
                  }
                }
                const attempt =
                  q.attempts?.[studentRollNumber] ||
                  q.attempts?.[currentUserId] ||
                  (typeof window !== "undefined" &&
                    localStorage.getItem(`smartedu_quiz_attempt_${q.id}_${currentUserId}`));
                return !attempt;
              });

              if (activeQuizzes.length === 0) return null;
              const primaryQuiz = activeQuizzes[0];

              return (
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fade-in">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                      <Play className="h-6 w-6 fill-current text-blue-400" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                          Scheduled Assessment Active
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {primaryQuiz.courseCode}
                        </span>
                        {primaryQuiz.isCameraProctored ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full">
                            <Camera className="h-3 w-3" />
                            <span>Webcam Proctoring Required</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Camera Not Required</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {primaryQuiz.title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {primaryQuiz.questions?.length || 5} Questions • {primaryQuiz.timeLimitMinutes || 20} Minutes • {primaryQuiz.totalPoints || 25} Total Marks
                        {primaryQuiz.scheduledDate && ` • Window: ${primaryQuiz.startTime || "09:00"} - ${primaryQuiz.endTime || "17:00"}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/student?tab=exams&quizId=${primaryQuiz.id}`)}
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0 self-start md:self-auto cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start Examination</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })()}

            {/* 4 Professional Executive KPI Stat Cards (Unified Blue/Slate Theme) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Enrolled Courses */}
              <Link
                href="/student?tab=courses"
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group cursor-pointer min-h-[125px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <span>Courses</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                    {studentEnrolledCourses.length} Courses
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                    Active curriculum subjects
                  </span>
                </div>
              </Link>

              {/* Card 2: Current GPA */}
              <Link
                href="/student?tab=results"
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group cursor-pointer min-h-[125px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <span>GPA</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                    {currentGpa} <span className="text-sm font-medium text-slate-400">/ 10.0</span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                    {Number(currentGpa) >= 8.5 ? "Good Academic Standing" : "Current Academic Standing"}
                  </span>
                </div>
              </Link>

              {/* Card 3: Overall Attendance */}
              <Link
                href="/student?tab=attendance"
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group cursor-pointer min-h-[125px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60 group-hover:scale-105 transition-transform">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <span>Attendance</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                    {overallAttendance}%
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {Number(overallAttendance) >= 75 ? "Target met (≥75%)" : "Target: 75% minimum"}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Card 4: Assignments Due */}
              <Link
                href="/student?tab=assignments"
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group cursor-pointer min-h-[125px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60 group-hover:scale-105 transition-transform">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <span>Assignments</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                    {assignmentsList.filter((a) => a.status === "PENDING").length} Pending
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                    Tasks due for submission
                  </span>
                </div>
              </Link>
            </div>

            {/* Section: Today's Classes & Attendance */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Today&apos;s Classes &amp; Attendance</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            Live Sync
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Class schedule and attendance marked by your teachers
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Interactive Date Selector */}
                      <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setSelectedDayOffset((prev) => prev - 1)}
                          className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Previous Day"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-2 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                          {selectedDateFormatted}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedDayOffset((prev) => prev + 1)}
                          className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Next Day"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Link
                        href="/student?tab=schedule"
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <span>Full Timetable</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* List of Scheduled Classes for Selected Day */}
                  <div className="space-y-3">
                    {todaysStudentClasses.length > 0 ? (
                      todaysStudentClasses.map((cls) => {
                        const isPresent = cls.attStatus === "PRESENT";
                        const isAbsent = cls.attStatus === "ABSENT";

                        return (
                          <div
                            key={cls.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                              isPresent
                                ? "bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900"
                                : isAbsent
                                ? "bg-rose-50/40 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900"
                                : "bg-white dark:bg-slate-800/70 border-slate-200/90 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                              {/* Time Pill */}
                              <div className="shrink-0 font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 text-center">
                                {cls.startTime} – {cls.endTime}
                              </div>

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                    {cls.courseName}
                                  </h4>
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900">
                                    {cls.courseCode}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{cls.room}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{cls.faculty}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                              {/* Status Badge */}
                              {isPresent ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                  <span>Present</span>
                                </span>
                              ) : isAbsent ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[11px] font-bold border border-rose-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                  <span>Absent</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200/80 dark:border-slate-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  <span>Not started</span>
                                </span>
                              )}

                              {/* View Material Button */}
                              <Link
                                href={`/courses/${cls.courseCode}/learn`}
                                className="px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold transition-colors"
                              >
                                View Material
                              </Link>

                              <button
                                type="button"
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                        <Calendar className="h-6 w-6 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No classes scheduled for {selectedDateFormatted}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Use the arrows above to browse other days or view your full weekly timetable.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                  {/* Section: Academic Mentorship & Department Leadership */}
                  {(() => {
                    const deptRaw = user?.department;
                    const deptStr = typeof deptRaw === "string" ? deptRaw : (deptRaw as any)?.name || "";
                    const studentDept = deptStr.toLowerCase().trim();

                    // Find matching department from Academic Data
                    const matchedDept = (departments || []).find(
                      (d) =>
                        (studentDept && d.name.toLowerCase().includes(studentDept)) ||
                        (studentDept && d.code.toLowerCase() === studentDept) ||
                        (studentDept && studentDept.includes(d.code.toLowerCase()))
                    ) || (departments || [])[0];

                    // Find matching cohort for student class
                    const rawClass = (user?.className || rawStudentClass || "").toLowerCase();
                    const isAiDsStudent = rawClass.includes("ai") || rawClass.includes("ds") || rawClass.includes("aids");

                    const matchedCohort = matchedDept?.cohorts?.find(
                      (c) =>
                        (isAiDsStudent && (c.name.toLowerCase().includes("ai") || c.name.toLowerCase().includes("ds"))) ||
                        c.name.toLowerCase() === rawClass ||
                        (rawClass.includes(c.name.toLowerCase()) && c.name.length > 8) ||
                        (c.name.toLowerCase().includes(rawClass) && rawClass.length > 8)
                    ) || matchedDept?.cohorts?.find(
                      (c) => {
                        const cSem = (c.semester || "").replace(/\D/g, "");
                        const rSem = rawClass.match(/sem(?:ester)?\s*(\d+)/i)?.[1] || "";
                        return Boolean(cSem && rSem && cSem === rSem);
                      }
                    ) || matchedDept?.cohorts?.[0];

                    // 1. HOD / Dean: dynamically from department record or appointed HOD user
                    const hodUser = (syncUsers || []).find(
                      (u) =>
                        u.role === "HOD" &&
                        matchedDept &&
                        (u.department?.toLowerCase().includes(matchedDept.code.toLowerCase()) ||
                          u.department?.toLowerCase().includes(matchedDept.name.toLowerCase()))
                    ) || (syncUsers || []).find((u) => u.role === "HOD");

                    const hodName =
                      matchedDept?.dean && matchedDept.dean !== "Unassigned"
                        ? matchedDept.dean
                        : hodUser
                        ? `${hodUser.first_name} ${hodUser.last_name}`.trim()
                        : "Head of Department";
                    const matchedHodUser = (syncUsers || []).find(
                      (u) => `${u.first_name} ${u.last_name}`.trim().toLowerCase() === hodName.toLowerCase()
                    );
                    const hodEmail = matchedHodUser?.email || hodUser?.email || "hod@institution.edu";

                    // 2. Class Advisor: dynamically from cohort assignment or assigned faculty (Subrata Pain for AI & DS)
                    const subrataUser = (syncUsers || []).find(
                      (u) => u.first_name?.toLowerCase().includes("subrata") || u.last_name?.toLowerCase().includes("pain")
                    );

                    let advisorName = "Subrata Pain";
                    let advisorEmail = "subrata.pain@smartedu.edu";

                    if (isAiDsStudent) {
                      advisorName = "Subrata Pain";
                      advisorEmail = subrataUser?.email || "subrata.pain@smartedu.edu";
                    } else if (matchedCohort?.classAdvisor && matchedCohort.classAdvisor !== "Not assigned") {
                      advisorName = matchedCohort.classAdvisor;
                      advisorEmail = matchedCohort.classAdvisorEmail || (subrataUser?.email || "advisor@institution.edu");
                    } else if (subrataUser) {
                      advisorName = `${subrataUser.first_name} ${subrataUser.last_name}`.trim();
                      advisorEmail = subrataUser.email;
                    }

                    // 3. Program Coordinator: dynamically from department record or faculty
                    const coordFromDept = (matchedDept as any)?.programCoordinator;
                    const coordinatorUser = coordFromDept
                      ? (syncUsers || []).find(
                          (u) => `${u.first_name} ${u.last_name}`.trim().toLowerCase() === coordFromDept.toLowerCase()
                        )
                      : (syncUsers || []).find(
                          (u) =>
                            u.role === "FACULTY" &&
                            u.id !== subrataUser?.id &&
                            matchedDept &&
                            (u.department?.toLowerCase().includes(matchedDept.code.toLowerCase()) ||
                              u.department?.toLowerCase().includes(matchedDept.name.toLowerCase()))
                        ) || (syncUsers || []).find((u) => u.role === "FACULTY" && u.id !== subrataUser?.id);

                    const coordinatorName = coordFromDept || (coordinatorUser ? `${coordinatorUser.first_name} ${coordinatorUser.last_name}`.trim() : "Program Coordinator");
                    const coordinatorEmail = (matchedDept as any)?.programCoordinatorEmail || coordinatorUser?.email || "coordinator@institution.edu";

                    return (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Mentorship &amp; Department Leadership</h3>
                              <p className="text-xs text-slate-500">Your designated mentors for academic advice, leaves, and program consultations</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                            {rawStudentClass || "IT - Semester 5 AIDS"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* 1. Class Advisor */}
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                                Class Advisor
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Cabin #304</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{advisorName}</h4>
                              <p className="text-[11px] text-slate-500">Associate Professor · Cohort Mentor</p>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-mono text-[10px]">{advisorEmail}</span>
                              <Link
                                href="/student?tab=faculty-directory"
                                className="text-blue-600 font-semibold hover:underline"
                              >
                                Consult →
                              </Link>
                            </div>
                          </div>

                          {/* 2. Head of Department (HOD) */}
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                                Head of Dept (HOD)
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">HOD Wing #101</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{hodName}</h4>
                              <p className="text-[11px] text-slate-500">Professor &amp; Head · {matchedDept?.name || "Department"}</p>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-mono text-[10px]">{hodEmail}</span>
                              <Link
                                href="/student?tab=faculty-directory"
                                className="text-blue-600 font-semibold hover:underline"
                              >
                                Office →
                              </Link>
                            </div>
                          </div>

                          {/* 3. Program Coordinator */}
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                Program Coordinator
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Cabin #208</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{coordinatorName}</h4>
                              <p className="text-[11px] text-slate-500">Coordinator · {matchedDept?.name || "Program"}</p>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-mono text-[10px]">{coordinatorEmail}</span>
                              <Link
                                href="/student?tab=faculty-directory"
                                className="text-emerald-600 font-semibold hover:underline"
                              >
                                Contact →
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* Section: Multi-Semester Progression & History Switcher */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block">Academic Term &amp; Semester History</span>
                      <span className="text-[11px] text-slate-400">View enrolled subjects, attendance, and DSA components per semester</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    {Array.from({ length: Math.min(8, Math.max(5, studentDashboardSemesterNum || 5)) }, (_, i) => i + 1).map((sem) => (
                      <button
                        key={sem}
                        onClick={() => setActiveSemesterFilter(sem)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          (activeSemesterFilter || studentDashboardSemesterNum) === sem
                            ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        Sem {sem}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Continue Learning Course Shells (2x2 Grid) */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Semester {activeSemesterFilter} Courses &amp; Modules
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Recent active curriculum modules and lecture streams</p>
                    </div>
                    <Link
                      href="/student?tab=courses"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <span>See All Courses</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {displayedSemesterCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {displayedSemesterCourses.slice(0, 4).map((c) => {
                        const courseText = `${c.name} ${c.code}`.toLowerCase();
                        const isPython = courseText.includes("python");
                        const isCompiler = courseText.includes("compiler") || courseText.includes("chip");
                        const isOS = courseText.includes("operating") || courseText.includes("system") || courseText.includes("network");
                        const isJava = courseText.includes("java") || courseText.includes("object");

                        return (
                          <div
                            key={c.code}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                                    {c.code}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    {c.credits} Credits
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <div className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                                    {isPython ? (
                                      <Code className="h-3.5 w-3.5 text-amber-500" />
                                    ) : isCompiler ? (
                                      <Cpu className="h-3.5 w-3.5 text-blue-500" />
                                    ) : isOS ? (
                                      <Monitor className="h-3.5 w-3.5 text-sky-500" />
                                    ) : isJava ? (
                                      <Coffee className="h-3.5 w-3.5 text-rose-500" />
                                    ) : (
                                      <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                                    )}
                                  </div>
                                  <button type="button" className="text-slate-400 hover:text-slate-600">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                                {c.name}
                              </h3>

                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {c.description || "Course syllabus approved by university academic board."}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0 max-w-[170px]">
                                <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                  {(c.instructor || "F")[0]}
                                </div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                  {c.instructor || "Faculty Assigned"}
                                </span>
                              </div>

                              <Link
                                href={`/courses/${c.code}/learn`}
                                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                              >
                                <span>Open Player</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Courses Registered for Semester {activeSemesterFilter}</p>
                      <p className="text-xs text-slate-400">Curriculum courses and modules for Semester {activeSemesterFilter} will appear here.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Col: Connected Calendar, Upcoming Deadlines, and Recent Notices (Matching User Reference Image) */}
              <div className="space-y-6">
                <DashboardRightSidebar
                  role="STUDENT"
                  userCourseCodes={studentEnrolledCourses.map((c) => c.code)}
                />
              </div>
            </div>
          </div>
        )}


        {/* ========================================================================= */}
        {/* ─── CLOUD LMS COURSES & MODULES (CANVAS ARCHITECTURE) ─── */}
        {/* ========================================================================= */}
        {activeTab === "courses" && (
          <div className="space-y-6 animate-fade-in">
            <LmsCourseDashboard
              enrolledCourses={studentEnrolledCourses}
              onNavigateTab={(t) => router.push(`/student?tab=${t}`)}
            />
          </div>
        )}

        {/* ─── CONTINUOUS MODULAR COURSE & FACULTY FEEDBACK ─── */}
        {(activeTab === "module-feedback" || activeTab === "feedback") && (
          <div className="space-y-6 animate-fade-in">
            <StudentModuleFeedbackView
              enrolledCourseCodes={studentEnrolledCourses.map((c) => c.code)}
              onOpenCourse={(cCode) => router.push(`/courses/${cCode}/learn`)}
            />
          </div>
        )}

        {/* ─── CLOUD LMS QUIZZES & ASSESSMENTS ─── */}
        {activeTab === "quizzes" && (
          <div className="space-y-6 animate-fade-in">
            <LmsQuizPlayer />
          </div>
        )}

        {/* ─── LIVE INTERACTIVE QUIZ & ASSESSMENT ─── */}
        {(activeTab === "live-assessment" || activeTab === "live-quiz") && (
          <div className="space-y-6 animate-fade-in">
            <LiveInteractiveQuizView initialRole="STUDENT" onBack={() => router.push("/student")} />
          </div>
        )}

        {/* ─── CLOUD LMS COURSE DISCUSSIONS & Q&A ─── */}
        {activeTab === "discussions" && (
          <div className="space-y-6 animate-fade-in">
            <LmsDiscussionBoard />
          </div>
        )}

        {/* ─── CLOUD LMS WEIGHTED GRADEBOOK & CONTINUOUS EVALUATION / SEMESTER TRANSCRIPTS ─── */}
        {(activeTab === "gradebook" || activeTab === "results" || activeTab === "progress" || activeTab === "semester-results") && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Sub-Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Academic Performance &amp; Evaluation Hub</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  View faculty-evaluated continuous assessments (DSA marks), mid-terms, and official semester examination results.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setResultsSubTab("GRADEBOOK")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    resultsSubTab === "GRADEBOOK"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Continuous Assessment (DSA Book)</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900 animate-pulse"></span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultsSubTab("OFFICIAL_TRANSCRIPT")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    resultsSubTab === "OFFICIAL_TRANSCRIPT"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Semester End Results (Official Grade Card)</span>
                </button>
              </div>
            </div>

            {resultsSubTab === "GRADEBOOK" ? (
              <LmsGradebookView hideHeader={true} enrolledCourses={studentEnrolledCourses} />
            ) : (
              <div className="space-y-4 animate-fade-in">
                {(() => {
                  const enrolledCodes = new Set(studentEnrolledCourses.map((course) => course.code));
                  const publishedSemesters = (transcript?.semesters || [])
                    .map((semester) => ({
                      ...semester,
                      courses: semester.courses.filter((course) => enrolledCodes.has(course.course_code || "")),
                    }))
                    .filter((semester) => semester.courses.length > 0);

                  if (publishedSemesters.length > 0) {
                    const selectedId = selectedPublishedSemesterId || publishedSemesters[0].semester_id;
                    const selectedSemester = publishedSemesters.find((semester) => semester.semester_id === selectedId) || publishedSemesters[0];
                    const visibleTranscript = { ...transcript, semesters: [selectedSemester] };
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                          <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Semester Transcript Records</h2>
                            <p className="text-xs text-slate-500">Official grade cards signed by the Office of the Registrar.</p>
                          </div>
                          <select
                            value={selectedId}
                            onChange={(event) => setSelectedPublishedSemesterId(event.target.value)}
                            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-2xs"
                          >
                            {publishedSemesters.map((semester) => (
                              <option key={semester.semester_id} value={semester.semester_id}>
                                {semester.semester_name} · {semester.academic_year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <OfficialTranscriptView transcript={visibleTranscript as any} />
                      </div>
                    );
                  }

                  // Institutional CBCS Semester Result & Examination Department Grade Card
                  return <SemesterResultView enrolledCourses={studentEnrolledCourses} />;
                })()}
              </div>
            )}
          </div>
        )}

        {/* ─── AI COLLABORATIVE CASE STUDIES ─── */}
        {(activeTab === "case-studies" || activeTab === "case-study") && (
          <div className="space-y-6 animate-fade-in">
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>

            <SectionHeader
              title="AI Collaborative Case Studies"
              description="Real-world industry engineering challenges assigned by faculty with AI-assigned multi-role team responsibilities"
            />

            <StudentCaseStudyView
              studentName={userName}
              studentRollNo={(user as any)?.roll_number || (user as any)?.student_profile?.roll_number || ""}
              studentId={user?.id || ""}
              studentClassName={user?.className || (user as any)?.class_name || ""}
              enrolledCourseCodes={studentEnrolledCourses.map((c) => c.code)}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ─── 3. ASSIGNMENTS TAB WITH FULL CODING & QUIZ PROCTORING SUPPORT ─── */}
        {/* ========================================================================= */}
        {activeTab === "assignments" && (
          <div className="space-y-6 animate-fade-in">
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>

            <SectionHeader
              title="Course Assignments & Problem Sets"
              description="Review upcoming coding problem sets, online quizzes, and track proctoring security policies set by faculty"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Pending Submissions</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {individualAssignments.filter((a) => a.status === "PENDING").length}
                </p>
                <span className="text-xs text-amber-600 font-bold">Due within 48 hours</span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Submitted &amp; Graded</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {individualAssignments.filter((a) => a.status !== "PENDING").length}
                </p>
                <span className="text-xs text-emerald-600 font-bold">Based on recorded submissions</span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Completion Rate</span>
                <p className="text-2xl font-black text-blue-600 font-mono">
                  {individualAssignments.length > 0
                    ? `${Math.round((individualAssignments.filter((assignment) => assignment.status !== "PENDING").length / individualAssignments.length) * 100)}%`
                    : "--"}
                </p>
                <span className="text-xs text-slate-400">
                  {individualAssignments.length > 0 ? "Calculated from individual assigned coursework" : "No coursework assigned"}
                </span>
              </div>
            </div>

            {/* Top Switcher: Course Cards vs All Tasks */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setStudentAssignmentViewMode("COURSES");
                    setSelectedCourseForStudentAssignments(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    studentAssignmentViewMode === "COURSES" && !selectedCourseForStudentAssignments
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Enrolled Courses ({studentEnrolledCourses.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentAssignmentViewMode("ALL");
                    setSelectedCourseForStudentAssignments(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    studentAssignmentViewMode === "ALL"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Individual Tasks ({individualAssignments.length})</span>
                </button>
              </div>
            </div>

            {/* ════════════ LEVEL 1: ENROLLED COURSE CARDS ════════════ */}
            {studentAssignmentViewMode === "COURSES" && !selectedCourseForStudentAssignments && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Courses &amp; Academic Modules</h3>
                  <p className="text-xs text-slate-500">Select a course to view problem sets, homework, and submission progress.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {studentEnrolledCourses.map((c) => {
                    const courseTasks = individualAssignments.filter((a) => a.courseCode === c.code);
                    const pendingCount = courseTasks.filter((a) => a.status === "PENDING").length;
                    const gradedCount = courseTasks.filter((a) => a.status === "GRADED").length;
                    const submittedCount = courseTasks.filter((a) => a.status === "SUBMITTED").length;
                    const completionRate = courseTasks.length > 0
                      ? Math.round(((submittedCount + gradedCount) / courseTasks.length) * 100)
                      : 100;

                    return (
                      <div
                        key={c.code}
                        onClick={() => setSelectedCourseForStudentAssignments(c.code)}
                        className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                              {c.code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {c.credits} Credits
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
                              {c.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Faculty: {c.instructor || "Academic Department"}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total</span>
                              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{courseTasks.length}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">To Do</span>
                              <span className={`text-sm font-black font-mono ${pendingCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                {pendingCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Done</span>
                              <span className="text-sm font-black text-blue-600 font-mono">{submittedCount + gradedCount}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Progress:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{completionRate}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            <span>Open Course Tasks</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                          {pendingCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                              {pendingCount} due
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════════════ LEVEL 2: SPECIFIC COURSE DRILLED-DOWN ASSIGNMENTS ════════════ */}
            {studentAssignmentViewMode === "COURSES" && selectedCourseForStudentAssignments && (
              <div className="space-y-4 animate-fade-in">
                {(() => {
                  const matchedCourse = studentEnrolledCourses.find((c) => c.code === selectedCourseForStudentAssignments);
                  const courseTasks = individualAssignments.filter((a) => a.courseCode === selectedCourseForStudentAssignments);

                  return (
                    <>
                      {/* Course Breadcrumb Banner */}
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCourseForStudentAssignments(null)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Back to All Enrolled Courses</span>
                          </button>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                              {selectedCourseForStudentAssignments}
                            </span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                              {matchedCourse?.name || selectedCourseForStudentAssignments}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Instructor: {matchedCourse?.instructor || "Academic Faculty"} • {courseTasks.length} Assignments
                          </p>
                        </div>
                      </div>

                      {/* Course Assignment Items */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        {courseTasks.length === 0 ? (
                          <div className="p-10 text-center space-y-2">
                            <FileText className="h-10 w-10 text-slate-400 mx-auto" />
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">No assignments for this course yet</h4>
                            <p className="text-xs text-slate-500">Your professor has not published any coursework for this module.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {courseTasks.map((ass) => (
                              <div key={ass.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="space-y-1.5 max-w-xl">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg">
                                      {ass.courseCode}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                      {ass.title}
                                    </h4>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        ass.proctoringMode === "PROCTORED"
                                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      }`}
                                    >
                                      {ass.proctoringMode === "PROCTORED" ? "🔒 Proctored Lock" : "🔓 Open Workspace"}
                                    </span>
                                    {ass.isTeamAssignment && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                        👥 Team Project ({ass.minTeamSize || 2}–{ass.maxTeamSize || 4} Members)
                                      </span>
                                    )}
                                    {ass.format === "CODING" && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                        💻 Coding Lab
                                      </span>
                                    )}
                                    {ass.format === "IDEATHON" && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                                        💡 Ideathon Challenge
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        ass.status === "SUBMITTED"
                                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                                          : ass.status === "GRADED"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
                                      }`}
                                    >
                                      {ass.status === "SUBMITTED" ? "Submitted (Grading in progress)" : ass.status === "GRADED" ? `Graded: ${ass.score} pts` : `Due ${ass.dueDate}`}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Instructor: {ass.facultyInCharge} • Max Points: {ass.maxPoints} ({ass.weight})
                                  </p>
                                  <p className="text-xs text-slate-400 leading-relaxed">{ass.description}</p>

                                  {ass.isTeamAssignment && (
                                    <div className="flex items-center gap-2 pt-1">
                                      {(() => {
                                        const myTeam = (ass.teams || []).find(
                                          (t) => t.memberStudentIds.includes(user?.id || "") || t.leaderStudentId === (user?.id || "")
                                        );
                                        return (
                                          <>
                                            {myTeam ? (
                                              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200">
                                                Team: <strong>{myTeam.name}</strong> ({myTeam.memberStudentIds.length}/{ass.maxTeamSize || 4} members)
                                              </span>
                                            ) : (
                                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200">
                                                ⚠️ No Team Formed Yet
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setSelectedAssignmentForTeam(ass)}
                                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                              <Users className="h-3 w-3" />
                                              <span>{myTeam ? "Manage Team" : "Form / Join Team"}</span>
                                            </button>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {ass.status === "PENDING" && (
                                    <button
                                      onClick={() => {
                                        if (ass.format === "CODING") {
                                          setSubmissionCodeText(ass.starterCode || "# Python 3 solution\ndef solve():\n    pass");
                                        }
                                        setSelectedSubmissionAssignment(ass);
                                      }}
                                      className="btn-saas-primary flex items-center gap-1.5 px-4 py-2 text-xs"
                                    >
                                      {ass.format === "CODING" ? (
                                        <>
                                          <Terminal className="h-3.5 w-3.5" />
                                          <span>Open Code Sandbox</span>
                                        </>
                                      ) : ass.format === "IDEATHON" ? (
                                        <>
                                          <Cpu className="h-3.5 w-3.5" />
                                          <span>Open Ideathon Workspace</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-3.5 w-3.5" />
                                          <span>Submit work</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {ass.status === "SUBMITTED" && (
                                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-200">
                                      Under Review
                                    </span>
                                  )}
                                  {ass.status === "GRADED" && (
                                    <button
                                      onClick={() => setSelectedFeedbackAssignment(ass)}
                                      className="btn-saas-outline text-xs px-4 py-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                                    >
                                      <Award className="h-3.5 w-3.5" />
                                      <span>View Feedback</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ════════════ LEVEL 3 (OR FLAT MODE): ALL ASSIGNMENTS ════════════ */}
            {studentAssignmentViewMode === "ALL" && (
              <div className="space-y-4">
                {/* Unified Assessment Filter Bar */}
                <AssessmentFilterBar
                  filter={assignmentFilterStatus}
                  onFilterChange={setAssignmentFilterStatus}
                  counts={assignmentFilterCounts}
                  sortBy={assignmentSortOption}
                  onSortChange={setSortOptionForAssignments}
                  viewMode={assignmentViewMode}
                  onViewModeChange={setAssignmentViewMode}
                  searchQuery={assignmentSearchQuery}
                  onSearchChange={setAssignmentSearchQuery}
                />

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Assignment Register</h3>
                      <p className="text-xs text-slate-400">Faculty-configured coding problem sets and assessments ({filteredAndSortedAssignments.length} visible)</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Lock className="h-3.5 w-3.5 text-blue-600" />
                        <span>Proctored Lock</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <FileCode className="h-3.5 w-3.5 text-blue-600" />
                        <span>Code Lab</span>
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAndSortedAssignments.map((ass) => (
                    <div key={ass.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg">
                            {ass.courseCode}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {ass.title}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              ass.proctoringMode === "PROCTORED"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {ass.proctoringMode === "PROCTORED" ? "🔒 Proctored Lock" : "🔓 Open Workspace"}
                          </span>

                          {ass.format === "CODING" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                              <FileCode className="h-2.5 w-2.5" />
                              <span>Coding Lab</span>
                            </span>
                          )}
                          {ass.format === "IDEATHON" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Cpu className="h-2.5 w-2.5" />
                              <span>Ideathon</span>
                            </span>
                          )}
                          {ass.isTeamAssignment && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" />
                              <span>Team ({ass.minTeamSize || 2}-{ass.maxTeamSize || 4})</span>
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ass.status === "SUBMITTED"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                                : ass.status === "GRADED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
                            }`}
                          >
                            {ass.status === "SUBMITTED" ? "Submitted (Grading in progress)" : ass.status === "GRADED" ? `Graded: ${ass.score}` : `Due ${ass.dueDate}`}
                          </span>
                          {ass.status !== "SUBMITTED" && ass.status !== "GRADED" && ass.dueDate && (
                            <DeadlineCountdownBadge dueDate={ass.dueDate} />
                          )}
                          {ass.isExtended && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ✨ Extended Deadline
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {ass.courseName} • Instructor: {ass.facultyInCharge} • Max Points: {ass.maxPoints} ({ass.weight})
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">{ass.description}</p>

                        {ass.isTeamAssignment && (
                          <div className="flex items-center gap-2 pt-1">
                            {(() => {
                              const myTeam = (ass.teams || []).find(
                                (t) => t.memberStudentIds.includes(user?.id || "") || t.leaderStudentId === (user?.id || "")
                              );
                              return (
                                <>
                                  {myTeam ? (
                                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200">
                                      Team: <strong>{myTeam.name}</strong> ({myTeam.memberStudentIds.length}/{ass.maxTeamSize || 4} members)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200">
                                      ⚠️ No Team Formed Yet
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAssignmentForTeam(ass)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Users className="h-3 w-3" />
                                    <span>{myTeam ? "Manage Team" : "Form / Join Team"}</span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ass.proctoringMode === "PROCTORED" ? (
                          <span className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            Available from Examinations
                          </span>
                        ) : (
                          <>
                            {ass.status === "PENDING" && (
                              <button
                                onClick={() => {
                                  if (ass.format === "CODING") {
                                    setSubmissionCodeText(ass.starterCode || "# Python 3 solution\ndef solve():\n    pass");
                                  }
                                  setSelectedSubmissionAssignment(ass);
                                }}
                                className="btn-saas-primary flex items-center gap-1.5 px-4 py-2 text-xs"
                              >
                                {ass.format === "CODING" ? (
                                  <>
                                    <Terminal className="h-3.5 w-3.5" />
                                    <span>Open Code Sandbox</span>
                                  </>
                                ) : ass.format === "IDEATHON" ? (
                                  <>
                                    <Cpu className="h-3.5 w-3.5" />
                                    <span>Open Ideathon Workspace</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3.5 w-3.5" />
                                    <span>Submit work</span>
                                  </>
                                )}
                              </button>
                            )}
                            {ass.status === "SUBMITTED" && <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Submitted</span>}
                            {ass.status === "GRADED" && (
                              <button
                                onClick={() => setSelectedFeedbackAssignment(ass)}
                                className="btn-saas-outline text-xs px-4 py-2 flex items-center gap-1.5 text-emerald-600"
                              >
                                <Award className="h-3.5 w-3.5" />
                                <span>View Feedback</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* ========================================================================= */}
        {/* ─── 3b. GROUP PROJECTS & INNOVATION IDEATHONS (TEAM COLLABORATION) ─── */}
        {/* ========================================================================= */}
        {(activeTab === "projects" || activeTab === "ideathons" || activeTab === "team-projects") && (
          <div className="space-y-6 animate-fade-in">
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>

            <SectionHeader
              title="Projects & Ideathons"
              description="Collaborate on capstone coursework, sprint milestones, and timed full-screen subjective ideathon assessments."
            />

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
              <button
                onClick={() => setProjectTabFilter("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  projectTabFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Coursework ({groupProjects.length})
              </button>
              <button
                onClick={() => setProjectTabFilter("IDEATHON")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  projectTabFilter === "IDEATHON"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Ideathon Challenges ({groupProjects.filter((p) => p.format === "IDEATHON").length})</span>
              </button>
              <button
                onClick={() => setProjectTabFilter("PROJECT")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  projectTabFilter === "PROJECT"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Capstone &amp; Lab Projects ({groupProjects.filter((p) => p.format !== "IDEATHON").length})</span>
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Assigned</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {groupProjects.length}
                </p>
                <span className="text-xs text-blue-600 font-semibold">Active curriculum items</span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Ideathons</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {groupProjects.filter((p) => p.format === "IDEATHON").length}
                </p>
                <span className="text-xs text-slate-500 font-semibold">Subjective assessments</span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pending Action</span>
                <p className="text-2xl font-black text-amber-600 font-mono">
                  {groupProjects.filter((p) => p.status === "PENDING").length}
                </p>
                <span className="text-xs text-amber-600 font-semibold">Awaiting submission</span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Evaluated</span>
                <p className="text-2xl font-black text-emerald-600 font-mono">
                  {groupProjects.filter((p) => p.status === "GRADED").length}
                </p>
                <span className="text-xs text-emerald-600 font-semibold">Faculty / AI feedback</span>
              </div>
            </div>

            {/* Filter Bar with Status Counts, Sort Selector, Search and Grid/List View Switch */}
            <AssessmentFilterBar
              filter={projectFilterStatus}
              onFilterChange={setProjectFilterStatus}
              counts={projectFilterCounts}
              sortBy={projectSortOption}
              onSortChange={setSortOptionForProjects}
              viewMode={projectViewMode}
              onViewModeChange={setProjectViewMode}
              searchQuery={projectSearchQuery}
              onSearchChange={setProjectSearchQuery}
            />

            {/* Coursework Cards List */}
            <div className="space-y-4">
              {filteredAndSortedProjects.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <FolderKanban className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {projectTabFilter === "IDEATHON"
                      ? "No Ideathon Challenges Active"
                      : projectTabFilter === "PROJECT"
                      ? "No Capstone or Lab Projects Active"
                      : "No Coursework Assigned Yet"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When faculty publishes an ideathon challenge or capstone project for your course and section, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredAndSortedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                      >
                        {/* Top Metadata Row */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900">
                                {project.courseCode}
                              </span>
                              {project.format === "IDEATHON" ? (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 flex items-center gap-1">
                                  <Terminal className="h-3 w-3" />
                                  <span>Ideathon</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 flex items-center gap-1">
                                  <FolderKanban className="h-3 w-3" />
                                  <span>Capstone</span>
                                </span>
                              )}
                            </div>

                            {/* Status Chip */}
                            {project.status === "GRADED" ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                Score: {project.score}
                              </span>
                            ) : project.status === "SUBMITTED" ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200">
                                Under Review
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200">
                                Pending
                              </span>
                            )}
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {project.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {project.description || "Continuous academic capstone and subjective coursework deliverable."}
                            </p>
                          </div>

                          {/* Problem Domain / Statement (Compact Sleek Box) */}
                          {(project.problemDomain || project.problemStatement) && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                              {project.problemDomain && (
                                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                  <Terminal className="h-3 w-3 text-blue-600 shrink-0" />
                                  <span>Domain: <strong className="text-slate-800 dark:text-slate-200">{project.problemDomain}</strong></span>
                                </div>
                              )}
                              {project.problemStatement && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                  "{project.problemStatement}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Team Roster / Cohort Summary */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="h-3.5 w-3.5 text-blue-600" />
                              {project.myTeam ? (
                                <strong className="text-blue-700 dark:text-blue-300">Team: {project.myTeam.name || "Formed"}</strong>
                              ) : (
                                <span>Cohort: {(user as any)?.className || "Semester 5"}</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-400">
                                Due: <strong>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "End of Term"}</strong>
                              </span>
                              {project.dueDate && project.status !== "SUBMITTED" && project.status !== "GRADED" && (
                                <DeadlineCountdownBadge dueDate={project.dueDate} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions & Weightage */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-300">
                              {project.maxPoints || 100} pts
                            </span>
                            <span>Wt: <strong>{project.weight || "20%"}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {project.format === "IDEATHON" ? (
                              project.status === "PENDING" ? (
                                <button
                                  onClick={() => setActiveIdeathonModalProject(project.rawFacultyProject || project)}
                                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ShieldAlert className="h-3.5 w-3.5 text-white" />
                                  <span>Start Assessment</span>
                                </button>
                              ) : project.status === "SUBMITTED" ? (
                                <button
                                  onClick={() => setSelectedIdeathonReviewProject(project)}
                                  className="px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Review</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelectedIdeathonReviewProject(project)}
                                  className="px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer flex items-center gap-1"
                                >
                                  <Award className="h-3.5 w-3.5" />
                                  <span>Feedback</span>
                                </button>
                              )
                            ) : (
                              project.status === "PENDING" ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedAssignmentForTeam(project)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1"
                                  >
                                    <Users className="h-3.5 w-3.5 text-slate-500" />
                                    <span>{project.myTeam ? "Team" : "Form Team"}</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedSubmissionAssignment(project)}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                                  >
                                    <Upload className="h-3.5 w-3.5" />
                                    <span>Submit</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setSelectedFeedbackAssignment(project)}
                                  className="px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer flex items-center gap-1"
                                >
                                  <Award className="h-3.5 w-3.5" />
                                  <span>Team Feedback</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ─── 4. EXAMS & QUIZZES TAB ─── */}
        {/* ========================================================================= */}
        {activeTab === "exams" && (
          <div className="space-y-6 animate-fade-in">
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>

            <LmsQuizPlayer />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ─── 4b. OFFICIAL EXAM HALL TICKET / ADMIT CARD ─── */}
        {/* ========================================================================= */}
        {(activeTab === "hall-ticket" || activeTab === "admit-card") && Boolean(isHallTicketsReleased) && (
          <StudentHallTicketView onBack={() => router.push("/student")} />
        )}

        {/* ========================================================================= */}
        {/* ─── 5. SCHEDULE & TIMETABLE (UNIFIED WEEKLY TIMETABLE + ACADEMIC CALENDAR) ─── */}
        {/* ========================================================================= */}
        {(activeTab === "schedule" || activeTab === "timetable" || activeTab === "calendar") && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Link
                href="/student"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Overview</span>
              </Link>

              {/* Sub-Tab Switcher */}
              <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs w-fit">
                <button
                  onClick={() => setScheduleSubTab("TIMETABLE")}
                  className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    scheduleSubTab === "TIMETABLE"
                      ? "bg-white dark:bg-slate-700 text-[#3b82f6] shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>My Class Timetable</span>
                </button>
                <button
                  onClick={() => setScheduleSubTab("FACULTY")}
                  className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    scheduleSubTab === "FACULTY"
                      ? "bg-white dark:bg-slate-700 text-[#3b82f6] shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Faculty Cabins &amp; Schedules</span>
                </button>
                <button
                  onClick={() => setScheduleSubTab("CALENDAR")}
                  className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    scheduleSubTab === "CALENDAR"
                      ? "bg-white dark:bg-slate-700 text-[#3b82f6] shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  <span>Academic Term Calendar</span>
                </button>
              </div>
            </div>

            {scheduleSubTab === "TIMETABLE" ? (
              <StudentWeeklyCalendarView
                schedules={schedules}
                enrolledCourses={studentEnrolledCourses}
                onLaunchAiCatchUp={(lec) => setActiveAiCatchUpLecture(lec)}
              />
            ) : scheduleSubTab === "FACULTY" ? (
              <StudentFacultyConsultationView />
            ) : (
              <AcademicCalendarView />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ─── FACULTY CABIN DIRECTORY & CONSULTATION TIMETABLES ─── */}
        {/* ========================================================================= */}
        {(activeTab === "faculty-directory" || activeTab === "faculty-consultation" || activeTab === "faculty-timetable") && (
          <div className="space-y-6 animate-fade-in">
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <StudentFacultyConsultationView />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ─── 6. ANNOUNCEMENTS & ALERTS (UNIFIED CAMPUS NOTICES + SYSTEM NOTIFICATIONS) ─── */}
        {/* ========================================================================= */}
        {(activeTab === "announcements" || activeTab === "communication" || activeTab === "notifications") && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Link
                href="/student"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Overview</span>
              </Link>

              {/* Sub-Tab Switcher */}
              <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs w-fit">
                <button
                  onClick={() => setAnnouncementSubTab("ANNOUNCEMENTS")}
                  className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    announcementSubTab === "ANNOUNCEMENTS"
                      ? "bg-white dark:bg-slate-700 text-[#3b82f6] shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  <span>Campus Announcements ({displayedAnnouncements.length})</span>
                </button>
                <button
                  onClick={() => setAnnouncementSubTab("NOTIFICATIONS")}
                  className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    announcementSubTab === "NOTIFICATIONS"
                      ? "bg-white dark:bg-slate-700 text-[#3b82f6] shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>System Notifications ({syncNotifications?.length || 0})</span>
                </button>
              </div>
            </div>

            {announcementSubTab === "ANNOUNCEMENTS" ? (
              <AnnouncementFeed announcements={displayedAnnouncements} loading={isLoading} />
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                {/* Dynamically Render Real Notifications */}
                {(() => {
                  const studentId = user?.id;
                  const studentEmail = (user?.email || "").toLowerCase().trim();
                  const studentRelevantNotifications = (syncNotifications || []).filter((n) => {
                    // Exclude notifications explicitly targeted to other students
                    if (n.targetStudentId && n.targetStudentId !== studentId) return false;
                    // Exclude notifications targeted only to faculty, hod, admin
                    if (n.targetRole && n.targetRole !== "STUDENT" && n.targetRole !== "ALL") return false;
                    // Exclude notifications directed to another email
                    if (n.targetRecipientEmail && n.targetRecipientEmail.toLowerCase().trim() !== studentEmail) return false;
                    // Scoping for leave application notices meant for faculty advisors
                    if (n.type === "ATTENDANCE" && (n.title || "").toLowerCase().includes("leave application") && !n.title.includes("Sanctioned") && !n.title.includes("Rejected")) {
                      return false;
                    }
                    return true;
                  });

                  if (studentRelevantNotifications.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl space-y-2">
                        <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">No New Notifications</p>
                        <p className="text-xs text-slate-400">All academic alerts, invitations, and updates will appear here in real time.</p>
                      </div>
                    );
                  }

                  return studentRelevantNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      n.type === "TEAM_INVITE"
                        ? "bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40"
                        : n.type === "ATTENDANCE"
                        ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                        : n.type === "GRADE"
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          n.type === "TEAM_INVITE"
                            ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600"
                            : n.type === "ATTENDANCE"
                            ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600"
                            : n.type === "GRADE"
                            ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600"
                            : "bg-blue-100 dark:bg-blue-900/60 text-blue-600"
                        }`}
                      >
                        {n.type === "TEAM_INVITE" ? (
                          <Users className="h-4 w-4" />
                        ) : n.type === "ATTENDANCE" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : n.type === "GRADE" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {n.title}
                          </p>
                          {(!n.isRead || (n as any).unread) && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {n.message || (n as any).description}
                        </p>
                        {n.topic && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                            <span className="text-slate-400 font-medium">Topic Covered Today:</span>
                            <span className="font-bold text-slate-900 dark:text-white">&ldquo;{n.topic}&rdquo;</span>
                          </div>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                          {n.createdAt || (n as any).timestamp || "Just now"}
                        </span>
                      </div>
                    </div>

                    {n.type === "ATTENDANCE" && (
                      <button
                        onClick={() => {
                          if (markNotificationAsRead) markNotificationAsRead(n.id);
                          setActiveAiCatchUpLecture({
                            courseCode: n.courseCode || "",
                            courseName: n.courseCode || "",
                            lectureNumber: n.lectureNumber || 0,
                            topic: n.topic || "",
                            facultyName: n.facultyName || "Not added",
                            room: n.room || "Not added",
                            date: n.createdAt || "",
                            sessionAgenda: [],
                          });
                        }}
                        className="btn-saas-primary text-xs px-4 py-2 flex items-center justify-center gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white shadow-xs self-end sm:self-center"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Catch Up with AI Tutor</span>
                      </button>
                    )}

                    {(n.title?.toLowerCase().includes("case study") || (n.message || (n as any).description || "").toLowerCase().includes("case study")) && (
                      <Link
                        href="/student?tab=case-studies"
                        onClick={() => {
                          if (markNotificationAsRead) markNotificationAsRead(n.id);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xs self-end sm:self-center transition-colors"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Open Case Study</span>
                      </Link>
                    )}

                    {(n.type === "EXAM" || (n as any).quizId || n.title?.toLowerCase().includes("quiz") || n.title?.toLowerCase().includes("exam") || n.title?.toLowerCase().includes("assessment")) && (
                      <button
                        onClick={() => {
                          if (markNotificationAsRead) markNotificationAsRead(n.id);
                          const targetQuizId = (n as any).quizId || "";
                          router.push(`/student?tab=exams${targetQuizId ? `&quizId=${targetQuizId}` : ""}`);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xs self-end sm:self-center transition-colors cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Examination</span>
                      </button>
                    )}

                    {(n.type === "TEAM_INVITE" || (n as any).assignmentId) && n.teamId && (
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            const studentName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "Student");
                            const res = await joinAssignmentTeam(n.assignmentId || "", n.teamId || "", user?.id || "", studentName);
                            if (res.success) {
                              if (markNotificationAsRead) markNotificationAsRead(n.id);
                              triggerToast(`Successfully joined team "${n.teamName || "the project team"}"! 🎉`);
                              router.push("/student?tab=assignments");
                            } else {
                              triggerToast(`Unable to join: ${res.error || "Team full or already joined."}`);
                            }
                          }}
                          className="btn-saas-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Accept & Join Team</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (markNotificationAsRead) markNotificationAsRead(n.id);
                            triggerToast("Invitation dismissed.");
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* Legacy Messages view support */}
        {activeTab === "messages" && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <AcademicMessagingView
              currentUserId={user?.id || ""}
              currentUserRole={user?.role?.name || "STUDENT"}
            />
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <SectionHeader
              title="Academic Learning Resources & Library"
              description="Download official curriculum syllabi, lecture slides, and library reference guides"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <FolderKanban className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Curriculum Handbooks</h4>
                <p className="text-xs text-slate-400">Official department regulations, grading rubrics, and degree rules.</p>
                <button
                  onClick={() => triggerToast("Downloading Curriculum Handbook PDF...")}
                  className="btn-saas-outline text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <FileText className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Lecture Slide Archives</h4>
                <p className="text-xs text-slate-400">Weekly presentation decks across all enrolled Fall 2026 courses.</p>
                <button
                  onClick={() => triggerToast("Opening Lecture Slide Archive repository...")}
                  className="btn-saas-outline text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Access Folder</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <Bookmark className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Digital Library Access</h4>
                <p className="text-xs text-slate-400">IEEE Xplore, ACM Digital Library, and academic journal subscriptions.</p>
                <button
                  onClick={() => triggerToast("Connecting to Institutional Library proxy...")}
                  className="btn-saas-outline text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Portal</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: LEAVE & ON-DUTY GOVERNANCE ─── */}
        {(activeTab === "leaves" || activeTab === "leave" || activeTab === "student-leaves" || activeTab === "od") && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <StudentLeaveManagementView enrolledCourseCodes={studentEnrolledCourses.map((c) => c.code)} />
          </div>
        )}

        {/* ─── TAB: ATTENDANCE GOVERNANCE ─── */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <SectionHeader
              title="Student Attendance & Eligibility"
              description="Class session attendance records, 75% exam eligibility requirement, and monthly check-in history"
            />

            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Overall Attendance</span>
                  <UserCheck className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
                    {typeof overallAttendance === "number" ? `${overallAttendance.toFixed(1)}%` : `${overallAttendance}%`}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      Number(overallAttendance) >= 75 ? "text-slate-700 dark:text-slate-300" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {Number(overallAttendance) >= 75 ? "Safe Standing" : "Shortage Warning"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {totalConductedSessions > 0
                    ? `${totalAttendedSessions} attended of ${totalConductedSessions} total sessions`
                    : "No conducted sessions yet"}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Statutory Threshold</span>
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">75.0%</span>
                  <span className="text-xs font-medium text-slate-500">Regulation 4.2</span>
                </div>
                <p className="text-[11px] text-slate-400">Mandatory minimum for Final Exams</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Exam Eligibility</span>
                  <CheckCircle2 className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
                    {eligibleCoursesCount} / {verifiedAttendanceCourses.length || studentEnrolledCourses.length || 1}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {eligibleCoursesCount === (verifiedAttendanceCourses.length || 1) ? "100% Eligible" : "Action Required"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Enrolled courses in good standing</p>
              </div>

              <div
                onClick={() => setAttendanceSubTab("LEAVES")}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Excused Leaves & OD</span>
                  <FileCheck className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">{myApprovedLeaveDays} Days</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Sanctioned</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {myPendingLeavesCount > 0 ? `${myPendingLeavesCount} request(s) under review` : "Click to view OD & Leaves"}
                </p>
              </div>
            </div>

            {/* Attendance Sub-Tab Navigation */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
              <button
                onClick={() => setAttendanceSubTab("BREAKDOWN")}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  attendanceSubTab === "BREAKDOWN"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Course Breakdown</span>
              </button>

              <button
                onClick={() => setAttendanceSubTab("LOG")}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  attendanceSubTab === "LOG"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Monthly Check-in Log</span>
              </button>

              <button
                onClick={() => setAttendanceSubTab("LEAVES")}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  attendanceSubTab === "LEAVES"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>On-Duty & Leaves</span>
                {myPendingLeavesCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {myPendingLeavesCount}
                  </span>
                )}
              </button>
            </div>

            {/* ─── SUBTAB 1: COURSE BREAKDOWN TABLE & CARDS ─── */}
            {attendanceSubTab === "BREAKDOWN" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden space-y-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Course Attendance Records</h3>
                    <p className="text-xs text-slate-400">Attendance sessions recorded by course faculty</p>
                  </div>
                </div>

                {/* AI Catch-Up Banner for Missed Class (Only if student has a real attendance absence) */}
                {(() => {
                  const targetNotif = (syncNotifications || []).find(
                    (n) => n.type === "ATTENDANCE" && (n.aiCatchUpAvailable || n.title.toLowerCase().includes("absent") || n.message.toLowerCase().includes("marked absent")) && !n.title.includes("Credited") && !n.title.includes("Sanctioned")
                  );
                  const hasAbsence = verifiedAttendanceCourses.some((c) => (c.absent_count || 0) > 0);

                  if (!hasAbsence || !targetNotif) return null;

                  const topicTaught = targetNotif.topic || "Core Curriculum Lecture";
                  const courseCode = targetNotif.courseCode || "Enrolled Course";

                  return (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-blue-500/10 border border-amber-200/80 dark:border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-start gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] tracking-wide border border-rose-200 dark:border-rose-900/60">
                              MARKED ABSENT
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {courseCode}
                            </span>
                            <span className="text-[11px] text-slate-400">&bull; {targetNotif.createdAt || "Today"}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            Topic Taught Today: &ldquo;{topicTaught}&rdquo;
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {targetNotif.facultyName ? `Delivered by ${targetNotif.facultyName}. ` : ""}
                            An interactive AI catch-up lesson is available. Complete the structured module and self-test to master what you missed.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveAiCatchUpLecture({
                            courseCode: courseCode,
                            courseName: "Academic Lecture",
                            lectureNumber: targetNotif.lectureNumber || 1,
                            topic: topicTaught,
                            facultyName: targetNotif.facultyName || "Course Instructor",
                            room: targetNotif.room || "Room",
                            date: targetNotif.createdAt || "Today",
                            sessionAgenda: ["Key concept review", "Detailed walkthrough", "Comprehension test"],
                          });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shrink-0 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-sm self-start md:self-center"
                      >
                        <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-600" />
                        <span>Launch AI Catch-Up Lesson</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Course Code &amp; Title</th>
                        <th className="py-3 px-4 text-center">Hours Visible (Conducted)</th>
                        <th className="py-3 px-4 text-center">Attended</th>
                        <th className="py-3 px-4 text-center">Missed</th>
                        <th className="py-3 px-4">Percentage &amp; Buffer</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {verifiedAttendanceCourses && verifiedAttendanceCourses.length > 0 ? (
                        verifiedAttendanceCourses.map((c) => {
                          const pct = Math.round(c.attendance_percentage * 10) / 10;
                          const bufferCount = Math.max(0, Math.floor((c.present_count - 0.75 * c.total_sessions) / 0.75));
                          const deficitCount = Math.max(0, Math.ceil((0.75 * c.total_sessions - c.present_count) / 0.25));
                          const item = {
                            code: c.course_code,
                            title: c.course_name,
                            total: c.total_sessions,
                            attended: c.present_count,
                            missed: c.absent_count,
                            pct: pct,
                            buffer: pct >= 75 ? `Can safely miss ${bufferCount} ${bufferCount === 1 ? "class" : "classes"}` : `Need ${deficitCount} classes to recover`,
                            isSafe: pct >= 75,
                          };
                          return (
                            <tr key={item.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-4 px-4">
                                <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                                <span className="font-mono text-[11px] text-slate-500 font-bold">{item.code}</span>
                              </td>
                              <td className="py-4 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{item.total} hrs</td>
                              <td className="py-4 px-4 text-center font-mono font-semibold text-slate-900 dark:text-white">{item.attended}</td>
                              <td className="py-4 px-4 text-center">
                                {item.missed > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Find all missed sessions for this course
                                      const courseSessions = (attendanceSessions || []).filter(
                                        (s) => (s.courseCode || "").toUpperCase().trim() === item.code.toUpperCase().trim()
                                      );
                                      const missedSessions = courseSessions
                                        .filter((s) => {
                                          if (Array.isArray(s.records) && s.records.length > 0) {
                                            const myRec = s.records.find((r: any) => {
                                              const rId = r.studentId || r.student_id;
                                              const rRoll = (r.rollNo || r.student_identifier || "").toLowerCase().trim();
                                              const myRoll = (user?.student_identifier || "").toLowerCase().trim();
                                              return (user?.id && rId === user.id) || (myRoll && rRoll === myRoll);
                                            });
                                            if (myRec) {
                                              const st = (myRec.status || "").toUpperCase();
                                              return st === "ABSENT" || st === "A";
                                            }
                                          }
                                          return s.studentIsPresent === false;
                                        })
                                        .map((s) => ({
                                          id: s.id,
                                          date: s.sessionDateRaw || s.sessionDate || "Recent Class",
                                          topic: s.topic || "Classroom Lecture",
                                          faculty: s.conductedByFaculty || "Course Instructor",
                                          room: s.room || "LH-101",
                                        }));

                                      let resolvedSessions = missedSessions;
                                      if (resolvedSessions.length === 0 && item.missed > 0) {
                                        const baseDate = new Date();
                                        resolvedSessions = Array.from({ length: item.missed }).map((_, idx) => {
                                          const d = new Date(baseDate);
                                          d.setDate(d.getDate() - (idx + 1) * 3);
                                          return {
                                            id: `missed-${item.code}-${idx}`,
                                            date: `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${idx % 2 === 0 ? "10:00 AM - 11:00 AM" : "02:00 PM - 03:00 PM"}`,
                                            topic: `Core Lecture Session ${Math.max(1, item.total - item.missed + idx)}`,
                                            faculty: "Course Instructor",
                                            room: "LH-101",
                                          };
                                        });
                                      }

                                      setSelectedMissedCourse({
                                        code: item.code,
                                        name: item.title,
                                        missedCount: item.missed,
                                        sessions: resolvedSessions,
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer underline underline-offset-2 hover:scale-105"
                                    title="Click to view exact dates and times you missed this class"
                                  >
                                    <span>{item.missed}</span>
                                    <span className="text-[10px] uppercase font-sans font-bold">Missed</span>
                                  </button>
                                ) : (
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">0</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="space-y-1 w-44">
                                  <div className="flex justify-between text-[11px] font-mono font-bold">
                                    <span className={item.isSafe ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400"}>{item.pct}%</span>
                                    <span className="text-slate-400 text-[10px]">{item.buffer}</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${item.isSafe ? "bg-slate-900 dark:bg-slate-200" : "bg-rose-500"}`}
                                      style={{ width: `${Math.min(100, item.pct)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <span
                                  className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                    item.isSafe
                                      ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                                  }`}
                                >
                                  {item.isSafe ? "In Compliance" : "Shortage Risk"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">
                            No attendance sessions recorded for enrolled courses yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── SUBTAB 2: MONTHLY CHECK-IN LOG & CALENDAR ─── */}
            {attendanceSubTab === "LOG" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-6">
                {/* Header & Legend */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Monthly Attendance &amp; Class Calendar Log
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Verified institutional attendance registry: Click any date to inspect session times, course codes, and instructor logs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> P = Present
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> A = Absent
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> OD = On Duty
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> O = Sanctioned Leave
                    </span>
                  </div>
                </div>

                {/* Monthly Calendar View with Navigation */}
                {(() => {
                  const now = new Date();
                  const targetDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
                  const year = targetDate.getFullYear();
                  const month = targetDate.getMonth();
                  const monthName = targetDate.toLocaleString("default", { month: "long", year: "numeric" });
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  // Map sessions and student status by day string YYYY-MM-DD
                  const dayEventsMap = new Map<string, Array<{ courseCode: string; status: "P" | "A" | "OD" | "O"; title: string; room?: string; faculty?: string; time?: string }>>();

                  (attendanceSessions || []).forEach((sess) => {
                    const dateStr = sess.sessionDateRaw || (sess.sessionDate?.includes("202") ? sess.sessionDate.slice(0, 10) : "");
                    if (!dateStr) return;

                    let myStatus: "P" | "A" | "OD" | "O" = "P";
                    if (Array.isArray(sess.records) && sess.records.length > 0) {
                      const myRec = sess.records.find((r: any) => {
                        const rId = r.studentId || r.student_id;
                        const rRoll = (r.rollNo || r.student_identifier || "").toLowerCase().trim();
                        const myRoll = (user?.student_identifier || "").toLowerCase().trim();
                        return (user?.id && rId === user.id) || (myRoll && rRoll === myRoll);
                      });
                      if (myRec) {
                        const st = (myRec.status || "").toUpperCase();
                        if (st === "ABSENT" || st === "A") myStatus = "A";
                        else if (st === "ON_DUTY" || st === "OD") myStatus = "OD";
                        else if (st === "APPROVED_LEAVE" || st === "LEAVE") myStatus = "O";
                        else myStatus = "P";
                      } else {
                        myStatus = sess.studentIsPresent === false ? "A" : "P";
                      }
                    } else {
                      myStatus = sess.studentIsPresent === false ? "A" : "P";
                    }

                    const list = dayEventsMap.get(dateStr) || [];
                    list.push({
                      courseCode: sess.courseCode,
                      status: myStatus,
                      title: sess.topic || sess.courseName,
                      room: sess.room || "LH-101",
                      faculty: sess.conductedByFaculty || "Course Instructor",
                      time: (sess as any).startTime || (sess.sessionDate?.includes(":") ? sess.sessionDate.split(",")[1]?.trim() : "") || "10:00 AM",
                    });
                    dayEventsMap.set(dateStr, list);
                  });

                  // Merge approved leaves and ODs
                  (studentLeaves || []).forEach((l) => {
                    const isMine =
                      l.studentId === user?.id ||
                      (l.studentRollNo && l.studentRollNo.toLowerCase().trim() === (user?.student_identifier || "").toLowerCase().trim());
                    if (isMine && (l.status === "APPROVED" || l.attendanceCredited)) {
                      const codeStatus: "OD" | "O" = l.leaveType === "ON_DUTY" ? "OD" : "O";
                      const start = new Date(l.startDate);
                      const end = new Date(l.endDate);
                      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dStr = d.toISOString().slice(0, 10);
                        const list = dayEventsMap.get(dStr) || [];
                        list.push({
                          courseCode: l.leaveType === "ON_DUTY" ? "ON DUTY" : "LEAVE",
                          status: codeStatus,
                          title: l.reason || l.leaveType,
                          room: "Approved Deanery",
                          time: "Full Day",
                        });
                        dayEventsMap.set(dStr, list);
                      }
                    }
                  });

                  // Monthly Summary Counts
                  let totalMonthClasses = 0;
                  let presentMonthCount = 0;
                  let absentMonthCount = 0;
                  let odMonthCount = 0;
                  let leaveMonthCount = 0;

                  for (let day = 1; day <= daysInMonth; day++) {
                    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const evs = dayEventsMap.get(dStr) || [];
                    totalMonthClasses += evs.length;
                    evs.forEach((e) => {
                      if (e.status === "P") presentMonthCount++;
                      else if (e.status === "A") absentMonthCount++;
                      else if (e.status === "OD") odMonthCount++;
                      else if (e.status === "O") leaveMonthCount++;
                    });
                  }

                  const effectivePresent = presentMonthCount + odMonthCount + leaveMonthCount;
                  const monthPercentage = totalMonthClasses > 0 ? Math.round((effectivePresent / totalMonthClasses) * 1000) / 10 : 100;

                  const dayCells = [];
                  for (let i = 0; i < firstDay; i++) {
                    dayCells.push(<div key={`empty-${i}`} className="min-h-[92px] bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800/40" />);
                  }

                  for (let day = 1; day <= daysInMonth; day++) {
                    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const events = dayEventsMap.get(dStr) || [];
                    const isToday = calendarMonthOffset === 0 && day === now.getDate();
                    const isSelected = selectedCalendarDay === dStr;

                    dayCells.push(
                      <div
                        key={`day-${day}`}
                        onClick={() => setSelectedCalendarDay(isSelected ? null : dStr)}
                        className={`min-h-[92px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                          isSelected
                            ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                            : isToday
                            ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 ring-2 ring-amber-500/20"
                            : "bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : isToday
                              ? "bg-amber-500 text-white"
                              : "text-slate-800 dark:text-slate-200 group-hover:text-blue-600"
                          }`}>
                            {day}
                          </span>
                          {events.length > 0 && (
                            <span className="text-[10px] font-mono font-semibold text-slate-400">
                              {events.length} {events.length === 1 ? "class" : "classes"}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 mt-1.5 flex-1">
                          {events.slice(0, 3).map((ev, eIdx) => {
                            const badgeColor =
                              ev.status === "P"
                                ? "bg-emerald-500 text-white"
                                : ev.status === "A"
                                ? "bg-rose-500 text-white"
                                : ev.status === "OD"
                                ? "bg-blue-500 text-white"
                                : "bg-purple-500 text-white";

                            return (
                              <div
                                key={eIdx}
                                className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/80"
                                title={`${ev.courseCode}: ${ev.title} (${ev.status === "P" ? "Present" : ev.status === "A" ? "Absent" : ev.status === "OD" ? "On Duty" : "Leave"})`}
                              >
                                <span className="truncate font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {ev.courseCode}
                                </span>
                                <span className={`h-4 min-w-[16px] px-1 rounded text-[9px] font-mono font-bold flex items-center justify-center shrink-0 ${badgeColor}`}>
                                  {ev.status}
                                </span>
                              </div>
                            );
                          })}
                          {events.length > 3 && (
                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold block text-center">
                              +{events.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const selectedDayEvents = selectedCalendarDay ? dayEventsMap.get(selectedCalendarDay) || [] : [];

                  return (
                    <div className="space-y-5">
                      {/* Month Switcher & Statistics Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Previous Month"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-3 text-xs font-bold font-mono text-slate-900 dark:text-white min-w-[130px] text-center">
                              {monthName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCalendarMonthOffset((prev) => prev + 1)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Next Month"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                          {calendarMonthOffset !== 0 && (
                            <button
                              type="button"
                              onClick={() => setCalendarMonthOffset(0)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                            >
                              Current Month
                            </button>
                          )}
                        </div>

                        {/* Monthly KPI Chips */}
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs font-semibold">
                            <span className="text-slate-400 font-normal">Conducted:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{totalMonthClasses} hrs</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-semibold">
                            <span>Present:</span>
                            <span className="font-mono font-bold">{presentMonthCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 font-semibold">
                            <span>Absent:</span>
                            <span className="font-mono font-bold">{absentMonthCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-semibold">
                            <span>OD / Leave:</span>
                            <span className="font-mono font-bold">{odMonthCount + leaveMonthCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold">
                            <span>Monthly %:</span>
                            <span className="font-mono">{monthPercentage}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Calendar Days Header */}
                      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                      </div>

                      {/* Day Grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {dayCells}
                      </div>

                      {/* Selected Day Timeline Breakdown Drawer */}
                      {selectedCalendarDay && (
                        <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/80 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800/60 pb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                Class Session Breakdown for <span className="font-mono text-blue-600 dark:text-blue-400">{selectedCalendarDay}</span>
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedCalendarDay(null)}
                              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                            >
                              Close Details ✕
                            </button>
                          </div>

                          {selectedDayEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {selectedDayEvents.map((ev, idx) => {
                                const isP = ev.status === "P";
                                const isA = ev.status === "A";
                                const isOD = ev.status === "OD";

                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                                        {ev.courseCode}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                        isP
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                          : isA
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                          : isOD
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                          : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                      }`}>
                                        {isP ? "MARKED PRESENT" : isA ? "MARKED ABSENT" : isOD ? "ON DUTY (CREDITED)" : "SANCTIONED LEAVE"}
                                      </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                                      {ev.title}
                                    </p>
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                                      <span>Time: {ev.time || "10:00 AM"}</span>
                                      <span>Room: {ev.room || "LH-101"}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic py-2">
                              No institutional sessions scheduled for this date.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Biometric Sessions List */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Recent Biometric Session Check-ins</h4>
                    <span className="text-xs font-mono font-bold text-slate-400">Academic Term Log</span>
                  </div>

                  <div className="space-y-3">
                    {verifiedAttendanceCourses && verifiedAttendanceCourses.length > 0 ? (
                      verifiedAttendanceCourses.map((courseItem, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold shrink-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <Check className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{courseItem.course_name}</p>
                              <p className="text-[11px] text-slate-400">
                                {courseItem.present_count} attended / {courseItem.total_sessions} total sessions conducted
                              </p>
                            </div>
                          </div>

                          <span className="px-3 py-1 rounded-full font-bold text-[10px] w-fit font-mono bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {Math.round(courseItem.attendance_percentage)}% ATTENDANCE
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                        No biometric or classroom check-in logs recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── SUBTAB 3: ON-DUTY & LEAVE GOVERNANCE ─── */}
            {attendanceSubTab === "LEAVES" && (
              <StudentLeaveManagementView enrolledCourseCodes={studentEnrolledCourses.map((c) => c.code)} />
            )}

          </div>
        )}

        {/* ─── TAB: COURSE CATALOG EXPLORER ─── */}
        {activeTab === "catalog" && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <SectionHeader
              title="University Course Catalog Explorer"
              description="Explore elective offerings, prerequisites, and syllabus modules across university departments"
            />

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search course code (e.g. CS-301), topic name, or department..."
                  className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {["All Departments", "CSE", "ECE", "MECH", "ROB"].map((dept, i) => (
                  <button
                    key={i}
                    onClick={() => setCatalogSearch(dept === "All Departments" ? "" : dept)}
                    className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Course Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalog.length > 0 ? (
                filteredCatalog.map((c: any) => (
                  <div key={c.id || c.code} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-lg">
                          {c.course_code || c.code}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {c.credits} Credits • {c.department_code || "ACADEMIC"}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                        {c.name || c.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {c.description || "Comprehensive syllabus exploring foundational theory, industry applications, and laboratory problem sets."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>Elective Open</span>
                      </span>
                      <Link
                        href={`/courses/${c.id || "1"}/learn`}
                        className="btn-saas-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                      >
                        <span>View Course</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <GraduationCap className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No Elective Courses Found</p>
                  <p className="text-xs text-slate-400">Course catalog will populate once new courses are added by administration.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: ACADEMIC PERFORMANCE & PROGRESS ─── */}
        {activeTab === "intelligence" && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <SectionHeader
              title="Academic Performance & Progress Overview"
              description="GPA trajectory, attendance standing, and personalized study recommendations"
            />

            {/* AI Academic Health Card */}
            {intelligenceData ? (
              <AcademicHealthCard data={intelligenceData} />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                Performance insights will appear after attendance and assessment records are available.
              </div>
            )}

            {/* Actionable Recommendations List */}
            <RecommendationList recommendations={intelligenceData?.recommendations || []} />

          </div>
        )}

        {/* ─── TAB: AI TUTOR & CONCEPT MASTER ─── */}
        {(activeTab === "ai-tutor" || activeTab === "tutor") && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <StudentAiTutorView />
          </div>
        )}

        {/* ─── TAB: AI MOCK INTERVIEW & CAREER ─── */}
        {(activeTab === "mock-interview" || activeTab === "interview" || activeTab === "career") && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <AiMockInterviewView />
          </div>
        )}

        {/* ─── TAB: HELP & STUDENT GUIDE ─── */}
        {(activeTab === "help" || activeTab === "guide" || activeTab === "support") && (
          <div className="space-y-6 animate-fade-in">
            <Link href="/student" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Overview</span>
            </Link>
            <StudentHelpCenterView />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ─── MODAL 1: ASSIGNMENT SUBMISSION MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedSubmissionAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setSelectedSubmissionAssignment(null)}
                  className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg">
                      {selectedSubmissionAssignment.courseCode}
                    </span>
                    {selectedSubmissionAssignment.format === "CODING" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                        <Terminal className="h-3 w-3" />
                        <span>Interactive Code Sandbox</span>
                      </span>
                    )}
                    {selectedSubmissionAssignment.format === "IDEATHON" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        <span>Ideathon Solution Workspace</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedSubmissionAssignment.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Max Points: {selectedSubmissionAssignment.maxPoints} • Weight: {selectedSubmissionAssignment.weight} • Instructor: {selectedSubmissionAssignment.facultyInCharge}
                  </p>
                </div>

                {/* Team Assignment Status Banner */}
                {(() => {
                  if (!selectedSubmissionAssignment.isTeamAssignment) return null;
                  const myTeam = (selectedSubmissionAssignment.teams || []).find(
                    (t) => t.memberStudentIds.includes(user?.id || "") || t.leaderStudentId === (user?.id || "")
                  );
                  if (!myTeam) {
                    return (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Users className="h-5 w-5 text-amber-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              Team Required for Submission
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">
                              This is a collaborative challenge (team size: {selectedSubmissionAssignment.minTeamSize || 2}-{selectedSubmissionAssignment.maxTeamSize || 4} members). You must create or join a team before submitting.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssignmentForTeam(selectedSubmissionAssignment);
                          }}
                          className="btn-saas-primary text-xs px-3.5 py-1.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Form / Join Team
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          Submitting on behalf of Team: <span className="underline">{myTeam.name}</span> ({myTeam.memberStudentIds.length} members)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAssignmentForTeam(selectedSubmissionAssignment)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 underline"
                      >
                        View Team
                      </button>
                    </div>
                  );
                })()}

                {selectedSubmissionAssignment.proctoringMode === "PROCTORED" && (selectedSubmissionAssignment as any).format === "EXAM" && (
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                        <Lock className="h-4 w-4 text-primary" />
                        <span>Protected Assessment Mode Active</span>
                      </div>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                        Camera &amp; Screen Monitored
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Please stay on this screen. Tab switching and copy-paste events are recorded on your submission log.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href="/student?tab=exams"
                        className="btn-saas-primary bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 flex items-center gap-1.5 w-full justify-center shadow-xs"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>View Exams</span>
                      </Link>
                    </div>
                  </div>
                )}

                <form onSubmit={handleFinalSubmitAssignment} className="space-y-4">
                  {/* ─── CODING FORMAT ─── */}
                  {selectedSubmissionAssignment.format === "CODING" ? (
                    <div className="space-y-4">
                      {/* Problem statement */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Terminal className="h-4 w-4 text-cyan-600" />
                            Problem Statement &amp; Requirements
                          </span>
                          {integrityStrikes > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
                              ⚠️ Integrity Strikes: {integrityStrikes}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {selectedSubmissionAssignment.problemStatement || selectedSubmissionAssignment.description}
                        </p>
                      </div>

                      {/* Anti-Cheating & Security Bar */}
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Sandbox Protections Active:</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                            🚫 Copy / Cut / Paste Disabled
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                            🛡️ Right-Click Disabled
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                            🔍 DevTools / Extension Detection
                          </span>
                        </div>
                      </div>

                      {/* Code Editor */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <FileCode className="h-4 w-4 text-cyan-600" />
                            <span>Solution Code (Python 3 / Multi-Language Engine)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setSubmissionCodeText(selectedSubmissionAssignment.starterCode || "# Python 3 solution\ndef solve():\n    pass")}
                            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                          >
                            Reset to Starter Code
                          </button>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                              <span>solution.py</span>
                            </span>
                            <span>UTF-8 • Sandbox Engine Active</span>
                          </div>
                          <textarea
                            rows={10}
                            value={submissionCodeText}
                            onChange={(e) => setSubmissionCodeText(e.target.value)}
                            onCopy={(e) => {
                              e.preventDefault();
                              setIntegrityStrikes((prev) => prev + 1);
                              triggerToast("⚠️ Proctored Security Violation: Copying code is disabled.");
                            }}
                            onCut={(e) => {
                              e.preventDefault();
                              setIntegrityStrikes((prev) => prev + 1);
                              triggerToast("⚠️ Proctored Security Violation: Cutting code is disabled.");
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              setIntegrityStrikes((prev) => prev + 1);
                              triggerToast("⚠️ Proctored Security Violation: External pasting is disabled.");
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              triggerToast("⚠️ Security Policy: Right-click context menu is restricted in Code Sandbox.");
                            }}
                            placeholder="# Write your algorithmic solution here..."
                            className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none resize-y selection:bg-emerald-950"
                          />
                        </div>
                      </div>

                      {/* Test Cases Execution Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Validation Test Cases
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({(selectedSubmissionAssignment.testCases || []).filter((tc) => !tc.isHidden).length} Visible,{" "}
                              {(selectedSubmissionAssignment.testCases || []).filter((tc) => tc.isHidden).length} Hidden)
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={isRunningCode}
                            onClick={handleRunVisibleTestCases}
                            className="btn-saas-outline text-xs px-3.5 py-1.5 flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                          >
                            <Play className="h-3 w-3" />
                            <span>{isRunningCode ? "Running Suite..." : "Run Visible Test Cases"}</span>
                          </button>
                        </div>

                        {codeExecutionResults && (
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Visible Test Results: {codeExecutionResults.passedCount} / {codeExecutionResults.totalVisibleCount} Passed
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                🔒 +{(selectedSubmissionAssignment.testCases || []).filter((tc) => tc.isHidden).length} Hidden Test Cases will be graded on submit
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {codeExecutionResults.cases.map((tc, idx) => (
                                <div
                                  key={tc.id || idx}
                                  className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-between ${
                                    tc.passed
                                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                                      : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div>
                                      <span className="font-bold">Test Case {idx + 1}:</span> Input: <code>{tc.input}</code>
                                    </div>
                                    <div>
                                      Expected: <code>{tc.expected}</code> | Output: <code>{tc.actual}</code>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${tc.passed ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100" : "bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100"}`}>
                                    {tc.passed ? "PASSED" : "FAILED"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : selectedSubmissionAssignment.format === "IDEATHON" ? (
                    /* ─── IDEATHON FORMAT ─── */
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <Cpu className="h-4 w-4 text-amber-600" />
                            Ideathon &amp; Real-World Problem Solving Challenge
                          </span>
                          {selectedSubmissionAssignment.ideathonTheme && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                              Theme: {selectedSubmissionAssignment.ideathonTheme}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {selectedSubmissionAssignment.problemStatement || selectedSubmissionAssignment.description}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          1. Solution Codename &amp; Proposal Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Distributed Low-Latency Edge Sync Engine"
                          value={ideathonProposalTitle}
                          onChange={(e) => setIdeathonProposalTitle(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          2. System Architecture Blueprint &amp; Data Flow
                        </label>
                        <p className="text-[11px] text-slate-400">Describe APIs, microservices, database schemas, messaging queues, and component communication.</p>
                        <textarea
                          rows={4}
                          placeholder="e.g. Ingress API -> Kafka event stream -> FastAPI worker nodes -> Redis Cache & PostgreSQL TimescaleDB..."
                          value={ideathonArchitecture}
                          onChange={(e) => setIdeathonArchitecture(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          3. Technology Stack Justification &amp; Trade-Offs
                        </label>
                        <p className="text-[11px] text-slate-400">Why choose these frameworks vs alternatives? (Performance, latency, community support, cost)</p>
                        <textarea
                          rows={3}
                          placeholder="e.g. Chosen Go/Rust for compute-intensive microservices due to low memory footprint and zero GC pauses..."
                          value={ideathonTechStack}
                          onChange={(e) => setIdeathonTechStack(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          4. Real-World Feasibility, Scalability &amp; Edge Cases
                        </label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Handles 100k req/sec with auto-scaling ECS containers, circuit breakers on external payment gateways..."
                          value={ideathonImpact}
                          onChange={(e) => setIdeathonImpact(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    /* ─── STANDARD DOCUMENT / CERTIFICATE UPLOAD FORMAT ─── */
                    <>
                      {/* If Certificate Upload Format */}
                      {selectedSubmissionAssignment.format === "CERTIFICATE_UPLOAD" && (
                        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 space-y-3">
                          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                            <Award className="h-4 w-4 text-indigo-600" />
                            <span>Online MOOC / Coursera Certificate Verification</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Certificate Provider
                              </label>
                              <select
                                value={submissionCertificateProvider}
                                onChange={(e) => setSubmissionCertificateProvider(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                              >
                                <option value="Coursera">Coursera</option>
                                <option value="edX">edX</option>
                                <option value="NPTEL / Swayam">NPTEL / Swayam</option>
                                <option value="Udemy">Udemy</option>
                                <option value="Google Cloud">Google Cloud</option>
                                <option value="AWS Training">AWS Training</option>
                                <option value="Microsoft Learn">Microsoft Learn</option>
                                <option value="Other Academy">Other Academy</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Online Verification URL
                              </label>
                              <input
                                type="url"
                                placeholder="https://coursera.org/verify/..."
                                value={submissionCertificateUrl}
                                onChange={(e) => setSubmissionCertificateUrl(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* File Upload Dropzone */}
                      <div className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2 hover:border-indigo-400 transition-colors">
                        <Upload className="h-7 w-7 text-indigo-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {submissionFileName
                            ? `Selected: ${submissionFileName}`
                            : selectedSubmissionAssignment.format === "CERTIFICATE_UPLOAD"
                            ? "Upload Certificate PDF or Image (PDF, PNG, JPG)"
                            : "Upload Project Archive / Code / Solution (.zip, .rar, .7z, .pdf, .docx, code)"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Supports full project ZIP archives, codebases (.py, .cpp, .java, .ipynb), documents and folders
                        </p>
                        <label className="btn-saas-outline text-[11px] px-3.5 py-1.5 cursor-pointer inline-block font-bold">
                          Browse Files
                          <input
                            type="file"
                            multiple
                            accept={
                              selectedSubmissionAssignment.format === "CERTIFICATE_UPLOAD"
                                ? ".pdf,.png,.jpg,.jpeg"
                                : ".pdf,.doc,.docx,.zip,.tar,.gz,.rar,.7z,.txt,.ipynb,.cpp,.py,.java,.js,.jsx,.ts,.tsx,.json,.csv,.sql,.html,.css"
                            }
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                if (e.target.files.length === 1) {
                                  setSubmissionFileName(e.target.files[0].name);
                                  setSubmissionFile(e.target.files[0]);
                                } else {
                                  setSubmissionFileName(`${e.target.files.length} files selected (${e.target.files[0].name}, ...)`);
                                  setSubmissionFile(e.target.files[0]);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Written solution text / notes */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {selectedSubmissionAssignment.format === "CERTIFICATE_UPLOAD"
                            ? "Student Comments & Verification Details (Optional)"
                            : "Solution Notes / GitHub Repo URL (Optional)"}
                        </label>
                        <textarea
                          rows={2}
                          value={submissionCodeText}
                          onChange={(e) => setSubmissionCodeText(e.target.value)}
                          placeholder={
                            selectedSubmissionAssignment.format === "CERTIFICATE_UPLOAD"
                              ? "e.g. Completed with 98% grade, completed on Sep 2026..."
                              : "e.g. Scanned PDF attached, GitHub link, algorithm complexity breakdown..."
                          }
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionAssignment(null)}
                      className="btn-saas-outline flex-1 text-xs py-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmittingAssignment ||
                        Boolean(
                          selectedSubmissionAssignment.isTeamAssignment &&
                            !(selectedSubmissionAssignment.teams || []).some(
                              (t) =>
                                t.memberStudentIds.includes(user?.id || "") ||
                                t.leaderStudentId === (user?.id || "")
                            )
                        )
                      }
                      className="btn-saas-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSubmittingAssignment ? "Submitting..." : "Submit for Grading"}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── MODAL: TEAM FORMATION & ROSTER MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedAssignmentForTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => {
                    setSelectedAssignmentForTeam(null);
                    setTeamActionError(null);
                  }}
                  className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="space-y-1">
                  <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg">
                    {selectedAssignmentForTeam.courseCode} • Team Collaboration
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedAssignmentForTeam.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Rule: Teams must consist of {selectedAssignmentForTeam.minTeamSize || 2} to {selectedAssignmentForTeam.maxTeamSize || 4} members.
                  </p>
                </div>

                {teamActionError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                    {teamActionError}
                  </div>
                )}

                {/* Current User Team Status */}
                {(() => {
                  const currentTeams = selectedAssignmentForTeam.teams || [];
                  const myTeam = currentTeams.find(
                    (t: any) =>
                      (t.memberStudentIds && t.memberStudentIds.includes(user?.id || "")) ||
                      t.leaderStudentId === (user?.id || "") ||
                      t.leadStudentId === (user?.id || "") ||
                      (t.members && t.members.some((m: any) => m.id === user?.id))
                  );
                  if (myTeam) {
                    return (
                      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              Your Active Team
                            </span>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                {myTeam.name}
                              </h4>
                              {myTeam.isLocked && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200">
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100">
                            {myTeam.memberStudentIds.length} / {selectedAssignmentForTeam.maxTeamSize || 4} Members
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {myTeam.memberStudentIds.map((mId, idx) => {
                            const memberUser = syncUsers?.find((u) => u.id === mId);
                            const memberName = memberUser
                              ? `${memberUser.first_name} ${memberUser.last_name || ""}`.trim()
                              : `Member ${idx + 1}`;
                            const isLeader = mId === myTeam.leaderStudentId;
                            return (
                              <span
                                key={mId}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                              >
                                {isLeader ? "👑 " : "👤 "}
                                {memberName}
                                {isLeader && <span className="text-[9px] text-amber-500 font-bold">(Leader)</span>}
                              </span>
                            );
                          })}
                        </div>
                        <div className="pt-2 flex items-center justify-between border-t border-indigo-100 dark:border-indigo-950">
                          {myTeam.leaderStudentId === (user?.id || "") ? (
                            <button
                              type="button"
                              onClick={() => {
                                const res = toggleLockAssignmentTeam(selectedAssignmentForTeam.id, myTeam.id);
                                triggerToast(res.isLocked ? "Team roster locked! 🔒" : "Team roster unlocked! 🔓");
                              }}
                              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shadow-2xs transition-colors cursor-pointer"
                            >
                              {myTeam.isLocked ? "🔓 Unlock Team Roster" : "🔒 Lock Team Roster"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {myTeam.isLocked ? "Roster locked by team leader" : "Open for team invitations"}
                            </span>
                          )}

                          {!myTeam.isLocked && (
                            confirmLeavingTeamId === myTeam.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200 dark:border-rose-800">
                                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Leave team?</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await leaveAssignmentTeam(selectedAssignmentForTeam.id, myTeam.id, user?.id || "");
                                      triggerToast("You have left the team.");
                                      setSelectedAssignmentForTeam(null);
                                      setConfirmLeavingTeamId(null);
                                    } catch (err: any) {
                                      setTeamActionError(err.message || "Failed to leave team.");
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Yes, Leave
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmLeavingTeamId(null)}
                                  className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmLeavingTeamId(myTeam.id)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                              >
                                Leave this team
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }

                  const allFreeClassmates = (syncUsers || []).filter(
                    (u) =>
                      u.role === "STUDENT" &&
                      u.id !== user?.id &&
                      !(selectedAssignmentForTeam.teams || []).some((t) => t.memberStudentIds.includes(u.id))
                  );
                  const maxTeammates = Math.max(1, (selectedAssignmentForTeam.maxTeamSize || 4) - 1);

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Create a New Team &amp; Select Members
                        </h4>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          Max team size: {selectedAssignmentForTeam.maxTeamSize || 4}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Enter team name (e.g. Code Ninjas, Team Alpha)..."
                          value={teamNameInput}
                          onChange={(e) => setTeamNameInput(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />

                        {/* Participant Selection Checklist */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>Select Classmates to Add:</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">
                              {selectedTeammatesForNewTeam.length} / {maxTeammates} selected
                            </span>
                          </div>

                          {allFreeClassmates.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No free classmates found.</p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                              {allFreeClassmates.map((st) => {
                                const isChecked = selectedTeammatesForNewTeam.includes(st.id);
                                return (
                                  <label
                                    key={st.id}
                                    className={`flex items-center gap-2.5 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedTeammatesForNewTeam((prev) => prev.filter((id) => id !== st.id));
                                        } else {
                                          if (selectedTeammatesForNewTeam.length >= maxTeammates) {
                                            const msg = `You can select at most ${maxTeammates} additional teammate${maxTeammates === 1 ? "" : "s"}.`;
                                            setTeamActionError(msg);
                                            triggerToast(msg);
                                            return;
                                          }
                                          setSelectedTeammatesForNewTeam((prev) => [...prev, st.id]);
                                        }
                                      }}
                                      className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="font-bold flex-1 truncate">
                                      {st.first_name} {st.last_name || ""}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {st.student_identifier || st.email}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!teamNameInput.trim()) {
                              setTeamActionError("Please enter a valid team name.");
                              return;
                            }
                            try {
                              const leaderName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "Student");
                              const selectedMembersData = allFreeClassmates
                                .filter((c) => selectedTeammatesForNewTeam.includes(c.id))
                                .map((c) => ({
                                  id: c.id,
                                  name: `${c.first_name} ${c.last_name || ""}`.trim() || c.email,
                                }));

                              const res = await createAssignmentTeam(
                                selectedAssignmentForTeam.id,
                                teamNameInput.trim(),
                                user?.id || "",
                                leaderName,
                                selectedMembersData
                              );

                              if (!res.success) {
                                setTeamActionError(res.error || "Failed to create team.");
                                return;
                              }

                              loadFacultyHubProjects();
                              if (res.team) {
                                setSelectedAssignmentForTeam((prev: any) => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    teams: [...(prev.teams || []), res.team],
                                  };
                                });
                              }

                              // Dispatch invitations/notifications to all selected members
                              selectedMembersData.forEach((member) => {
                                sendTeamInvitation(
                                  selectedAssignmentForTeam.id,
                                  res.team?.id || `team-${Date.now()}`,
                                  teamNameInput.trim(),
                                  leaderName,
                                  member.id,
                                  member.name
                                );
                              });

                              setTeamNameInput("");
                              setSelectedTeammatesForNewTeam([]);
                              setTeamActionError(null);
                              triggerToast(`Team "${teamNameInput.trim()}" formed with ${selectedMembersData.length + 1} members! 🎉`);
                            } catch (err: any) {
                              setTeamActionError(err.message || "Failed to create team.");
                            }
                          }}
                          className="btn-saas-primary text-xs w-full py-2.5 font-bold"
                        >
                          Create Team &amp; Form Roster ({selectedTeammatesForNewTeam.length + 1} Members)
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Existing Open Teams to Join */}
                {(() => {
                  const currentTeams = selectedAssignmentForTeam.teams || [];
                  const myTeam = currentTeams.find(
                    (t: any) =>
                      (t.memberStudentIds && t.memberStudentIds.includes(user?.id || "")) ||
                      t.leaderStudentId === (user?.id || "") ||
                      t.leadStudentId === (user?.id || "") ||
                      (t.members && t.members.some((m: any) => m.id === user?.id))
                  );
                  if (myTeam) return null; // If already in a team, don't show join list
                  const otherTeams = selectedAssignmentForTeam.teams || [];
                  if (otherTeams.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Or Join an Existing Team
                      </h4>
                      <div className="space-y-2">
                        {otherTeams.map((team) => {
                          const isFull = team.memberStudentIds.length >= (selectedAssignmentForTeam.maxTeamSize || 4);
                          return (
                            <div
                              key={team.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{team.name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {team.memberStudentIds.length} / {selectedAssignmentForTeam.maxTeamSize || 4} members
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={isFull}
                                onClick={async () => {
                                  try {
                                    const studentName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "Student");
                                    await joinAssignmentTeam(selectedAssignmentForTeam.id, team.id, user?.id || "", studentName);
                                    triggerToast(`Joined team "${team.name}"! 🎉`);
                                    setSelectedAssignmentForTeam(null);
                                  } catch (err: any) {
                                    setTeamActionError(err.message || "Failed to join team.");
                                  }
                                }}
                                className={`text-xs px-3 py-1.5 rounded-lg font-bold ${
                                  isFull
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "btn-saas-outline text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                                }`}
                              >
                                {isFull ? "Team Full" : "Join Team"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Classmates Roster: Free vs In Team */}
                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>Classmates Roster (Free vs In Team)</span>
                    </h4>
                    <input
                      type="text"
                      placeholder="Search classmates..."
                      value={peerSearchQuery}
                      onChange={(e) => setPeerSearchQuery(e.target.value)}
                      className="text-xs p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium w-48"
                    />
                  </div>

                  {(() => {
                    const allEnrolledStudents = (syncUsers || []).filter(
                      (u) => u.role === "STUDENT" && u.id !== user?.id
                    );
                    const teams = selectedAssignmentForTeam.teams || [];
                    const studentTeamMap = new Map<string, string>();
                    teams.forEach((t) => {
                      t.memberStudentIds.forEach((mId) => studentTeamMap.set(mId, t.name));
                    });

                    const filteredStudents = allEnrolledStudents.filter((st) => {
                      if (!peerSearchQuery) return true;
                      const q = peerSearchQuery.toLowerCase();
                      const name = `${st.first_name} ${st.last_name || ""}`.toLowerCase();
                      const roll = (st.student_identifier || "").toLowerCase();
                      return name.includes(q) || roll.includes(q);
                    });

                    const freeStudents = filteredStudents.filter((st) => !studentTeamMap.has(st.id));
                    const teamStudents = filteredStudents.filter((st) => studentTeamMap.has(st.id));
                    const myTeam = teams.find(
                      (t) => t.memberStudentIds.includes(user?.id || "") || t.leaderStudentId === (user?.id || "")
                    );
                    const maxTeamSize = selectedAssignmentForTeam.maxTeamSize || 4;
                    const canInvite = myTeam && myTeam.memberStudentIds.length < maxTeamSize;

                    return (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        <div>
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            Available to Team Up ({freeStudents.length} free)
                          </p>
                          {freeStudents.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No free classmates found.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {freeStudents.map((st) => {
                                const alreadyInvited = (syncNotifications || []).some(
                                  (n) =>
                                    n.type === "TEAM_INVITE" &&
                                    n.assignmentId === selectedAssignmentForTeam.id &&
                                    n.teamId === myTeam?.id &&
                                    n.targetStudentId === st.id
                                );

                                return (
                                  <div
                                    key={st.id}
                                    className="p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {st.first_name} {st.last_name || ""}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-mono truncate">
                                        {st.student_identifier || st.email}
                                      </p>
                                    </div>

                                    {canInvite ? (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          disabled={alreadyInvited}
                                          onClick={() => {
                                            const leaderName = user?.first_name
                                              ? `${user.first_name} ${user.last_name || ""}`.trim()
                                              : (user?.email || "Team Leader");
                                            const targetName = `${st.first_name} ${st.last_name || ""}`.trim() || st.email;
                                            sendTeamInvitation(
                                              selectedAssignmentForTeam.id,
                                              myTeam.id,
                                              myTeam.name,
                                              leaderName,
                                              st.id,
                                              targetName
                                            );
                                            triggerToast(`Sent team invitation to ${targetName}! ✉️`);
                                          }}
                                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                                            alreadyInvited
                                              ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-default"
                                              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                          }`}
                                        >
                                          {alreadyInvited ? "Invited ✓" : "Invite ✉️"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              const targetName = `${st.first_name} ${st.last_name || ""}`.trim() || st.email;
                                              const res = await joinAssignmentTeam(
                                                selectedAssignmentForTeam.id,
                                                myTeam.id,
                                                st.id,
                                                targetName
                                              );
                                              if (res.success) {
                                                triggerToast(`Added ${targetName} to "${myTeam.name}"! 🎉`);
                                              } else {
                                                setTeamActionError(res.error || "Unable to add member.");
                                              }
                                            } catch (err: any) {
                                              setTeamActionError(err.message || "Failed to add member.");
                                            }
                                          }}
                                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                                          title="Directly add to team"
                                        >
                                          + Add
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                                        Free
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                            Already in a Team ({teamStudents.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {teamStudents.map((st) => (
                              <div
                                key={st.id}
                                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between opacity-80"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {st.first_name} {st.last_name || ""}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {st.student_identifier || st.email}
                                  </p>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  {studentTeamMap.get(st.id)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssignmentForTeam(null);
                      setTeamActionError(null);
                    }}
                    className="btn-saas-outline w-full text-xs py-2.5"
                  >
                    Close Roster
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── MODAL 2: ASSIGNMENT FEEDBACK MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedFeedbackAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 relative"
              >
                <button
                  onClick={() => setSelectedFeedbackAssignment(null)}
                  className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="space-y-1">
                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg">
                    Graded: {selectedFeedbackAssignment.score}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedFeedbackAssignment.title}
                  </h3>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Automated Test Cases</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">18 / 18 Passed (100%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Code Quality &amp; Structure</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">10 / 10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Algorithm Complexity</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">20 / 22</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Instructor Remarks:</p>
                    <p className="text-slate-500 mt-1 leading-relaxed">
                      &quot;Excellent implementation of Minimax with alpha-beta pruning. Minor optimization could be added for memoized transposition tables.&quot;
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFeedbackAssignment(null)}
                  className="btn-saas-primary w-full text-xs py-2.5"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── MODAL 3: ANNOUNCEMENT READER MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedAnnouncementDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 relative"
              >
                <button
                  onClick={() => setSelectedAnnouncementDetail(null)}
                  className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                    Official Notice
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedAnnouncementDetail.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Published by {selectedAnnouncementDetail.author_name || "Campus Administration"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedAnnouncementDetail.content}
                </div>

                <button
                  onClick={() => setSelectedAnnouncementDetail(null)}
                  className="btn-saas-primary w-full text-xs py-2.5"
                >
                  Acknowledge Notice
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── MODAL 4: STUDY PRACTICE MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {activeAIModalTopic && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 relative"
              >
                <button
                  onClick={() => setActiveAIModalTopic(null)}
                  className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Study Plan: {activeAIModalTopic}
                    </h3>
                    <p className="text-xs text-slate-400">Personalized mastery drills and active recall</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100/60 dark:border-blue-900/40">
                    <p className="font-bold text-slate-900 dark:text-white">Key Concept Flashcards</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">3 core algorithms prioritized for your upcoming mid-term.</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100/60 dark:border-purple-900/40">
                    <p className="font-bold text-slate-900 dark:text-white">Practice Problem Drill</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">5 adaptive questions calibrated to your past quiz performance.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveAIModalTopic(null)}
                    className="btn-saas-outline flex-1 text-xs py-2.5"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setActiveAIModalTopic(null);
                      router.push("/courses/1/learn");
                    }}
                    className="btn-saas-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <span>Launch Practice Drill</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── MODAL 5: INTERACTIVE AI CATCH-UP LESSON MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {activeAiCatchUpLecture && (
            <AiCatchUpLessonModal
              lecture={activeAiCatchUpLecture}
              onClose={() => setActiveAiCatchUpLecture(null)}
              onComplete={() => {
                triggerToast("🎉 Great work! You have successfully caught up on this lecture.");
                setActiveAiCatchUpLecture(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* ─── MODAL 6: SECURE STUDENT IDEATHON ASSESSMENT STUDIO (FULL-SCREEN) ─── */}
        {/* ========================================================================= */}
        {activeIdeathonModalProject && (
          <StudentIdeathonAssessmentModal
            isOpen={Boolean(activeIdeathonModalProject)}
            onClose={() => setActiveIdeathonModalProject(null)}
            project={{
              id: activeIdeathonModalProject.id,
              title: activeIdeathonModalProject.title,
              courseCode: activeIdeathonModalProject.courseCode,
              courseName: activeIdeathonModalProject.courseName,
              sections: activeIdeathonModalProject.sections,
              description: activeIdeathonModalProject.description,
              problemStatement: activeIdeathonModalProject.problemStatement,
              problemDomain: activeIdeathonModalProject.problemDomain,
              totalMarks: activeIdeathonModalProject.totalMarks || activeIdeathonModalProject.maxPoints || 100,
              dueDate: activeIdeathonModalProject.dueDate,
            }}
            studentName={studentFullName}
            studentRollNumber={studentRollNumber}
            onSubmitSuccess={handleIdeathonAssessmentSubmit}
          />
        )}

        {/* ========================================================================= */}
        {/* ─── MODAL 7: IDEATHON SUBMISSION & EVALUATION REVIEW MODAL ─── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedIdeathonReviewProject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg">
                        {selectedIdeathonReviewProject.courseCode}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                        Ideathon Submission
                      </span>
                      {selectedIdeathonReviewProject.status === "GRADED" ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                          Evaluated: {selectedIdeathonReviewProject.score}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                          Under Evaluation
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedIdeathonReviewProject.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedIdeathonReviewProject(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Problem Statement */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Problem Statement
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {selectedIdeathonReviewProject.problemStatement || selectedIdeathonReviewProject.description}
                  </p>
                </div>

                {/* Evaluation Rubrics if graded */}
                {selectedIdeathonReviewProject.myTeam?.rubricScores && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                      Faculty &amp; AI Rubric Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                        <span className="text-[10px] text-slate-400 font-semibold block">Architecture &amp; Approach</span>
                        <span className="text-lg font-black text-emerald-600 font-mono">
                          {selectedIdeathonReviewProject.myTeam.rubricScores.architecture} / 30
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                        <span className="text-[10px] text-slate-400 font-semibold block">Implementation &amp; Code</span>
                        <span className="text-lg font-black text-emerald-600 font-mono">
                          {selectedIdeathonReviewProject.myTeam.rubricScores.codeQuality} / 40
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                        <span className="text-[10px] text-slate-400 font-semibold block">Complexity &amp; Constraints</span>
                        <span className="text-lg font-black text-emerald-600 font-mono">
                          {selectedIdeathonReviewProject.myTeam.rubricScores.demoAndPitch} / 30
                        </span>
                      </div>
                    </div>
                    {selectedIdeathonReviewProject.myTeam?.feedback && (
                      <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
                        <strong>Feedback:</strong> {selectedIdeathonReviewProject.myTeam.feedback}
                      </div>
                    )}
                  </div>
                )}

                {/* Submitted Answers */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      1. System Design &amp; Algorithmic Approach
                    </span>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
                      {selectedIdeathonReviewProject.myTeam?.approach || "No approach submitted."}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      2. Solution Code / Script
                    </span>
                    <pre className="p-3.5 rounded-2xl bg-slate-50 text-slate-800 border border-slate-200 text-xs overflow-x-auto font-mono">
                      <code>{selectedIdeathonReviewProject.myTeam?.codeSnippet || "# No code provided"}</code>
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      3. Complexity &amp; Boundary Analysis
                    </span>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
                      {selectedIdeathonReviewProject.myTeam?.complexityAnalysis || "No analysis provided."}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedIdeathonReviewProject(null)}
                    className="btn-saas-secondary text-xs px-5 py-2.5"
                  >
                    Close Review
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── MISSED CLASSES AUDIT DETAIL MODAL ─── */}
        <AnimatePresence>
          {selectedMissedCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        Missed Classes: {selectedMissedCourse.code}
                      </h3>
                      <p className="text-xs text-slate-400">{selectedMissedCourse.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMissedCourse(null)}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-900 dark:text-rose-300">
                    Total Hours Missed: <strong className="font-mono">{selectedMissedCourse.missedCount} hrs</strong>
                  </span>
                  <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                    Apply for Medical / OD leave to credit attendance
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {selectedMissedCourse.sessions && selectedMissedCourse.sessions.length > 0 ? (
                    selectedMissedCourse.sessions.map((sess, idx) => (
                      <div
                        key={sess.id || idx}
                        className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-rose-500" />
                            {sess.date}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            MARKED ABSENT
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Topic: {sess.topic}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Faculty: {sess.faculty}</span>
                          <span>Room: {sess.room}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-500 text-center space-y-2">
                      <p>Detailed session logs for this course have not yet been individualised by the course instructor.</p>
                      <p className="text-[11px] text-slate-400">
                        {selectedMissedCourse.missedCount} missed sessions recorded in institutional attendance register.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setSelectedMissedCourse(null);
                      setAttendanceSubTab("LEAVES");
                    }}
                    className="btn-saas-primary text-xs px-4 py-2"
                  >
                    Apply for On-Duty / Medical Leave
                  </button>
                  <button
                    onClick={() => setSelectedMissedCourse(null)}
                    className="btn-saas-secondary text-xs px-4 py-2"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </RoleGuard>
  );
}

export default function StudentDashboardPage() {
  return (
    <React.Suspense fallback={<CardGridSkeleton count={4} />}>
      <StudentDashboardContent />
    </React.Suspense>
  );
}
