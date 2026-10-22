"use client";

import React from "react";
import { Printer, ShieldCheck } from "lucide-react";
import { OfficialStudentTranscript } from "@/types";

interface OfficialTranscriptViewProps {
  transcript: OfficialStudentTranscript | null;
}

export const OfficialTranscriptView: React.FC<OfficialTranscriptViewProps> = ({ transcript }) => {
  if (!transcript) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
        No published academic transcript records found for the current student.
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Digitally Verified University Academic Record • CBCS Scheme</span>
        </div>
        <button
          onClick={handlePrint}
          className="btn-saas-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Official Transcript</span>
        </button>
      </div>

      {/* Printable Official Document */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-6 mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 dark:text-white uppercase">
            UNIVERSITY ACADEMIC RECORD
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
            Office of the University Registrar &amp; Controller of Examinations
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Official Academic Transcript of Records • Choice Based Credit System (CBCS)
          </p>
        </div>

        {/* Student Metadata Box */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 text-xs">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Student Name</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{transcript.student_name}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Student ID / Roll No</span>
            <span className="font-mono font-bold text-blue-700 text-sm">{transcript.student_identifier || "Not assigned"}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Department</span>
            <span className="font-bold text-slate-900 dark:text-white">{transcript.department_name || "Not assigned"}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Academic Program</span>
            <span className="font-bold text-slate-900 dark:text-white">{transcript.program || "Not assigned"}</span>
          </div>
        </div>

        {/* Semesters Loop */}
        <div className="space-y-6">
          {transcript.semesters.map((sem) => {
            const semName = sem.semester_name;
            const semGpa = sem.semester_gpa;
            const courseList = sem.courses || [];

            return (
              <div key={sem.semester_id || semName} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {/* Semester Header */}
                <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                    {semName} {sem.academic_year ? `— ${sem.academic_year}` : ""}
                  </span>
                  <span className="text-xs font-semibold bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    Term SGPA: <strong className="text-indigo-600 font-mono text-sm">{Number(semGpa).toFixed(2)}</strong>
                  </span>
                </div>

                {/* Course Results Table */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px]">
                        <th className="py-2.5 px-4">Course Code</th>
                        <th className="py-2.5 px-4">Course Title</th>
                        <th className="py-2.5 px-3 text-center">Credits</th>
                        <th className="py-2.5 px-3 text-center">Internal (CIA/DSA)</th>
                        <th className="py-2.5 px-3 text-center">SEE Pen &amp; Paper</th>
                        <th className="py-2.5 px-3 text-center">Total (%)</th>
                        <th className="py-2.5 px-3 text-center">Letter Grade</th>
                        <th className="py-2.5 px-3 text-center">Grade Point</th>
                        <th className="py-2.5 px-3 text-center">Attendance</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {courseList.map((c: any, cIdx: number) => {
                        const code = c.course_code || "Not assigned";
                        const name = c.course_name || "Course name unavailable";
                        const credits = c.credits_earned;
                        const score = c.final_percentage;
                        const grade = c.letter_grade;
                        const gp = c.grade_point;
                        const status = c.academic_status;

                        return (
                          <tr key={c.id || code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{code}</td>
                            <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium">{name}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{credits}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                              Not published
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                              Not published
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900 dark:text-white">
                              {Number(score).toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-indigo-600 font-mono">{grade}</td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-700 dark:text-slate-300">
                              {Number(gp).toFixed(1)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                &ge;75% (Eligible)
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  status === "PASS"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Semester Summary Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500">
                  <span>Registered Credits: <strong>{sem.total_credits_registered}</strong></span>
                  <span>Earned Credits: <strong>{sem.total_credits_earned}</strong></span>
                  <span>Term SGPA: <strong className="text-slate-900 dark:text-white font-mono">{Number(semGpa).toFixed(2)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cumulative Summary */}
        <div className="mt-8 pt-6 border-t-2 border-slate-800 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Degree Credits</span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {transcript.total_credits_earned} / {transcript.total_credits_registered}
            </span>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900">
            <span className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Cumulative CGPA</span>
            <span className="text-2xl font-black text-indigo-900 dark:text-indigo-200 font-mono mt-0.5 block">
              {Number(transcript.cumulative_gpa).toFixed(2)}
            </span>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900">
            <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Courses Completed</span>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 font-mono mt-0.5 block">
              {transcript.total_courses_passed} Passed
            </span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Academic Standing</span>
            <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">
              {transcript.academic_standing.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Official Authentication Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs text-slate-400">
          <div>
            <p>Issued: {new Date(transcript.issued_at).toLocaleDateString()}</p>
          </div>
          <div className="text-left sm:text-center">
            <div className="w-48 border-b border-slate-800 dark:border-slate-500 pb-1 mb-1 font-semibold text-slate-800 dark:text-slate-200">
              Controller of Examinations
            </div>
            <span className="text-[10px]">University Examination Office</span>
          </div>
        </div>
      </div>
    </div>
  );
};
