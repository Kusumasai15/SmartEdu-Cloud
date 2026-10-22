"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  BookOpen,
  LayoutGrid,
  List,
  Filter,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  X,
  Plus,
  Mail,
  GraduationCap,
  Building,
  Check,
  FileText,
  Lightbulb,
} from "lucide-react";
import { ClassSchedule } from "@/types";
import { AiCatchUpLessonModal, AiCatchUpLectureInfo } from "@/components/student/AiCatchUpLessonModal";
import { useAcademicData, CalendarScheduleEvent, InstitutionalHoliday } from "@/context/AcademicDataContext";
import { getUserAvatarUrl } from "@/lib/avatar";
import { useAuth } from "@/context/AuthContext";

export type CalendarEvent = CalendarScheduleEvent;

const timeSlots = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface StudentWeeklyCalendarViewProps {
  schedules?: ClassSchedule[];
  enrolledCourses?: { code: string; name?: string }[];
  onLaunchAiCatchUp?: (lecture: AiCatchUpLectureInfo) => void;
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return -1;
  const cleaned = timeStr.trim();
  const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toUpperCase();

  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  if (!period && h >= 1 && h <= 6) {
    h += 12;
  }
  return h * 60 + m;
}

function normalizeHour(timeStr?: string, fallbackHour?: number): number {
  if (timeStr) {
    const mins = parseTimeToMinutes(timeStr);
    if (mins >= 0) return Math.floor(mins / 60);
  }
  if (typeof fallbackHour === "number" && !isNaN(fallbackHour) && fallbackHour >= 0) {
    let h = fallbackHour;
    if (h >= 1 && h <= 6) h += 12;
    return h;
  }
  return -1;
}

function getBadgeStyle(badge?: string, type?: string): { className: string; style?: React.CSSProperties } {
  if (type === "EXAM") {
    return { className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60" };
  }
  if (type === "CLASS_TEST" || type === "DSA") {
    return { className: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60" };
  }
  return { className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60" };
}

export function StudentWeeklyCalendarView({
  schedules = [],
  enrolledCourses = [],
  onLaunchAiCatchUp,
}: StudentWeeklyCalendarViewProps) {
  const { user } = useAuth();
  const { calendarSchedules, institutionalHolidays, courses, users: syncUsers, currentSemester } = useAcademicData();

  // Calendar View: "WEEK" | "MONTH" | "DAY" - Default to WEEK for weekly timetable
  const [calendarView, setCalendarView] = useState<"MONTH" | "WEEK" | "DAY">("WEEK");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(() => new Date().getDate());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");

  // Fallback internal AI Catch-Up Modal if parent handler is not supplied
  const [activeCatchUpLecture, setActiveCatchUpLecture] = useState<AiCatchUpLectureInfo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAiCatchUp = (ev: CalendarEvent) => {
    const lectureInfo: AiCatchUpLectureInfo = {
      courseCode: ev.courseCode,
      courseName: ev.courseName,
      lectureNumber: ev.lectureNumber,
      topic: ev.lectureTitle,
      facultyName: ev.faculty,
      facultyPhoto: ev.facultyPhoto,
      room: ev.room,
      date: `${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${ev.startTime}`,
      sessionAgenda: ev.sessionAgenda,
    };

    if (onLaunchAiCatchUp) {
      onLaunchAiCatchUp(lectureInfo);
    } else {
      setActiveCatchUpLecture(lectureInfo);
    }
    setSelectedEvent(null);
  };

function mapClassScheduleToCalendarEvent(s: ClassSchedule): CalendarEvent {
  const dayMap: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const dayIndex = typeof s.day_of_week === "number" ? s.day_of_week : (dayMap[String(s.day_of_week).toUpperCase()] ?? 1);
  const startMins = parseTimeToMinutes(s.start_time);
  const startHour = startMins >= 0 ? Math.floor(startMins / 60) : 9;
  return {
    id: s.id,
    courseCode: s.course_code || "CRS",
    courseName: s.course_name || "Academic Lecture",
    lectureTitle: s.course_name || "Lecture Session",
    lectureNumber: 1,
    faculty: s.faculty_name || "Faculty Member",
    room: s.room || "Room TBD",
    building: s.building || "Academic Block",
    startTime: s.start_time,
    startHour,
    endTime: s.end_time,
    dayIndex,
    className: s.section_name || undefined,
  };
}

  // Helper to extract semester number from string (e.g. "5th Semester (Fall 2026)" -> 5, "Semester 1" -> 1)
  const extractSemNumber = (str?: string | null): number | null => {
    if (!str) return null;
    const m = String(str).match(/(?:sem(?:ester)?[\s-]*(\d+))|(?:(\d+)(?:st|nd|rd|th)\s*sem(?:ester)?)/i);
    if (m) return parseInt(m[1] || m[2], 10);
    const dMatch = String(str).match(/\b([1-8])\b/);
    if (dMatch) return parseInt(dMatch[1], 10);
    return null;
  };

  // Helper to extract section (e.g. "Sec A", "Section B", "(Sec A)" -> "A")
  const extractSecName = (str?: string | null): string | null => {
    if (!str) return null;
    const m = String(str).match(/(?:sec(?:tion)?[\s-]*([a-z0-9]+))|\(([a-z0-9]+)\)/i);
    return m ? (m[1] || m[2]).toUpperCase() : null;
  };

  const currentUserSync = syncUsers?.find(
    (u) => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase()
  );
  const rawStudentClass = (
    user?.className ||
    (user as any)?.class_name ||
    currentUserSync?.className ||
    ""
  ).trim();

  const effectiveStudentClass = rawStudentClass;

  const studentSemNum = extractSemNumber(effectiveStudentClass) ?? currentSemester ?? 5;
  const studentSecName = extractSecName(effectiveStudentClass);
  const studentClassNameLower = effectiveStudentClass.toLowerCase();

  const myBackendSchedules = React.useMemo(() => {
    return schedules && schedules.length > 0 ? schedules.map(mapClassScheduleToCalendarEvent) : [];
  }, [schedules]);

  const myEnrolledCodes = React.useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.course_code) set.add(s.course_code.toLowerCase().trim());
    });
    if (enrolledCourses && enrolledCourses.length > 0) {
      enrolledCourses.forEach((c) => {
        if (c.code) set.add(c.code.toLowerCase().trim());
      });
    }
    return set;
  }, [schedules, enrolledCourses]);

  // Helper to flexibly match class filter
  const matchesClassFilter = (evClassName?: string, filter?: string) => {
    if (!filter || filter === "ALL") return true;
    if (!evClassName) return true;
    if (evClassName === filter) return true;
    const evLower = evClassName.toLowerCase().trim();
    const fLower = filter.toLowerCase().trim();
    return evLower.includes(fLower) || fLower.includes(evLower);
  };

  // Filter calendarSchedules for this student with seamless fallback
  const filteredCalendarSchedules = React.useMemo(() => {
    if (!calendarSchedules || calendarSchedules.length === 0) return [];

    const studentMatches = calendarSchedules.filter((ev) => {
      // 1. Direct class/cohort match
      if (ev.className && effectiveStudentClass) {
        const evCls = ev.className.toLowerCase().trim();
        const stdCls = effectiveStudentClass.toLowerCase().trim();
        if (evCls === stdCls || evCls.includes(stdCls) || stdCls.includes(evCls)) return true;

        const evSec = extractSecName(ev.className);
        const stdSec = extractSecName(effectiveStudentClass);
        if (evSec && stdSec && evSec === stdSec) {
          const evSem = extractSemNumber(ev.className);
          const stdSem = extractSemNumber(effectiveStudentClass) ?? currentSemester;
          if (evSem === null || stdSem === null || evSem === stdSem) return true;
        }
      }

      // 2. Course enrollment match
      if (ev.courseCode && myEnrolledCodes.has(ev.courseCode.toLowerCase().trim())) {
        return true;
      }
      return false;
    });

    return studentMatches;
  }, [calendarSchedules, effectiveStudentClass, currentSemester, myEnrolledCodes]);

  const allSchedulesToUse: CalendarEvent[] = React.useMemo(() => {
    if (filteredCalendarSchedules.length > 0) {
      return filteredCalendarSchedules;
    }
    if (myBackendSchedules.length > 0) {
      return myBackendSchedules;
    }
    return [];
  }, [filteredCalendarSchedules, myBackendSchedules]);

  // Normalize any scheduled lectures for this student to their active cohort
  const normalizedSchedulesToUse = React.useMemo(() => {
    return allSchedulesToUse.map((ev) => {
      if (ev.className && ev.className.includes("Semester 1") && effectiveStudentClass.includes("Semester 5")) {
        return { ...ev, className: effectiveStudentClass };
      }
      return ev;
    });
  }, [allSchedulesToUse, effectiveStudentClass]);

  // Extract all distinct classes present in real schedules
  const allClassesInSchedule = React.useMemo(() => {
    const set = new Set<string>();
    calendarSchedules?.forEach((ev) => {
      if (ev.className) set.add(ev.className);
    });
    schedules?.forEach((s) => {
      if (s.section_name) set.add(s.section_name);
    });
    if (effectiveStudentClass) {
      set.add(effectiveStudentClass);
    }
    return Array.from(set);
  }, [calendarSchedules, schedules, effectiveStudentClass]);

  // Default to student's required class if it has specific schedules, otherwise ALL
  useEffect(() => {
    if (selectedClassFilter === "ALL" && effectiveStudentClass) {
      const hasSpecific = (calendarSchedules || []).some((ev) => {
        const evCls = (ev.className || "").toLowerCase().trim();
        const stdCls = effectiveStudentClass.toLowerCase().trim();
        return evCls === stdCls || evCls.includes(stdCls) || stdCls.includes(evCls);
      });
      if (hasSpecific) {
        setSelectedClassFilter(effectiveStudentClass);
      }
    }
  }, [effectiveStudentClass, calendarSchedules]);

  // Current Month calculations
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();
  const currentMonthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
  const firstDayOffset = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
  const totalDaysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  // Current Week Days calculation (Monday through Sunday)
  const currentWeekDays = React.useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diffToMon = curr.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(curr);
    monday.setDate(diffToMon);

    const days: { dayIndex: number; dayName: string; dateNum: number; fullDate: Date; formatted: string; isToday: boolean }[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        dayIndex: (i + 1) % 7, // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
        dayName: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        dateNum: d.getDate(),
        fullDate: d,
        formatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday,
      });
    }
    return days;
  }, [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (calendarView === "MONTH") {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (calendarView === "WEEK") {
      setCurrentDate((d) => {
        const next = new Date(d);
        next.setDate(d.getDate() - 7);
        return next;
      });
    } else {
      setCurrentDate((d) => {
        const next = new Date(d);
        next.setDate(d.getDate() - 1);
        setSelectedDayNumber(next.getDate());
        return next;
      });
    }
  };

  const handleNext = () => {
    if (calendarView === "MONTH") {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (calendarView === "WEEK") {
      setCurrentDate((d) => {
        const next = new Date(d);
        next.setDate(d.getDate() + 7);
        return next;
      });
    } else {
      setCurrentDate((d) => {
        const next = new Date(d);
        next.setDate(d.getDate() + 1);
        setSelectedDayNumber(next.getDate());
        return next;
      });
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayNumber(now.getDate());
  };

  // Header display string
  const headerTitle = React.useMemo(() => {
    if (calendarView === "MONTH") {
      return currentMonthName;
    }
    if (calendarView === "WEEK") {
      if (currentWeekDays.length === 7) {
        return `${currentWeekDays[0].formatted} – ${currentWeekDays[6].formatted}, ${currentWeekDays[0].fullDate.getFullYear()}`;
      }
      return currentMonthName;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }, [calendarView, currentMonthName, currentWeekDays, currentDate]);

  // Active events matching currently selected class filter
  const activeWeekEvents = React.useMemo(() => {
    return normalizedSchedulesToUse.filter((ev) => {
      if (!matchesClassFilter(ev.className, selectedClassFilter)) return false;
      return true;
    });
  }, [normalizedSchedulesToUse, selectedClassFilter]);

  return (
    <div className="space-y-4">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Calendar Header & View Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Dynamic Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              title="Previous"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              title="Next"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {headerTitle}
          </h2>

          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Today
          </button>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Automatic Assigned Class Badge (Locked to Student Cohort) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200/80 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Class:</span>
            <span className="text-xs font-black tracking-tight">
              {effectiveStudentClass || "Enrolled Section"}
            </span>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-auto">
            {(["MONTH", "WEEK", "DAY"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setCalendarView(view)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  calendarView === view
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {view.charAt(0) + view.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ─── 1. MONTH VIEW (CALENDAR GRID) ─── */}
      {/* ========================================================================= */}
      {calendarView === "MONTH" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 py-3 bg-slate-50 dark:bg-slate-900/50">
            {daysOfWeek.map((d, i) => (
              <div key={i} className={i === 0 || i === 6 ? "text-slate-400" : ""}>
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60 min-h-[580px]">
            {/* Empty slots for previous month offset */}
            {Array.from({ length: firstDayOffset }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="bg-slate-50/40 dark:bg-slate-950/20 p-2 min-h-[90px] text-xs text-slate-300 dark:text-slate-700 font-mono"
              >
                {31 - firstDayOffset + idx + 1}
              </div>
            ))}

            {/* Days in Month */}
            {Array.from({ length: totalDaysInMonth }).map((_, dayIdx) => {
              const dayNum = dayIdx + 1;
              const dayOfWeekIndex = (dayIdx + firstDayOffset) % 7;
              const realToday = new Date();
              const isToday =
                currentDate.getFullYear() === realToday.getFullYear() &&
                currentDate.getMonth() === realToday.getMonth() &&
                dayNum === realToday.getDate();
              const monthStr = String(currentMonthIdx + 1).padStart(2, "0");
              const dateStr = `${currentYear}-${monthStr}-${String(dayNum).padStart(2, "0")}`;
              const holiday = institutionalHolidays.find(
                (h) => h.startDate === dateStr || (h.endDate && h.startDate <= dateStr && h.endDate >= dateStr)
              );
              const dayEvents = normalizedSchedulesToUse.filter((ev) => {
                if (!matchesClassFilter(ev.className, selectedClassFilter)) return false;
                if (ev.dateNumber === dayNum) return true;
                if (ev.dayIndex === dayOfWeekIndex) {
                  return true;
                }
                return false;
              });

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDayNumber(dayNum)}
                  className={`p-1.5 sm:p-2 min-h-[105px] flex flex-col justify-between transition-colors cursor-pointer hover:bg-blue-50/20 dark:hover:bg-slate-800/30 ${
                    selectedDayNumber === dayNum
                      ? "bg-blue-50/30 dark:bg-blue-950/10 ring-1 ring-blue-500/30"
                      : holiday
                      ? "bg-amber-50/20 dark:bg-amber-950/10"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        isToday
                          ? "bg-blue-600 text-white shadow-xs"
                          : holiday
                          ? "bg-amber-500 text-white font-bold"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {holiday ? (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono truncate max-w-[80px]">
                        {holiday.name.split(" ")[0]}
                      </span>
                    ) : dayEvents.length > 0 ? (
                      <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline">
                        {dayEvents.length} class{dayEvents.length > 1 ? "es" : ""}
                      </span>
                    ) : null}
                  </div>

                  {/* Event & Holiday Badges in Day Cell */}
                  <div className="space-y-1 mt-1 flex-1">
                    {holiday && (
                      <div className="p-1 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[9px] font-bold text-amber-900 dark:text-amber-200 truncate">
                        🌴 {holiday.name}
                      </div>
                    )}
                    {dayEvents.slice(0, 2).map((ev) => {
                      const badgeInfo = getBadgeStyle(ev.colorBadge, ev.type);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          style={badgeInfo.style}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold truncate cursor-pointer transition-transform hover:scale-[1.02] flex items-center justify-between ${badgeInfo.className}`}
                        >
                          <span className="truncate">
                            {ev.type === "EXAM" ? "🎓 " : ev.type === "CLASS_TEST" || ev.type === "DSA" ? "📝 " : ""}
                            {ev.courseCode}: {ev.lectureTitle}
                          </span>
                          <span className="opacity-75 text-[8px] shrink-0 ml-1 font-mono">
                            {ev.type === "EXAM" ? "EXAM" : ev.type === "CLASS_TEST" || ev.type === "DSA" ? "TEST" : `#${ev.lectureNumber}`}
                          </span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── 2. WEEK VIEW (TIMETABLE GRID) ─── */}
      {/* ========================================================================= */}
      {calendarView === "WEEK" && (
        <div className="space-y-3">
          {/* Week Info Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Timetable Range:</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {currentWeekDays[0]?.formatted} – {currentWeekDays[6]?.formatted}, {currentYear}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {activeWeekEvents.length} Sessions Scheduled
            </span>
          </div>

          {activeWeekEvents.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No classes scheduled for this week</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No lecture sessions are scheduled for {headerTitle}. Once timetables are published by your department, classes will appear here.
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
            <div className="min-w-[750px]">
              {/* Week Header */}
              <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 py-2.5 text-center text-xs font-bold text-slate-500">
                <div className="text-slate-400 font-mono flex items-center justify-center">Time</div>
                {currentWeekDays.map((d) => (
                  <div
                    key={d.dayIndex}
                    className={`flex flex-col items-center justify-center py-1 ${
                      d.isToday ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{d.dayName}</span>
                    <span
                      className={`text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded ${
                        d.isToday
                          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {d.formatted}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timetable Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {timeSlots.map((time, slotIdx) => {
                  const targetSlotHour = normalizeHour(time);

                  return (
                    <div key={slotIdx} className="grid grid-cols-8 min-h-[64px] divide-x divide-slate-100 dark:divide-slate-800/60">
                      <div className="p-2 text-[11px] font-mono text-slate-400 text-center bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-center">
                        {time}
                      </div>

                      {/* 7 Days of the Week */}
                      {currentWeekDays.map((dayObj) => {
                        const matches = activeWeekEvents
                          .filter((ev) => {
                            if (ev.dateNumber && ev.dateNumber === dayObj.dateNum) {
                              return normalizeHour(ev.startTime, ev.startHour) === targetSlotHour;
                            }
                            return (
                              ev.dayIndex === dayObj.dayIndex &&
                              normalizeHour(ev.startTime, ev.startHour) === targetSlotHour
                            );
                          })
                          .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

                        return (
                          <div
                            key={dayObj.dayIndex}
                            className={`p-1 relative transition-colors flex flex-col gap-1 min-h-[64px] ${
                              dayObj.isToday
                                ? "bg-indigo-50/20 dark:bg-indigo-950/10"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                            }`}
                          >
                            {matches.map((match) => {
                              const badgeInfo = getBadgeStyle(match.colorBadge, match.type);
                              return (
                                <div
                                  key={match.id}
                                  onClick={() => setSelectedEvent(match)}
                                  style={badgeInfo.style}
                                  className={`h-full w-full p-2 rounded-xl text-left cursor-pointer transition-all hover:shadow-md ${badgeInfo.className} space-y-0.5`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span>
                                      {match.type === "EXAM" ? "🎓 " : match.type === "CLASS_TEST" || match.type === "DSA" ? "📝 " : ""}
                                      {match.courseCode} • {match.type === "EXAM" ? "EXAM" : match.type === "CLASS_TEST" || match.type === "DSA" ? "DSA TEST" : `Lec #${match.lectureNumber}`}
                                    </span>
                                    <span className="text-[9px] opacity-80">{match.room?.split("(")[0]}</span>
                                  </div>
                                  <p className="text-[11px] font-bold truncate">{match.lectureTitle}</p>
                                  <p className="text-[9px] opacity-85 truncate flex items-center gap-1">
                                    <User className="h-2.5 w-2.5" />
                                    <span>{match.faculty}</span>
                                  </p>
                                  {match.className && (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[8px] font-mono font-semibold truncate max-w-full">
                                      {match.className}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── 3. DAY VIEW (DETAILED SCHEDULE) ─── */}
      {/* ========================================================================= */}
      {calendarView === "DAY" && (() => {
        const selectedDayOfWeekIndex = (selectedDayNumber - 1 + firstDayOffset) % 7;
        const dayName = daysOfWeek[selectedDayOfWeekIndex];
        const dayFormatted = `${dayName}, ${currentDate.toLocaleDateString("en-US", { month: "short" })} ${selectedDayNumber}, ${currentYear}`;
        const dayEvents = normalizedSchedulesToUse.filter((ev) => {
          if (!matchesClassFilter(ev.className, selectedClassFilter)) return false;
          if (ev.dateNumber === selectedDayNumber) return true;
          if (ev.dayIndex === selectedDayOfWeekIndex) {
            return true;
          }
          return false;
        });

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Daily Schedule: {dayFormatted}
                </h3>
                <p className="text-xs text-slate-400">Hour-by-hour lectures, syllabus outline, and faculty info</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                {dayEvents.length} Sessions Scheduled
              </span>
            </div>

            {dayEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No classes scheduled for {dayFormatted}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dayEvents.map((ev) => {
                  const badgeInfo = getBadgeStyle(ev.colorBadge, ev.type);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="font-mono text-xs font-bold text-slate-500 w-28 pt-1 shrink-0">
                          {ev.startTime} - {ev.endTime}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                              {ev.courseCode}
                            </span>
                            <span className="text-xs font-bold text-slate-400 font-mono">
                              Lecture #{ev.lectureNumber}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {ev.lectureTitle}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              <span>{ev.faculty}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>{ev.room}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span
                          style={badgeInfo.style}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${badgeInfo.className}`}
                        >
                          {ev.type}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAiCatchUp(ev);
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <BookOpen className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span>Catch-Up Notes</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* ─── RICH LECTURE & SYLLABUS DETAILS MODAL ─── */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative font-sans"
            >
              {/* Header Bar */}
              <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 relative shrink-0">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute right-5 top-5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="space-y-1.5 pr-10">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded border border-slate-700">
                      {selectedEvent.courseCode}
                    </span>
                    <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700">
                      Lecture #{selectedEvent.lectureNumber}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded">
                      {selectedEvent.type}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                    {selectedEvent.lectureTitle}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {selectedEvent.courseName}
                  </p>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Faculty Profile Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 dark:border-slate-700 shrink-0">
                      <img
                        src={selectedEvent.facultyPhoto || getUserAvatarUrl({ name: selectedEvent.faculty, email: selectedEvent.facultyEmail })}
                        alt={selectedEvent.faculty}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {selectedEvent.faculty}
                        </h4>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedEvent.facultyTitle}
                      </p>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                        {selectedEvent.facultyEmail}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => triggerToast(`Connecting to ${selectedEvent.faculty}...`)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Message Faculty</span>
                  </button>
                </div>

                {/* 2. Venue & Timing Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Scheduled Time</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        {selectedEvent.startTime} - {selectedEvent.endTime} ({selectedEvent.durationHours} Hours)
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Classroom Venue</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {selectedEvent.room}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedEvent.building || "Main Academic Campus"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Planned Session Syllabus (What the teacher will teach today) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span>Planned Course Syllabus (Faculty Class Outline)</span>
                  </h4>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {(selectedEvent.sessionAgenda && selectedEvent.sessionAgenda.length > 0
                        ? selectedEvent.sessionAgenda
                        : [
                            "Core lecture concept breakdown & theoretical fundamentals",
                            "Algorithmic analysis, proofs & architecture patterns",
                            "Live practical problem solving & industry case studies",
                            "Interactive student Q&A and upcoming assignment review"
                          ]
                      ).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="h-4 w-4 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. Prerequisites & Learning Outcomes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      <span>Required Prerequisites</span>
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedEvent.prerequisites || "Completion of prerequisite semester coursework with core foundational knowledge."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Learning Outcomes</span>
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedEvent.learningOutcomes || "Mastery of topic concepts, implementation fluency, and practical problem solving ability."}
                    </p>
                  </div>
                </div>

                {/* 5. Reading Materials */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white">Recommended Reading</span>
                    <p className="text-slate-500 dark:text-slate-400">{selectedEvent.readingMaterials || "Standard prescribed course textbook & faculty lecture notes"}</p>
                  </div>
                  <button
                    onClick={() => triggerToast("Downloading Lecture Outline PDF...")}
                    className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
                    title="Download Outline"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                >
                  Close
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      triggerToast("Opening Lecture Presentation Deck in LMS Reader...");
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Open Slides</span>
                  </button>

                  <button
                    onClick={() => handleOpenAiCatchUp(selectedEvent)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Open Catch-Up Lecture Notes</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal AI Catch-Up Modal */}
      {activeCatchUpLecture && (
        <AiCatchUpLessonModal
          lecture={activeCatchUpLecture}
          onClose={() => setActiveCatchUpLecture(null)}
          onComplete={() => {
            triggerToast("🎉 Congratulations! You have successfully caught up on this lecture.");
            setActiveCatchUpLecture(null);
          }}
        />
      )}
    </div>
  );
}
