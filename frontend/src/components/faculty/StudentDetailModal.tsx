"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Phone,
  GraduationCap,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Send,
  Calendar,
  Layers,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Student360Detail {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  batch: string;
  semester: string;
  cgpa: number;
  overallAttendance: number;
  academicStanding: "HONORS" | "NORMAL" | "AT_RISK";
  advisor: string;
  courseEnrollments: Array<{
    courseCode: string;
    courseName: string;
    attendancePct: number;
    classesAttended: number;
    totalClasses: number;
    continuousAssessmentScore: number;
    midtermScore: number;
    labScore: number;
    currentGrade: string;
    status: "ENROLLED" | "COMPLETED" | "AT_RISK" | "ON_TRACK" | "TOP_PERFORMER" | "SHORTAGE";
  }>;
  proctoringHistory?: Array<{
    examTitle: string;
    date: string;
    strikes: number;
    integrityStatus: "CLEAN" | "FLAGGED";
  }>;
  facultyNotes?: string[];
}

export type StudentAcademicDetail = Student360Detail;

export function StudentDetailModal({
  student,
  isOpen = true,
  onClose,
}: {
  student: Student360Detail | null;
  isOpen?: boolean;
  onClose: () => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "courses" | "proctoring" | "notes">("overview");
  const [facultyNote, setFacultyNote] = useState("");
  const [notesList, setNotesList] = useState<string[]>(student?.facultyNotes || []);
  const [messageSentNotice, setMessageSentNotice] = useState<string | null>(null);

  if (!student || !isOpen) return null;

  const handleAddNote = () => {
    if (!facultyNote.trim()) return;
    setNotesList([facultyNote, ...notesList]);
    setFacultyNote("");
  };

  const handleSendMessage = () => {
    setMessageSentNotice(`Advisory notification sent to ${student.email}`);
    setTimeout(() => setMessageSentNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-6 max-h-[90vh] flex flex-col font-sans">
        {/* Modal Top Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-blue-500/20">
              {student.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{student.name}</h2>
                <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {student.rollNo}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    student.academicStanding === "HONORS"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                      : student.academicStanding === "AT_RISK"
                      ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {student.academicStanding === "HONORS"
                    ? "Honors Standing"
                    : student.academicStanding === "AT_RISK"
                    ? "Attendance Shortage Risk"
                    : "Good Standing"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {student.department} • Batch {student.batch} • {student.semester} • Advisor: {student.advisor}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {messageSentNotice && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{messageSentNotice}</span>
            </div>
            <button onClick={() => setMessageSentNotice(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 4 Core KPIs Strip — Professional Executive Monochrome */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Cumulative CGPA</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
              {student.cgpa} / 10.0
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Strong performance</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Overall Attendance</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
              {student.overallAttendance}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {student.overallAttendance >= 75 ? "Requirement met" : "Needs attention"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Course Load</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
              {student.courseEnrollments.length} Courses
            </span>
            <span className="text-[11px] text-slate-500 font-medium">20 Earned Credits</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Exam Record</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
              0 Strikes
            </span>
            <span className="text-[11px] text-slate-500 font-medium">No warnings</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
          {[
            { id: "overview", label: "Academic Performance" },
            { id: "courses", label: "Course Breakdown" },
            { id: "proctoring", label: "Exam Monitoring" },
            { id: "notes", label: "Faculty Advisory Notes" },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {activeSubTab === "overview" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  <span>Academic Trajectory Assessment</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Current GPA: <strong>{student.cgpa || "Not published"}</strong>. Overall attendance: <strong>{student.overallAttendance}%</strong>. Academic standing: <strong>{student.academicStanding.replace(/_/g, " ")}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
                  <h4 className="font-bold text-slate-900 dark:text-white">Contact &amp; Personal Info</h4>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      <span>{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      <span>{student.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                      <span>Advisor: {student.advisor}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
                  <h4 className="font-bold text-slate-900 dark:text-white">Quick Advisory Actions</h4>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSendMessage}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs w-full justify-center shadow-sm shadow-blue-500/20 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      <span>Send Direct Email Advisory</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => alert(`Attendance audit report generated for ${student.name}`)}
                      className="text-xs w-full justify-center border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      <span>Generate Attendance Report</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "courses" && (
            <div className="space-y-3">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">Course</th>
                    <th className="p-2.5">Attendance</th>
                    <th className="p-2.5">CA (15%)</th>
                    <th className="p-2.5">Mid-Term (25%)</th>
                    <th className="p-2.5">Lab (20%)</th>
                    <th className="p-2.5">Grade</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {student.courseEnrollments.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold">
                        <span className="font-mono text-slate-800 dark:text-slate-200 mr-1.5">{c.courseCode}</span>
                        <span className="text-slate-900 dark:text-white">{c.courseName}</span>
                      </td>
                      <td className="p-2.5 font-mono">
                        <span className="text-slate-800 dark:text-slate-200">
                          {c.attendancePct}% ({c.classesAttended}/{c.totalClasses})
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">{c.continuousAssessmentScore} / 30</td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">{c.midtermScore} / 50</td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">{c.labScore} / 40</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{c.currentGrade}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === "proctoring" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0" />
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Student maintains an assessment integrity history with zero security strike terminations.
                </p>
              </div>

              {(student.proctoringHistory || []).map((p, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white">{p.examTitle}</h4>
                    <span className="font-mono text-slate-400 text-[11px]">{p.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Strikes Recorded: <strong className="font-mono text-slate-900 dark:text-white">{p.strikes} Strikes</strong></span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 text-[10px] font-semibold">
                      {p.integrityStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === "notes" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={facultyNote}
                  onChange={(e) => setFacultyNote(e.target.value)}
                  placeholder="Type confidential faculty observation note..."
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                <Button onClick={handleAddNote} className="bg-blue-600 text-white hover:bg-blue-700 text-xs shrink-0 font-bold shadow-sm shadow-blue-500/20 cursor-pointer">
                  Save Note
                </Button>
              </div>

              <div className="space-y-2">
                {notesList.map((n, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <p className="text-slate-800 dark:text-slate-200">{n}</p>
                    <span className="text-[10px] text-slate-400">Logged by Course Faculty</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 font-bold shadow-sm shadow-blue-500/20 cursor-pointer">
            Close Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
