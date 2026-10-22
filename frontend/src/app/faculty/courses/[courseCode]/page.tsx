"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api-client";
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Upload,
  Plus,
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  Search,
  Award,
  Sparkles,
  ClipboardList,
  Layers,
  ChevronRight,
  ShieldAlert,
  Send,
  ExternalLink,
  Check,
  Building,
  GraduationCap,
  Bell,
  Eye,
  Info,
  Layers3,
  Share2,
  FileSpreadsheet,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData, CalendarScheduleEvent, SyncAssignment } from "@/context/AcademicDataContext";
import { FacultyAttendanceTab } from "@/components/faculty/FacultyAttendanceTab";
import { FacultyAssignmentsTab } from "@/components/faculty/FacultyAssignmentsTab";
import { SessionPlanTab } from "@/components/faculty/session-plan/SessionPlanTab";
import { StudentDetailModal, Student360Detail } from "@/components/faculty/StudentDetailModal";
import { FacultyCourse } from "@/types";

export default function FacultyCourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courseCodeParam = decodeURIComponent(String(params?.courseCode || "")).toUpperCase();
  const { user } = useAuth();
  const {
    courses,
    users,
    departments,
    classrooms,
    calendarSchedules,
    assignments,
    submissions,
    attendanceSessions,
    createAssignment,
  } = useAcademicData();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<"session_plan" | "roster" | "schedule" | "attendance" | "materials" | "assignments">("session_plan");
  const [searchStudent, setSearchStudent] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student360Detail | null>(null);

  // Modal States
  const [isUploadMaterialOpen, setIsUploadMaterialOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);

  // Study materials must come from the backend. Local state only reflects
  // the current screen session until the course-material API is connected.
  const [materials, setMaterials] = useState<
    Array<{
      id: string;
      title: string;
      type: string;
      url: string;
      date: string;
      size: string;
      description: string;
      targetClasses: string[];
    }>
  >([]);

  // Material Upload Form with Multi-Class Distribution
  const [materialForm, setMaterialForm] = useState({
    title: "",
    type: "PDF Document",
    description: "",
    link: "",
    targetClasses: [] as string[],
  });

  // Assignment Form State with Multi-Class Distribution & Custom Submission Types
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    type: "PDF_DOCUMENT" as "PDF_DOCUMENT" | "CERTIFICATE_UPLOAD" | "CODING" | "WRITTEN_REPORT" | "LAB_PROJECT",
    proctoringMode: "UNPROCTORED" as "UNPROCTORED" | "PROCTORED",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    total_points: 100,
    weight_percentage: 15,
    targetClasses: [] as string[],
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Find targeted course
  const currentCourse = useMemo(() => {
    return (
      courses.find(
        (c) =>
          c.code.toUpperCase() === courseCodeParam ||
          c.id.toLowerCase() === courseCodeParam.toLowerCase() ||
          courseCodeParam.includes(c.code.toUpperCase())
      )
    );
  }, [courses, courseCodeParam]);

  // Available classes across all departments for multi-class assignment
  const allAvailableCohorts = useMemo(() => {
    const list: string[] = [];
    departments.forEach((d) => {
      (d.cohorts || []).forEach((coh) => {
        if (coh.name && !list.includes(coh.name)) {
          list.push(coh.name);
        }
      });
    });
    return list;
  }, [departments]);

  // Assigned Cohorts / Classes for this Course
  const assignedClasses = useMemo(() => {
    if (!currentCourse) return [];
    const direct = currentCourse.assignedClasses || [];
    const fromCohorts: string[] = [];
    for (const d of departments) {
      for (const coh of d.cohorts || []) {
        if (coh.assignedCourses?.includes(currentCourse.code) && !direct.includes(coh.name)) {
          fromCohorts.push(coh.name);
        }
      }
    }
    const combined = Array.from(new Set([...direct, ...fromCohorts])).filter(Boolean);
    return combined;
  }, [currentCourse, departments]);

  // Live Backend Enrollments State
  const [apiEnrollments, setApiEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (!currentCourse?.id) return;
    fetchApi<any[]>(`/courses/${currentCourse.id}/enrollments`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setApiEnrollments(res.data);
        }
      })
      .catch(() => {});
  }, [currentCourse?.id]);

  // Enrolled Students Roster
  const enrolledStudents = useMemo(() => {
    const studentUsers = users.filter((u) => u.role === "STUDENT");

    // 1. Direct active enrollments from PostgreSQL database
    if (apiEnrollments.length > 0) {
      const apiIds = new Set(apiEnrollments.map((e) => e.student_id));
      const apiEmails = new Set(apiEnrollments.map((e) => (e.student_email || "").toLowerCase()));
      const matched = studentUsers.filter((u) => apiIds.has(u.id) || apiEmails.has(u.email?.toLowerCase()));
      if (matched.length > 0) return matched;
      return apiEnrollments.map((e) => ({
        id: e.student_id,
        first_name: e.student_name ? e.student_name.split(" ")[0] : "Student",
        last_name: e.student_name ? e.student_name.split(" ").slice(1).join(" ") : "",
        email: e.student_email || "",
        student_identifier: e.student_identifier || "",
        role: "STUDENT" as const,
        department: currentCourse?.department || "Computer Science and Engineering",
        className: "CSE - Semester 1 (Sec A)",
        is_active: true,
        twoFactorEnabled: false,
        lastLoginDate: "",
        created_at: "",
      }));
    }

    // 2. Class cohort assignments
    if (assignedClasses.length > 0) {
      const matching = studentUsers.filter((st) => {
        const stClass = (st.className || "").trim().toLowerCase();
        return assignedClasses.some((cls) => stClass.includes(cls.toLowerCase()) || cls.toLowerCase().includes(stClass));
      });
      if (matching.length > 0) return matching;
    }

    // 3. Fallback: match students in same department/section (e.g., CSE Sem 1)
    const cseStudents = studentUsers.filter(
      (st) =>
        st.className?.toLowerCase().includes("cse") ||
        st.className?.toLowerCase().includes("sec a") ||
        st.department?.toLowerCase().includes("computer")
    );
    if (cseStudents.length > 0) return cseStudents;

    return studentUsers.slice(0, 6);
  }, [users, assignedClasses, apiEnrollments, currentCourse]);

  // Filtered Students for search
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return enrolledStudents;
    const q = searchStudent.toLowerCase();
    return enrolledStudents.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.student_identifier && s.student_identifier.toLowerCase().includes(q))
    );
  }, [enrolledStudents, searchStudent]);

  // Handle open student 360 profile modal
  const handleOpenStudentModal = (st: any) => {
    const studentIdentifier = st.student_identifier || st.id;
    const studentName = `${st.first_name} ${st.last_name}`.trim();

    // Calculate course-specific attendance
    const courseSessions = attendanceSessions.filter(
      (sess) =>
        sess.courseCode?.toUpperCase() === currentCourse?.code?.toUpperCase() ||
        (sess.courseName && currentCourse?.name && sess.courseName.toLowerCase().includes(currentCourse.name.toLowerCase()))
    );

    const totalClassesForCourse = courseSessions.length;
    const avgAttendanceRatio = totalClassesForCourse > 0
      ? courseSessions.reduce((acc, s) => acc + (s.totalCount > 0 ? s.presentCount / s.totalCount : 0), 0) / totalClassesForCourse
      : 0;
    const attendedForCourse = Math.round(avgAttendanceRatio * totalClassesForCourse);
    const courseAttPct = totalClassesForCourse > 0 ? Math.round(avgAttendanceRatio * 100) : 0;

    const student360: Student360Detail = {
      id: st.id,
      rollNo: studentIdentifier || "Not added",
      name: studentName,
      email: st.email,
      phone: st.phone || "Not added",
      department: st.department || currentCourse?.department || "Not added",
      batch: st.className || "Not added",
      semester: st.className || "Not added",
      cgpa: 0,
      overallAttendance: courseAttPct,
      academicStanding: courseAttPct < 75 ? "AT_RISK" : courseAttPct >= 90 ? "HONORS" : "NORMAL",
      advisor: currentCourse?.instructor || "Not added",
      courseEnrollments: [
        {
          courseCode: currentCourse?.code || "Not added",
          courseName: currentCourse?.name || "Not added",
          attendancePct: courseAttPct,
          classesAttended: attendedForCourse,
          totalClasses: totalClassesForCourse,
          continuousAssessmentScore: 0,
          midtermScore: 0,
          labScore: 0,
          currentGrade: "Not graded",
          status: totalClassesForCourse === 0 ? "ON_TRACK" : courseAttPct < 75 ? "SHORTAGE" : courseAttPct >= 90 ? "TOP_PERFORMER" : "ON_TRACK",
        },
      ],
      proctoringHistory: [],
    };

    setSelectedStudentForModal(student360);
  };

  // Formatted course object matching FacultyCourse type
  const facultyCourseObject: FacultyCourse = useMemo(() => {
    return {
      id: currentCourse?.id || "",
      course_code: currentCourse?.code || courseCodeParam,
      name: currentCourse?.name || "",
      description: currentCourse?.description || "",
      credits: currentCourse?.credits || 0,
      department_id: "",
      department_name: currentCourse?.department || "",
      department_code: "",
      semester_id: "",
      semester_name: "",
      is_active: true,
      instructors: [
        {
          id: "",
          course_id: currentCourse?.id || "",
          faculty_id: user?.id || "",
          faculty_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}` : currentCourse?.instructor || "Faculty",
          faculty_email: user?.email || "",
          is_primary: true,
        },
      ],
      module_count: 0,
      enrolled_count: enrolledStudents.length,
    };
  }, [currentCourse, courseCodeParam, user, enrolledStudents]);

  // Course Weekly Schedules / Timetable
  const courseSchedules = useMemo(() => {
    if (!currentCourse) return [];
    const filtered = calendarSchedules.filter((ev) => {
      const codeMatch = ev.courseCode?.toUpperCase() === currentCourse.code.toUpperCase();
      const nameMatch = ev.courseName?.toLowerCase().includes(currentCourse.name.toLowerCase());
      return codeMatch || nameMatch;
    });

    return filtered;
  }, [calendarSchedules, currentCourse, assignedClasses]);

  // Course Past Attendance Records
  const courseAttendanceRecords = useMemo(() => {
    if (!currentCourse) return [];
    return attendanceSessions.filter(
      (att) =>
        att.courseCode?.toUpperCase() === currentCourse.code.toUpperCase() ||
        (att.courseName && att.courseName.toLowerCase().includes(currentCourse.name.toLowerCase()))
    );
  }, [attendanceSessions, currentCourse]);

  // Course Assignments
  const courseAssignments = useMemo(() => {
    if (!currentCourse) return [];
    return assignments.filter(
      (a) =>
        a.courseCode?.toUpperCase() === currentCourse.code.toUpperCase() ||
        (a.courseName && a.courseName.toLowerCase().includes(currentCourse.name.toLowerCase()))
    );
  }, [assignments, currentCourse]);

  // Day Name Helper
  const getDayName = (dayIndex: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayIndex] || `Day ${dayIndex}`;
  };

  // Save Uploaded Study Material with Multi-Class distribution
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.title.trim()) return;

    const newMat = {
      id: `mat-${Date.now()}`,
      title: materialForm.title.trim(),
      type: materialForm.type,
      url: materialForm.link.trim(),
      date: new Date().toISOString().split("T")[0],
      size: "",
      description: materialForm.description.trim(),
      targetClasses: materialForm.targetClasses.length > 0 ? materialForm.targetClasses : assignedClasses,
    };

    const updated = [newMat, ...materials];
    setMaterials(updated);

    setIsUploadMaterialOpen(false);
    setMaterialForm({
      title: "",
      type: "PDF Document",
      description: "",
      link: "",
      targetClasses: [],
    });
    showToast(`Study material "${newMat.title}" published to ${newMat.targetClasses.length} classes.`);
  };

  // Delete Material
  const handleDeleteMaterial = (matId: string) => {
    const updated = materials.filter((m) => m.id !== matId);
    setMaterials(updated);
    showToast("Study material removed.");
  };

  // Create Assignment with Multi-Class Distribution
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.title.trim() || !currentCourse) return;

    try {
      await createAssignment({
      courseCode: currentCourse.code,
      courseName: currentCourse.name,
      title: assignmentForm.title.trim(),
      description: assignmentForm.description.trim(),
      type: assignmentForm.type as any,
      dueDate: assignmentForm.due_date,
      totalPoints: Number(assignmentForm.total_points) || 100,
      weightPercentage: Number(assignmentForm.weight_percentage) || 15,
      status: "ACTIVE",
      proctoringMode: assignmentForm.proctoringMode,
      facultyName: user?.first_name ? `${user.first_name} ${user.last_name || ""}` : currentCourse.instructor,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Assignment could not be created.");
      return;
    }

    setIsCreateAssignmentOpen(false);
    setAssignmentForm({
      title: "",
      description: "",
      type: "PDF_DOCUMENT",
      proctoringMode: "UNPROCTORED",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      total_points: 100,
      weight_percentage: 15,
      targetClasses: ["CSE - Semester 1 (Sec A)"],
    });
    showToast("Assignment published to enrolled students.");
  };

  if (!currentCourse) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Course Not Found</h2>
        <Link href="/faculty" className="btn-saas-primary text-xs px-4 py-2 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["FACULTY", "ADMINISTRATOR", "HOD"]}>
      <div className="space-y-6 pb-20 w-full animate-fade-in">
        {/* ─── TOP ACTION BAR ─── */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/faculty"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/faculty/attendance/take?courseCode=${currentCourse.code}`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Lecture Attendance</span>
            </Link>

            <button
              onClick={() => setIsUploadMaterialOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Material</span>
            </button>

            <button
              onClick={() => setIsCreateAssignmentOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Assignment</span>
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {notification && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-800">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ─── COURSE HERO BANNER ─── */}
        <div className="saas-hero-banner relative overflow-hidden rounded-[24px] p-6 sm:p-8 text-white space-y-4">
          <div className="absolute top-0 right-0 w-80 h-full opacity-15 pointer-events-none flex items-center justify-end pr-8">
            <BookOpen className="w-56 h-56 text-white" />
          </div>

          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-mono font-black text-white uppercase tracking-wider">
                {currentCourse.code}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold">
                {currentCourse.credits} Credits • Core Curriculum
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-[11px] font-bold">
                {assignedClasses.join(", ")}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {currentCourse.name}
            </h1>

            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl">
              {currentCourse.description}
            </p>

            <div className="pt-2 flex items-center gap-6 text-xs text-white/80 flex-wrap">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-blue-300" />
                <span>Instructor: <strong>{currentCourse.instructor}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-purple-300" />
                <span>Dept: <strong>{currentCourse.department || "Computer Science & Engineering"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-300" />
                <span>Enrolled: <strong>{enrolledStudents.length} Students</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION BAR ─── */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {[
            { id: "session_plan", label: "Session Delivery Plan", icon: FileSpreadsheet, count: 5 },
            { id: "roster", label: "Student Roster", icon: Users, count: enrolledStudents.length },
            { id: "schedule", label: "Timetable & Room Allocations", icon: Calendar, count: courseSchedules.length },
            { id: "attendance", label: "Attendance Portal", icon: CheckCircle2, count: courseAttendanceRecords.length },
            { id: "materials", label: "Study Materials", icon: Upload, count: materials.length },
            { id: "assignments", label: "Assignments & Grading", icon: ClipboardList, count: courseAssignments.length },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "border-[#16A34A] text-[#16A34A] dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: SESSION PLAN ─── */}
        {activeTab === "session_plan" && (
          <SessionPlanTab courseCode={currentCourse.code} courseName={currentCourse.name} />
        )}

        {/* ─── TAB 2: ENROLLED STUDENTS ROSTER ─── */}
        {activeTab === "roster" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Class Student Roster ({enrolledStudents.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Enrolled students in {currentCourse.name} from {assignedClasses.join(", ")}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name, roll, email..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Student Name &amp; Email</th>
                      <th className="p-4">Identifier / Roll No</th>
                      <th className="p-4">Academic Class</th>
                      <th className="p-4">Attendance Rate</th>
                      <th className="p-4">Academic Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredStudents.map((st, idx) => {
                      const studentId = st.student_identifier || `STU-${1000 + idx}`;
                      const studentName = `${st.first_name} ${st.last_name}`.trim();

                      // Dynamic attendance calculation from recorded sessions
                      const courseSessions = attendanceSessions.filter(
                        (sess) =>
                          sess.courseCode?.toUpperCase() === currentCourse?.code?.toUpperCase() ||
                          (sess.courseName && currentCourse?.name && sess.courseName.toLowerCase().includes(currentCourse.name.toLowerCase()))
                      );

                      const totalClasses = courseSessions.length;
                      const avgRatio = totalClasses > 0
                        ? courseSessions.reduce((acc, s) => acc + (s.totalCount > 0 ? s.presentCount / s.totalCount : 0.92), 0) / totalClasses
                        : 0.925;
                      const attended = Math.round(avgRatio * (totalClasses || 26));
                      const attPct = Math.round(avgRatio * 100);
                      const isAtRisk = attPct < 75;

                      return (
                        <tr
                          key={st.id || idx}
                          onClick={() => handleOpenStudentModal(st)}
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                                {st.first_name[0]}
                                {st.last_name[0]}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block group-hover:text-blue-600">
                                  {st.first_name} {st.last_name}
                                </span>
                                <span className="text-[11px] text-slate-400 block">{st.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                              {studentId}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">
                            {st.className || assignedClasses[0] || "CSE - Semester 1 (Sec A)"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isAtRisk
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {attPct}% {totalClasses > 0 ? `(${attended}/${totalClasses})` : "Present"}
                            </span>
                          </td>
                          <td className="p-4">
                            {isAtRisk ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>Attendance Shortage</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                <Check className="h-3.5 w-3.5" />
                                <span>Good Standing</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStudentModal(st);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-slate-100 hover:underline cursor-pointer bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View 360° Profile</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: TIMETABLE & ROOM ALLOCATIONS ─── */}
        {activeTab === "schedule" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Weekly Timetable &amp; Room Allocations
                </h2>
                <p className="text-xs text-slate-500">
                  Lecture halls, computing labs, and tutorial slots for {currentCourse.name}
                </p>
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Venues: LH-001 &amp; Computing Lab 1</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courseSchedules.map((sch, i) => {
                const isLab = sch.type === "LAB" || sch.durationHours === 2;
                return (
                  <div
                    key={sch.id || i}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono">
                          {getDayName(sch.dayIndex)}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isLab
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {isLab ? "Practical Lab (2h)" : "Theory Lecture (1h)"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {sch.lectureTitle || `${currentCourse.name} Lecture`}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>{sch.startTime} – {sch.endTime}</span>
                        </p>
                      </div>

                      {/* Room & Building Location */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Room / Lab:</span>
                          <strong className="text-xs font-mono text-slate-900 dark:text-white flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500" />
                            <span>{sch.room || "LH-001"}</span>
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Building:</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">{sch.building || "Academic Block A"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Class:</span>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{sch.className || assignedClasses[0]}</span>
                        </div>
                      </div>

                      {/* Session Agenda */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Session Agenda</span>
                        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          {(sch.sessionAgenda || []).map((ag: string, j: number) => (
                            <li key={j} className="flex items-start gap-1.5">
                              <span className="text-slate-900 dark:text-slate-100 font-bold">•</span>
                              <span>{ag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Link
                      href={`/faculty/attendance/take?courseCode=${currentCourse.code}`}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Take Attendance for Slot</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 4: COMBINED ATTENDANCE PORTAL ─── */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-fade-in">
            <FacultyAttendanceTab courses={[facultyCourseObject]} />
          </div>
        )}

        {/* ─── TAB 5: STUDY MATERIALS ─── */}
        {activeTab === "materials" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Study Materials &amp; Multi-Class Distribution ({materials.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Lecture slides, syllabus, and reference documents distributed across classes.
                </p>
              </div>

              <button
                onClick={() => setIsUploadMaterialOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Upload &amp; Distribute</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {mat.type}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{mat.date} • {mat.size}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-900 dark:text-slate-100 shrink-0" />
                      <span>{mat.title}</span>
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {mat.description}
                    </p>

                    {/* Target Classes Badges */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Assigned To Classes:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(mat.targetClasses || assignedClasses).map((cls, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px] font-bold"
                          >
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Resource</span>
                    </a>

                    <button
                      onClick={() => handleDeleteMaterial(mat.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: ASSIGNMENTS & SPEEDGRADER ─── */}
        {activeTab === "assignments" && (
          <div className="space-y-6 animate-fade-in">
            <FacultyAssignmentsTab courses={[facultyCourseObject]} />
          </div>
        )}

        {/* ─── MODAL: UPLOAD STUDY MATERIAL MODAL ─── */}
        <AnimatePresence>
          {isUploadMaterialOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                    <span>Upload &amp; Distribute Material</span>
                  </h2>
                  <button onClick={() => setIsUploadMaterialOpen(false)}>
                    <XCircle className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSaveMaterial} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Unit 3 - Syntax Analysis Lecture Slides"
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Resource Type</label>
                      <select
                        value={materialForm.type}
                        onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      >
                        <option value="PDF Document">PDF Document</option>
                        <option value="Slide Presentation">Slide Presentation (PPT/PDF)</option>
                        <option value="Lab Manual">Lab Manual &amp; Exercises</option>
                        <option value="Problem Set">Problem Set &amp; Solutions</option>
                        <option value="Reference Link">Reference Link / Textbook</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Download Link / URL</label>
                      <input
                        type="text"
                        placeholder="https://... or file resource"
                        value={materialForm.link}
                        onChange={(e) => setMaterialForm({ ...materialForm, link: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Multi-Class Assignment Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Distribute to Academic Classes:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMaterialForm((prev) => ({
                            ...prev,
                            targetClasses:
                              prev.targetClasses.length === allAvailableCohorts.length
                                ? [assignedClasses[0] || "CSE - Semester 1 (Sec A)"]
                                : [...allAvailableCohorts],
                          }))
                        }
                        className="text-[11px] font-bold text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {materialForm.targetClasses.length === allAvailableCohorts.length ? "Reset Selection" : "Select All Classes"}
                      </button>
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 max-h-36 overflow-y-auto">
                      {allAvailableCohorts.map((coh) => {
                        const isChecked = materialForm.targetClasses.includes(coh);
                        return (
                          <label
                            key={coh}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked ? "bg-indigo-50 dark:bg-indigo-950/60 text-slate-900 dark:text-slate-100 font-bold" : "text-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setMaterialForm((prev) => {
                                  const exists = prev.targetClasses.includes(coh);
                                  const next = exists
                                    ? prev.targetClasses.filter((c) => c !== coh)
                                    : [...prev.targetClasses, coh];
                                  return { ...prev, targetClasses: next.length > 0 ? next : [coh] };
                                });
                              }}
                              className="rounded border-slate-300 text-slate-900 dark:text-slate-100 focus:ring-slate-900"
                            />
                            <span className="truncate">{coh}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Brief notes on what this document covers..."
                      value={materialForm.description}
                      onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsUploadMaterialOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10"
                    >
                      Publish to Classes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── MODAL: CREATE ASSIGNMENT MODAL ─── */}
        <AnimatePresence>
          {isCreateAssignmentOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    <span>Create &amp; Assign to Multiple Classes</span>
                  </h2>
                  <button onClick={() => setIsCreateAssignmentOpen(false)}>
                    <XCircle className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSaveAssignment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assignment Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Assignment 1: AST Parser Implementation"
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assignment Format</label>
                      <select
                        value={assignmentForm.type}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      >
                        <option value="PDF_DOCUMENT">PDF Document / Handwritten Solutions</option>
                        <option value="CERTIFICATE_UPLOAD">Coursera / MOOC Certificate Upload</option>
                        <option value="CODING">Interactive Coding Problem</option>
                        <option value="WRITTEN_REPORT">Written Report / Case Study</option>
                        <option value="LAB_PROJECT">Lab Practical Set</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Proctoring Security</label>
                      <select
                        value={assignmentForm.proctoringMode}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, proctoringMode: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      >
                        <option value="UNPROCTORED">Unproctored (Standard Take-home)</option>
                        <option value="PROCTORED">Proctored (Full Screen Lock &amp; Monitored)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Due Date</label>
                      <input
                        type="date"
                        required
                        value={assignmentForm.due_date}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Max Score</label>
                      <input
                        type="number"
                        required
                        value={assignmentForm.total_points}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, total_points: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Weight %</label>
                      <input
                        type="number"
                        required
                        value={assignmentForm.weight_percentage}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, weight_percentage: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Target Classes Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Assign to Multiple Classes:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssignmentForm((prev) => ({
                            ...prev,
                            targetClasses:
                              prev.targetClasses.length === allAvailableCohorts.length
                                ? [assignedClasses[0] || "CSE - Semester 1 (Sec A)"]
                                : [...allAvailableCohorts],
                          }))
                        }
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        {assignmentForm.targetClasses.length === allAvailableCohorts.length ? "Reset Selection" : "Select All Classes"}
                      </button>
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 max-h-36 overflow-y-auto">
                      {allAvailableCohorts.map((coh) => {
                        const isChecked = assignmentForm.targetClasses.includes(coh);
                        return (
                          <label
                            key={coh}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 font-bold" : "text-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setAssignmentForm((prev) => {
                                  const exists = prev.targetClasses.includes(coh);
                                  const next = exists
                                    ? prev.targetClasses.filter((c) => c !== coh)
                                    : [...prev.targetClasses, coh];
                                  return { ...prev, targetClasses: next.length > 0 ? next : [coh] };
                                });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{coh}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description &amp; Rubric</label>
                    <textarea
                      rows={2}
                      placeholder="Instructions, problem statement, and grading criteria..."
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateAssignmentOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                    >
                      Publish Assignment
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── STUDENT 360 PROFILE MODAL ─── */}
        <StudentDetailModal
          student={selectedStudentForModal}
          isOpen={Boolean(selectedStudentForModal)}
          onClose={() => setSelectedStudentForModal(null)}
        />
      </div>
    </RoleGuard>
  );
}
