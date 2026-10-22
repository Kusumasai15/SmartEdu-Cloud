"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  BookOpen,
  Calendar as CalendarIcon,
  Plus,
  Building,
  CheckCircle2,
  X,
  MapPin,
  Users,
  CalendarDays,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Sun,
  Award,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData, CalendarScheduleEvent } from "@/context/AcademicDataContext";

export function FacultyWorkloadView() {
  const { user } = useAuth();
  const {
    calendarSchedules,
    institutionalHolidays,
    departments,
    courses,
    classrooms,
    users: allUsers,
    addScheduleEvent,
    deleteScheduleEvent,
    isHolidayDate,
  } = useAcademicData();
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<"TIMETABLE" | "STUDENT_TIMETABLE" | "ADVISOR_CLASS" | "HOLIDAYS">("TIMETABLE");
  const [selectedStudentCohort, setSelectedStudentCohort] = useState<string>("ALL");
  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State for Adding Custom Slot
  const [slotCourseCode, setSlotCourseCode] = useState("");
  const [slotCourseName, setSlotCourseName] = useState("");
  const [slotLectureTitle, setSlotLectureTitle] = useState("");
  const [slotClassName, setSlotClassName] = useState("");
  const [slotType, setSlotType] = useState<"LECTURE" | "LAB" | "TUTORIAL" | "EXAM" | "CLASS_TEST">("LECTURE");
  const [slotDayIndex, setSlotDayIndex] = useState(1);
  const [slotStartTime, setSlotStartTime] = useState("09:00 AM");
  const [slotEndTime, setSlotEndTime] = useState("10:30 AM");
  const [slotRoom, setSlotRoom] = useState("");

  const facultyFullName = user
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : "";

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenAddSessionModal = () => {
    if (!slotClassName && studentCohortList.length > 0) {
      setSlotClassName(studentCohortList[0]);
    }
    if (!slotRoom && availableRooms.length > 0) {
      setSlotRoom(availableRooms[0].roomNumber);
    }
    if (!slotCourseCode && courses.length > 0) {
      setSlotCourseCode(courses[0].code);
      setSlotCourseName(courses[0].name);
    }
    setIsAddSlotModalOpen(true);
  };

  // Find cohorts where this faculty is the designated Class Advisor
  const advisedCohorts = useMemo(() => {
    const list: Array<{
      cohortName: string;
      departmentName: string;
      room: string;
      program: string;
      semester: string;
      students: typeof allUsers;
      courses: string[];
    }> = [];

    departments.forEach((dept) => {
      dept.cohorts?.forEach((cohort) => {
        const advisorName = (cohort.classAdvisor || "").toLowerCase();
        const curFaculty = facultyFullName.toLowerCase();

        const isAdvisor = Boolean(advisorName && curFaculty && advisorName === curFaculty);

        if (isAdvisor) {
          // Find enrolled students in this class
          const cohortStudents = allUsers.filter(
            (u) =>
              u.role === "STUDENT" &&
              u.className === cohort.name
          );

          list.push({
            cohortName: cohort.name,
            departmentName: dept.name,
            room: cohort.room || "",
            program: cohort.program || "",
            semester: cohort.semester || "",
            students: cohortStudents,
            courses: cohort.assignedCourses || [],
          });
        }
      });
    });

    return list;
  }, [departments, allUsers, facultyFullName, user]);

  // All student cohorts and sections across the institution
  const studentCohortList = useMemo(() => {
    const list: string[] = [];
    departments.forEach((dept) => {
      dept.cohorts?.forEach((cohort) => {
        if (cohort.name && !list.includes(cohort.name)) list.push(cohort.name);
      });
      dept.classes?.forEach((cls) => {
        if (cls && !list.includes(cls)) list.push(cls);
      });
    });
    calendarSchedules.forEach((s) => {
      const cls = s.className || s.section;
      if (cls && !list.includes(cls)) list.push(cls);
    });
    return list;
  }, [departments, calendarSchedules]);

  // Registered campus rooms for selectable room/hall scheduling
  const availableRooms = useMemo(() => {
    const list: { roomNumber: string; label: string }[] = [];
    if (classrooms && classrooms.length > 0) {
      classrooms.forEach((r) => {
        const num = (r.roomNumber || r.name || "").trim();
        if (num && !list.some((x) => x.roomNumber.toLowerCase() === num.toLowerCase())) {
          list.push({
            roomNumber: num,
            label: `${num} • ${r.name || "Lecture Room"} (${r.building || "Campus"})`,
          });
        }
      });
    }
    const defaultCampusRooms = [
      { roomNumber: "LH-001", label: "LH-001 • Smart Lecture Hall (Main Block)" },
      { roomNumber: "LH-002", label: "LH-002 • Large Lecture Hall (Main Block)" },
      { roomNumber: "LH-301", label: "LH-301 • Engineering Block Lecture Room" },
      { roomNumber: "Lab 1", label: "Lab 1 • Software Systems Computing Lab" },
      { roomNumber: "Lab 2", label: "Lab 2 • Advanced Systems & Networking Lab" },
      { roomNumber: "Lab 3", label: "Lab 3 • AI & Research Lab" },
      { roomNumber: "101", label: "Room 101 • Smart Lecture Hall (Aryabhatta)" },
      { roomNumber: "102", label: "Room 102 • Computing Lab (Aryabhatta)" },
    ];
    defaultCampusRooms.forEach((rm) => {
      if (!list.some((x) => x.roomNumber.toLowerCase() === rm.roomNumber.toLowerCase())) {
        list.push(rm);
      }
    });
    return list;
  }, [classrooms]);

  // Helper: parse time string (e.g. "08:00 AM", "09:00", "14:00") into minutes for chronological sorting
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  // Real-time schedule events for this faculty
  const facultyEvents = useMemo(() => {
    const curEmail = (user?.email || "").toLowerCase().trim();
    const curFirstName = (user?.first_name || "").toLowerCase().trim();
    const curLastName = (user?.last_name || "").toLowerCase().trim();
    const curFullName = facultyFullName.toLowerCase().trim();

    // Courses where THIS faculty is the designated instructor
    const myTaughtCourseCodes = new Set<string>();

    // From courses list
    courses.forEach((c) => {
      const inst = (c.instructor || "").toLowerCase().trim();
      const code = (((c as any).course_code || (c as any).code || "") as string).toLowerCase().trim();
      if (!code) return;
      if (inst && (inst === curFullName || inst.includes(curFullName) || curFullName.includes(inst))) {
        myTaughtCourseCodes.add(code);
      } else if (curFirstName && curFirstName.length >= 3 && inst.includes(curFirstName)) {
        myTaughtCourseCodes.add(code);
      }
      if (Array.isArray((c as any).instructors)) {
        (c as any).instructors.forEach((ci: any) => {
          const iEmail = (ci.faculty_email || ci.email || "").toLowerCase();
          const iName = (ci.faculty_name || ci.name || "").toLowerCase();
          const iId = ci.faculty_id || ci.id;
          if (
            (iId && iId === user?.id) ||
            (iEmail && iEmail === curEmail) ||
            (iName && (iName.includes(curFullName) || curFullName.includes(iName)))
          ) {
            myTaughtCourseCodes.add(code);
          }
        });
      }
    });

    // From department cohorts
    departments.forEach((dept) => {
      dept.cohorts?.forEach((cohort) => {
        const advisorName = (cohort.classAdvisor || "").toLowerCase();
        const advisorEmail = (cohort.classAdvisorEmail || "").toLowerCase();
        const isAdvisor = (advisorEmail && advisorEmail === curEmail) || (advisorName && (advisorName === curFullName || advisorName.includes(curFullName) || curFullName.includes(advisorName)));

        if (cohort.courseInstructors) {
          Object.entries(cohort.courseInstructors).forEach(([cCode, inst]) => {
            const iLower = (inst || "").toLowerCase();
            if (iLower && (iLower === curFullName || iLower.includes(curFullName) || curFullName.includes(iLower) || (curFirstName.length >= 3 && iLower.includes(curFirstName)) || iLower === curEmail)) {
              myTaughtCourseCodes.add(cCode.toLowerCase().trim());
            }
          });
        }

        if (isAdvisor && cohort.assignedCourses) {
          cohort.assignedCourses.forEach((cCode) => myTaughtCourseCodes.add(cCode.toLowerCase().trim()));
        }
      });
    });

    return calendarSchedules.filter((ev) => {
      const evEmail = (ev.facultyEmail || "").toLowerCase().trim();
      const evFaculty = (ev.faculty || "").toLowerCase().trim();

      // 1. Direct email match
      if (evEmail && curEmail && evEmail === curEmail) {
        return true;
      }

      // 2. Direct faculty name match
      if (evFaculty && curFullName) {
        if (evFaculty === curFullName || evFaculty.includes(curFullName) || curFullName.includes(evFaculty)) {
          return true;
        }
        if (curFirstName && curFirstName.length >= 3 && evFaculty.includes(curFirstName)) {
          return true;
        }
      }

      // 3. If this course code is specifically taught by this faculty
      if (ev.courseCode && myTaughtCourseCodes.has(ev.courseCode.toLowerCase().trim())) {
        return true;
      }

      // 4. Exclude only if event is explicitly assigned to another identifiable faculty member
      if (evFaculty && evFaculty !== "faculty teacher" && evFaculty !== "faculty professor" && evFaculty !== "assigned faculty" && evFaculty !== "unassigned") {
        const otherFaculty = allUsers.filter(
          (u) => (u.role === "FACULTY" || u.role === "HOD") && u.email?.toLowerCase() !== curEmail
        );
        const assignedToOther = otherFaculty.some((u) => {
          const oFull = `${u.first_name} ${u.last_name || ""}`.toLowerCase().trim();
          return oFull && (evFaculty === oFull || evFaculty.includes(oFull));
        });
        if (assignedToOther) {
          return false;
        }
      }

      return false;
    });
  }, [calendarSchedules, facultyFullName, courses, user, allUsers, departments]);

  const daysOfWeek = [
    { index: 1, name: "Monday", short: "Mon" },
    { index: 2, name: "Tuesday", short: "Tue" },
    { index: 3, name: "Wednesday", short: "Wed" },
    { index: 4, name: "Thursday", short: "Thu" },
    { index: 5, name: "Friday", short: "Fri" },
  ];

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const today = useMemo(() => new Date(), []);

  // Calculate Monday of the current or navigated academic working week
  const currentWeekMonday = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    let diff = 0;
    if (day === 0) {
      // Sunday -> Academic week begins tomorrow (Monday)
      diff = 1;
    } else if (day === 6) {
      // Saturday -> Upcoming Monday
      diff = 2;
    } else {
      // Monday to Friday
      diff = -(day - 1);
    }
    const targetDate = new Date(d);
    targetDate.setDate(d.getDate() + diff + weekOffset * 7);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate;
  }, [today, weekOffset]);

  const currentWeekDates = useMemo(() => {
    const map: Record<number, { formatted: string; fullDate: string; isRealToday: boolean }> = {};
    for (let i = 1; i <= 5; i++) {
      const dateObj = new Date(currentWeekMonday);
      dateObj.setDate(currentWeekMonday.getDate() + (i - 1));

      const isRealToday =
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate();

      map[i] = {
        formatted: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: dateObj.toISOString().split("T")[0],
        isRealToday,
      };
    }
    return map;
  }, [currentWeekMonday, today]);

  const weekRangeLabel = useMemo(() => {
    const mon = currentWeekDates[1]?.formatted || "";
    const fri = currentWeekDates[5]?.formatted || "";
    const year = currentWeekMonday.getFullYear();
    return `${mon} – ${fri}, ${year}`;
  }, [currentWeekDates, currentWeekMonday]);

  const handleAddSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotLectureTitle.trim()) {
      showNotification("⚠️ Lecture / Topic title is required.");
      return;
    }
    const finalClass = (slotClassName || studentCohortList[0] || "").trim();
    const finalRoom = (slotRoom || availableRooms[0]?.roomNumber || "LH-001").trim();

    if (!finalClass) {
      showNotification("⚠️ Please select an academic class cohort.");
      return;
    }
    if (!finalRoom) {
      showNotification("⚠️ Please select a room/hall.");
      return;
    }

    const newStartMins = parseTimeToMinutes(slotStartTime);
    const newEndMins = parseTimeToMinutes(slotEndTime);
    if (newEndMins <= newStartMins) {
      showNotification("⚠️ Invalid Time: End time must be after start time.");
      return;
    }

    // ─── 1. ROOM COLLISION DETECTION ───
    const roomCollision = calendarSchedules.find((ev) => {
      if (ev.dayIndex !== slotDayIndex) return false;
      const evRoom = (ev.room || "").trim().toLowerCase();
      if (evRoom !== finalRoom.toLowerCase()) return false;

      const evStart = parseTimeToMinutes(ev.startTime);
      const evEnd = parseTimeToMinutes(ev.endTime);
      return Math.max(newStartMins, evStart) < Math.min(newEndMins, evEnd);
    });

    if (roomCollision) {
      showNotification(
        `⚠️ Room Overlap: ${finalRoom} is already booked on this day by ${roomCollision.faculty || "Faculty"} for ${roomCollision.courseCode} (${roomCollision.startTime} – ${roomCollision.endTime}). Please select a different room or time.`
      );
      return;
    }

    // ─── 2. CLASS COHORT COLLISION DETECTION ───
    const classCollision = calendarSchedules.find((ev) => {
      if (ev.dayIndex !== slotDayIndex) return false;
      const evClass = (ev.className || "").trim().toLowerCase();
      if (evClass !== finalClass.toLowerCase()) return false;

      const evStart = parseTimeToMinutes(ev.startTime);
      const evEnd = parseTimeToMinutes(ev.endTime);
      return Math.max(newStartMins, evStart) < Math.min(newEndMins, evEnd);
    });

    if (classCollision) {
      showNotification(
        `⚠️ Class Overlap: Cohort "${finalClass}" already has an assigned session (${classCollision.courseCode}: ${classCollision.lectureTitle || classCollision.courseName}) at ${classCollision.startTime} – ${classCollision.endTime}.`
      );
      return;
    }

    // ─── 3. FACULTY SCHEDULE COLLISION DETECTION ───
    const facultyCollision = calendarSchedules.find((ev) => {
      if (ev.dayIndex !== slotDayIndex) return false;
      const evFaculty = (ev.faculty || "").trim().toLowerCase();
      if (evFaculty && facultyFullName && evFaculty === facultyFullName.toLowerCase()) {
        const evStart = parseTimeToMinutes(ev.startTime);
        const evEnd = parseTimeToMinutes(ev.endTime);
        return Math.max(newStartMins, evStart) < Math.min(newEndMins, evEnd);
      }
      return false;
    });

    if (facultyCollision) {
      showNotification(
        `⚠️ Faculty Schedule Conflict: You already have a session (${facultyCollision.courseCode}) scheduled at ${facultyCollision.startTime} – ${facultyCollision.endTime}.`
      );
      return;
    }

    try {
      addScheduleEvent({
        className: finalClass,
        courseCode: slotCourseCode.trim(),
        courseName: slotCourseName.trim(),
        lectureNumber: 1,
        lectureTitle: slotLectureTitle.trim(),
        dayIndex: slotDayIndex,
        weekNumber: 1,
        dateNumber: slotDayIndex,
        startTime: slotStartTime,
        endTime: slotEndTime,
        startHour: parseInt(slotStartTime) || 9,
        durationHours: 1.5,
        room: finalRoom,
        building: "Engineering Block",
        faculty: facultyFullName,
        facultyTitle: "Professor",
        facultyPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
        facultyEmail: user?.email || "faculty@smartedu.local",
        facultyDepartment: "Computer Science and Engineering",
        type: slotType,
        colorBadge:
          slotType === "EXAM"
            ? "bg-rose-600 text-white"
            : slotType === "CLASS_TEST"
            ? "bg-amber-600 text-white"
            : slotType === "LAB"
            ? "bg-purple-600 text-white"
            : slotType === "TUTORIAL"
            ? "bg-indigo-600 text-white"
            : "bg-blue-600 text-white",
        sessionAgenda: ["Core Topic Lecture", "Practical Problem Solving", "Q&A"],
        prerequisites: "Previous module concepts",
        learningOutcomes: `Mastery of ${slotLectureTitle}`,
        readingMaterials: "Course syllabus notes",
      });

      setIsAddSlotModalOpen(false);
      setSlotLectureTitle("");
      showNotification(`✓ Successfully scheduled session "${slotLectureTitle}" for ${finalClass} in ${finalRoom}.`);
    } catch (err: any) {
      showNotification(`⚠️ Cannot schedule: ${err.message || "Schedule collision detected"}`);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between shadow-xl border border-slate-800"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* ─── CLASS ADVISOR PORTFOLIO HERO BANNER ─── */}
      {advisedCohorts.map((ac, idx) => (
        <div
          key={idx}
          className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-blue-800/50 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-blue-200">
                <GraduationCap className="h-4 w-4 text-amber-300" />
                <span>Class Advisor Dashboard</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {ac.cohortName}
              </h2>
              <p className="text-xs text-blue-100/80">
                {ac.program} • {ac.departmentName} • Room: <strong>{ac.room}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenAddSessionModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Schedule Extra Class</span>
              </button>
            </div>
          </div>

          {/* Enrolled Students Quick View */}
          <div className="pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-md">
              <span className="text-[11px] text-blue-200 block font-semibold">Enrolled Students in Class</span>
              <strong className="text-lg text-white font-mono">{ac.students.length} Registered</strong>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-200/90 truncate">
                {ac.students.slice(0, 3).map((s) => (
                  <span key={s.id} className="px-1.5 py-0.5 rounded bg-white/15 text-[10px]">
                    {s.first_name} ({s.student_identifier || "ID"})
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-md">
              <span className="text-[11px] text-blue-200 block font-semibold">Assigned Subjects</span>
              <strong className="text-lg text-white font-mono">{ac.courses.length} Courses</strong>
              <span className="text-[11px] text-blue-200 block truncate">
                {ac.courses.join(", ")}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-md">
              <span className="text-[11px] text-blue-200 block font-semibold">Scheduled Sessions / Week</span>
              <strong className="text-lg text-white font-mono">
                {facultyEvents.length} Active Slots
              </strong>
              <span className="text-[11px] text-emerald-300 block">Synchronized with Admin master timetable</span>
            </div>
          </div>
        </div>
      ))}

      {/* ─── TAB SWITCHER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "TIMETABLE", label: "My Teaching Timetable", count: facultyEvents.length },
            { id: "STUDENT_TIMETABLE", label: "Student Section Timetable", count: calendarSchedules.length },
            { id: "ADVISOR_CLASS", label: "Advised Class Roster", count: advisedCohorts[0]?.students.length || 0 },
            { id: "HOLIDAYS", label: "Institutional Holidays", count: institutionalHolidays.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeSubTab === tab.id ? "bg-blue-700 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleOpenAddSessionModal}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Session</span>
        </button>
      </div>

      {/* ─── SUB-TAB 1: TEACHING TIMETABLE ─── */}
      {activeSubTab === "TIMETABLE" && (
        <div className="space-y-4">
          {/* Week Navigation Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {weekRangeLabel}
              </span>
              {weekOffset === 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Current Academic Week
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  weekOffset === 0
                    ? "bg-blue-600 text-white shadow-xs"
                    : "border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                Current Week
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next Week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              {daysOfWeek.map((day) => {
                const dayEvents = facultyEvents
                  .filter((ev) => ev.dayIndex === day.index)
                  .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
                const dateInfo = currentWeekDates[day.index];
                const isDayHoliday = institutionalHolidays.find(
                  (h) => dateInfo?.fullDate && (h.startDate <= dateInfo.fullDate && (h.endDate ? h.endDate >= dateInfo.fullDate : h.startDate === dateInfo.fullDate))
                );

                const isToday = Boolean(dateInfo?.isRealToday);
                const dateFormatted = dateInfo?.formatted;

                return (
                  <div key={day.index} className={`min-h-[380px] flex flex-col ${isToday ? "bg-blue-50/20 dark:bg-blue-950/10" : ""}`}>
                    {/* Day Header */}
                    <div
                      className={`p-3 border-b text-center transition-colors ${
                        isToday
                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`text-xs uppercase tracking-wider block ${
                            isToday ? "font-black text-blue-700 dark:text-blue-300" : "font-bold text-slate-900 dark:text-white"
                          }`}
                        >
                          {day.name}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white">
                            TODAY
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-mono block mt-0.5 ${
                          isToday ? "text-blue-700 dark:text-blue-300 font-bold" : "text-slate-400"
                        }`}
                      >
                        {dateFormatted ? `${dateFormatted} • ` : ""}{dayEvents.length} {dayEvents.length === 1 ? "Session" : "Sessions"}
                      </span>
                    </div>

                    {/* Holiday notice if any */}
                    {isDayHoliday && (
                      <div className="m-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-200 font-bold flex items-center gap-1">
                        <Sun className="h-3 w-3 text-amber-600 shrink-0" />
                        <span className="truncate">{isDayHoliday.name}</span>
                      </div>
                    )}

                    {/* Slot cards */}
                    <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
                      {dayEvents.length === 0 ? (
                        <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                          <p className="text-[11px] text-slate-400">No lecture scheduled</p>
                          <button
                            onClick={() => {
                              setSlotDayIndex(day.index);
                              handleOpenAddSessionModal();
                            }}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            + Add slot
                          </button>
                        </div>
                      ) : (
                        dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:shadow-md hover:border-blue-300 transition-all relative group"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                {ev.courseCode}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 font-mono">
                                {ev.type}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                {ev.lectureTitle}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{ev.className || "Class"}</p>
                            </div>

                            <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                              <div className="flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3 text-blue-600 shrink-0" />
                                <span>{ev.startTime} - {ev.endTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{ev.room}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 2: STUDENT SECTION TIMETABLE (FACULTY OBSERVATION) ─── */}
      {activeSubTab === "STUDENT_TIMETABLE" && (
        <div className="space-y-4 animate-fade-in">
          {/* Cohort Selector Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Student Class &amp; Cohort Weekly Timetable
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Inspect student schedules to verify when sections are occupied with lectures vs. available for extra classes or office hours.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">Section:</span>
              <select
                value={selectedStudentCohort}
                onChange={(e) => setSelectedStudentCohort(e.target.value)}
                className="w-full sm:w-auto h-9 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Student Sections</option>
                {studentCohortList.map((cohort) => (
                  <option key={cohort} value={cohort}>
                    {cohort}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Timetable Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              {daysOfWeek.map((day) => {
                const dayEvents = calendarSchedules
                  .filter((ev) => {
                    if (ev.dayIndex !== day.index) return false;
                    if (selectedStudentCohort !== "ALL") {
                      return ev.className === selectedStudentCohort || ev.section === selectedStudentCohort;
                    }
                    return true;
                  })
                  .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
                const dayDateInfo = currentWeekDates[day.index];
                const isDayHoliday = institutionalHolidays.find((h) => {
                  if (!dayDateInfo?.fullDate || !h.endDate) return false;
                  return dayDateInfo.fullDate >= h.startDate && dayDateInfo.fullDate <= h.endDate;
                });

                return (
                  <div key={day.index} className="flex flex-col min-h-[360px]">
                    {/* Column header */}
                    <div
                      className={`p-3 text-center border-b border-slate-200 dark:border-slate-800 transition-colors ${
                        dayDateInfo?.isRealToday
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-xs font-bold block">{day.name}</span>
                      <span className={`text-[11px] block mt-0.5 ${dayDateInfo?.isRealToday ? "text-blue-100" : "text-slate-500"}`}>
                        {dayDateInfo?.formatted || ""}
                      </span>
                    </div>

                    {/* Holiday indicator */}
                    {isDayHoliday && (
                      <div className="m-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[10px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{isDayHoliday.name}</span>
                      </div>
                    )}

                    {/* Events */}
                    <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
                      {dayEvents.length === 0 ? (
                        <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-emerald-200 dark:border-emerald-950/60 rounded-xl space-y-1 bg-emerald-50/30 dark:bg-emerald-950/20">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🟢 Class Free / Available</span>
                          <span className="text-[9px] text-slate-400">No lecture scheduled</span>
                        </div>
                      ) : (
                        dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-1.5 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                {ev.courseCode}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{ev.className || ev.section}</span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                              {ev.lectureTitle}
                            </h5>
                            <p className="text-[10px] text-slate-500 truncate">Prof. {ev.faculty || "Faculty"}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400 font-mono">
                              <span>{ev.startTime} - {ev.endTime}</span>
                              <span>{ev.room}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 3: ADVISED CLASS ROSTER ─── */}
      {activeSubTab === "ADVISOR_CLASS" && (
        <div className="space-y-4">
          {advisedCohorts.map((ac, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {ac.cohortName} • Student Roster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students enrolled in your advised class. You can monitor attendance, continuous assessment, and marks.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/faculty?tab=attendance")}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>View Attendance Register</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Roll No / ID</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Class Section</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ac.students.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {stu.first_name[0]}
                          </div>
                          <span>{stu.first_name} {stu.last_name || ""}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {stu.student_identifier || "2026-CSE-001"}
                        </td>
                        <td className="p-3 text-slate-500 font-mono">{stu.email}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{stu.className || ac.cohortName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active Enrolled
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => router.push("/faculty?tab=gradebook")}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold transition-colors"
                          >
                            Gradebook
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── SUB-TAB 3: INSTITUTIONAL HOLIDAYS ─── */}
      {activeSubTab === "HOLIDAYS" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Official Non-Instructional Holidays &amp; Recess
          </h3>
          <p className="text-xs text-slate-500">
            Teaching classes are suspended during declared campus holidays.
          </p>

          {institutionalHolidays.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400">
              No institutional holidays scheduled for this period.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {institutionalHolidays.map((hol) => (
                <div key={hol.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase font-mono">
                      {hol.type}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{hol.startDate}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{hol.name}</h4>
                  <p className="text-xs text-slate-500">{hol.description || "Campus Closed • Regular Classes Suspended"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: SCHEDULE SESSION ─── */}
      <AnimatePresence>
        {isAddSlotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans"
            >
              <div className="px-6 py-4 bg-blue-600 text-white border-b border-blue-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-100" />
                  <h3 className="font-bold text-sm">Schedule Teaching Session</h3>
                </div>
                <button
                  onClick={() => setIsAddSlotModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-blue-700 text-blue-100 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSlotSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-3.5 overflow-y-auto flex-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Academic Class:</label>
                    <select
                      required
                      value={slotClassName || studentCohortList[0] || ""}
                      onChange={(e) => setSlotClassName(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {studentCohortList.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Code:</label>
                      <input
                        type="text"
                        required
                        value={slotCourseCode}
                        onChange={(e) => setSlotCourseCode(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Name:</label>
                      <input
                        type="text"
                        required
                        value={slotCourseName}
                        onChange={(e) => setSlotCourseName(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lecture / Topic Title:</label>
                    <input
                      type="text"
                      required
                      value={slotLectureTitle}
                      onChange={(e) => setSlotLectureTitle(e.target.value)}
                      placeholder="e.g. Memory Management & Pointers"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Day:</label>
                      <select
                        value={slotDayIndex}
                        onChange={(e) => setSlotDayIndex(Number(e.target.value))}
                        className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      >
                        {daysOfWeek.map((d) => (
                          <option key={d.index} value={d.index}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Time:</label>
                      <input
                        type="text"
                        value={slotStartTime}
                        onChange={(e) => setSlotStartTime(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Time:</label>
                      <input
                        type="text"
                        value={slotEndTime}
                        onChange={(e) => setSlotEndTime(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Room / Hall:</label>
                      <select
                        required
                        value={slotRoom || availableRooms[0]?.roomNumber || "LH-001"}
                        onChange={(e) => setSlotRoom(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      >
                        {availableRooms.map((rm) => (
                          <option key={rm.roomNumber} value={rm.roomNumber}>
                            {rm.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Session Type:</label>
                      <select
                        value={slotType}
                        onChange={(e) => setSlotType(e.target.value as any)}
                        className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      >
                        <option value="LECTURE">Theory Lecture</option>
                        <option value="LAB">Practical Laboratory</option>
                        <option value="TUTORIAL">Tutorial Session</option>
                        <option value="CLASS_TEST">📝 DSA Class Test (Internal)</option>
                        <option value="EXAM">🎓 Term Examination</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddSlotModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                  >
                    Add Session
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
