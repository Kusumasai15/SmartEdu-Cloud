"use client";

import React, { useState } from "react";
import {
  X,
  UserCheck,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Search,
  Users,
  Clock,
  RotateCcw,
  Building,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import { facultyRoster, StudentRosterItem } from "./FacultyRosterModal";
import { getUserAvatarUrl } from "@/lib/avatar";

interface FacultyAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: FacultyCourse[];
  initialCourseId?: string;
  onSubmitSession: (sessionData: {
    courseId: string;
    courseCode: string;
    courseName: string;
    topic: string;
    presentCount: number;
    totalCount: number;
  }) => void;
}

export function FacultyAttendanceModal({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  onSubmitSession,
}: FacultyAttendanceModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || courses[0]?.id || "");
  const [topic, setTopic] = useState<string>("AVL Tree Rotations & Invariant Proofs");
  const [lectureHall, setLectureHall] = useState<string>("Lecture Hall 101");
  const [unitModule, setUnitModule] = useState<string>("Unit 3: Balanced Search Trees");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "P" | "A">("ALL");
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Binary Attendance: "P" (Present) or "A" (Absent)
  const [studentStatus, setStudentStatus] = useState<Record<string, "P" | "A">>({});

  if (!isOpen) return null;

  const targetCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const handleMarkAll = (status: "P" | "A") => {
    const next: Record<string, "P" | "A"> = {};
    facultyRoster.forEach((s) => {
      next[s.id] = status;
    });
    setStudentStatus(next);
  };

  const presentCount = Object.values(studentStatus).filter((s) => s === "P").length;
  const absentCount = Object.values(studentStatus).filter((s) => s === "A").length;
  const totalCount = facultyRoster.length;
  const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : "0";

  const filteredStudents = facultyRoster.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const currentStatus = studentStatus[s.id] || "P";
    if (statusFilter === "ALL") return true;
    return currentStatus === statusFilter;
  });

  const handleSubmit = () => {
    if (!targetCourse || !topic.trim() || facultyRoster.length === 0) return;
    onSubmitSession({
      courseId: targetCourse.id,
      courseCode: targetCourse.course_code,
      courseName: targetCourse.name,
      topic: topic.trim(),
      presentCount,
      totalCount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl animate-fade-in flex flex-col transition-all ${
          isFullScreen
            ? "w-full h-full rounded-none p-6"
            : "max-w-6xl w-full h-[88vh] rounded-3xl p-6 sm:p-8"
        }`}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Take Attendance
                </h3>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                  {targetCourse?.course_code}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Class</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mark present and absent students for this class.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Course & Session Topic Configuration Strip */}
        <div className="py-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code}: {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              placeholder="e.g. AVL Tree Rotations"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Unit</label>
            <select
              value={unitModule}
              onChange={(e) => setUnitModule(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="Unit 1: Foundations & Asymptotics">Unit 1: Foundations &amp; Asymptotics</option>
              <option value="Unit 2: Linear Structures & Hashing">Unit 2: Linear Structures &amp; Hashing</option>
              <option value="Unit 3: Balanced Search Trees">Unit 3: Balanced Search Trees</option>
              <option value="Unit 4: Graph Algorithms & DP">Unit 4: Graph Algorithms &amp; DP</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Room</label>
            <input
              type="text"
              value={lectureHall}
              onChange={(e) => setLectureHall(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              placeholder="e.g. Lecture Hall 101"
            />
          </div>
        </div>

        {/* Live Attendance Metric Bar & Quick Batch Controls */}
        <div className="py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              🟢 Present: <strong className="font-mono text-sm ml-1">{presentCount}</strong>
            </span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
              🔴 Absent: <strong className="font-mono text-sm ml-1">{absentCount}</strong>
            </span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
              Attendance: <strong className="font-mono text-sm ml-1">{attendanceRate}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => handleMarkAll("P")}
              className="btn-saas-outline px-3 py-1.5 font-bold text-emerald-600 flex items-center gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Mark All Present</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll("A")}
              className="btn-saas-outline px-3 py-1.5 font-bold text-rose-600 flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Mark All Absent</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Roster Bar */}
        <div className="py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name or roll number..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(["ALL", "P", "A"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                  statusFilter === filter
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {filter === "ALL"
                  ? `All (${facultyRoster.length})`
                  : filter === "P"
                  ? `Present (${presentCount})`
                  : `Absent (${absentCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Professional Tabular Student Roll-Call Register */}
        <div className="flex-1 overflow-y-auto py-2 border rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student Profile</th>
                  <th className="py-3 px-4">Roll / Registration No</th>
                  <th className="py-3 px-4">Cumulative Attendance</th>
                  <th className="py-3 px-4 text-center">Live Roll-Call Status</th>
                  <th className="py-3 px-4 text-center">Academic Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((s, idx) => {
                  const currentStatus = studentStatus[s.id] || "P";
                  const isCompliant = s.attendancePct >= 75;
                  const initials = s.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        currentStatus === "A" ? "bg-rose-50/30 dark:bg-rose-950/15" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getUserAvatarUrl(s)}
                            alt={s.name}
                            className={`h-9 w-9 rounded-xl object-cover shrink-0 border shadow-2xs ${
                              currentStatus === "P"
                                ? "border-blue-500/30 ring-1 ring-blue-500/20"
                                : "border-rose-500/30 ring-1 ring-rose-500/20"
                            }`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {s.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {s.email || "Email not added"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900">
                          {s.rollNo}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`font-mono font-bold ${isCompliant ? "text-emerald-600" : "text-rose-600"}`}>
                              {s.attendancePct}%
                            </span>
                            <span className="text-slate-400 font-mono">
                              {s.classesAttended}/{s.totalClasses}
                            </span>
                          </div>
                          <div className="w-28 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isCompliant ? "bg-emerald-500" : "bg-rose-500"}`}
                              style={{ width: `${s.attendancePct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStudentStatus({ ...studentStatus, [s.id]: "P" })}
                            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                              currentStatus === "P"
                                ? "bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-400/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                          >
                            <span>Present</span>
                            <span className="font-mono text-[10px] opacity-80">[P]</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus({ ...studentStatus, [s.id]: "A" })}
                            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                              currentStatus === "A"
                                ? "bg-rose-600 text-white shadow-xs scale-102 ring-2 ring-rose-400/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                            }`}
                          >
                            <span>Absent</span>
                            <span className="font-mono text-[10px] opacity-80">[A]</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompliant
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                          }`}
                        >
                          <span>{isCompliant ? "Compliant" : "Shortage Risk"}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Marked at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="btn-saas-primary text-xs px-6 font-bold shadow-md shadow-blue-500/20"
            >
              Save Attendance
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
