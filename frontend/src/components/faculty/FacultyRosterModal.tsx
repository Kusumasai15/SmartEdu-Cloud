"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Users,
  Search,
  Eye,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentDetailModal, Student360Detail } from "./StudentDetailModal";
import { useAcademicData } from "@/context/AcademicDataContext";
import { getUserAvatarUrl } from "@/lib/avatar";

export interface StudentRosterItem {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  className: string;
  courseCode: string;
  courseName: string;
  attendancePct: number;
  classesAttended: number;
  totalClasses: number;
  currentGrade: string;
  cgpa: number;
  status: "NORMAL" | "AT_RISK" | "HONORS";
  lastActive: string;
}

export const facultyRoster: StudentRosterItem[] = [];

interface FacultyRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FacultyRosterModal({ isOpen, onClose }: FacultyRosterModalProps) {
  const { users, courses, attendanceSessions, assignments, submissions } = useAcademicData();
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student360Detail | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Dynamically map all registered student users from academic data
  const dynamicRoster: StudentRosterItem[] = useMemo(() => {
    const studentUsers = users.filter((u) => u.role === "STUDENT");

    return studentUsers.map((st) => {
      const studentId = st.student_identifier || "Not added";
      const fullName = `${st.first_name} ${st.last_name}`.trim();
      const studentClass = st.className || "";

      // Find primary enrolled course for this student
      const enrolledCourse = courses.find((c) => {
        if (!studentClass || !c.assignedClasses || c.assignedClasses.length === 0) return false;
        return c.assignedClasses.some(
          (cls) => cls.toLowerCase().includes(studentClass.toLowerCase()) || studentClass.toLowerCase().includes(cls.toLowerCase())
        );
      });

      // Calculate real attendance across sessions for this specific student
      const courseSessions = attendanceSessions.filter(
        (sess) =>
          sess.courseCode?.toUpperCase() === enrolledCourse?.code?.toUpperCase() ||
          (sess.courseName && enrolledCourse?.name && sess.courseName.toLowerCase().includes(enrolledCourse.name.toLowerCase()))
      );

      // Check for individual student session records
      const studentSessionRecords = (attendanceSessions as any[]).filter((sess) =>
        Array.isArray(sess.records) &&
        sess.records.some((r: any) => r.studentId === st.id || r.student_id === st.id || r.rollNo === studentId)
      );

      let totalClasses = 0;
      let attended = 0;
      let attendancePct = 0;

      if (studentSessionRecords.length > 0) {
        totalClasses = studentSessionRecords.length;
        attended = studentSessionRecords.filter((sess) =>
          sess.records.some(
            (r: any) =>
              (r.studentId === st.id || r.student_id === st.id || r.rollNo === studentId) &&
              (r.status === "PRESENT" || r.status === "P")
          )
        ).length;
        attendancePct = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;
      } else {
        totalClasses = courseSessions.length;
        attended = 0;
        attendancePct = 0;
      }

      // Calculate grade/status
      const isAtRisk = totalClasses > 0 && attendancePct < 75;
      const isHonors = totalClasses > 0 && attendancePct >= 90;
      const status: "NORMAL" | "AT_RISK" | "HONORS" = isAtRisk ? "AT_RISK" : isHonors ? "HONORS" : "NORMAL";
      const currentGrade = "Not graded";
      const cgpa = 0;

      return {
        id: st.id,
        rollNo: studentId,
        name: fullName,
        email: st.email,
        phone: st.phone || "Not added",
        department: st.department || "Not added",
        className: studentClass,
        courseCode: enrolledCourse?.code || "",
        courseName: enrolledCourse?.name || "",
        attendancePct,
        classesAttended: attended,
        totalClasses,
        currentGrade,
        cgpa,
        status,
        lastActive: "Today",
      };
    });
  }, [users, courses, attendanceSessions]);

  // Distinct courses for filter chips
  const distinctCourseCodes = useMemo(() => {
    const list: string[] = [];
    dynamicRoster.forEach((s) => {
      if (s.courseCode && !list.includes(s.courseCode)) {
        list.push(s.courseCode);
      }
    });
    return list;
  }, [dynamicRoster]);

  if (!isOpen) return null;

  const filteredStudents = dynamicRoster.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "AT_RISK") return s.status === "AT_RISK";
    if (selectedFilter === "HONORS") return s.status === "HONORS";
    return s.courseCode === selectedFilter;
  });

  const handleStudentClick = (s: StudentRosterItem) => {
    // Generate full 360 profile from live context
    const student360: Student360Detail = {
      id: s.id,
      rollNo: s.rollNo,
      name: s.name,
      email: s.email,
      phone: s.phone,
      department: s.department,
      batch: s.className || "Not added",
      semester: s.className || "Not added",
      cgpa: s.cgpa,
      overallAttendance: s.attendancePct,
      academicStanding: s.status,
      advisor: "Not added",
      courseEnrollments: [
        {
          courseCode: s.courseCode,
          courseName: s.courseName,
          attendancePct: s.attendancePct,
          classesAttended: s.classesAttended,
          totalClasses: s.totalClasses,
          continuousAssessmentScore: 0,
          midtermScore: 0,
          labScore: 0,
          currentGrade: s.currentGrade,
          status: s.status === "HONORS" ? "TOP_PERFORMER" : s.status === "AT_RISK" ? "SHORTAGE" : "ON_TRACK",
        },
      ],
      proctoringHistory: [],
    };

    setSelectedStudentDetail(student360);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div
          className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl animate-fade-in flex flex-col transition-all ${
            isFullScreen ? "w-full h-full rounded-none p-6" : "max-w-6xl w-full h-[85vh] p-6 sm:p-8"
          }`}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Enrolled Student Roster &amp; Profiles</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    {filteredStudents.length} Students
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Click any student row to view complete 360° academic performance, attendance breakdown, and proctoring records.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, roll number, class section, or email..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              {(["ALL", "HONORS", "AT_RISK", ...distinctCourseCodes] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    selectedFilter === filter
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {filter === "ALL"
                    ? "All Students"
                    : filter === "HONORS"
                    ? "★ Honors (≥90%)"
                    : filter === "AT_RISK"
                    ? "⚠️ Shortage Risk (<75%)"
                    : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto pt-2">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] z-10 font-mono">
                <tr>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Student Name &amp; Email</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Primary Course</th>
                  <th className="p-3">Attendance Rate</th>
                  <th className="p-3">Score &amp; Grade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleStudentClick(s)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 font-mono font-bold text-blue-600 group-hover:underline">
                        {s.rollNo}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getUserAvatarUrl(s)}
                            alt={s.name}
                            className="h-7 w-7 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                            }}
                          />
                          <div>
                            <strong className="text-slate-900 dark:text-white block">{s.name}</strong>
                            <span className="text-[11px] text-slate-400">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                        {s.className}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {s.courseCode}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              s.attendancePct >= 75 ? "text-blue-600 dark:text-blue-400" : "text-rose-600"
                            }`}
                          >
                            {s.attendancePct}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({s.classesAttended}/{s.totalClasses})
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {s.currentGrade} • CGPA {s.cgpa}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === "HONORS"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                              : s.status === "AT_RISK"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {s.status === "HONORS" ? "★ Honors" : s.status === "AT_RISK" ? "⚠️ Shortage Risk" : "● Good Standing"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStudentClick(s);
                          }}
                          className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View 360°</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs font-semibold">
                      No students found matching the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              Showing {filteredStudents.length} of {dynamicRoster.length} active registered students
            </span>
            <Button onClick={onClose} className="btn-saas-primary text-xs px-6 cursor-pointer">
              Close Roster
            </Button>
          </div>
        </div>
      </div>

      {/* Nested 360° Profile Modal */}
      {selectedStudentDetail && (
        <StudentDetailModal
          student={selectedStudentDetail}
          isOpen={!!selectedStudentDetail}
          onClose={() => setSelectedStudentDetail(null)}
        />
      )}
    </>
  );
}
