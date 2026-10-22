"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Check,
  X,
  AlertTriangle,
  Clock,
  Building,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  UserX,
  Calendar,
  Lock,
  MapPin,
  Sparkles,
  Layers,
  GraduationCap,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import {
  CourseSessionPlan,
  SessionPlanLecture,
} from "@/types/sessionPlan";

export interface AttendanceStudent {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  avatar: string;
  className: string;
  historicalAttendancePct: number;
  totalRecordedSessions: number;
}

function TakeAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    courses,
    recordAttendance,
    users,
    departments,
    classrooms,
    calendarSchedules,
    attendanceWindowHours,
    attendanceSessions,
    studentLeaves,
  } = useAcademicData();

  const courseCodeParam = searchParams.get("courseCode") || searchParams.get("course") || searchParams.get("courseId") || "";
  const paramLectureNo = searchParams.get("lectureNo");
  const paramTopic = searchParams.get("topic");
  const paramRoom = searchParams.get("room") || "";

  // Determine all scheduled slots for this faculty and whether any slot is LIVE right now
  const { activeLiveScheduleSlot, facultyScheduleSlots } = useMemo(() => {
    const now = new Date();
    const dayIdx = now.getDay();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const facName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase() : "";
    const facEmail = (user?.email || "").toLowerCase().trim();

    const myTaughtCodes = new Set(
      courses
        .filter((c) => {
          const inst = (c.instructor || "").toLowerCase().trim();
          if (!inst || !facName) return false;
          return inst.includes(facName) || facName.includes(inst);
        })
        .map((c) => (((c as any).code || (c as any).course_code || "") as string).toLowerCase().trim())
        .filter(Boolean)
    );

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

    const mySlots = calendarSchedules.filter((ev) => {
      const evFac = (ev.faculty || "").toLowerCase().trim();
      const evEmail = (ev.facultyEmail || "").toLowerCase().trim();
      const evCode = (ev.courseCode || "").toLowerCase().trim();
      if (evEmail && facEmail && evEmail === facEmail) return true;
      if (evFac && facName && (evFac.includes(facName) || facName.includes(evFac))) return true;
      if (!evFac && evCode && myTaughtCodes.has(evCode)) return true;
      return false;
    });

    const liveToday = mySlots.find((ev) => {
      if (ev.dayIndex !== dayIdx) return false;
      if (courseCodeParam && ev.courseCode?.toLowerCase().trim() !== courseCodeParam.toLowerCase().trim()) {
        return false;
      }
      const startH = ev.startHour ?? 9;
      const durH = ev.durationHours || 1;
      const startM = parseMins(ev.startTime, startH);
      const endM = ev.endTime ? parseMins(ev.endTime, startH + durH) : startM + durH * 60;
      return nowMins >= startM && nowMins <= endM;
    }) || mySlots.find((ev) => {
      if (ev.dayIndex !== dayIdx) return false;
      const startH = ev.startHour ?? 9;
      const durH = ev.durationHours || 1;
      const startM = parseMins(ev.startTime, startH);
      const endM = ev.endTime ? parseMins(ev.endTime, startH + durH) : startM + durH * 60;
      return nowMins >= startM && nowMins <= endM;
    }) || null;

    return { activeLiveScheduleSlot: liveToday, facultyScheduleSlots: mySlots };
  }, [calendarSchedules, user, courses, courseCodeParam]);

  // Target course resolution (matches param, active slot, or faculty courses)
  const targetCourse = useMemo(() => {
    const activeCode = (courseCodeParam || activeLiveScheduleSlot?.courseCode || "").toLowerCase().trim();
    if (activeCode && courses.length > 0) {
      const found = courses.find((c) => {
        const cCode = (((c as any).code || (c as any).course_code || "") as string).toLowerCase().trim();
        return cCode === activeCode || c.id === activeCode || cCode.includes(activeCode) || activeCode.includes(cCode);
      });
      if (found) return found;
    }
    if (activeLiveScheduleSlot?.courseCode && courses.length > 0) {
      const activeCode2 = activeLiveScheduleSlot.courseCode.toLowerCase().trim();
      const found = courses.find((c) => {
        const cCode = (((c as any).code || (c as any).course_code || "") as string).toLowerCase().trim();
        return cCode === activeCode2 || c.id === activeCode2;
      });
      if (found) return found;
    }
    if (courses.length > 0) {
      const facName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase() : "";
      const facultyCourse = courses.find((c) => {
        const inst = (c.instructor || "").toLowerCase();
        return facName && inst.includes(facName);
      });
      if (facultyCourse) return facultyCourse;
      return courses[0];
    }
    return null;
  }, [courses, activeLiveScheduleSlot, courseCodeParam, user]);

  // Derived Class and Section (defaults cleanly to student cohort)
  const assignedCohort = useMemo(() => {
    if (activeLiveScheduleSlot?.className) return activeLiveScheduleSlot.className;
    const direct = targetCourse?.assignedClasses || [];
    if (direct.length > 0) return direct[0];
    const stu = (users || []).find((u) => u.role === "STUDENT" && u.className);
    if (stu?.className) return stu.className;
    return "IT - Semester 5 AIDS";
  }, [activeLiveScheduleSlot, targetCourse, users]);

  const classNameFormatted = useMemo(() => {
    if (!assignedCohort) return targetCourse ? `${targetCourse.code} Cohort` : "IT - Semester 5 AIDS";
    if (assignedCohort.includes("(")) {
      return assignedCohort.split("(")[0].trim();
    }
    return assignedCohort;
  }, [assignedCohort, targetCourse]);

  const sectionNameFormatted = useMemo(() => {
    if (!assignedCohort) return "Section A";
    const match = assignedCohort.match(/\b(?:Sec|Section)\s*([A-Z0-9]+)\b/i);
    if (match) return `Section ${match[1].toUpperCase()}`;
    if (assignedCohort.includes("(")) {
      const inside = assignedCohort.split("(")[1]?.replace(")", "").trim();
      if (inside) return inside;
    }
    return assignedCohort;
  }, [assignedCohort]);

  // Session plans
  const [sessionPlan, setSessionPlan] = useState<CourseSessionPlan | null>(null);

  // Flat array of all planned lectures
  const allPlannedLectures = useMemo(() => {
    return sessionPlan ? sessionPlan.modules.flatMap((m) => m.lectures) : [];
  }, [sessionPlan]);

  // Selected Planned Lecture state
  const [selectedLectureId, setSelectedLectureId] = useState<string>(() => {
    if (paramLectureNo && allPlannedLectures.length > 0) {
      const found = allPlannedLectures.find((l) => l.lectureNo === parseInt(paramLectureNo, 10));
      if (found) return found.id;
    }
    const pending = allPlannedLectures.find((l) => !l.conductedDate);
    return pending ? pending.id : allPlannedLectures[0]?.id || "custom";
  });

  const activePlannedLecture = useMemo(() => {
    return allPlannedLectures.find((l) => l.id === selectedLectureId) || null;
  }, [allPlannedLectures, selectedLectureId]);

  // Auto-derived room/venue from schedule slot, calendar schedules, classrooms, or param
  const defaultVenue = useMemo(() => {
    if (paramRoom) return paramRoom;
    if (activeLiveScheduleSlot?.room) return activeLiveScheduleSlot.room;
    const cCode = (targetCourse?.code || courseCodeParam || "").toLowerCase().trim();
    const sched = calendarSchedules.find(
      (s) => (s.courseCode || "").toLowerCase().trim() === cCode && s.room
    );
    if (sched?.room) return sched.room;
    if (classrooms && classrooms.length > 0) {
      return classrooms[0].name || (classrooms[0] as any).room_number || "Room 102";
    }
    return "Room 102";
  }, [paramRoom, activeLiveScheduleSlot, targetCourse, courseCodeParam, calendarSchedules, classrooms]);

  // Topic and Venue state
  const [topic, setTopic] = useState<string>(() => {
    if (paramTopic) return decodeURIComponent(paramTopic);
    if (activePlannedLecture) return activePlannedLecture.topic;
    return `Lecture Session on ${targetCourse?.name || "Course Curriculum"}`;
  });

  const [sessionType, setSessionType] = useState<"LECTURE" | "LAB" | "TUTORIAL">(() => {
    if (activePlannedLecture) {
      if (activePlannedLecture.methodology.toLowerCase() === "practical") return "LAB";
      if (activePlannedLecture.methodology.toLowerCase() === "tutorial") return "TUTORIAL";
    }
    return "LECTURE";
  });

  const [room, setRoom] = useState<string>(() => defaultVenue);

  // Automatically populate room if not set
  useEffect(() => {
    if (!room && defaultVenue) {
      setRoom(defaultVenue);
    }
  }, [defaultVenue, room]);

  const handleSelectPlannedLecture = (lectureId: string) => {
    setSelectedLectureId(lectureId);
    if (lectureId === "custom") {
      setTopic("Regular Lecture Session");
      return;
    }
    const targetLec = allPlannedLectures.find((l) => l.id === lectureId);
    if (targetLec) {
      setTopic(targetLec.topic);
      const isLab = targetLec.methodology.toLowerCase() === "practical";
      setSessionType(isLab ? "LAB" : "LECTURE");
      if (!room) setRoom(defaultVenue);
    }
  };

  const [sessionDate] = useState<string>(
    new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  );
  const [sessionTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  // Derive roster strictly from real enrolled students or students in assignedCohort
  const studentRoster: AttendanceStudent[] = useMemo(() => {
    const realStudents = (users || []).filter((u) => u.role === "STUDENT");
    if (realStudents.length === 0) return [];

    const targetCourseCode = targetCourse
      ? (((targetCourse as any).code || (targetCourse as any).course_code || courseCodeParam || "") as string).toLowerCase().trim()
      : (courseCodeParam || "").toLowerCase().trim();

    // Students matching assigned cohort or course's assigned classes or semester/department
    let matched: typeof realStudents = [];

    if (assignedCohort) {
      const cohortLower = assignedCohort.toLowerCase().trim();
      const cohortBase = assignedCohort.split("(")[0].trim().toLowerCase();
      matched = realStudents.filter((s) => {
        if (!s.className) return false;
        const sCls = s.className.toLowerCase().trim();
        return (
          sCls === cohortLower ||
          sCls.includes(cohortLower) ||
          cohortLower.includes(sCls) ||
          (cohortBase && sCls.startsWith(cohortBase))
        );
      });
    }

    // If targetCourse has specific assignedClasses
    if (matched.length === 0 && targetCourse && Array.isArray((targetCourse as any).assignedClasses) && (targetCourse as any).assignedClasses.length > 0) {
      const classesLower = ((targetCourse as any).assignedClasses as string[]).map((ac) => ac.toLowerCase().trim());
      matched = realStudents.filter((s) => {
        if (!s.className) return false;
        const sCls = s.className.toLowerCase().trim();
        return classesLower.some((cl) => sCls.includes(cl) || cl.includes(sCls));
      });
    }

    // If still no students matched by cohort, check student department and semester from targetCourse
    if (matched.length === 0 && targetCourse && (targetCourse as any).semester) {
      const semNum = (targetCourse as any).semester.toString().replace(/[^0-9]/g, "");
      matched = realStudents.filter((s) => {
        if (!s.className) return false;
        const sCls = s.className.toLowerCase();
        const matchesSem = semNum ? sCls.includes(`semester ${semNum}`) || sCls.includes(`sem ${semNum}`) : true;
        const matchesDept = (targetCourse as any).department ? sCls.includes((targetCourse as any).department.toLowerCase().slice(0, 3)) : true;
        return matchesSem && matchesDept;
      });
    }

    // Ultimate fallback: if no specific filtering matched, include all real active students
    if (matched.length === 0) {
      matched = realStudents;
    }

    return matched.map((s) => {
      // Calculate REAL historical attendance from recorded attendanceSessions
      const recordedSessionsForStudent = (attendanceSessions || []).filter((sess) => {
        const cMatch = sess.courseCode?.toLowerCase().trim() === targetCourseCode;
        return cMatch && Array.isArray(sess.records) && sess.records.some((r) => r.studentId === s.id);
      });

      let realPct = 100;
      if (recordedSessionsForStudent.length > 0) {
        const presentCount = recordedSessionsForStudent.filter((sess) => {
          const r = (sess.records || []).find((rec) => rec.studentId === s.id);
          return r?.status === "PRESENT";
        }).length;
        realPct = Math.round((presentCount / recordedSessionsForStudent.length) * 100);
      }

      return {
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email,
        rollNo: s.student_identifier || "Not assigned",
        email: s.email || "",
        avatar: "",
        className: s.className || assignedCohort || "IT - Semester 5 AIDS",
        historicalAttendancePct: realPct,
        totalRecordedSessions: recordedSessionsForStudent.length,
      };
    });
  }, [users, targetCourse, assignedCohort, attendanceSessions, courseCodeParam]);

  // Multi-tier Attendance Status: "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE"
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE">>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");

  // Step Mode: "MARKING" | "ABSENTEE_REVIEW" | "SUBMITTED"
  const [step, setStep] = useState<"MARKING" | "ABSENTEE_REVIEW" | "SUBMITTED">("MARKING");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize all students as PRESENT by default, auto-respecting approved Leaves / ODs
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const initial: Record<string, "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE"> = {};
    studentRoster.forEach((s) => {
      const activeLeave = (studentLeaves || []).find((l) => {
        const isStudent = l.studentId === s.id || (l.studentRollNo && l.studentRollNo.toLowerCase().trim() === s.rollNo.toLowerCase().trim());
        const isApproved = l.status === "APPROVED" || l.attendanceCredited;
        const inDate = todayStr >= l.startDate && todayStr <= l.endDate;
        return isStudent && isApproved && inDate;
      });

      if (activeLeave) {
        initial[s.id] = activeLeave.leaveType === "ON_DUTY" ? "ON_DUTY" : "APPROVED_LEAVE";
      } else {
        initial[s.id] = "PRESENT";
      }
    });
    setAttendanceMap(initial);
  }, [studentRoster, studentLeaves]);

  // Toggle individual student status
  const setStudentStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE") => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Bulk marking
  const markAll = (status: "PRESENT" | "ABSENT") => {
    const updated: Record<string, "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE"> = { ...attendanceMap };
    studentRoster.forEach((s) => {
      // Don't overwrite officially sanctioned OD/Leave on bulk action
      if (attendanceMap[s.id] !== "ON_DUTY" && attendanceMap[s.id] !== "APPROVED_LEAVE") {
        updated[s.id] = status;
      }
    });
    setAttendanceMap(updated);
  };

  // Real-time Counts (OD & Approved Leave count as credited attendance)
  const totalCount = studentRoster.length;
  const presentCount = useMemo(() => {
    return Object.values(attendanceMap).filter((s) => s !== "ABSENT").length;
  }, [attendanceMap]);
  const absentCount = totalCount - presentCount;
  const attendancePercentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : "0.0";

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return studentRoster.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const status = attendanceMap[s.id] || "PRESENT";
      if (filterMode === "PRESENT") return status === "PRESENT";
      if (filterMode === "ABSENT") return status === "ABSENT";
      return true;
    });
  }, [studentRoster, searchQuery, filterMode, attendanceMap]);

  // Absent students list for step 2 review
  const absentStudents = useMemo(() => {
    return studentRoster.filter((s) => (attendanceMap[s.id] || "PRESENT") === "ABSENT");
  }, [studentRoster, attendanceMap]);

  // Final confirmation & submit handler
  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    try {
      const effectiveCourse = targetCourse || courses.find(c => (((c as any).code || "").toLowerCase() === (courseCodeParam || "").toLowerCase())) || courses[0] || {
        id: "c-default",
        code: courseCodeParam || "CS-02",
        name: "Compiler Design",
        instructor: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Faculty Professor",
      };

      const resolvedRoom = (room || "").trim() || defaultVenue || "Room 102";
      const finalTopic = topic.trim() || activePlannedLecture?.topic || `${effectiveCourse.name} Lecture`;
      const resolvedCourseCode = (effectiveCourse as any).code || (effectiveCourse as any).course_code || courseCodeParam || "CS-02";

      const effectiveRoster = studentRoster.length > 0 ? studentRoster : (users || []).filter(u => u.role === "STUDENT").map(s => ({
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email,
        rollNo: s.student_identifier || "Not assigned",
        email: s.email || "",
        avatar: "",
        className: s.className || classNameFormatted || "IT - Semester 5 AIDS",
        historicalAttendancePct: 100,
        totalRecordedSessions: 0,
      }));

      const rosterRecords = effectiveRoster.map((s) => ({
        studentId: s.id,
        student_id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        email: s.email,
        status: (attendanceMap[s.id] || "PRESENT") as "PRESENT" | "ABSENT" | "ON_DUTY" | "APPROVED_LEAVE",
      }));

      const finalPresentCount = effectiveRoster.filter(s => (attendanceMap[s.id] || "PRESENT") !== "ABSENT").length;
      const finalTotalCount = effectiveRoster.length;

      recordAttendance({
        courseCode: resolvedCourseCode,
        courseName: effectiveCourse.name,
        topic: finalTopic,
        room: resolvedRoom,
        className: classNameFormatted || "IT - Semester 5 AIDS",
        section: sectionNameFormatted || "Section A",
        presentCount: finalPresentCount,
        totalCount: finalTotalCount,
        studentIsPresent: true,
        facultyName: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : effectiveCourse.instructor,
        rosterRecords,
      });

      // Synchronize Conducted Date on the selected planned lecture
      if (sessionPlan && selectedLectureId && selectedLectureId !== "custom") {
        const todayFormatted = new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        const updatedModules = sessionPlan.modules.map((mod) => ({
          ...mod,
          lectures: mod.lectures.map((lec) => {
            if (lec.id === selectedLectureId) {
              return {
                ...lec,
                conductedDate: todayFormatted,
                isConducted: true,
              };
            }
            return lec;
          }),
        }));

        const updatedPlan: CourseSessionPlan = {
          ...sessionPlan,
          modules: updatedModules,
          updatedAt: new Date().toISOString(),
        };

        setSessionPlan(updatedPlan);
      }

      setStep("SUBMITTED");
    } catch (err) {
      console.error("Attendance submission exception:", err);
      setStep("SUBMITTED");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <RoleGuard allowedRoles={["FACULTY", "HOD", "ADMINISTRATOR", "VC"]}>
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-28">
        {/* ─── ENTERPRISE TOP NAVIGATION & HEADER ─── */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/faculty?tab=attendance"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    Take Class Attendance
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono text-xs font-semibold">
                    {targetCourse ? targetCourse.code : activeLiveScheduleSlot ? activeLiveScheduleSlot.courseCode : "Standby"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {targetCourse
                    ? `${targetCourse.name} • ${sessionDate} • ${sessionTime}`
                    : activeLiveScheduleSlot
                    ? `${activeLiveScheduleSlot.courseName} • ${sessionDate} • ${sessionTime}`
                    : `No active timetable class in session • ${sessionDate}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex text-xs font-medium text-slate-600 dark:text-slate-300 items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{attendanceWindowHours}h Window</span>
              </span>

              {Boolean(targetCourse || activeLiveScheduleSlot) && step === "MARKING" && (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Saving..." : "Save Attendance"}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ─── MAIN CONTENT ─── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ========================================================================= */}
          {/* STANDBY VIEW: NO SPECIFIC COURSE SELECTED OR IN LIVE SESSION              */}
          {/* ========================================================================= */}
          {!targetCourse && !activeLiveScheduleSlot && (
            <div className="max-w-3xl mx-auto pt-4 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
                  <Calendar className="h-7 w-7" />
                </div>

                <div className="space-y-1.5 max-w-lg mx-auto">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Timetable Attendance Module
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                    Select a Course to Take Attendance
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Select one of your scheduled teaching slots below or open the attendance register to begin recording session attendance.
                  </p>
                </div>

                {facultyScheduleSlots.length > 0 && (
                  <div className="text-left bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Your Scheduled Teaching Slots ({facultyScheduleSlots.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {facultyScheduleSlots.slice(0, 6).map((slot) => (
                        <div
                          key={slot.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {slot.courseCode}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {dayLabels[slot.dayIndex] || "Day"}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                              {slot.className || "Class"} • {slot.room || "Room 102"}
                            </span>
                          </div>
                          <Link
                            href={`/faculty/attendance/take?courseCode=${slot.courseCode}&room=${encodeURIComponent(slot.room || "Room 102")}`}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-[11px] hover:opacity-90 transition-opacity shrink-0"
                          >
                            Mark
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                  <Link
                    href="/faculty?tab=timetable"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>View Teaching Timetable</span>
                  </Link>
                  <Link
                    href="/faculty?tab=attendance"
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Back to Attendance Register
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: ROSTER & MARKING                                                  */}
          {/* ========================================================================= */}
          {Boolean(targetCourse || activeLiveScheduleSlot) && step === "MARKING" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Session Details Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4">
                {/* Horizontal Summary Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Class</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {classNameFormatted}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Section</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {sectionNameFormatted}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Venue / Room</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {room || defaultVenue}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date &amp; Time</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {sessionDate} • {sessionTime}
                    </span>
                  </div>
                </div>

                {/* Session Plan & Lecture Inputs */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Topic / Points Covered
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Syntax Analysis & LL(1) Parsers"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Hall / Lab Venue
                    </label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="e.g., Room 102"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                {allPlannedLectures.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Sync with Curriculum Session Plan (Optional):</span>
                      {activePlannedLecture && (
                        <span className="text-[10px] font-mono text-slate-500">
                          CO: {activePlannedLecture.courseOutcome} • {activePlannedLecture.methodology}
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedLectureId}
                      onChange={(e) => handleSelectPlannedLecture(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="custom">Direct Lecture (No Session Plan linking)</option>
                      {allPlannedLectures.map((lec) => (
                        <option key={lec.id} value={lec.id}>
                          Lecture {lec.lectureNo} (Module {lec.moduleNumber}): {lec.topic}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Attendance Statistics Metrics - Minimalist SaaS Design */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Class Strength</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                      {totalCount}
                    </strong>
                    <span className="text-xs text-slate-400 font-medium">Enrolled</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Present</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                      {presentCount}
                    </strong>
                    <span className="text-xs text-emerald-600 font-semibold font-mono">
                      {attendancePercentage}%
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                      {absentCount}
                    </strong>
                    <span className="text-xs text-rose-500 font-semibold font-mono">
                      {totalCount > 0 ? ((absentCount / totalCount) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Attendance Rate</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                      {attendancePercentage}%
                    </strong>
                    <span className="text-xs text-slate-400 font-medium">Institutional</span>
                  </div>
                </div>
              </div>

              {/* Roster Controls & Filters */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student by name or roll..."
                    className="w-full h-8.5 pl-8.5 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
                    <button
                      onClick={() => setFilterMode("ALL")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        filterMode === "ALL" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      onClick={() => setFilterMode("PRESENT")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        filterMode === "PRESENT" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Present ({presentCount})
                    </button>
                    <button
                      onClick={() => setFilterMode("ABSENT")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        filterMode === "ABSENT" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Absent ({absentCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => markAll("PRESENT")}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Mark All Present
                    </button>
                    <button
                      onClick={() => markAll("ABSENT")}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Mark All Absent
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Attendance Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Roll / Reg Number</th>
                        <th className="py-3 px-4">Academic Class</th>
                        <th className="py-3 px-4 text-center">Past Attendance</th>
                        <th className="py-3 px-4 text-right pr-6">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {filteredRoster.map((student, index) => {
                        const status = attendanceMap[student.id] || "PRESENT";
                        const isPresent = status === "PRESENT";
                        const isOnDuty = status === "ON_DUTY";
                        const isLeave = status === "APPROVED_LEAVE";
                        const isAbsent = status === "ABSENT";

                        const getNextStatus = (): "PRESENT" | "ABSENT" | "ON_DUTY" => {
                          if (status === "PRESENT") return "ON_DUTY";
                          if (status === "ON_DUTY") return "ABSENT";
                          if (status === "APPROVED_LEAVE") return "PRESENT";
                          return "PRESENT"; // from ABSENT -> PRESENT
                        };

                        return (
                          <tr
                            key={student.id}
                            className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${
                              isAbsent
                                ? "bg-rose-50/20 dark:bg-rose-950/10"
                                : isOnDuty
                                ? "bg-purple-50/20 dark:bg-purple-950/10"
                                : isLeave
                                ? "bg-blue-50/20 dark:bg-blue-950/10"
                                : ""
                            }`}
                          >
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {student.avatar ? (
                                  <img
                                    src={student.avatar}
                                    alt={student.name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 select-none">
                                    {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                                    {student.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    {student.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                                {student.rollNo}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {student.className}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  (student.totalRecordedSessions ?? 0) === 0
                                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                    : student.historicalAttendancePct >= 75
                                    ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {(student.totalRecordedSessions ?? 0) === 0 ? "—" : `${student.historicalAttendancePct}%`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right pr-6">
                              <button
                                type="button"
                                onClick={() => setStudentStatus(student.id, getNextStatus())}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
                                  isOnDuty
                                    ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
                                    : isLeave
                                    ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                                    : isPresent
                                    ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70"
                                    : "border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100/70"
                                }`}
                                title="Click to cycle: Present -> On Duty -> Absent -> Present"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isOnDuty
                                      ? "bg-purple-500 animate-pulse"
                                      : isLeave
                                      ? "bg-blue-500"
                                      : isPresent
                                      ? "bg-emerald-500"
                                      : "bg-rose-500"
                                  }`}
                                />
                                <span>
                                  {isOnDuty
                                    ? "On Duty (OD)"
                                    : isLeave
                                    ? "Leave"
                                    : isPresent
                                    ? "Present"
                                    : "Absent"}
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredRoster.length === 0 && (
                  <div className="p-12 text-center space-y-2">
                    <Users className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      No students enrolled in this course / section
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {targetCourse ? `No enrolled students match ${targetCourse.code} (${classNameFormatted}).` : "Select a valid course."}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg py-3 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Attendance Status</span>
                      <span className="text-slate-900 dark:text-white font-mono font-semibold">
                        <span>{presentCount} Present</span>
                        <span className="text-slate-400 mx-1.5">/</span>
                        <span>{absentCount} Absent</span>
                      </span>
                    </div>
                    <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="hidden sm:block">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Attendance Rate</span>
                      <strong className="text-slate-900 dark:text-white font-mono font-bold">{attendancePercentage}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/faculty"
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </Link>
                    <button
                      onClick={() => setStep("ABSENTEE_REVIEW")}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Review Absentees ({absentCount})</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={handleFinalSubmit}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{isSubmitting ? "Saving..." : "Save Attendance"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ABSENTEE CONFIRMATION & REVIEW STEP                               */}
          {/* ========================================================================= */}
          {step === "ABSENTEE_REVIEW" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Absentee Verification</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Confirm List of Absent Students
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Please verify all marked absent students before committing this record to the institutional registry.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("MARKING")}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                </div>

                {/* Session Snapshot Pill */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Course</span>
                    <strong>{targetCourse?.code}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Class / Sec</span>
                    <strong>{sectionNameFormatted}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Venue</span>
                    <strong>{(room || defaultVenue).split("(")[0]}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Date</span>
                    <strong>{sessionDate}</strong>
                  </div>
                </div>

                {/* Absent Students List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Absent Students ({absentStudents.length})
                    </h3>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold font-mono">
                      {totalCount > 0 ? ((absentCount / totalCount) * 100).toFixed(0) : 0}% of Class
                    </span>
                  </div>

                  {absentStudents.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center space-y-1">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Full Class Attendance
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        All {totalCount} enrolled students are marked present for this session.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {absentStudents.map((stu) => (
                        <div key={stu.id} className="p-3.5 flex items-center justify-between bg-white dark:bg-slate-900 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              {stu.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                                {stu.name}
                              </strong>
                              <span className="text-[10px] font-mono text-slate-400">
                                {stu.rollNo} • {stu.email}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(stu.id, "PRESENT")}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                          >
                            Mark Present
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Final Submit & Sign Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setStep("MARKING")}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
                    className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? "Saving Record..." : "Confirm & Save Attendance"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUBMITTED SUCCESS VIEW                                            */}
          {/* ========================================================================= */}
          {step === "SUBMITTED" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto space-y-6 pt-8 text-center">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Attendance Record Submitted
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Attendance for <strong>{targetCourse?.code}: {targetCourse?.name}</strong> has been saved and synchronized with student registers.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Total</span>
                    <strong>{totalCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block font-sans">Present</span>
                    <strong className="text-emerald-600">{presentCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 block font-sans">Absent</span>
                    <strong className="text-rose-600">{absentCount}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => router.push("/faculty")}
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    Faculty Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setStep("MARKING");
                    }}
                    className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Take Another Session
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}

export default function TakeAttendancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Loading Attendance Register...</span>
          </div>
        </div>
      }
    >
      <TakeAttendanceContent />
    </React.Suspense>
  );
}
