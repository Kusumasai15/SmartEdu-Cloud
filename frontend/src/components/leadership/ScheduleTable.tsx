"use client";

import React, { useState, useMemo } from "react";
import { useApiResource } from "@/lib/use-api-resource";
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  BookOpen,
  Filter,
  Grid3X3,
  ListFilter,
  Users,
  Building2,
  CalendarDays
} from "lucide-react";

interface Schedule {
  id: string;
  course_code: string;
  course_name: string;
  faculty_id: string;
  faculty_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  section_name: string | null;
  status: string;
}

const DAYS_MAP: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const ORDERED_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export function ScheduleTable() {
  const { data: apiData, error, loading, refresh } = useApiResource<Schedule[]>("/timetable/my-schedules");

  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [facultyFilter, setFacultyFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  const allSchedules: Schedule[] = apiData ?? [];

  // Derived filter options
  const facultyOptions = useMemo(() => {
    const map = new Map<string, string>();
    allSchedules.forEach((s) => {
      if (s.faculty_name) {
        map.set(s.faculty_id || s.faculty_name, s.faculty_name);
      }
    });
    return Array.from(map.entries());
  }, [allSchedules]);

  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    allSchedules.forEach((s) => {
      if (s.course_code) set.add(s.course_code);
    });
    return Array.from(set).sort();
  }, [allSchedules]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allSchedules
      .filter((s) => {
        if (selectedDay !== "ALL" && s.day_of_week !== selectedDay) return false;
        if (facultyFilter !== "ALL" && (s.faculty_id !== facultyFilter && s.faculty_name !== facultyFilter)) return false;
        if (courseFilter !== "ALL" && s.course_code !== courseFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dayDiff = ORDERED_DAYS.indexOf(a.day_of_week) - ORDERED_DAYS.indexOf(b.day_of_week);
        if (dayDiff !== 0) return dayDiff;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [allSchedules, selectedDay, facultyFilter, courseFilter]);

  // Summary Metrics
  const totalClassesCount = allSchedules.length;
  const distinctInstructors = facultyOptions.length;
  const distinctRooms = useMemo(() => {
    const rooms = new Set(allSchedules.map((s) => s.room).filter(Boolean));
    return rooms.size;
  }, [allSchedules]);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[11px] font-bold text-blue-700 dark:text-blue-300 tracking-wide border border-blue-200/80 dark:border-blue-900/60 mb-2">
            <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Academic Timetable &amp; Schedule Matrix</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Department Master Timetable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Weekly scheduled lectures, lab practicals, classrooms, and assigned course faculty
          </p>
        </div>

        {/* View Mode & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("GRID")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode("LIST")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Weekly Sessions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{totalClassesCount}</span>
            <span className="text-xs text-slate-500">active slots</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Faculty Scheduled</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 font-mono">{distinctInstructors}</span>
            <span className="text-xs text-slate-500">instructors</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rooms &amp; Labs</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{distinctRooms}</span>
            <span className="text-xs text-slate-500">allocated halls</span>
          </div>
        </div>
      </div>

      {/* Day Filter Pills & Selects */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedDay("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedDay === "ALL"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Days ({allSchedules.length})
          </button>
          {ORDERED_DAYS.map((d) => {
            const count = allSchedules.filter((s) => s.day_of_week === d).length;
            const isSelected = selectedDay === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{DAYS_MAP[d]}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Filter By:</span>
          </div>

          <select
            aria-label="Filter faculty"
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Faculty Members</option>
            {facultyOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter course"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Courses</option>
            {courseOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          {(facultyFilter !== "ALL" || courseFilter !== "ALL" || selectedDay !== "ALL") && (
            <button
              onClick={() => {
                setFacultyFilter("ALL");
                setCourseFilter("ALL");
                setSelectedDay("ALL");
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Timetable Body */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
          Loading departmental timetable schedules...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
          <Calendar className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No scheduled classes found</p>
          <p className="text-[11px] text-slate-400">Try adjusting your day, faculty, or course filters above.</p>
        </div>
      ) : viewMode === "GRID" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900/60 shadow-2xs hover:shadow-xs transition-all space-y-3 group"
            >
              {/* Day & Time Strip */}
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200/80 dark:border-blue-900/60">
                  {DAYS_MAP[row.day_of_week] || row.day_of_week}
                </span>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-semibold">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>
                    {row.start_time} - {row.end_time}
                  </span>
                </div>
              </div>

              {/* Course Title */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                    {row.course_code}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Sec {row.section_name || "A"}</span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">
                  {row.course_name}
                </h4>
              </div>

              {/* Faculty & Room Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate max-w-[140px]">{row.faculty_name}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 font-mono font-bold bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span>{row.room || "Room 101"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Time Slot</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Instructor</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4 text-right">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {DAYS_MAP[row.day_of_week] || row.day_of_week}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-400">
                    {row.start_time} - {row.end_time}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">
                      {row.course_code}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{row.course_name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {row.faculty_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {row.section_name || "A"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                    {row.room || "Room 101"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
