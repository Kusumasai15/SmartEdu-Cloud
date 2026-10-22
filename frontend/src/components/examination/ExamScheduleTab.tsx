"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Building2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Search,
  Trash2,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Filter,
  Users,
  Check,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { exportToExcel } from "@/lib/excel-utils";
import { apiClient } from "@/lib/api-client";

export interface ScheduledExamSession {
  id: string;
  series: "MIDTERM" | "SEMESTER";
  semester: string;
  courseCode: string;
  courseName: string;
  department: string;
  enrolledSections: string[];
  totalCandidates: number;
  date: string;
  timeSlot: string;
  venue: string;
  status: "SCHEDULED" | "COMPLETED";
}

interface Props {
  showToast: (msg: string) => void;
}

export function ExamScheduleTab({ showToast }: Props) {
  const { courses, users, classrooms } = useAcademicData();

  // Active Filters
  const [activeSeries, setActiveSeries] = useState<"ALL" | "MIDTERM" | "SEMESTER">("ALL");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [series, setSeries] = useState<"MIDTERM" | "SEMESTER">("SEMESTER");
  const [formSemester, setFormSemester] = useState<string>("");
  const [formCourseCode, setFormCourseCode] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [timeSlot, setTimeSlot] = useState<string>("09:30 AM - 12:30 PM (Morning Session)");
  const [selectedVenue, setSelectedVenue] = useState<string>("");

  const realCourses = useMemo(() => (courses || []).filter((course) => course.status === "Active"), [courses]);

  // Semesters available
  const availableSemesters = useMemo(() => Array.from(new Set(realCourses.map((course) => course.semester).filter(Boolean))).sort(), [realCourses]);

  // Filter courses available for the selected semester in the form
  const semesterCourses = useMemo(() => {
    return realCourses.filter((course) => !formSemester || course.semester === formSemester);
  }, [formSemester, realCourses]);

  // Automatically find all sections that take this subject in this semester
  const matchingSections = useMemo(() => {
    const selectedCourse = semesterCourses.find((course) => course.code === formCourseCode);
    const names = selectedCourse?.assignedClasses || [];
    return names.map((name) => ({
      id: name,
      name,
      totalStudents: users.filter((user) => user.role === "STUDENT" && user.className === name).length,
    }));
  }, [formCourseCode, semesterCourses, users]);

  const totalCandidatesForSubject = useMemo(() => {
    return matchingSections.reduce((acc, sec) => acc + sec.totalStudents, 0);
  }, [matchingSections]);

  const [schedules, setSchedules] = useState<ScheduledExamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.get<{ exams?: any[] }>("/assessments/scheduled-exams")
      .then((response) => {
        if (!active) return;
        setSchedules((response.exams || []).map((exam) => ({
          id: exam.id,
          series: exam.series === "MIDTERM" ? "MIDTERM" : "SEMESTER",
          semester: exam.semester || "",
          courseCode: exam.courseCode || "",
          courseName: exam.courseName || exam.title || "",
          department: exam.department || "",
          enrolledSections: Array.isArray(exam.enrolledSections) ? exam.enrolledSections : exam.targetClass ? [exam.targetClass] : [],
          totalCandidates: Number(exam.totalCandidates || 0),
          date: exam.scheduledDate || "",
          timeSlot: [exam.startTime, exam.endTime].filter(Boolean).join(" - "),
          venue: exam.venue || "",
          status: exam.status === "COMPLETED" ? "COMPLETED" : "SCHEDULED",
        })));
      })
      .catch(() => active && setSchedules([]))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  // Conflict Checker: Check if selected semester already has an exam on the specified date
  // Rule: Two subject examinations cannot be held on the same date for the same semester!
  const conflictDetails = useMemo(() => {
    if (!formSemester || !examDate) return null;
    const existing = schedules.find(
      (s) => s.semester === formSemester && s.date === examDate
    );
    if (existing) {
      return {
        hasConflict: true,
        message: `Institutional Scheduling Conflict: ${formSemester} already has an examination (${existing.courseCode} - ${existing.courseName}) scheduled on ${examDate}. All sections taking a subject take it on the same day, and college regulations strictly prohibit holding two subject exams for the same semester on the same day.`,
        existingExam: existing,
      };
    }
    return { hasConflict: false };
  }, [schedules, formSemester, examDate]);

  // Filtered schedules list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      if (activeSeries !== "ALL" && item.series !== activeSeries) return false;
      if (selectedSemesterFilter !== "ALL" && item.semester !== selectedSemesterFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.courseCode.toLowerCase().includes(q) ||
          item.courseName.toLowerCase().includes(q) ||
          item.semester.toLowerCase().includes(q) ||
          item.venue.toLowerCase().includes(q) ||
          item.date.includes(q) ||
          item.enrolledSections.some((sec) => sec.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [schedules, activeSeries, selectedSemesterFilter, searchQuery]);

  const handleOpenModal = () => {
    if (semesterCourses.length > 0) {
      setFormCourseCode(semesterCourses[0].code);
    }
    setExamDate("");
    setIsModalOpen(true);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSemester || !formCourseCode || !examDate || !selectedVenue) {
      showToast("Please complete all required schedule fields.");
      return;
    }

    if (conflictDetails?.hasConflict) {
      showToast("Cannot schedule: Another subject examination is already scheduled for this semester on the same day.");
      return;
    }

    const matchedCourse = semesterCourses.find((c) => c.code === formCourseCode) || realCourses.find((c) => c.code === formCourseCode);
    const sectionNames = matchingSections.map((s) => s.name);

    const newSession: ScheduledExamSession = {
      id: crypto.randomUUID(),
      series,
      semester: formSemester,
      courseCode: formCourseCode,
      courseName: matchedCourse?.name || "",
      department: matchedCourse?.department || "",
      enrolledSections: sectionNames,
      totalCandidates: totalCandidatesForSubject,
      date: examDate,
      timeSlot,
      venue: selectedVenue,
      status: "SCHEDULED",
    };

    try {
      await apiClient.post("/assessments/scheduled-exams", {
        ...newSession,
        scheduledDate: examDate,
        startTime: timeSlot.split(" - ")[0],
        endTime: timeSlot.split(" - ")[1] || "",
        targetClass: sectionNames.length === 1 ? sectionNames[0] : "All Enrolled Sections",
        questions: [],
        attempts: {},
      });
      setSchedules([newSession, ...schedules]);
      showToast(`Examination for ${formCourseCode} scheduled on ${examDate}.`);
      setIsModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Examination could not be scheduled.");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await apiClient.delete(`/assessments/scheduled-exams/${id}`);
      setSchedules(schedules.filter((schedule) => schedule.id !== id));
      showToast("Examination schedule removed.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Examination schedule could not be removed.");
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredSchedules.map((s) => ({
      "Exam Series": s.series === "MIDTERM" ? "Midterm (CIA)" : "Semester End (SEE)",
      "Semester": s.semester,
      "Course Code": s.courseCode,
      "Course Title": s.courseName,
      "Enrolled Sections Count": s.enrolledSections.length,
      "Enrolled Sections List": s.enrolledSections.join(", "),
      "Total Candidates": s.totalCandidates,
      "Exam Date": s.date,
      "Time Slot": s.timeSlot,
      "Assigned Venue(s)": s.venue,
      "Status": s.status,
    }));
    exportToExcel(exportData, `Semester_Examination_Schedule_${formSemester}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              SEMESTER-FIRST TIMETABLE ARCHITECTURE
            </span>
            <span className="text-xs text-slate-500 font-semibold">Unified Cross-Section Examination</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Semester Examination Timetable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select semester &rarr; subject. All enrolled sections (Sec A, B, C...) sit simultaneously on the scheduled date across campus halls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Series Filter Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setActiveSeries("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSeries === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Series ({schedules.length})
            </button>
            <button
              onClick={() => setActiveSeries("MIDTERM")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSeries === "MIDTERM"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Midterm (CIA)
            </button>
            <button
              onClick={() => setActiveSeries("SEMESTER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSeries === "SEMESTER"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semester End (SEE)
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Timetable</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Examination</span>
          </button>
        </div>
      </div>

      {/* Semester Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSemesterFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSemesterFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            All Semesters
          </button>
          {["Semester 1", "Semester 3", "Semester 5", "Semester 7"].map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemesterFilter(sem)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSemesterFilter === sem
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {sem}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject code, title, section, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Series &amp; Code</th>
                <th className="py-3.5 px-4">Subject Title</th>
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4">Enrolled Sections (Simultaneous)</th>
                <th className="py-3.5 px-4">Exam Date &amp; Slot</th>
                <th className="py-3.5 px-4">Campus Venues</th>
                <th className="py-3.5 px-4 text-center">Candidates</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map((item) => {
                  const isMidterm = item.series === "MIDTERM";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isMidterm
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                            }`}
                          >
                            {isMidterm ? "MIDTERM" : "SEE"}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.courseCode}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {item.courseName}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.semester}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] inline-block border border-blue-200 dark:border-blue-800">
                            {item.enrolledSections.length} Sections Examined Together
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" title={item.enrolledSections.join(", ")}>
                            {item.enrolledSections.map((s) => s.split("-")[0].trim() + " " + s.split("(")[1]?.replace(")", "") || s).join(", ")}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            {item.date}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.timeSlot}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.venue}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                          {item.totalCandidates}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove Schedule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? "Loading examination schedules..." : "No examination schedules found matching your filter criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: SCHEDULE NEW EXAMINATION (SEMESTER-FIRST FLOW) ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  CENTRAL CONTROLLER SCHEDULING
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  Schedule Semester Subject Examination
                </h3>
                <p className="text-xs text-slate-400">
                  Select semester &rarr; subject. All enrolled sections (A, B, C...) will automatically be scheduled together.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              {/* Series Selection Toggle */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. Examination Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeries("MIDTERM")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      series === "MIDTERM"
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Midterm Examination (CIA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeries("SEMESTER")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      series === "SEMESTER"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Semester End Examination (SEE)
                  </button>
                </div>
              </div>

              {/* Step 1: Select Semester */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. Select Academic Semester:
                </label>
                <select
                  value={formSemester}
                  onChange={(e) => {
                    setFormSemester(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {availableSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Subject Taught in that Semester */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  3. Select Subject Taught in {formSemester}:
                </label>
                <select
                  value={formCourseCode}
                  onChange={(e) => setFormCourseCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {semesterCourses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.department})
                    </option>
                  ))}
                </select>

                {/* Enrolled Sections Notification Banner */}
                <div className="mt-2.5 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>All Enrolled Sections Sit Together Simultaneously:</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300 leading-relaxed pl-5">
                    {matchingSections.length} Sections ({matchingSections.map((s) => s.name.split("(")[1]?.replace(")", "") || s.name).join(", ")}): Approx <strong>{totalCandidatesForSubject} candidates</strong> will write this examination at this exact slot across assigned halls.
                  </p>
                </div>
              </div>

              {/* Step 3: Date with Semester Conflict Verification */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    4. Examination Date:
                  </label>
                  {examDate && (
                    <span className={`text-[11px] font-bold ${
                      conflictDetails?.hasConflict ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {conflictDetails?.hasConflict ? "⚠️ Semester Conflict Detected" : "✓ Date Available for this Semester"}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExamDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 ${
                    conflictDetails?.hasConflict
                      ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 focus:ring-rose-500/30"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:ring-blue-500/20"
                  }`}
                />

                {/* Hard Conflict Warning Banner */}
                {conflictDetails?.hasConflict && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Semester-Level Scheduling Conflict</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        {conflictDetails.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Time Slot */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  5. Session Slot &amp; Time:
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="09:30 AM - 12:30 PM (Morning Session)">09:30 AM - 12:30 PM (Morning Session - 3 Hours)</option>
                  <option value="02:00 PM - 05:00 PM (Afternoon Session)">02:00 PM - 05:00 PM (Afternoon Session - 3 Hours)</option>
                  <option value="10:00 AM - 12:00 PM (Midterm)">10:00 AM - 12:00 PM (Midterm CIA - 2 Hours)</option>
                </select>
              </div>

              {/* Step 5: Campus Venues & Multi-Hall Partitioning */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  6. Examination Venues / Hall Allocation:
                </label>
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select a saved examination room</option>
                  {classrooms.filter((room) => room.status === "AVAILABLE").map((room) => (
                    <option key={room.id} value={`${room.roomNumber} - ${room.building}`}>
                      {room.roomNumber} - {room.building} ({room.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={conflictDetails?.hasConflict}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Schedule for All Sections</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
