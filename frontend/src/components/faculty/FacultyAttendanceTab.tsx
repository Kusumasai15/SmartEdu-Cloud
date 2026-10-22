"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  UserCheck,
  CheckCircle2,
  Download,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  RotateCcw,
  BookOpen,
  Building,
  AlertCircle,
  FileSpreadsheet,
  FileUp,
  Upload,
  FileText,
  Eye,
  Send,
  ShieldCheck,
  FileCheck,
  ExternalLink,
  Filter,
  Calendar,
  Edit3,
  Save,
  ShieldAlert,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import { facultyRoster, StudentRosterItem } from "./FacultyRosterModal";
import { exportToExcel, importFromExcel } from "@/lib/excel-utils";
import { exportToPdf } from "@/lib/export-reports";

export interface AttendanceSessionRecord {
  id: string;
  course_id: string;
  course_code: string;
  course_name?: string;
  session_date: string;
  topic: string;
  room?: string;
  present_count: number;
  total_count: number;
  status?: string;
  records?: Array<{ studentId?: string; student_id?: string; rollNo?: string; status: "PRESENT" | "ABSENT" | "LATE" | "P" | "A" | "OD" | "ON_DUTY" | "APPROVED_LEAVE" | string }>;
  createdAtTimestamp?: number;
  sessionDateRaw?: string;
}

export const initialAttendanceSessions: AttendanceSessionRecord[] = [];

import { useAcademicData, StudentLeaveRequest, StudentLeaveType } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { getUserAvatarUrl } from "@/lib/avatar";

interface FacultyAttendanceTabProps {
  courses?: FacultyCourse[];
}

export function FacultyAttendanceTab({ courses = [] }: FacultyAttendanceTabProps) {
  const {
    recordAttendance,
    updateAttendanceSession,
    attendanceWindowHours = 48,
    users,
    calendarSchedules,
    attendanceSessions: contextSessions,
    studentLeaves,
    reviewStudentLeaveByAdvisor,
    departments = [],
  } = useAcademicData();
  const { user } = useAuth();

  const myCourseCodes = useMemo(() => {
    return new Set(
      courses
        .map((c) => (((c as any).course_code || (c as any).code || "") as string).toLowerCase().trim())
        .filter(Boolean)
    );
  }, [courses]);

  // Check if there is an active scheduled class in session right now for this faculty
  const liveScheduledSlot = useMemo(() => {
    const now = new Date();
    const dayIdx = now.getDay();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const facName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase() : "";
    const facEmail = (user?.email || "").toLowerCase().trim();

    const parseMins = (t?: string, fallbackH = 9) => {
      if (!t) return fallbackH * 60;
      const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (!m) return fallbackH * 60;
      let h = parseInt(m[1], 10);
      const mins = m[2] ? parseInt(m[2], 10) : 0;
      const mer = m[3]?.toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      return h * 60 + mins;
    };

    return (
      calendarSchedules.find((ev) => {
        if (ev.dayIndex !== dayIdx) return false;
        const evFac = (ev.faculty || "").toLowerCase().trim();
        const evEmail = (ev.facultyEmail || "").toLowerCase().trim();
        const evCode = (ev.courseCode || "").toLowerCase().trim();

        const isMySlot =
          (evEmail && facEmail && evEmail === facEmail) ||
          (evFac && facName && (evFac.includes(facName) || facName.includes(evFac))) ||
          (!evFac && evCode && myCourseCodes.has(evCode));

        if (!isMySlot) return false;

        const startH = ev.startHour ?? 9;
        const durH = ev.durationHours || 1;
        const startM = parseMins(ev.startTime, startH);
        const endM = ev.endTime ? parseMins(ev.endTime, startH + durH) : startM + durH * 60;
        return nowMins >= startM && nowMins <= endM;
      }) || null
    );
  }, [calendarSchedules, user, myCourseCodes]);

  // Dynamically derive enrolled students strictly from real academic users
  const enrolledStudents: StudentRosterItem[] = useMemo(() => {
    const studentUsers = users.filter((u) => u.role === "STUDENT");
    if (studentUsers.length === 0 || courses.length === 0) return [];

    const primaryCourse = courses[0]?.course_code || (courses[0] as any)?.code || "";
    const primaryName = courses[0]?.name || "Academic Course";

    return studentUsers.map((st) => {
      const rollNo = st.student_identifier || "Not assigned";
      const fullName = `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.email;

      // Compute real attendance from recorded sessions
      const studentSessions = (contextSessions || []).filter(
        (sess) =>
          myCourseCodes.has((sess.courseCode || "").toLowerCase().trim()) &&
          Array.isArray(sess.records) &&
          sess.records.some((r) => r.studentId === st.id)
      );
      const totalClasses = studentSessions.length;
      const classesAttended = studentSessions.filter((sess) =>
        (sess.records || []).some((r) => r.studentId === st.id && r.status === "PRESENT")
      ).length;
      const attendancePct = totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

      return {
        id: st.id,
        rollNo,
        name: fullName,
        email: st.email,
        phone: st.phone || "",
        department: st.department || courses[0]?.department_name || "",
        className: st.className || "Not assigned",
        courseCode: primaryCourse,
        courseName: primaryName,
        attendancePct,
        classesAttended,
        totalClasses,
        currentGrade: "",
        cgpa: 0,
        status: totalClasses > 0 && attendancePct < 75 ? ("AT_RISK" as const) : ("NORMAL" as const),
        lastActive: "",
      };
    });
  }, [users, courses, contextSessions, myCourseCodes]);

  // Main view state: "REGISTER" | "LIVE_ROLL_CALL" | "CUMULATIVE" | "ADVISOR_APPROVALS" | "DATE_LOOKUP"
  const [currentView, setCurrentView] = useState<"REGISTER" | "LIVE_ROLL_CALL" | "CUMULATIVE" | "ADVISOR_APPROVALS" | "DATE_LOOKUP">("REGISTER");

  // Advisor Review State
  const [advisorNotesMap, setAdvisorNotesMap] = useState<Record<string, string>>({});
  const [selectedProofPreview, setSelectedProofPreview] = useState<{ title: string; url?: string; fileName?: string } | null>(null);
  const [advisorSectionFilter, setAdvisorSectionFilter] = useState<string>("ALL");
  const [advisorStatusFilter, setAdvisorStatusFilter] = useState<"PENDING" | "FORWARDED" | "ALL">("PENDING");

  const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim().toLowerCase();
  const userEmail = (user?.email || "").toLowerCase();
  const userRole = (typeof user?.role === "string" ? user.role : user?.role?.name || "").toLowerCase();
  const isSuperUser = userRole.includes("hod") || userRole.includes("dean") || userRole.includes("admin");

  const myAdvisedClasses = useMemo(() => {
    const classes = new Set<string>();
    departments.forEach((dept) => {
      dept.cohorts?.forEach((cohort) => {
        const advisorName = (cohort.classAdvisor || "").toLowerCase();
        const advisorEmail = (cohort.classAdvisorEmail || "").toLowerCase();
        if (
          (advisorEmail && advisorEmail === userEmail) ||
          (advisorName && (advisorName === userFullName || advisorName.includes(userFullName) || userFullName.includes(advisorName)))
        ) {
          classes.add(cohort.name);
        }
      });
    });
    return classes;
  }, [departments, userEmail, userFullName]);

  const availableAdvisorClasses = useMemo(() => {
    return Array.from(new Set(
      (studentLeaves || [])
        .filter((l) => isSuperUser || myAdvisedClasses.has(l.className) || (l.advisorEmail && l.advisorEmail.toLowerCase() === userEmail) || (l.advisorName && l.advisorName.toLowerCase().includes(userFullName)))
        .map((l) => l.className)
        .filter(Boolean)
    ));
  }, [studentLeaves, isSuperUser, myAdvisedClasses, userEmail, userFullName]);

  const pendingAdvisorLeavesCount = useMemo(() => {
    return (studentLeaves || []).filter((l) => {
      if (l.status !== "PENDING_ADVISOR") return false;
      return isSuperUser || myAdvisedClasses.has(l.className) || (l.advisorEmail && l.advisorEmail.toLowerCase() === userEmail) || (l.advisorName && l.advisorName.toLowerCase().includes(userFullName));
    }).length;
  }, [studentLeaves, isSuperUser, myAdvisedClasses, userEmail, userFullName]);

  const advisorLeaves = useMemo(() => {
    return (studentLeaves || []).filter((l) => {
      const cls = l.className || "";
      const isMyAdvisee = isSuperUser || myAdvisedClasses.has(cls) || (l.advisorEmail && l.advisorEmail.toLowerCase() === userEmail) || (l.advisorName && l.advisorName.toLowerCase().includes(userFullName));
      if (!isMyAdvisee) return false;

      if (advisorSectionFilter !== "ALL" && cls !== advisorSectionFilter) return false;

      if (advisorStatusFilter === "PENDING") {
        return l.status === "PENDING_ADVISOR";
      }
      if (advisorStatusFilter === "FORWARDED") {
        return l.status === "PENDING_HOD" || l.status === "APPROVED";
      }
      return true;
    });
  }, [studentLeaves, isSuperUser, myAdvisedClasses, userEmail, userFullName, advisorSectionFilter, advisorStatusFilter]);

  const handleAdvisorAction = (
    leaveId: string,
    action: "APPROVE" | "REJECT"
  ) => {
    const notes = advisorNotesMap[leaveId] || (action === "APPROVE" ? "Verified credentials and supporting documents. Recommended to HOD for sanction." : "Incomplete or unverified documentation.");
    const advisorName = user ? (`${user.first_name || ""} ${user.last_name || ""}`.trim() || (user as any).username || user.email || "Class Advisor") : "Class Advisor";
    reviewStudentLeaveByAdvisor(leaveId, action, notes, advisorName);
    setNotification(
      action === "APPROVE"
        ? "✓ Application verified and forwarded to HOD for final sanction & attendance credit."
        : "✕ Application rejected with notes returned to student."
    );
    setTimeout(() => setNotification(null), 4000);
  };

  const mappedContextSessions: AttendanceSessionRecord[] = useMemo(() => {
    return (contextSessions || [])
      .filter((s) => myCourseCodes.size === 0 || myCourseCodes.has((s.courseCode || "").toLowerCase().trim()))
      .map((s) => ({
        id: s.id,
        course_id: `course-${(s.courseCode || "").toLowerCase()}`,
        course_code: s.courseCode,
        course_name: s.courseName,
        session_date: s.sessionDate,
        sessionDateRaw: s.sessionDateRaw,
        createdAtTimestamp: s.createdAtTimestamp,
        topic: s.topic,
        room: s.room,
        present_count: s.presentCount,
        total_count: s.totalCount,
        status: "LOCKED",
        records: s.records as any,
      }));
  }, [contextSessions, myCourseCodes]);

  const [sessions, setSessions] = useState<AttendanceSessionRecord[]>(mappedContextSessions);

  useEffect(() => {
    setSessions(mappedContextSessions);
  }, [mappedContextSessions]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<AttendanceSessionRecord | null>(null);

  // Policy-Compliant Date & Class Lookup / Modifier State
  const [lookupDate, setLookupDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [lookupCourseCode, setLookupCourseCode] = useState<string>(courses[0]?.course_code || "");
  const [editingSession, setEditingSession] = useState<(AttendanceSessionRecord & { records?: Array<{ studentId?: string; student_id?: string; rollNo?: string; status: "PRESENT" | "ABSENT" | "LATE" | "P" | "A" | "OD" }>; policyJustification?: string }) | null>(null);
  const [editingRosterStatuses, setEditingRosterStatuses] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE" | "OD">>({});
  const [editPolicyJustification, setEditPolicyJustification] = useState<string>("");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  const handleOpenEditSession = (sess: AttendanceSessionRecord) => {
    const rawRecords = (sess as any).records || [];
    const statusMap: Record<string, "PRESENT" | "ABSENT" | "LATE" | "OD"> = {};
    enrolledStudents.forEach((st) => {
      const rec = rawRecords.find((r: any) => r.studentId === st.id || r.student_id === st.id || r.rollNo === st.rollNo);
      if (rec) {
        statusMap[st.id] = (rec.status === "A" || rec.status === "ABSENT") ? "ABSENT" : (rec.status === "LATE" ? "LATE" : (rec.status === "OD" ? "OD" : "PRESENT"));
      } else {
        statusMap[st.id] = "PRESENT";
      }
    });
    setEditingRosterStatuses(statusMap);
    setEditPolicyJustification((sess as any).policyJustification || "");
    setEditErrorMessage(null);
    setEditingSession(sess as any);
  };

  const handleSaveSessionModifications = () => {
    if (!editingSession) return;
    const sessionTime = editingSession.createdAtTimestamp || (editingSession.sessionDateRaw ? new Date(editingSession.sessionDateRaw).getTime() : Date.now());
    const hoursElapsed = (Date.now() - sessionTime) / (3600 * 1000);
    const isExpired = hoursElapsed > attendanceWindowHours;

    if (isExpired && !editPolicyJustification.trim()) {
      setEditErrorMessage(`This session was held ${Math.round(hoursElapsed)} hours ago, which exceeds the ${attendanceWindowHours}-hour institutional edit window. Institutional policy requires entering a mandatory administrative justification.`);
      return;
    }

    const updatedRecords = enrolledStudents.map((st) => ({
      studentId: st.id,
      student_id: st.id,
      rollNo: st.rollNo,
      status: (editingRosterStatuses[st.id] === "ABSENT" ? "ABSENT" : editingRosterStatuses[st.id] === "LATE" ? "LATE" : "PRESENT") as "PRESENT" | "ABSENT" | "LATE",
    }));

    const presentCount = updatedRecords.filter((r) => r.status === "PRESENT").length;
    const totalCount = updatedRecords.length;

    const res = updateAttendanceSession(editingSession.id, {
      presentCount,
      totalCount,
      records: updatedRecords as any,
      policyJustification: editPolicyJustification.trim() || undefined,
    });

    if (res.success) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? {
                ...s,
                present_count: presentCount,
                total_count: totalCount,
                records: updatedRecords as any,
                policyJustification: editPolicyJustification.trim() || undefined,
              }
            : s
        )
      );
      setNotification(`✓ Attendance for session (${editingSession.course_code} • ${editingSession.session_date}) modified and committed according to institutional policy.`);
      setEditingSession(null);
      setTimeout(() => setNotification(null), 5000);
    } else {
      setEditErrorMessage(res.error || "Failed to update attendance session.");
    }
  };

  // Live Roll-Call Session State
  const [sessionCourseCode, setSessionCourseCode] = useState<string>(courses[0]?.course_code || "");
  const [sessionTopic, setSessionTopic] = useState<string>("");
  const [sessionUnit, setSessionUnit] = useState<string>("");
  const [sessionRoom, setSessionRoom] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "P" | "A">("ALL");

  // Multi-Tier Attendance Mapping (Present 'P' | Absent 'A' | On-Duty 'OD' | Approved Leave 'LEAVE')
  const [studentStatus, setStudentStatus] = useState<Record<string, "P" | "A" | "OD" | "LEAVE">>({});

  // Initialize student statuses for roll call (auto-crediting approved leaves & ODs)
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const initial: Record<string, "P" | "A" | "OD" | "LEAVE"> = {};
    enrolledStudents.forEach((s) => {
      const activeLeave = (studentLeaves || []).find((l) => {
        const isStudent = l.studentId === s.id || (l.studentRollNo && l.studentRollNo.toLowerCase().trim() === s.rollNo.toLowerCase().trim());
        const isApproved = l.status === "APPROVED" || l.attendanceCredited;
        const inDate = todayStr >= l.startDate && todayStr <= l.endDate;
        return isStudent && isApproved && inDate;
      });

      if (activeLeave) {
        initial[s.id] = activeLeave.leaveType === "ON_DUTY" ? "OD" : "LEAVE";
      } else {
        initial[s.id] = "P";
      }
    });
    setStudentStatus(initial);
  }, [enrolledStudents, studentLeaves]);

  const presentCount = Object.values(studentStatus).filter((s) => s === "P" || s === "OD" || s === "LEAVE").length;
  const absentCount = Object.values(studentStatus).filter((s) => s === "A").length;
  const totalCount = enrolledStudents.length;
  const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : "0";

  const handleMarkAll = (status: "P" | "A") => {
    const next: Record<string, "P" | "A" | "OD" | "LEAVE"> = { ...studentStatus };
    enrolledStudents.forEach((s) => {
      // Retain officially sanctioned OD/Leave unless explicitly overridden
      if (studentStatus[s.id] !== "OD" && studentStatus[s.id] !== "LEAVE") {
        next[s.id] = status;
      }
    });
    setStudentStatus(next);
  };

  const handleCommitSession = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCourse = courses.find((c) => c.course_code === sessionCourseCode);
    const resolvedName = matchedCourse ? matchedCourse.name : (sessionCourseCode || "Course");

    const records = enrolledStudents.map((st) => ({
      studentId: st.id,
      student_id: st.id,
      rollNo: st.rollNo,
      status: (studentStatus[st.id] === "A" ? "ABSENT" : studentStatus[st.id] === "OD" ? "ON_DUTY" : studentStatus[st.id] === "LEAVE" ? "APPROVED_LEAVE" : "PRESENT") as "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE",
    }));

    const newSession: AttendanceSessionRecord & { records?: typeof records } = {
      id: `att-${Date.now()}`,
      course_id: `course-${sessionCourseCode.toLowerCase()}`,
      course_code: sessionCourseCode,
      session_date: `Today • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      topic: sessionTopic || "General Attendance",
      room: sessionRoom || "Classroom",
      present_count: presentCount,
      total_count: totalCount,
      status: "LOCKED",
      records,
    };

    recordAttendance({
      courseCode: sessionCourseCode || "COURSE",
      courseName: resolvedName,
      topic: sessionTopic || "General Attendance",
      room: sessionRoom || "Classroom",
      presentCount,
      totalCount,
      studentIsPresent: presentCount === totalCount,
      records,
    });

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentView("REGISTER");
    setNotification(`✓ Attendance recorded for ${sessionCourseCode} (${presentCount}/${totalCount} Present). Committed to Academic Registrar.`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleExportExcel = () => {
    try {
      const data = enrolledStudents.map((s) => ({
        "Roll No": s.rollNo,
        "Student Name": s.name,
        "Class / Section": s.className || "—",
        "Course Code": s.courseCode,
        "Classes Attended": s.classesAttended,
        "Total Classes": s.totalClasses,
        "Attendance %": `${s.attendancePct}%`,
        "Institutional Status": s.attendancePct >= 75 ? "COMPLIANT" : "SHORTAGE_RISK",
      }));
      exportToExcel(data, `Faculty_Attendance_Register_${Date.now()}`, "Attendance");
      setNotification("✓ Official institutional attendance ledger downloaded as Excel (.xlsx).");
      setTimeout(() => setNotification(null), 4000);
    } catch {
      handleExportCSV();
    }
  };

  const handleExportPdf = () => {
    try {
      const exportData = enrolledStudents.map((s) => ({
        rollNo: s.rollNo,
        name: s.name,
        className: s.className || "—",
        courseCode: s.courseCode,
        attendance: `${s.classesAttended} / ${s.totalClasses}`,
        pct: `${s.attendancePct}%`,
        status: s.attendancePct >= 75 ? "COMPLIANT" : "SHORTAGE_RISK",
      }));

      const columns = [
        { header: "Roll No", key: "rollNo" },
        { header: "Student Name", key: "name" },
        { header: "Class / Section", key: "className" },
        { header: "Course", key: "courseCode" },
        { header: "Classes Attended", key: "attendance" },
        { header: "Attendance %", key: "pct" },
        { header: "Status", key: "status" },
      ];

      exportToPdf(
        "Institutional Class Attendance Ledger",
        exportData,
        columns,
        {
          subtitle: `Faculty Course Attendance Ledger • ${new Date().toLocaleDateString()}`,
          department: "Computer Science & Engineering",
          academicTerm: "Fall 2026",
          generatedBy: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Faculty",
        }
      );
      setNotification("✓ Official institutional attendance ledger downloaded as PDF.");
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Failed to generate PDF: ${err?.message || "Unknown error"}`);
    }
  };

  const handleImportAttendanceExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await importFromExcel(file);
      if (!rows || rows.length === 0) {
        setNotification("⚠️ Uploaded sheet contains no records.");
        return;
      }

      let markedCount = 0;
      const updatedStatus: Record<string, "P" | "A" | "OD" | "LEAVE"> = { ...studentStatus };

      rows.forEach((r: any) => {
        const roll = String(r["Roll No"] || r["Roll"] || r["Identifier"] || r["RollNo"] || "").trim().toLowerCase();
        const rawStatus = String(r["Status"] || r["Attendance"] || r["Mark"] || "").trim().toUpperCase();

        if (roll) {
          const matchedStudent = enrolledStudents.find(
            (s) => s.rollNo.trim().toLowerCase() === roll || s.name.trim().toLowerCase() === roll
          );
          if (matchedStudent) {
            const isPresent = ["P", "PRESENT", "1", "YES", "TRUE"].includes(rawStatus);
            updatedStatus[matchedStudent.id] = isPresent ? "P" : "A";
            markedCount++;
          }
        }
      });

      setStudentStatus(updatedStatus);
      setNotification(`✓ Imported attendance from Excel: successfully mapped ${markedCount} students.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification(err.message || "Failed to parse attendance spreadsheet.");
    } finally {
      e.target.value = "";
    }
  };

  const handleExportCSV = () => {
    const headers = ["Roll No", "Student Name", "Course", "Classes Attended", "Total Classes", "Attendance %", "Status"];
    const rows = enrolledStudents.map((s) => [
      s.rollNo,
      s.name,
      s.courseCode,
      s.classesAttended,
      s.totalClasses,
      `${s.attendancePct}%`,
      s.attendancePct >= 75 ? "COMPLIANT" : "SHORTAGE_RISK",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification("✓ Official institutional attendance ledger downloaded as CSV.");
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredSessions = sessions.filter((s) => {
    if (selectedCourseFilter !== "ALL" && s.course_code !== selectedCourseFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.topic.toLowerCase().includes(q) || s.course_code.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredStudents = enrolledStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    const current = studentStatus[s.id] || "P";
    if (statusFilter === "ALL") return true;
    return current === statusFilter;
  });

  const avgAttendancePct = enrolledStudents.length > 0 && sessions.length > 0
    ? Math.round(enrolledStudents.reduce((acc, s) => acc + s.attendancePct, 0) / enrolledStudents.length)
    : 0;
  const lowAttendanceCount = enrolledStudents.filter((s) => s.attendancePct < 75).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#22B573]" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── IN-PAGE VIEW 1 & 2: SESSIONS REGISTER OR CUMULATIVE ROSTER ─── */}
      {currentView !== "LIVE_ROLL_CALL" && (
        <div className="space-y-6">
          {/* Header & Main Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <SectionHeader
              title="Attendance"
              description="Take class attendance and review student attendance records."
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                id="faculty-attendance-excel-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportAttendanceExcel}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => document.getElementById("faculty-attendance-excel-input")?.click()}
                className="btn-saas-outline text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40 cursor-pointer"
                title="Import attendance markings from Excel (.xlsx) or CSV"
              >
                <FileUp className="h-3.5 w-3.5" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="btn-saas-outline text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 cursor-pointer"
                title="Download attendance register as Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="btn-saas-outline text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40 cursor-pointer"
                title="Download official attendance report as PDF"
              >
                <FileText className="h-3.5 w-3.5 text-rose-600" />
                <span>Download PDF</span>
              </button>

              {liveScheduledSlot ? (
                <Link
                  href={`/faculty/attendance/take?courseCode=${encodeURIComponent(liveScheduledSlot.courseCode || "")}&topic=${encodeURIComponent(
                    liveScheduledSlot.lectureTitle || ""
                  )}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-2 font-bold px-4 py-2 rounded-xl shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Take Class Attendance ({liveScheduledSlot.courseCode})</span>
                </Link>
              ) : (
                <span
                  className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold inline-flex items-center gap-1.5"
                  title="Attendance can only be taken while a scheduled class is actively in session"
                >
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>No Active Class Session Right Now</span>
                </span>
              )}
            </div>
          </div>

      {/* Attendance summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Sessions Held</span>
              <p className="text-2xl font-black text-[#171A2B] dark:text-white font-mono">{sessions.length}</p>
              <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">Classes recorded</span>
            </div>

            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Average Attendance</span>
              <p className="text-2xl font-black text-[#22B573] font-mono">{avgAttendancePct}%</p>
              <span className="text-xs text-[#737A90]">Required: 75%</span>
            </div>

            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Low Attendance</span>
              <p className="text-2xl font-black text-[#F4B740] font-mono">{lowAttendanceCount}</p>
              <span className="text-xs text-[#F4B740] font-bold">Below 75%</span>
            </div>

            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Status</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {liveScheduledSlot ? "Live Now" : "Standby"}
              </p>
              <span className="text-xs text-[#737A90] font-semibold">
                {liveScheduledSlot ? `${liveScheduledSlot.courseCode} in session` : "No live lecture right now"}
              </span>
            </div>
          </div>

          {/* Sub-View Switcher & Filter Bar */}
          <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-4 border border-[#E8EAF1] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FC] dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setCurrentView("REGISTER")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  currentView === "REGISTER"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                }`}
              >
                Class Records ({sessions.length})
              </button>
              <button
                onClick={() => setCurrentView("CUMULATIVE")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  currentView === "CUMULATIVE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                }`}
              >
                Students ({enrolledStudents.length})
              </button>
              <button
                onClick={() => setCurrentView("ADVISOR_APPROVALS")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === "ADVISOR_APPROVALS"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                }`}
              >
                <span>Advisor Approvals</span>
                {pendingAdvisorLeavesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse leading-none">
                    {pendingAdvisorLeavesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCurrentView("DATE_LOOKUP")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === "DATE_LOOKUP"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Date &amp; Class Modifier</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#737A90]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topic or student..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
                />
              </div>

              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="p-1.5 text-xs rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white font-bold"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.course_code}>
                    {c.course_code}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table: Session Registers */}
          {currentView === "REGISTER" && (
            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 shadow-xs overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Class Attendance Records</h3>
                  <p className="text-xs text-[#737A90]">Class sessions with student attendance counts</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-[#E8EAF1] dark:border-slate-800 text-[#737A90] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Course Code</th>
                      <th className="p-3">Date &amp; Time</th>
                      <th className="p-3">Lecture Room</th>
                      <th className="p-3">Topic</th>
                      <th className="p-3">Present</th>
                      <th className="p-3">Attendance Rate</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
                    {filteredSessions.map((session) => {
                      const pct = ((session.present_count / session.total_count) * 100).toFixed(0);
                      return (
                        <tr key={session.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{session.course_code}</td>
                          <td className="p-3 font-medium text-[#171A2B] dark:text-slate-300">{session.session_date}</td>
                          <td className="p-3 font-medium text-[#737A90]">{session.room || "Lecture Hall 101"}</td>
                          <td className="p-3 font-semibold text-[#171A2B] dark:text-white">{session.topic}</td>
                          <td className="p-3 font-mono font-bold text-[#22B573]">
                            {session.present_count} / {session.total_count}
                          </td>
                          <td className="p-3 font-mono font-bold text-[#171A2B] dark:text-white">
                            {pct}%
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#22B573] dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Saved</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedSessionForDetail(session)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Inspect session roll-call roster"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Roster</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSession(session)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Edit & modify session attendance under institutional policy"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Modify</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 4: Policy-Compliant Date & Class Lookup / Modifier */}
          {currentView === "DATE_LOOKUP" && (
            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 shadow-xs overflow-hidden p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E8EAF1] dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#171A2B] dark:text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Attendance Register by Date &amp; Class</span>
                  </h3>
                  <p className="text-xs text-[#737A90]">
                    Select any calendar day and course to view attendance roster, verify institutional {attendanceWindowHours}h policy window, or modify student markings.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Policy Window: {attendanceWindowHours} Hours</span>
                  </span>
                </div>
              </div>

              {/* Selector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#F7F8FC] dark:bg-slate-900/60 rounded-2xl border border-[#E8EAF1] dark:border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Target Date
                  </label>
                  <input
                    type="date"
                    value={lookupDate}
                    onChange={(e) => setLookupDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Course
                  </label>
                  <select
                    value={lookupCourseCode}
                    onChange={(e) => setLookupCourseCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">-- All Assigned Courses --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.course_code}>
                        {c.course_code}: {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setLookupDate(new Date().toISOString().split("T")[0]);
                      if (courses[0]) setLookupCourseCode(courses[0].course_code);
                    }}
                    className="w-full btn-saas-outline text-xs py-2.5 flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset to Today</span>
                  </button>
                </div>
              </div>

              {/* Results based on Lookup */}
              {(() => {
                const matchedSessions = sessions.filter((s) => {
                  const matchesCourse = !lookupCourseCode || s.course_code === lookupCourseCode;
                  const isTodayMatch = s.session_date?.toLowerCase().includes("today") && lookupDate === new Date().toISOString().split("T")[0];
                  const matchesDate = s.sessionDateRaw === lookupDate || isTodayMatch || (s.session_date && s.session_date.includes(lookupDate));
                  return matchesCourse && matchesDate;
                });

                if (matchedSessions.length === 0) {
                  return (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
                      <div>
                        <h4 className="font-bold text-sm text-[#171A2B] dark:text-white">
                          No Session Recorded for {lookupDate} {lookupCourseCode ? `(${lookupCourseCode})` : ""}
                        </h4>
                        <p className="text-xs text-[#737A90] max-w-md mx-auto mt-1">
                          No official roll call was registered on this date. You can initiate a roll call or backfill class attendance within institutional guidelines.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (lookupCourseCode) setSessionCourseCode(lookupCourseCode);
                            setSessionTopic(`Class Session on ${lookupDate}`);
                            setCurrentView("LIVE_ROLL_CALL");
                          }}
                          className="btn-saas-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 font-bold shadow-xs cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Record Roll Call for {lookupDate}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Found {matchedSessions.length} recorded session(s) on {lookupDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {matchedSessions.map((sess) => {
                        const sessionTime = sess.createdAtTimestamp || (sess.sessionDateRaw ? new Date(sess.sessionDateRaw).getTime() : Date.now());
                        const hoursElapsed = Math.max(0, Math.floor((Date.now() - sessionTime) / (3600 * 1000)));
                        const isExpired = hoursElapsed > attendanceWindowHours;
                        const rate = ((sess.present_count / (sess.total_count || 1)) * 100).toFixed(0);

                        return (
                          <div
                            key={sess.id}
                            className="p-5 rounded-2xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white">
                                  {sess.course_code}
                                </span>
                                <span className="font-bold text-sm text-[#171A2B] dark:text-white">
                                  {sess.topic || "Class Session"}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    isExpired
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200"
                                  }`}
                                >
                                  {isExpired ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                                  <span>{isExpired ? `Policy Expired (${hoursElapsed}h ago)` : `Policy Active (${hoursElapsed}h ago)`}</span>
                                </span>
                              </div>

                              <p className="text-xs text-slate-500">
                                Venue: {sess.room || "Lecture Hall"} • Recorded: {sess.session_date} • Present: {sess.present_count} / {sess.total_count} ({rate}%)
                              </p>

                              {(sess as any).policyJustification && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/60">
                                  <strong>Logged Justification:</strong> {(sess as any).policyJustification}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedSessionForDetail(sess)}
                                className="btn-saas-outline text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View Roster</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSession(sess)}
                                className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit &amp; Modify Attendance</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Table: Cumulative Student Roster */}
          {currentView === "CUMULATIVE" && (
            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 shadow-xs overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Student Attendance</h3>
                  <p className="text-xs text-[#737A90]">Track attendance for enrolled students</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-[#E8EAF1] dark:border-slate-800 text-[#737A90] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Roll Number</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class / Section</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Classes Attended</th>
                      <th className="p-3">Attendance %</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
                    {filteredStudents.map((s) => {
                      const isCompliant = s.attendancePct >= 75;
                      return (
                        <tr key={s.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{s.rollNo}</td>
                          <td className="p-3 font-semibold text-[#171A2B] dark:text-white">{s.name}</td>
                          <td className="p-3 font-medium text-slate-600 dark:text-slate-300">{s.className || "—"}</td>
                          <td className="p-3 font-mono text-[#737A90]">{s.courseCode}</td>
                          <td className="p-3 font-mono text-[#171A2B] dark:text-slate-300">
                            {s.classesAttended} / {s.totalClasses}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            <span className={isCompliant ? "text-[#22B573]" : "text-[#E05252]"}>
                              {s.attendancePct}%
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isCompliant
                                  ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-rose-50 text-[#E05252] dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {isCompliant ? "● Compliant (>=75%)" : "⚠️ Shortage Risk"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 3: Class Advisor Leave & OD Approvals */}
          {currentView === "ADVISOR_APPROVALS" && (
            <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 shadow-xs overflow-hidden p-6 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8EAF1] dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <h3 className="text-base font-bold text-[#171A2B] dark:text-white">Class Advisor On-Duty &amp; Leave Approvals</h3>
                  </div>
                  <p className="text-xs text-[#737A90] mt-0.5">
                    Review student event participation, medical leaves, and university on-duty applications. Recommended applications move to HOD for final attendance sanction.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 p-1 bg-[#F7F8FC] dark:bg-slate-800 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setAdvisorStatusFilter("PENDING")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        advisorStatusFilter === "PENDING"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                      }`}
                    >
                      Pending ({pendingAdvisorLeavesCount})
                    </button>
                    <button
                      onClick={() => setAdvisorStatusFilter("FORWARDED")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        advisorStatusFilter === "FORWARDED"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                      }`}
                    >
                      Recommended &amp; Approved
                    </button>
                    <button
                      onClick={() => setAdvisorStatusFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        advisorStatusFilter === "ALL"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                      }`}
                    >
                      All History
                    </button>
                  </div>

                  <select
                    value={advisorSectionFilter}
                    onChange={(e) => setAdvisorSectionFilter(e.target.value)}
                    className="p-2 text-xs rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white font-bold"
                  >
                    <option value="ALL">All Cohorts &amp; Sections</option>
                    {availableAdvisorClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Applications List */}
              {advisorLeaves.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[#E8EAF1] dark:border-slate-800 rounded-2xl space-y-2">
                  <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-[#171A2B] dark:text-white">All Caught Up</p>
                  <p className="text-xs text-[#737A90]">
                    No leave requests currently matching this filter for your advisor section.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {advisorLeaves.map((leave) => {
                    const daysCount = Math.max(
                      1,
                      Math.round(
                        (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1
                    );

                    const typeMeta =
                      leave.leaveType === "EVENT"
                        ? { label: "Hackathon & Event", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200" }
                        : leave.leaveType === "MEDICAL"
                        ? { label: "Medical Leave", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200" }
                        : { label: "University On-Duty (OD)", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" };

                    return (
                      <div
                        key={leave.id}
                        className="p-5 rounded-2xl border border-[#E8EAF1] dark:border-slate-800 bg-[#FBFBFE] dark:bg-slate-900/60 space-y-4 shadow-2xs hover:border-blue-200 dark:hover:border-blue-900 transition-all"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center bg-blue-600 text-white font-bold text-xs">
                              {getUserAvatarUrl({ name: leave.studentName, email: `${leave.studentRollNo}@uniflow.edu`, role: "student" }) ? (
                                <img
                                  src={getUserAvatarUrl({ name: leave.studentName, email: `${leave.studentRollNo}@uniflow.edu`, role: "student" })!}
                                  alt={leave.studentName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{leave.studentName.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-[#171A2B] dark:text-white">
                                  {leave.studentName}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {leave.studentRollNo}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {leave.className}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.color}`}>
                                  {typeMeta.label}
                                </span>
                              </div>
                              <p className="text-xs text-[#737A90]">
                                Applied on {leave.appliedAt} &bull; Student ID: {leave.studentId}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-[#E8EAF1] dark:border-slate-700 text-[#171A2B] dark:text-white">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              <span>{leave.startDate} to {leave.endDate} ({daysCount} {daysCount === 1 ? "Day" : "Days"})</span>
                            </span>
                          </div>
                        </div>

                        {/* Reason & Affected Courses */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white dark:bg-slate-800/60 p-3.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800">
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-[#737A90] tracking-wider">Statement of Purpose</span>
                            <p className="text-[#171A2B] dark:text-slate-200 font-medium leading-relaxed">
                              {leave.reason}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-[#737A90] tracking-wider">Affected Courses</span>
                            <div className="flex flex-wrap gap-1">
                              {leave.affectedCourseCodes && leave.affectedCourseCodes.length > 0 ? (
                                leave.affectedCourseCodes.map((c: string) => (
                                  <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    {c}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400">All registered courses</span>
                              )}
                            </div>

                            {leave.proofFileName && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedProofPreview({
                                      title: `${leave.studentName} - ${leave.proofFileName}`,
                                      url: leave.proofUrl,
                                      fileName: leave.proofFileName,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline cursor-pointer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>View Supporting Proof ({leave.proofFileName})</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status / Actions */}
                        {leave.status === "PENDING_ADVISOR" ? (
                          <div className="pt-2 border-t border-[#E8EAF1] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Advisor recommendation note (e.g. Verified official event credentials. Recommended to HOD)..."
                                value={advisorNotesMap[leave.id] || ""}
                                onChange={(e) =>
                                  setAdvisorNotesMap((prev) => ({ ...prev, [leave.id]: e.target.value }))
                                }
                                className="w-full text-xs p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-[#171A2B] dark:text-white"
                              />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAdvisorAction(leave.id, "REJECT")}
                                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleAdvisorAction(leave.id, "APPROVE")}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Recommend to HOD</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                  leave.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : leave.status === "PENDING_HOD"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {leave.status === "APPROVED"
                                  ? "✓ Sanctioned & Attendance Credited by HOD"
                                  : leave.status === "PENDING_HOD"
                                  ? "⏳ Forwarded to HOD for Final Sanction"
                                  : "✕ Rejected"}
                              </span>
                              {leave.advisorNotes && (
                                <span className="text-[#737A90] italic">
                                  Advisor Note: &ldquo;{leave.advisorNotes}&rdquo;
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#737A90]">
                              Reviewed: {leave.advisorReviewedAt || leave.appliedAt}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── IN-PAGE VIEW 3: DEDICATED LIVE ROLL-CALL WORKSPACE ─── */}
      {currentView === "LIVE_ROLL_CALL" && (
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] border border-[#E8EAF1] dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs animate-fade-in">
          {/* Header & Back Button */}
          <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("REGISTER")}
                className="p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#171A2B] dark:text-white">Live Classroom Roll-Call Session</h2>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {sessionCourseCode}
                  </span>
                </div>
                <p className="text-xs text-[#737A90]">
                  Mark student roll-call and synchronize records directly to the institutional academic registrar
                </p>
              </div>
            </div>

            <Button
              onClick={handleCommitSession}
              className="btn-saas-primary text-xs px-5 font-bold shadow-xs"
            >
              Lock &amp; Commit Session Register
            </Button>
          </div>

          {/* Session Configuration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-[#F7F8FC] dark:bg-slate-900/60 p-4 rounded-xl border border-[#E8EAF1] dark:border-slate-800">
            <div>
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Target Course</label>
              <select
                value={sessionCourseCode}
                onChange={(e) => setSessionCourseCode(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-[#171A2B] dark:text-white font-bold"
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
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Syllabus Topic</label>
              <input
                type="text"
                value={sessionTopic}
                onChange={(e) => setSessionTopic(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-[#171A2B] dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Curriculum Unit</label>
              <select
                value={sessionUnit}
                onChange={(e) => setSessionUnit(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-[#171A2B] dark:text-white font-medium"
              >
                <option value="Unit 1: Foundations & Asymptotics">Unit 1: Foundations &amp; Asymptotics</option>
                <option value="Unit 2: Linear Structures & Hashing">Unit 2: Linear Structures &amp; Hashing</option>
                <option value="Unit 3: Balanced Search Trees">Unit 3: Balanced Search Trees</option>
                <option value="Unit 4: Graph Algorithms & DP">Unit 4: Graph Algorithms &amp; DP</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Lecture Venue</label>
              <input
                type="text"
                value={sessionRoom}
                onChange={(e) => setSessionRoom(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 text-[#171A2B] dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Metric Strip & Quick Batch Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#22B573] font-bold border border-emerald-200 dark:border-emerald-800">
                🟢 Present: <strong className="font-mono text-sm ml-1">{presentCount}</strong>
              </span>
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#E05252] font-bold border border-rose-200 dark:border-rose-800">
                🔴 Absent: <strong className="font-mono text-sm ml-1">{absentCount}</strong>
              </span>
              <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border border-indigo-100">
                Attendance: <strong className="font-mono text-sm ml-1">{attendanceRate}%</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleMarkAll("P")}
                className="btn-saas-outline px-3 py-1.5 font-bold text-[#22B573] flex items-center gap-1 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("A")}
                className="btn-saas-outline px-3 py-1.5 font-bold text-[#E05252] flex items-center gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Roster Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#737A90]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or roll number..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FC] dark:bg-slate-800 rounded-xl">
              {(["ALL", "P", "A"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    statusFilter === filter
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                  }`}
                >
                  {filter === "ALL"
                    ? `All (${enrolledStudents.length})`
                    : filter === "P"
                    ? `Present (${presentCount})`
                    : `Absent (${absentCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Professional Tabular Student Roll-Call Register */}
          <div className="overflow-hidden border rounded-2xl border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800/60 text-[#737A90] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Student Scholar</th>
                    <th className="py-3 px-4">Roll / Registration No</th>
                    <th className="py-3 px-4">Cumulative Attendance</th>
                    <th className="py-3 px-4 text-center">Live Roll-Call Action</th>
                    <th className="py-3 px-4 text-center">Academic Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
                  {filteredStudents.map((s, idx) => {
                    const current = studentStatus[s.id] || "P";
                    const isCompliant = s.attendancePct >= 75;
                    const studentAvatar = getUserAvatarUrl({ name: s.name, email: s.email, role: "student" });

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40 ${
                          current === "A" ? "bg-rose-50/30 dark:bg-rose-950/15" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono text-[#737A90] font-bold text-[11px]">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs bg-blue-600 text-white font-bold text-xs">
                              {studentAvatar ? (
                                <img
                                  src={studentAvatar}
                                  alt={s.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{s.name.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-[#171A2B] dark:text-white block truncate">
                                {s.name}
                              </span>
                              <span className="text-[11px] text-[#737A90] block truncate">
                                {s.email || "Email not added"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:bg-slate-800 dark:text-indigo-300 border border-indigo-100 dark:border-slate-700">
                            {s.rollNo}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={`font-mono font-bold ${isCompliant ? "text-[#22B573]" : "text-[#E05252]"}`}>
                                {s.attendancePct}%
                              </span>
                              <span className="text-[#737A90] font-mono">
                                {s.classesAttended}/{s.totalClasses}
                              </span>
                            </div>
                            <div className="w-28 h-1.5 rounded-full bg-[#E8EAF1] dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCompliant ? "bg-[#22B573]" : "bg-[#E05252]"}`}
                                style={{ width: `${s.attendancePct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const next = current === "P" ? "OD" : current === "OD" ? "A" : "P";
                              setStudentStatus({ ...studentStatus, [s.id]: next });
                            }}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                              current === "P"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                                : current === "OD" || current === "LEAVE"
                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
                                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                            }`}
                            title="Click to cycle Present / On-Duty / Absent"
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                                current === "P"
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : current === "OD" || current === "LEAVE"
                                  ? "bg-purple-600 border-purple-600 text-white"
                                  : "bg-white dark:bg-slate-800 border-rose-400 text-rose-600"
                              }`}
                            >
                              {current === "P" ? (
                                <UserCheck className="h-3 w-3 stroke-[3]" />
                              ) : current === "OD" || current === "LEAVE" ? (
                                <ShieldCheck className="h-3 w-3 stroke-[3]" />
                              ) : (
                                <X className="h-3 w-3 stroke-[3]" />
                              )}
                            </div>
                            <span className="font-semibold">
                              {current === "P" ? "Present" : current === "OD" ? "On Duty (OD)" : current === "LEAVE" ? "Approved Leave" : "Absent"}
                            </span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isCompliant
                                ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                                : "bg-rose-50 text-[#E05252] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                            }`}
                          >
                            <span>{isCompliant ? "● Compliant" : "⚠️ Shortage Risk"}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between text-xs text-[#737A90]">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Ready to save attendance</span>
            </div>
            <Button
              onClick={handleCommitSession}
              className="btn-saas-primary text-xs px-6 font-bold"
            >
              Save Attendance
            </Button>
          </div>
        </div>
      )}

      {/* ─── MODAL: INSPECT SESSION ROLL-CALL ROSTER ─── */}
      {selectedSessionForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#181C2B] rounded-3xl border border-[#E8EAF1] dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E8EAF1] dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {selectedSessionForDetail.course_code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedSessionForDetail.session_date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#171A2B] dark:text-white mt-0.5">
                    {selectedSessionForDetail.topic || "Class Session"}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sessionRoster = enrolledStudents.map((st) => {
                      const rec = (selectedSessionForDetail.records || []).find(
                        (r) => r.studentId === st.id || r.student_id === st.id || r.rollNo === st.rollNo
                      );
                      const isPresent = rec ? (rec.status === "PRESENT" || rec.status === "P" || rec.status === "ON_DUTY" || rec.status === "APPROVED_LEAVE") : true;
                      return {
                        "Roll No": st.rollNo,
                        "Student Name": st.name,
                        "Class / Section": st.className || "—",
                        "Course": selectedSessionForDetail.course_code,
                        "Session Date": selectedSessionForDetail.session_date,
                        "Status": rec?.status === "ON_DUTY" ? "ON_DUTY" : rec?.status === "APPROVED_LEAVE" ? "APPROVED_LEAVE" : isPresent ? "PRESENT" : "ABSENT",
                      };
                    });
                    exportToExcel(
                      sessionRoster,
                      `Session_Attendance_${selectedSessionForDetail.course_code}_${Date.now()}`,
                      "SessionRoster"
                    );
                    setNotification("✓ Session roster exported as Excel (.xlsx).");
                    setTimeout(() => setNotification(null), 4000);
                  }}
                  className="btn-saas-outline text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 cursor-pointer"
                  title="Download session attendance as Excel"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => setSelectedSessionForDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Attendance Stat Banner */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-[#F7F8FC] dark:bg-slate-900/60 border-b border-[#E8EAF1] dark:border-slate-800 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Present</span>
                <p className="text-xl font-black text-emerald-600 font-mono">
                  {selectedSessionForDetail.present_count}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Absent</span>
                <p className="text-xl font-black text-rose-600 font-mono">
                  {Math.max(0, selectedSessionForDetail.total_count - selectedSessionForDetail.present_count)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Attendance Rate</span>
                <p className="text-xl font-black text-blue-600 font-mono">
                  {((selectedSessionForDetail.present_count / (selectedSessionForDetail.total_count || 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Students Roll Call List */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-[#E8EAF1] dark:border-slate-800 text-[#737A90] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Class / Section</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
                  {enrolledStudents.map((st) => {
                    const rec = (selectedSessionForDetail.records || []).find(
                      (r) => r.studentId === st.id || r.student_id === st.id || r.rollNo === st.rollNo
                    );
                    const isPresent = rec ? (rec.status === "PRESENT" || rec.status === "P" || rec.status === "ON_DUTY" || rec.status === "APPROVED_LEAVE") : true;
                    return (
                      <tr key={st.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{st.rollNo}</td>
                        <td className="p-3 font-semibold text-[#171A2B] dark:text-white">{st.name}</td>
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-300">{st.className || "—"}</td>
                        <td className="p-3 text-center">
                          {rec?.status === "ON_DUTY" ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                              On-Duty (OD)
                            </span>
                          ) : rec?.status === "APPROVED_LEAVE" ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              Approved Leave
                            </span>
                          ) : isPresent ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                              Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E8EAF1] dark:border-slate-800 flex justify-end">
              <Button
                onClick={() => setSelectedSessionForDetail(null)}
                className="btn-saas-secondary text-xs px-5 font-bold cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: POLICY-COMPLIANT ATTENDANCE MODIFIER ─── */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#181C2B] rounded-3xl max-w-3xl w-full border border-[#E8EAF1] dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#171A2B] dark:text-white flex items-center gap-2">
                      <span>Attendance Modifier &amp; Compliance Audit</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                        {editingSession.course_code}
                      </span>
                    </h3>
                    <p className="text-xs text-[#737A90]">
                      {editingSession.session_date} • {editingSession.topic || "Class Session"} • Room: {editingSession.room || "Classroom"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Policy Audit Status Card */}
            {(() => {
              const sessionTime = editingSession.createdAtTimestamp || (editingSession.sessionDateRaw ? new Date(editingSession.sessionDateRaw).getTime() : Date.now());
              const hoursElapsed = Math.max(0, Math.floor((Date.now() - sessionTime) / (3600 * 1000)));
              const isExpired = hoursElapsed > attendanceWindowHours;

              return (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-[#E8EAF1] dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {isExpired ? (
                        <>
                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-800 dark:text-amber-200">
                            Institutional Policy Window Notice (Conducted {hoursElapsed}h ago, Limit: {attendanceWindowHours}h)
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-800 dark:text-emerald-200">
                            Within Institutional Policy Window (Conducted {hoursElapsed}h ago, Window: {attendanceWindowHours}h)
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Policy Rule: § 4.2 Academic Roll-Call Amendment
                    </span>
                  </div>

                  {isExpired && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
                        Mandatory Administrative Justification Note:
                      </label>
                      <textarea
                        rows={2}
                        value={editPolicyJustification}
                        onChange={(e) => {
                          setEditPolicyJustification(e.target.value);
                          if (editErrorMessage) setEditErrorMessage(null);
                        }}
                        placeholder="e.g. Student submitted hospital discharge paper approved by HOD, or attendance server sync adjustment..."
                        className="w-full p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  )}

                  {editErrorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{editErrorMessage}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Quick Actions & Live Counters */}
            {(() => {
              const pCount = Object.values(editingRosterStatuses).filter((st) => st === "PRESENT" || st === "OD").length;
              const aCount = Object.values(editingRosterStatuses).filter((st) => st === "ABSENT").length;
              const lCount = Object.values(editingRosterStatuses).filter((st) => st === "LATE").length;
              const tot = enrolledStudents.length || 1;
              const pct = Math.round((pCount / tot) * 100);

              return (
                <div className="px-6 py-3 bg-white dark:bg-[#181C2B] border-b border-[#E8EAF1] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Live Totals:</span>
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                      P: {pCount}
                    </span>
                    <span className="font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md">
                      A: {aCount}
                    </span>
                    <span className="font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                      L: {lCount}
                    </span>
                    <span className="font-mono font-bold text-blue-600">Rate: {pct}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allP: Record<string, "PRESENT"> = {};
                        enrolledStudents.forEach((s) => (allP[s.id] = "PRESENT"));
                        setEditingRosterStatuses(allP);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-[11px] cursor-pointer"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allA: Record<string, "ABSENT"> = {};
                        enrolledStudents.forEach((s) => (allA[s.id] = "ABSENT"));
                        setEditingRosterStatuses(allA);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 transition-colors text-[11px] cursor-pointer"
                    >
                      All Absent
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Editable Roll Call Roster */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-[#E8EAF1] dark:border-slate-800 text-[#737A90] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">Roll No</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Class / Section</th>
                    <th className="p-2.5 text-center">Status Modifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
                  {enrolledStudents.map((st) => {
                    const currentStatus = editingRosterStatuses[st.id] || "PRESENT";
                    return (
                      <tr key={st.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{st.rollNo}</td>
                        <td className="p-2.5 font-semibold text-[#171A2B] dark:text-white">{st.name}</td>
                        <td className="p-2.5 text-slate-500">{st.className || "—"}</td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingRosterStatuses((prev) => ({ ...prev, [st.id]: "PRESENT" }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRosterStatuses((prev) => ({ ...prev, [st.id]: "ABSENT" }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50"
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRosterStatuses((prev) => ({ ...prev, [st.id]: "LATE" }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === "LATE"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50"
                              }`}
                            >
                              Late
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRosterStatuses((prev) => ({ ...prev, [st.id]: "OD" }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === "OD"
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50"
                              }`}
                            >
                              On Duty
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Changes will be immutably recorded in the institutional academic audit log.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="btn-saas-secondary text-xs px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSessionModifications}
                  className="btn-saas-primary text-xs px-5 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Save &amp; Commit Changes</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {selectedProofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#181C2B] rounded-2xl max-w-lg w-full p-6 border border-[#E8EAF1] dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-sm text-[#171A2B] dark:text-white truncate">
                  {selectedProofPreview.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedProofPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <FileCheck className="h-12 w-12 text-blue-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedProofPreview.fileName || "Supporting Verification Certificate"}
              </p>
              <p className="text-[11px] text-slate-500">
                Official document uploaded by student. Verified under Institutional Academic Governance Guidelines.
              </p>
              {selectedProofPreview.url && (
                <a
                  href={selectedProofPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download / Open Document</span>
                </a>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setSelectedProofPreview(null)}
                className="btn-saas-secondary text-xs px-4 font-bold cursor-pointer"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
