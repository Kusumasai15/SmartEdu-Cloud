"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowRight,
  FileText,
  Megaphone,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";

interface DashboardRightSidebarProps {
  role?: "STUDENT" | "FACULTY";
  userCourseCodes?: string[];
  facultyName?: string;
  className?: string;
}

export function DashboardRightSidebar({
  role = "STUDENT",
  userCourseCodes = [],
  facultyName = "",
  className = "",
}: DashboardRightSidebarProps) {
  const {
    calendarSchedules,
    assignments,
    announcements,
    exams,
  } = useAcademicData();

  // Calendar Date State (Default to current real date)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(() => new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (0=Jan, ..., 9=Oct, 11=Dec)

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDayNumber(1);
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDayNumber(1);
  };

  const monthName = currentDate.toLocaleString("en-US", { month: "long" });

  // Compute days in month and starting weekday
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      dateObj: Date;
    }> = [];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({
        day: d,
        isCurrentMonth: false,
        dateObj: new Date(year, month - 1, d),
      });
    }

    // Days in current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        dateObj: new Date(year, month, i),
      });
    }

    // Leading days from next month to fill out the 35 or 42 grid slots
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        dateObj: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [year, month]);

  // Compute event indicators by day for this user
  const eventsByDay = useMemo(() => {
    const map: Record<
      number,
      {
        hasClass: boolean;
        hasAssignment: boolean;
        hasExam: boolean;
        hasEvent: boolean;
        classesList: any[];
        assignmentsList: any[];
        examsList: any[];
      }
    > = {};

    const normCourseCodes = new Set(
      userCourseCodes.map((c) => c.toLowerCase().trim()).filter(Boolean)
    );
    const normFac = facultyName.toLowerCase().trim();

    // 1. Classes / Schedule Events
    calendarSchedules.forEach((ev) => {
      // Filter by role if applicable
      if (role === "FACULTY" && normFac) {
        const evFac = (ev.faculty || "").toLowerCase().trim();
        if (evFac && !evFac.includes(normFac) && !normFac.includes(evFac)) {
          return;
        }
      } else if (role === "STUDENT" && normCourseCodes.size > 0 && ev.courseCode) {
        if (!normCourseCodes.has(ev.courseCode.toLowerCase().trim())) {
          // Keep general class events if enrolled codes not strictly constraining
        }
      }

      // Check which dates in this month fall on this event's dayIndex
      for (let day = 1; day <= 31; day++) {
        const dObj = new Date(year, month, day);
        if (dObj.getMonth() !== month) break;
        if (dObj.getDay() === ev.dayIndex) {
          if (!map[day]) {
            map[day] = {
              hasClass: false,
              hasAssignment: false,
              hasExam: false,
              hasEvent: false,
              classesList: [],
              assignmentsList: [],
              examsList: [],
            };
          }
          map[day].hasClass = true;
          map[day].classesList.push(ev);
        }
      }
    });

    // 2. Assignments Deadlines
    assignments.forEach((asg) => {
      if (!asg.dueDate) return;
      const d = new Date(asg.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) {
          map[day] = {
            hasClass: false,
            hasAssignment: false,
            hasExam: false,
            hasEvent: false,
            classesList: [],
            assignmentsList: [],
            examsList: [],
          };
        }
        map[day].hasAssignment = true;
        map[day].assignmentsList.push(asg);
      }
    });

    // 3. Exams
    (exams || []).forEach((ex: any) => {
      const examDate = ex.examDate || ex.date;
      if (!examDate) return;
      const d = new Date(examDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) {
          map[day] = {
            hasClass: false,
            hasAssignment: false,
            hasExam: false,
            hasEvent: false,
            classesList: [],
            assignmentsList: [],
            examsList: [],
          };
        }
        map[day].hasExam = true;
        map[day].examsList.push(ex);
      }
    });

    return map;
  }, [calendarSchedules, assignments, exams, year, month, role, userCourseCodes, facultyName]);

  // Selected Day Details
  const selectedDayEvents = eventsByDay[selectedDayNumber] || {
    hasClass: false,
    hasAssignment: false,
    hasExam: false,
    hasEvent: false,
    classesList: [],
    assignmentsList: [],
    examsList: [],
  };

  // ─── Upcoming Deadlines List (Matching Screenshot & Filtered to Enrolled Courses) ───
  const upcomingDeadlinesList = useMemo(() => {
    const normCourseCodes = new Set(
      userCourseCodes.map((c) => c.toLowerCase().trim()).filter(Boolean)
    );

    const list = [...assignments]
      .filter((a) => {
        if (!a.dueDate) return false;
        if (normCourseCodes.size > 0) {
          const aCode = (a.courseCode || "").toLowerCase().trim();
          return normCourseCodes.has(aCode);
        }
        return true;
      })
      .map((a) => {
        const dueObj = new Date(a.dueDate);
        const daysRemaining = isNaN(dueObj.getTime())
          ? 5
          : Math.ceil((dueObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const formattedDate = !isNaN(dueObj.getTime())
          ? dueObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : a.dueDate;

        return {
          id: a.id,
          title: a.title,
          courseCode: a.courseCode || "General",
          formattedDate,
          daysRemaining,
          isUrgent: daysRemaining <= 3,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return list.slice(0, 3);
  }, [assignments, userCourseCodes]);

  // ─── Recent Notices List (Clean Zero Mock Standard & Scoped to Audience) ───
  const recentNoticesList = useMemo(() => {
    if (announcements && announcements.length > 0) {
      const normCourseCodes = new Set(
        userCourseCodes.map((c) => c.toLowerCase().trim()).filter(Boolean)
      );

      const scopedAnnouncements = announcements.filter((ann) => {
        if (ann.title && ann.title.toLowerCase().startsWith("assessment quiz active")) return false;
        const aud = (ann.audience || "ALL").toUpperCase();
        if (role === "STUDENT") {
          if (aud === "FACULTY" || aud === "HOD" || aud === "STAFF" || aud === "ADMIN") return false;
        } else if (role === "FACULTY") {
          if (aud === "STUDENTS") return false;
        }
        if (ann.courseCode && normCourseCodes.size > 0) {
          return normCourseCodes.has(ann.courseCode.toLowerCase().trim());
        }
        return true;
      });

      return scopedAnnouncements.slice(0, 3).map((ann, idx) => {
        let timeAgo = "Recently";
        try {
          const created = new Date((ann as any).createdAt || (ann as any).created_at || (ann as any).date || "");
          if (!isNaN(created.getTime())) {
            const diffMs = Date.now() - created.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            if (diffHours < 1) timeAgo = "Just now";
            else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
            else timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
          }
        } catch {}
        const dotColor =
          idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-amber-500" : "bg-blue-500";
        return {
          id: ann.id,
          title: ann.title,
          timeAgo,
          dotColor,
        };
      });
    }

    return [];
  }, [announcements, role, userCourseCodes]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={`space-y-5 ${className}`}>
      {/* ===================================================================== */}
      {/* 1. INTERACTIVE MONTHLY CALENDAR CARD (MATCHING SCREENSHOT)            */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 space-y-4 transition-colors">
        {/* Calendar Header: Icon + Month Year + Nav Arrows */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
              {monthName} {year}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="h-7 w-7 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="h-7 w-7 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((wd) => (
            <span
              key={wd}
              className="text-[11px] font-semibold text-slate-400 py-1 select-none"
            >
              {wd}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center">
          {calendarGrid.map((item, idx) => {
            const isSelected = item.isCurrentMonth && item.day === selectedDayNumber;
            const evData = item.isCurrentMonth ? eventsByDay[item.day] : null;

            return (
              <div key={idx} className="flex flex-col items-center justify-center">
                <button
                  onClick={() => {
                    if (item.isCurrentMonth) {
                      setSelectedDayNumber(item.day);
                    }
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs transition-all flex items-center justify-center select-none cursor-pointer ${
                    !item.isCurrentMonth
                      ? "text-slate-300 dark:text-slate-600 pointer-events-none"
                      : isSelected
                      ? "bg-blue-600 text-white font-extrabold shadow-xs scale-105"
                      : "text-slate-800 dark:text-slate-200 font-bold hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {item.day}
                </button>

                {/* Event Dots underneath date */}
                {item.isCurrentMonth && evData && (
                  <div className="flex items-center gap-0.5 mt-0.5 h-1">
                    {evData.hasClass && (
                      <span className="h-1 w-1 rounded-full bg-blue-600" />
                    )}
                    {evData.hasAssignment && (
                      <span className="h-1 w-1 rounded-full bg-emerald-500" />
                    )}
                    {evData.hasExam && (
                      <span className="h-1 w-1 rounded-full bg-indigo-600" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend Bar (Matching Screenshot Exactly) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span>Class</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Assignment</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <span>Exam</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400 dark:text-slate-500" />
            <span>Event</span>
          </span>
        </div>

        {/* Selected Day Agenda Mini-Drawer (When day is clicked) */}
        {(selectedDayEvents.classesList.length > 0 ||
          selectedDayEvents.assignmentsList.length > 0 ||
          selectedDayEvents.examsList.length > 0) && (
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-200 border-b border-blue-200/60 dark:border-blue-900/50 pb-1">
              <span>
                Schedule for {monthName} {selectedDayNumber}
              </span>
              <span className="font-mono text-blue-700 dark:text-blue-300">
                {selectedDayEvents.classesList.length +
                  selectedDayEvents.assignmentsList.length +
                  selectedDayEvents.examsList.length}{" "}
                Events
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {selectedDayEvents.classesList.slice(0, 2).map((cls, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-blue-100 dark:border-slate-700 text-[11px]"
                >
                  <div className="truncate">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                      {cls.courseCode}: {cls.lectureTitle || cls.courseName}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-blue-500" />
                      {cls.room || "Room 302"}
                    </span>
                  </div>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold shrink-0 ml-2">
                    {cls.startTime}
                  </span>
                </div>
              ))}

              {selectedDayEvents.assignmentsList.map((asg, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-emerald-100 dark:border-slate-700 text-[11px]"
                >
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 truncate">
                    Due: {asg.title}
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[10px] shrink-0">
                    Assignment
                  </span>
                </div>
              ))}

              {selectedDayEvents.examsList.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-indigo-100 dark:border-slate-700 text-[11px]"
                >
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 truncate">
                    Exam: {ex.subject || ex.courseName || "Course Assessment"}
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[10px] shrink-0">
                    SEE Test
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. UPCOMING DEADLINES CARD (MATCHING SCREENSHOT)                       */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 space-y-3.5 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Upcoming Deadlines
            </h3>
          </div>

          <Link
            href={role === "FACULTY" ? "/faculty?tab=assignments" : "/student?tab=assignments"}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {upcomingDeadlinesList.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-30 text-slate-400" />
            No upcoming deadlines
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingDeadlinesList.map((item) => {
              const badgeClass =
                item.daysRemaining <= 3
                  ? "bg-rose-100 text-rose-700"
                  : item.daysRemaining <= 7
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700";

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs hover:border-blue-200 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.isUrgent
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {item.courseCode}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block">
                      {item.formattedDate}
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badgeClass}`}
                    >
                      {item.daysRemaining > 0
                        ? `${item.daysRemaining} days`
                        : "Due today"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. RECENT NOTICES CARD (MATCHING SCREENSHOT)                           */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 space-y-3.5 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Recent Notices
            </h3>
          </div>

          <Link
            href={role === "FACULTY" ? "/faculty?tab=overview" : "/student?tab=announcements"}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentNoticesList.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            <Megaphone className="h-6 w-6 mx-auto mb-1.5 opacity-30 text-slate-400 dark:text-slate-500" />
            No recent notices
          </div>
        ) : (
          <div className="space-y-2">
            {recentNoticesList.map((ann) => (
              <div
                key={ann.id}
                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full ${ann.dotColor} shrink-0`} />
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ann.title}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  {ann.timeAgo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
