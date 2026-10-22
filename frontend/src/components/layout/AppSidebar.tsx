"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getUserAvatarUrl } from "@/lib/avatar";
import {
  LayoutDashboard,
  Home,
  Landmark,
  Network,
  Sparkles,
  BookOpen,
  ClipboardList,
  FileCheck,
  GraduationCap,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Menu,
  Users,
  Building2,
  ShieldCheck,
  Settings,
  ChartBar,
  Award,
  Database,
  BarChart3,
  PlayCircle,
  Folder,
  User,
  Megaphone,
  Layers,
  DoorOpen,
  X,
  Swords,
  BrainCircuit,
  ShieldAlert,
  Trophy,
  Zap,
  FolderKanban,
  UserCheck,
  CalendarDays,
  CalendarCheck,
  Activity,
  Clock,
  Search,
  Check,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  tab?: string;
  alternateTabs?: string[];
  badge?: number | string;
  badgeType?: "pink" | "purple" | "blue" | "default";
}

interface NavSection {
  sectionTitle?: string;
  items: NavItem[];
}

interface DynamicCounts {
  assignments?: number;
  caseStudies?: number;
  notices?: number;
  speedgrader?: number;
  gradeApprovals?: number;
  moduleFeedback?: number;
}

function getRoleSections(role: string, counts: DynamicCounts, isHallTicketsReleased?: boolean): NavSection[] {
  const allSections: Record<string, NavSection[]> = {
    STUDENT: [
      {
        sectionTitle: "MAIN",
        items: [
          { title: "Dashboard", href: "/student", icon: <Home className="h-4 w-4" /> },
          { title: "My Courses", href: "/student?tab=courses", icon: <BookOpen className="h-4 w-4" />, tab: "courses" },
          {
            title: "Leave & OD Application",
            href: "/student?tab=leaves",
            icon: <ShieldCheck className="h-4 w-4" />,
            tab: "leaves",
            alternateTabs: ["leave", "student-leaves"],
          },
        ],
      },
      {
        sectionTitle: "ACADEMIC",
        items: [
          {
            title: "Assignments",
            href: "/student?tab=assignments",
            icon: <ClipboardList className="h-4 w-4" />,
            tab: "assignments",
            badge: counts.assignments && counts.assignments > 0 ? String(counts.assignments) : undefined,
            badgeType: "blue",
          },
          {
            title: "Projects & Ideathons",
            href: "/student?tab=projects",
            icon: <FolderKanban className="h-4 w-4" />,
            tab: "projects",
            alternateTabs: ["ideathons", "team-projects"],
          },
          { title: "Live Session / Quiz", href: "/student?tab=live-assessment", icon: <Zap className="h-4 w-4" />, tab: "live-assessment", alternateTabs: ["live-quiz"] },
          { title: "Quizzes & Tests", href: "/student?tab=quizzes", icon: <FileCheck className="h-4 w-4" />, tab: "quizzes" },
          {
            title: "Case Studies",
            href: "/student?tab=case-studies",
            icon: <BrainCircuit className="h-4 w-4" />,
            tab: "case-studies",
            alternateTabs: ["case-study"],
            badge: counts.caseStudies && counts.caseStudies > 0 ? String(counts.caseStudies) : undefined,
            badgeType: "blue",
          },
          { title: "Gradebook & Results", href: "/student?tab=gradebook", icon: <Award className="h-4 w-4" />, tab: "gradebook", alternateTabs: ["results", "semester-results", "progress"] },
          { title: "Class Timetable", href: "/student?tab=schedule", icon: <Calendar className="h-4 w-4" />, tab: "schedule", alternateTabs: ["timetable", "calendar"] },
          ...(isHallTicketsReleased
            ? [
                {
                  title: "Hall Ticket (Admit Card)",
                  href: "/student?tab=hall-ticket",
                  icon: <Award className="h-4 w-4" />,
                  tab: "hall-ticket",
                  alternateTabs: ["admit-card"],
                },
              ]
            : []),
          { title: "Faculty & Cabins", href: "/student?tab=faculty-directory", icon: <Users className="h-4 w-4" />, tab: "faculty-directory", alternateTabs: ["faculty-consultation"] },
        ],
      },
      {
        sectionTitle: "COMMUNICATION",
        items: [
          { title: "Course Discussions", href: "/student?tab=discussions", icon: <MessageSquare className="h-4 w-4" />, tab: "discussions" },
          {
            title: "Notices",
            href: "/student?tab=notifications",
            icon: <Megaphone className="h-4 w-4" />,
            tab: "notifications",
            badge: counts.notices && counts.notices > 0 ? String(counts.notices) : undefined,
            badgeType: "blue",
          },
        ],
      },
      {
        sectionTitle: "AI & CAREER",
        items: [
          {
            title: "Study Support",
            href: "/student?tab=ai-tutor",
            icon: <Sparkles className="h-4 w-4" />,
            tab: "ai-tutor",
            alternateTabs: ["tutor"],
          },
          {
            title: "Interview Practice",
            href: "/student?tab=mock-interview",
            icon: <Briefcase className="h-4 w-4" />,
            tab: "mock-interview",
            alternateTabs: ["interview", "career"],
          },
        ],
      },
    ],
    FACULTY: [
      {
        sectionTitle: "MAIN",
        items: [
          { title: "Dashboard", href: "/faculty", icon: <Home className="h-4 w-4" /> },
          { title: "Course Modules", href: "/faculty?tab=modules", icon: <Layers className="h-4 w-4" />, tab: "modules" },
          { title: "Module Feedback", href: "/faculty?tab=module-feedback", icon: <MessageSquare className="h-4 w-4" />, tab: "module-feedback", alternateTabs: ["feedback"] },
        ],
      },
      {
        sectionTitle: "ACADEMIC",
        items: [
          { title: "Quizzes & Tests", href: "/faculty?tab=quizzes", icon: <FileCheck className="h-4 w-4" />, tab: "quizzes", alternateTabs: ["quiz-analytics", "live-quiz"] },
          { title: "Case Studies", href: "/faculty?tab=case-studies", icon: <BrainCircuit className="h-4 w-4" />, tab: "case-studies" },
          { title: "Live Quiz Host", href: "/faculty?tab=live-quiz", icon: <Zap className="h-4 w-4" />, tab: "live-quiz", alternateTabs: ["live-assessment"] },
          {
            title: "Submissions",
            href: "/faculty?tab=speedgrader",
            icon: <FileCheck className="h-4 w-4" />,
            tab: "speedgrader",
            badge: counts.speedgrader && counts.speedgrader > 0 ? String(counts.speedgrader) : undefined,
          },
          { title: "Student Support Alerts", href: "/faculty?tab=at-risk", icon: <ShieldAlert className="h-4 w-4" />, tab: "at-risk" },
          {
            title: "Student Leaves & OD",
            href: "/faculty?tab=student-leaves",
            icon: <FileCheck className="h-4 w-4" />,
            tab: "student-leaves",
            alternateTabs: ["leaves", "od-leaves"],
          },
          { title: "Assignments", href: "/faculty?tab=assignments", icon: <ClipboardList className="h-4 w-4" />, tab: "assignments" },
          { title: "Projects & Ideathons", href: "/faculty?tab=projects", icon: <FolderKanban className="h-4 w-4" />, tab: "projects", alternateTabs: ["ideathons", "team-projects"] },
          { title: "Gradebook", href: "/faculty?tab=gradebook", icon: <Award className="h-4 w-4" />, tab: "gradebook" },
          { title: "Class Timetable", href: "/faculty?tab=timetable", icon: <Calendar className="h-4 w-4" />, tab: "timetable", alternateTabs: ["schedule"] },
        ],
      },
      {
        sectionTitle: "COMMUNICATION",
        items: [
          { title: "Class Discussions", href: "/faculty?tab=discussions", icon: <MessageSquare className="h-4 w-4" />, tab: "discussions" },
          { title: "1:1 Consultations", href: "/faculty?tab=consultations", icon: <CalendarCheck className="h-4 w-4" />, tab: "consultations", alternateTabs: ["doubt-appointments"] },
        ],
      },
    ],
    HOD: [
      {
        sectionTitle: "DEPARTMENT",
        items: [
          { title: "Department Overview", href: "/hod", icon: <Home className="h-4 w-4" /> },
          { title: "Department Courses", href: "/hod?tab=courses", icon: <BookOpen className="h-4 w-4" />, tab: "courses" },
          { title: "Study Materials", href: "/hod?tab=modules", icon: <Layers className="h-4 w-4" />, tab: "modules" },
          { title: "Module Feedback Audit", href: "/hod?tab=module-feedback", icon: <MessageSquare className="h-4 w-4" />, tab: "module-feedback", alternateTabs: ["feedback"] },
        ],
      },
      {
        sectionTitle: "ACADEMIC OPS",
        items: [
          { title: "Student Support Alerts", href: "/hod?tab=at-risk", icon: <ShieldAlert className="h-4 w-4" />, tab: "at-risk" },
          {
            title: "Grade Approvals",
            href: "/hod?tab=approvals",
            icon: <Award className="h-4 w-4" />,
            tab: "approvals",
            badge: counts.gradeApprovals && counts.gradeApprovals > 0 ? String(counts.gradeApprovals) : undefined,
          },
          {
            title: "Student OD & Leaves",
            href: "/hod?tab=student-leaves",
            icon: <FileCheck className="h-4 w-4" />,
            tab: "student-leaves",
          },
          { title: "Students", href: "/hod?tab=students", icon: <GraduationCap className="h-4 w-4" />, tab: "students" },
          { title: "Faculty Directory", href: "/hod?tab=faculty", icon: <Users className="h-4 w-4" />, tab: "faculty" },
          { title: "Department Timetable", href: "/hod?tab=timetable", icon: <Calendar className="h-4 w-4" />, tab: "timetable", alternateTabs: ["calendar"] },
        ],
      },
    ],
    VC: [
      {
        sectionTitle: "EXECUTIVE",
        items: [
          { title: "Command Cockpit", href: "/vc", icon: <Home className="h-4 w-4" /> },
          { title: "Exam & Results", href: "/vc?tab=results", icon: <Award className="h-4 w-4" />, tab: "results", alternateTabs: ["analytics"] },
          { title: "Institutional Attendance", href: "/vc?tab=attendance", icon: <Clock className="h-4 w-4" />, tab: "attendance" },
          { title: "Retention & At-Risk", href: "/vc?tab=intelligence", icon: <Activity className="h-4 w-4" />, tab: "intelligence" },
        ],
      },
      {
        sectionTitle: "GOVERNANCE",
        items: [
          {
            title: "Grade Authorizations",
            href: "/vc?tab=approvals",
            icon: <ShieldCheck className="h-4 w-4" />,
            tab: "approvals",
            badge: counts.gradeApprovals && counts.gradeApprovals > 0 ? String(counts.gradeApprovals) : undefined,
          },
          { title: "Schools & Departments", href: "/vc?tab=curriculum", icon: <Building2 className="h-4 w-4" />, tab: "curriculum", alternateTabs: ["departments"] },
          { title: "Faculty Roster", href: "/vc?tab=faculty", icon: <Users className="h-4 w-4" />, tab: "faculty" },
          { title: "Student Census", href: "/vc?tab=students", icon: <GraduationCap className="h-4 w-4" />, tab: "students" },
          { title: "Campus Timetable", href: "/vc?tab=timetable", icon: <Calendar className="h-4 w-4" />, tab: "timetable" },
        ],
      },
    ],
    ADMIN: [
      {
        sectionTitle: "MAIN",
        items: [
          { title: "Dashboard", href: "/admin", icon: <Home className="h-4 w-4" /> },
          { title: "Timetable & Calendar", href: "/admin?tab=timetable", icon: <Calendar className="h-4 w-4" />, tab: "timetable", alternateTabs: ["schedule"] },
          { title: "Courses & Syllabus", href: "/admin?tab=courses", icon: <BookOpen className="h-4 w-4" />, tab: "courses" },
          { title: "Classrooms & Halls", href: "/admin?tab=rooms", icon: <Landmark className="h-4 w-4" />, tab: "rooms" },
        ],
      },
      {
        sectionTitle: "PEOPLE",
        items: [
          { title: "User Directory & Logins", href: "/admin?tab=users", icon: <Users className="h-4 w-4" />, tab: "users" },
          { title: "Event & Bulk Attendance", href: "/admin?tab=event-attendance", icon: <CalendarCheck className="h-4 w-4" />, tab: "event-attendance", alternateTabs: ["bulk-attendance", "events"] },
          { title: "Student Admissions", href: "/admin?tab=admissions", icon: <GraduationCap className="h-4 w-4" />, tab: "admissions" },
          { title: "Departments & Classes", href: "/admin?tab=departments", icon: <Network className="h-4 w-4" />, tab: "departments" },
        ],
      },
      {
        sectionTitle: "SYSTEM & SETTINGS",
        items: [
          { title: "Analytics & Reports", href: "/admin?tab=analytics", icon: <BarChart3 className="h-4 w-4" />, tab: "analytics" },
          { title: "Academic Terms", href: "/admin?tab=terms", icon: <Database className="h-4 w-4" />, tab: "terms" },
          { title: "College Policies", href: "/admin?tab=policies", icon: <ShieldCheck className="h-4 w-4" />, tab: "policies" },
          { title: "Activity Logs", href: "/admin?tab=audit", icon: <ClipboardList className="h-4 w-4" />, tab: "audit" },
        ],
      },
    ],
    ADMINISTRATOR: [
      {
        sectionTitle: "MAIN",
        items: [
          { title: "Dashboard", href: "/admin", icon: <Home className="h-4 w-4" /> },
          { title: "Timetable & Calendar", href: "/admin?tab=timetable", icon: <Calendar className="h-4 w-4" />, tab: "timetable", alternateTabs: ["schedule"] },
          { title: "Courses & Syllabus", href: "/admin?tab=courses", icon: <BookOpen className="h-4 w-4" />, tab: "courses" },
          { title: "Classrooms & Halls", href: "/admin?tab=rooms", icon: <Landmark className="h-4 w-4" />, tab: "rooms" },
        ],
      },
      {
        sectionTitle: "PEOPLE",
        items: [
          { title: "User Directory & Logins", href: "/admin?tab=users", icon: <Users className="h-4 w-4" />, tab: "users" },
          { title: "Event & Bulk Attendance", href: "/admin?tab=event-attendance", icon: <CalendarCheck className="h-4 w-4" />, tab: "event-attendance", alternateTabs: ["bulk-attendance", "events"] },
          { title: "Student Admissions", href: "/admin?tab=admissions", icon: <GraduationCap className="h-4 w-4" />, tab: "admissions" },
          { title: "Departments & Classes", href: "/admin?tab=departments", icon: <Network className="h-4 w-4" />, tab: "departments" },
        ],
      },
      {
        sectionTitle: "SYSTEM & SETTINGS",
        items: [
          { title: "Analytics & Reports", href: "/admin?tab=analytics", icon: <BarChart3 className="h-4 w-4" />, tab: "analytics" },
          { title: "Academic Terms", href: "/admin?tab=terms", icon: <Database className="h-4 w-4" />, tab: "terms" },
          { title: "College Policies", href: "/admin?tab=policies", icon: <ShieldCheck className="h-4 w-4" />, tab: "policies" },
          { title: "Activity Logs", href: "/admin?tab=audit", icon: <ClipboardList className="h-4 w-4" />, tab: "audit" },
        ],
      },
    ],
    EXAMINATION: [
      {
        sectionTitle: "OPERATIONS",
        items: [
          { title: "Exam Dashboard", href: "/examination?tab=overview", icon: <Home className="h-4 w-4" />, tab: "overview" },
          { title: "Semester Timetables", href: "/examination?tab=schedules", icon: <Calendar className="h-4 w-4" />, tab: "schedules", alternateTabs: ["schedule"] },
          { title: "Multi-Hall Seating Plan", href: "/examination?tab=seating", icon: <Building2 className="h-4 w-4" />, tab: "seating" },
        ],
      },
      {
        sectionTitle: "ASSESSMENT & GRADES",
        items: [
          { title: "Clearance & Admit Cards", href: "/examination?tab=hall-tickets", icon: <FileCheck className="h-4 w-4" />, tab: "hall-tickets", alternateTabs: ["halltickets"] },
          { title: "Question Paper Vault", href: "/examination?tab=question-bank", icon: <ShieldCheck className="h-4 w-4" />, tab: "question-bank", alternateTabs: ["papers"] },
          { title: "Marks Entry & SEE Policy", href: "/examination?tab=evaluations", icon: <Award className="h-4 w-4" />, tab: "evaluations", alternateTabs: ["results", "evaluation", "grades"] },
        ],
      },
    ],
  };

  return allSections[role] || allSections.STUDENT;
}

import { useAcademicData } from "@/context/AcademicDataContext";

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const {
    courses,
    currentSemester,
    assignments,
    caseStudies,
    notifications,
    announcements,
    submissions,
    gradeSheets,
    studentAttendancePct,
    studentClassesAttended,
    studentTotalClasses,
    courseModules,
    moduleFeedbacks,
    isHallTicketsReleased,
  } = useAcademicData();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [portalOpen, setPortalOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [isHovered, setIsHovered] = React.useState<boolean>(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate collapsed state from localStorage (defaults to true for hover-expand sidebar)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartedu_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      } else {
        setIsCollapsed(false);
      }
    }
  }, []);

  const handleMouseEnter = React.useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (isCollapsed) {
      setIsHovered(true);
    }
  }, [isCollapsed]);

  const handleMouseLeave = React.useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setProfileOpen(false);
    }, 150);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("smartedu_sidebar_collapsed", String(next));
      }
      return next;
    });
    setIsHovered(false);
  }, []);

  const isEffectiveCollapsed = isCollapsed && !isHovered;

  // Keyboard shortcut: Alt+S or Cmd+B / Ctrl+B to toggle sidebar collapse
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.key.toLowerCase() === "s") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b")
      ) {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  const role = user?.role?.name?.toUpperCase() || "STUDENT";
  const userName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email : "User";
  const userInitials = user
    ? `${(user.first_name || "")[0] || ""}${(user.last_name || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateAvatar = () => {
      setAvatarUrl(getUserAvatarUrl(user));
    };
    updateAvatar();
    window.addEventListener("user-avatar-updated", updateAvatar);
    return () => window.removeEventListener("user-avatar-updated", updateAvatar);
  }, [user]);

  const dynamicCounts = React.useMemo<DynamicCounts>(() => {
    const activeAssignments = assignments.filter((a) => a.status === "ACTIVE" || !a.status).length;

    // Strictly count only case studies assigned to the logged-in student
    const sId = user?.id || "";
    const sEmail = (user?.email || "").toLowerCase().trim();
    const sName = userName.toLowerCase().trim();
    const sRoll = ((user as any)?.student_identifier || (user as any)?.roll_number || (user as any)?.rollNumber || "").toLowerCase().trim();

    const activeCaseStudies =
      role === "STUDENT"
        ? (caseStudies || []).filter((cs) => {
            if (!cs || cs.status === "ARCHIVED") return false;
            if (Array.isArray(cs.teams) && cs.teams.length > 0) {
              return cs.teams.some(
                (t) =>
                  Array.isArray(t.members) &&
                  t.members.some((m) => {
                    if (sId && m.studentId === sId) return true;
                    if (sEmail && (m.studentEmail || "").toLowerCase().trim() === sEmail) return true;
                    if (sRoll && (m.studentRollNo || m.rollNo || "").toLowerCase().trim() === sRoll) return true;
                    const mName = (m.studentName || "").toLowerCase().trim();
                    if (sName && mName && (mName === sName || mName.split(/\s+/)[0] === sName.split(/\s+/)[0])) return true;
                    return false;
                  })
              );
            }
            return false;
          }).length
        : caseStudies.length;

    const unreadNotices = notifications.filter((n) => !n.isRead).length + announcements.length;
    const pendingGrading = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "NEEDS_GRADING" || s.score === undefined).length;
    const pendingApprovals = gradeSheets.filter((g) => g.status === "SUBMITTED").length;

    // Calculate pending module feedbacks for student
    let pendingFeedback = 0;
    if (role === "STUDENT") {
      const completedCount = (courseModules || []).filter((m) => m.status === "COMPLETED").length;
      const myCount = (moduleFeedbacks || []).filter((fb) => {
        const fbRoll = (fb.studentRollNo || "").toLowerCase().trim();
        return (sRoll && fbRoll === sRoll) || (fb.studentId && fb.studentId === sId);
      }).length;
      pendingFeedback = Math.max(0, completedCount - myCount);
    }

    return {
      assignments: activeAssignments,
      caseStudies: activeCaseStudies,
      notices: unreadNotices,
      speedgrader: pendingGrading,
      gradeApprovals: pendingApprovals,
      moduleFeedback: pendingFeedback,
    };
  }, [assignments, caseStudies, notifications, announcements, submissions, gradeSheets, role, user, userName, courseModules, moduleFeedbacks]);

  const [navSearch, setNavSearch] = React.useState("");
  const activePortalRole = React.useMemo(() => {
    if (pathname.startsWith("/examination")) return "EXAMINATION";
    if (pathname.startsWith("/vc")) return "VC";
    if (pathname.startsWith("/hod")) return "HOD";
    if (pathname.startsWith("/faculty")) return "FACULTY";
    if (pathname.startsWith("/admin")) return "ADMIN";
    if (pathname.startsWith("/student")) return "STUDENT";
    return role;
  }, [pathname, role]);

  const sections = React.useMemo(
    () => getRoleSections(activePortalRole, dynamicCounts, isHallTicketsReleased),
    [activePortalRole, dynamicCounts, isHallTicketsReleased]
  );

  const filteredSections = React.useMemo(() => {
    if (!navSearch.trim()) return sections;
    const q = navSearch.toLowerCase().trim();
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (sec.sectionTitle && sec.sectionTitle.toLowerCase().includes(q))
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, navSearch]);

  const currentTab = searchParams.get("tab");

  const studentGPA = "N/A";
  const attendancePercent = studentAttendancePct ?? (studentTotalClasses > 0
    ? Math.round((studentClassesAttended / studentTotalClasses) * 1000) / 10
    : 0);

  const studentActiveCoursesCount = React.useMemo(() => {
    if (role !== "STUDENT") return courses.length;
    if (!currentSemester) return courses.length;
    const semNum = currentSemester;
    const semCourses = courses.filter((c) => {
      const s = (c.semester || "").toLowerCase();
      return s.includes(`semester ${semNum}`) || s.includes(`sem ${semNum}`) || s === String(semNum);
    });
    return semCourses.length;
  }, [role, courses, currentSemester]);

  const facultyAssignedCount = React.useMemo(() => {
    if (role !== "FACULTY" || !user) return 0;
    const curEmail = (user.email || "").toLowerCase().trim();
    const curName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().trim();
    return courses.filter((c) => {
      const inst = (c.instructor || "").toLowerCase().trim();
      if (inst && (inst === curName || inst.includes(curName) || curName.includes(inst))) return true;
      if (Array.isArray((c as any).instructors)) {
        return (c as any).instructors.some((i: any) => {
          const iEmail = (i.faculty_email || i.email || "").toLowerCase().trim();
          const iName = (i.faculty_name || i.name || "").toLowerCase().trim();
          return (curEmail && iEmail === curEmail) || (curName && (iName.includes(curName) || curName.includes(iName)));
        });
      }
      return false;
    }).length;
  }, [role, user, courses]);

  const allPortals = [
    { name: "Student Portal", href: "/student", role: "STUDENT", icon: GraduationCap },
    { name: "Faculty Portal", href: "/faculty", role: "FACULTY", icon: Users },
    { name: "HOD Portal", href: "/hod", role: "HOD", icon: Building2 },
    { name: "VC Portal", href: "/vc", role: "VC", icon: Award },
    { name: "Admin Portal", href: "/admin", role: "ADMIN", icon: ShieldCheck },
    { name: "Exam Portal", href: "/examination", role: "EXAMINATION", icon: Award },
  ];

  return (
    <motion.aside
      initial={false}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        width: isEffectiveCollapsed ? 68 : 248,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 32,
      }}
      className={cn(
        "hidden lg:flex shrink-0 flex-col h-full bg-[#F8FAFC] dark:bg-[#0D1322] border-r border-slate-200/90 dark:border-slate-800/90 select-none overflow-hidden transition-colors shadow-2xs",
        isCollapsed && isHovered && "z-50"
      )}
    >
      {/* 1. Top Brand Floating Card - Aligns with TopHeader */}
      <div
        className={cn(
          "h-14 px-3 bg-transparent border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 transition-all",
          isEffectiveCollapsed && "justify-center px-1.5"
        )}
      >
        <div className={cn("flex items-center justify-between min-w-0 w-full", isEffectiveCollapsed && "justify-center")}>
          {isEffectiveCollapsed ? (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={toggleCollapsed}
              className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-xs cursor-pointer overflow-hidden"
              title="Expand sidebar"
            >
              <img
                src="/uniflow-logo.png"
                alt="UniFlow"
                className="h-7 w-7 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
              />
            </motion.button>
          ) : (
            <>
              <Link
                href={`/${role.toLowerCase()}`}
                className="flex items-center gap-2.5 min-w-0 group"
                title="UniFlow Portal - University Management System"
              >
                <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img
                    src="/uniflow-logo.png"
                    alt="UniFlow Logo"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-[15px] text-slate-900 dark:text-slate-100 block leading-tight tracking-tight">
                    UniFlow
                  </span>
                  <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase leading-none mt-0.5 block">
                    UNIVERSITY LMS
                  </span>
                </div>
              </Link>

              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={toggleCollapsed}
                className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <Menu className="h-4 w-4" />
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Navigation Floating Card */}
      <div className="flex-1 bg-transparent flex flex-col justify-between overflow-hidden p-2.5 min-h-0 transition-colors">
        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3.5 pr-0.5">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {section.sectionTitle && !isEffectiveCollapsed && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 pt-1 pb-1 block">
                  {section.sectionTitle}
                </span>
              )}

              <div className="space-y-1">
                {section.items.map((item, iIdx) => {
                  let isActive = false;
                  if (!item.tab) {
                    isActive = pathname === item.href && !currentTab;
                  } else {
                    isActive = currentTab === item.tab || (item.alternateTabs?.includes(currentTab || "") ?? false);
                  }

                  return (
                    <div key={iIdx} className="relative group">
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center h-9 rounded-lg text-[13px] font-medium transition-[background-color,color,transform] duration-150",
                          isEffectiveCollapsed ? "justify-center px-0 w-10 mx-auto" : "px-3.5 justify-between",
                          isActive
                            ? "bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.22)]"
                            : "text-[#334155] dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800/70"
                        )}
                      >
                        <div className={cn("flex items-center gap-3 min-w-0", isEffectiveCollapsed && "justify-center")}>
                          <span
                            className={cn(
                              "shrink-0 transition-colors",
                              isActive
                                ? "text-white"
                                : "text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform"
                            )}
                          >
                            {item.icon}
                          </span>
                          {!isEffectiveCollapsed && (
                            <span className={cn(
                              "truncate tracking-tight font-semibold",
                              isActive ? "text-white" : "text-[#334155] dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            )}>
                              {item.title}
                            </span>
                          )}
                        </div>

                        {!isEffectiveCollapsed && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            {item.badge !== undefined && (
                              <span
                                className={cn(
                                  "h-4 min-w-[16px] px-1.5 rounded-full text-[10px] font-semibold font-mono flex items-center justify-center transition-all",
                                  isActive
                                    ? "bg-white/20 text-white border border-white/30 backdrop-blur-xs"
                                    : "bg-blue-50 text-blue-600 border border-blue-200"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                            {/* Chevron only on inactive items, exactly as reference image */}
                            {!isActive && (
                              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                            )}
                          </div>
                        )}

                        {/* Collapsed Tooltip */}
                        {isEffectiveCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold tracking-wide whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 flex items-center gap-1.5">
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-mono">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. User Profile Card at Bottom of Navigation Container (matches reference image: Blue circle initials, Name, Role, and Logout button) */}
        <div className="pt-2 mt-auto shrink-0 relative">
          <div
            className={cn(
              "rounded-lg bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/60 p-2 flex items-center justify-between transition-all",
              isEffectiveCollapsed && "p-1.5 justify-center"
            )}
          >
            <div
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity flex-1"
              title="Account Menu"
            >
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                <img
                  src={avatarUrl || getUserAvatarUrl(user)}
                  alt={userName}
                  className="h-full w-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("freepik")) {
                      target.src = "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg";
                    }
                  }}
                />
              </div>
              {!isEffectiveCollapsed && (
                <div className="text-left min-w-0 flex-1 ml-0.5">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {userName}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate leading-tight mt-0.5 capitalize">
                    {role === "ADMIN" || role === "ADMINISTRATOR"
                      ? "Administrator"
                      : role === "FACULTY"
                      ? "Faculty"
                      : role === "STUDENT"
                      ? "Student"
                      : role.toLowerCase()}
                  </p>
                </div>
              )}
            </div>

            {!isEffectiveCollapsed && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="h-9 w-9 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-500 hover:text-slate-800 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1.5"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
                  onClick={() => setProfileOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  className={cn(
                    "absolute p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 z-[100] isolate",
                    isEffectiveCollapsed
                      ? "left-full bottom-0 ml-3 w-60"
                      : "bottom-full mb-2.5 left-0 right-0"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {userName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email || "signed-in user"}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                      Active: {role}
                    </span>
                  </div>
                  <div className="pt-1 space-y-0.5">
                    <Link
                      href="/settings"
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Profile &amp; Settings</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

export function MobileSidebarDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const {
    assignments,
    notifications,
    announcements,
    submissions,
    gradeSheets,
    studentAttendancePct,
    studentClassesAttended,
    studentTotalClasses,
    currentSemester,
  } = useAcademicData();

  const role = user?.role?.name?.toUpperCase() || "STUDENT";

  const dynamicCounts = React.useMemo<DynamicCounts>(() => {
    const activeAssignments = assignments.filter((a) => a.status === "ACTIVE" || !a.status).length;
    const unreadNotices = notifications.filter((n) => !n.isRead).length + announcements.length;
    const pendingGrading = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "NEEDS_GRADING" || s.score === undefined).length;
    const pendingApprovals = gradeSheets.filter((g) => g.status === "SUBMITTED").length;

    return {
      assignments: activeAssignments,
      notices: unreadNotices,
      speedgrader: pendingGrading,
      gradeApprovals: pendingApprovals,
    };
  }, [assignments, notifications, announcements, submissions, gradeSheets]);

  const [mobileSearch, setMobileSearch] = React.useState("");
  const sections = React.useMemo(() => getRoleSections(role, dynamicCounts), [role, dynamicCounts]);

  const filteredSections = React.useMemo(() => {
    if (!mobileSearch.trim()) return sections;
    const q = mobileSearch.toLowerCase().trim();
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (sec.sectionTitle && sec.sectionTitle.toLowerCase().includes(q))
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, mobileSearch]);

  const currentTab = searchParams.get("tab");

  const userName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email : "User";
  const userInitials = user
    ? `${(user.first_name || "")[0] || ""}${(user.last_name || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateAvatar = () => {
      setAvatarUrl(getUserAvatarUrl(user));
    };
    updateAvatar();
    window.addEventListener("storage", updateAvatar);
    window.addEventListener("avatar-updated", updateAvatar);
    return () => {
      window.removeEventListener("storage", updateAvatar);
      window.removeEventListener("avatar-updated", updateAvatar);
    };
  }, [user]);

  const studentGPA = "N/A";
  const attendancePercent = studentAttendancePct ?? (studentTotalClasses > 0
    ? Math.round((studentClassesAttended / studentTotalClasses) * 1000) / 10
    : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Frosted Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Apple-style Spring Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="relative w-[300px] max-w-[85vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col justify-between h-full z-10 overflow-hidden"
          >
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/${role.toLowerCase()}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5"
                >
                  <div className="h-8.5 w-8.5 rounded-xl bg-white flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden border border-slate-200/80">
                    <img
                      src="/uniflow-logo.png"
                      alt="UniFlow Logo"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                  <div>
                    <span className="font-extrabold text-[16px] text-slate-900 dark:text-slate-100 block leading-none tracking-tight">
                      UniFlow
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase leading-none mt-1 block">
                      UNIVERSITY LMS
                    </span>
                  </div>
                </Link>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Mobile Quick Search Input */}
              <div className="px-3 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={mobileSearch}
                    onChange={(e) => setMobileSearch(e.target.value)}
                    placeholder="Search views..."
                    className="w-full h-8 pl-8.5 pr-7 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  {mobileSearch && (
                    <button
                      type="button"
                      onClick={() => setMobileSearch("")}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Nav Sections */}
              <div className="p-3 space-y-3.5">
                {filteredSections.length === 0 ? (
                  <div className="py-8 px-2 text-center">
                    <p className="text-xs text-slate-400">No views found matching "{mobileSearch}"</p>
                    <button
                      type="button"
                      onClick={() => setMobileSearch("")}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredSections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      {section.sectionTitle && (
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 mb-1 block">
                          {section.sectionTitle}
                        </span>
                      )}

                      <div className="space-y-1">
                        {section.items.map((item, iIdx) => {
                          let isActive = false;
                          if (!item.tab) {
                            isActive = pathname === item.href && !currentTab;
                          } else {
                            isActive =
                              currentTab === item.tab ||
                              (item.alternateTabs?.includes(currentTab || "") ?? false);
                          }

                          return (
                            <Link
                              key={iIdx}
                              href={item.href}
                              onClick={onClose}
                              className={cn(
                                "relative flex items-center justify-between h-10 px-3.5 rounded-2xl text-[13px] font-semibold transition-all duration-150 group active:scale-[0.98]",
                                isActive
                                  ? "bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                                  : "text-[#334155] dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={cn(
                                    "shrink-0 transition-colors",
                                    isActive
                                      ? "text-white"
                                      : "text-blue-600 dark:text-blue-400"
                                  )}
                                >
                                  {item.icon}
                                </span>
                                <span className="truncate">{item.title}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                {item.badge !== undefined && (
                                  <span
                                    className={cn(
                                      "h-4 min-w-[16px] px-1.5 rounded-full text-[10px] font-semibold font-mono flex items-center justify-center",
                                      isActive
                                        ? "bg-white/20 text-white border border-white/30 backdrop-blur-xs"
                                        : "bg-blue-50 text-blue-600 border border-blue-200"
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                                {!isActive && (
                                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Metrics Capsule on Mobile */}
              <div className="p-3 pt-0">
                {role === "STUDENT" && (
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50/60 to-slate-50 dark:from-slate-800/60 dark:to-slate-800/30 border border-blue-100/80 dark:border-slate-800 text-xs space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Academic Standing
                    </span>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Semester:{" "}
                        <strong className="text-blue-600 dark:text-blue-400 font-mono">
                          {currentSemester ? `Sem ${currentSemester}` : "Not set"}
                        </strong>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Attendance:{" "}
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {attendancePercent}%
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Profile & Sign Out Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-slate-800 shadow-xs overflow-hidden">
                  <img
                    src={avatarUrl || getUserAvatarUrl(user)}
                    alt={userName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes("freepik")) {
                        target.src = "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg";
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate capitalize">
                    {role.toLowerCase()}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
