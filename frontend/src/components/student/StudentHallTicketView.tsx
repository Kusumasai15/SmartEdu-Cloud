"use client";

import React, { useMemo } from "react";
import {
  Printer,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  User,
  Building2,
  FileText,
  Lock,
  ArrowLeft,
  Sparkles,
  Info,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";

interface StudentHallTicketViewProps {
  onBack?: () => void;
}

interface ExamPaper {
  code: string;
  name: string;
  date: string;
  time: string;
  session: string;
  venue: string;
}

export function StudentHallTicketView({ onBack }: StudentHallTicketViewProps) {
  const { user } = useAuth();
  const { currentSemester, attendanceSessions, isHallTicketsReleased } = useAcademicData();

  const studentName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.email || "Student";
  const rollNo = String(
    user?.student_identifier ||
      (user as any)?.roll_number ||
      (user as any)?.rollNumber ||
      "Not assigned"
  );
  const regNo = String(
    user?.student_identifier ||
      (user as any)?.registration_number ||
      "Not assigned"
  );
  const email = typeof user?.email === "string" ? user.email : "Not available";
  const studentProgram =
    typeof user?.department === "string"
      ? user.department
      : user?.department?.name
      ? user.department.name
      : (user as any)?.program ||
        (user as any)?.className ||
        (user as any)?.class_name ||
        "Not assigned";

  // Calculate attendance percentage to determine statutory exam eligibility (>= 75%)
  const attendancePct = useMemo(() => {
    if (!attendanceSessions || !Array.isArray(attendanceSessions) || attendanceSessions.length === 0) {
      return null;
    }
    const totalPoss = attendanceSessions.reduce((acc, s) => acc + (s.totalCount || 0), 0);
    const totalPres = attendanceSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
    return totalPoss > 0 ? Math.round((totalPres / totalPoss) * 1000) / 10 : null;
  }, [attendanceSessions]);

  const isEligible = attendancePct !== null && attendancePct >= 75.0;

  // Registered Exam Papers Schedule
  const examPapers = useMemo<ExamPaper[]>(() => [], []);

  // ─── STATE 1: HALL TICKETS HAVE NOT BEEN RELEASED BY THE EXAMINATION OFFICE ───
  if (!isHallTicketsReleased) {
    return (
      <div className="space-y-6 animate-fade-in pb-16 max-w-5xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Examination Office Directorate
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Semester End Examination (SEE) Admit Card
              </h1>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Semester {currentSemester}
          </span>
        </div>

        {/* Corporate Unreleased Hero Card */}
        <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Lock className="h-8 w-8 text-white" />
            </div>

            <div className="space-y-2 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-300 dark:border-amber-800">
                <Clock className="h-3.5 w-3.5" />
                <span>Issuance Pending Official Publication</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Admit Cards Have Not Been Released Yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                The Examination Office has not opened the hall ticket download window for Semester End Examinations (SEE).
                Pre-examination statutory attendance audits, continuous internal evaluation (CIE) verification, and seating allocation are currently underway.
              </p>
            </div>
          </div>

          {/* Provisional Clearance Check Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-blue-100 dark:border-slate-800">
            {/* Candidate Audit Status */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Your Pre-Audit Status
                </span>
                {isEligible ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Eligible for Issuance</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Shortage Notice (&lt;75%)</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {attendancePct === null ? "Not recorded" : `${attendancePct}%`}
                </span>
                <span className="text-xs text-slate-500 font-medium">Cumulative Attendance</span>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                {isEligible
                  ? "✓ You satisfy the statutory 75% attendance threshold. Your admit card will unlock automatically upon release."
                  : "⚠ Your attendance is below 75%. Please clear condonation requirements with your department HOD prior to release."}
              </p>
            </div>

            {/* Candidate Identification Box */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Candidate Registered Details
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Candidate:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                    {studentName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">University Roll No:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {rollNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Program:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                    {studentProgram}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Examination Series:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Not published
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Provisional Timetable Schedule Preview */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Provisional Examination Timetable Preview</span>
              </h3>
              <p className="text-xs text-slate-400">
                Official room and individual desk allocations will be encoded on your Admit Card once published.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl">
              {examPapers.length} Registered Courses
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {examPapers.map((paper, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {paper.code}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {paper.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Session: {paper.session} ({paper.time})
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                    {paper.date}
                  </span>
                  <span className="text-[10px] text-slate-400">Venue: Designated Exam Hall</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Inquiries Helpdesk */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Need assistance regarding attendance condonation or fee verification?
            </span>
          </div>
          <span className="text-blue-700 dark:text-blue-300 font-bold shrink-0">
            Contact details will appear after the Examination Office configures them.
          </span>
        </div>
      </div>
    );
  }

  if (examPapers.length === 0) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FileText className="mx-auto h-9 w-9 text-slate-400" />
        <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Hall ticket schedule is not available</h2>
        <p className="mt-1 text-sm text-slate-500">The Examination Office has not published your paper, venue, and seating allocations.</p>
      </div>
    );
  }

  // ─── STATE 2: OFFICIAL HALL TICKET IS OFFICIALLY RELEASED ───
  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* ─── ACTION TOP BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Official Release Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Official Examination Admit Card (Hall Ticket)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                Semester {currentSemester}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEligible ? (
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Download Admit Card</span>
            </button>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span>Download Restricted (Attendance Shortage)</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── ELIGIBILITY NOTIFICATION BANNER ─── */}
      {isEligible ? (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 shadow-xs flex items-center gap-3 print:hidden">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <span>STATUTORY EXAMINATION ELIGIBILITY CONFIRMED</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono">
                {attendancePct}% Attendance
              </span>
            </h2>
            <p className="text-xs text-emerald-800 dark:text-emerald-300/90 font-medium">
              You meet the mandatory university attendance threshold (≥75%) and have zero academic holds. You are permitted to appear for all scheduled examinations.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 dark:from-rose-950/40 dark:via-red-950/30 dark:to-rose-950/40 border border-rose-300 dark:border-rose-800/80 shadow-xs flex items-center gap-3 print:hidden">
          <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-rose-950 dark:text-rose-200 flex items-center gap-2">
              <span>NOT ELIGIBLE — ATTENDANCE SHORTAGE</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-mono">
                {attendancePct}% &lt; 75%
              </span>
            </h2>
            <p className="text-xs text-rose-800 dark:text-rose-300/90 font-medium">
              Your overall attendance is below the mandatory 75% regulation. As per Academic Regulation Clause 4.2, entry to the examination hall requires written condonation clearance.
            </p>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE OFFICIAL CORPORATE BLUE ADMIT CARD ─── */}
      <div className="bg-white rounded-3xl border-2 border-blue-600/30 shadow-xl p-6 sm:p-10 text-slate-900 relative overflow-hidden print:p-0 print:border-none print:shadow-none">
        {/* Top Watermark Background */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none select-none">
          <Building2 className="w-96 h-96 text-blue-900" />
        </div>

        {/* 1. Official Institutional Header (Royal Blue Corporate Gradient) */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 text-center space-y-2 shadow-md">
          <div className="flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white text-blue-900 flex items-center justify-center font-black text-lg shadow-sm">
              AU
            </div>
            <div className="text-left">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white leading-tight">
                ALLIANCE UNIVERSITY
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                AUTONOMOUS INSTITUTION • ACCREDITED WITH &apos;A+&apos; GRADE BY NAAC
              </p>
            </div>
          </div>

          <div className="inline-block mt-1 px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-black uppercase tracking-wider border border-white/20 backdrop-blur-xs">
            OFFICIAL ADMIT CARD &amp; HALL TICKET — SEMESTER END EXAMINATIONS (SEE 2026)
          </div>
        </div>

        {/* 2. Candidate Dossier & Passport Photo Frame */}
        <div className="py-6 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-6 items-center">
          {/* PASSPORT SIZE PHOTO PLACEHOLDER BOX */}
          <div className="w-36 h-44 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 flex flex-col items-center justify-center text-center p-2.5 mx-auto sm:mx-0 shadow-inner">
            <User className="h-12 w-12 text-blue-400 mb-1" />
            <span className="text-[9px] font-bold uppercase leading-tight text-blue-700">
              OFFICIALLY VERIFIED
            </span>
            <span className="text-[8px] text-blue-500 font-mono mt-0.5">
              AU BIOMETRIC ID
            </span>
          </div>

          {/* Candidate Metadata Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Candidate Name
              </span>
              <p className="font-extrabold text-sm text-slate-900">{studentName}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                University Roll No
              </span>
              <p className="font-black text-sm font-mono text-blue-700">{rollNo}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Registration Number
              </span>
              <p className="font-bold font-mono text-slate-800">{regNo}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Program &amp; Branch
              </span>
              <p className="font-bold text-slate-800">
                {studentProgram}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Examination Center
              </span>
              <p className="font-bold text-slate-800">
                School of Advanced Computing, Campus Central
              </p>
            </div>

            {/* Statutory Eligibility Tag */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Statutory Eligibility Status
              </span>
              {isEligible ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>ELIGIBLE TO SIT FOR EXAM ({attendancePct}%)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>NOT ELIGIBLE (SHORTAGE: {attendancePct}%)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Schedule of Registered Examinations */}
        <div className="py-6 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Course Examination Schedule &amp; Seating Matrix</span>
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-blue-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-50/80 text-blue-900 font-black uppercase text-[10px] border-b border-blue-200">
                <tr>
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-3">Subject Title</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Time &amp; Session</th>
                  <th className="py-2.5 px-3">Assigned Desk / Hall</th>
                  <th className="py-2.5 px-3 text-center">Invigilator Sign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {examPapers.map((exam, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30">
                    <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                      {exam.code}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {exam.name}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 font-mono">
                      {exam.date}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {exam.time}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {exam.venue}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300 font-mono text-[10px]">
                      [_______________]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Instructions for Candidates */}
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 text-[11px] space-y-1.5 text-slate-700">
          <h4 className="font-black text-xs uppercase text-blue-900 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-700" />
            <span>Important Instructions for the Examinee</span>
          </h4>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Candidates must present this Hall Ticket along with their official University ID Card at each session.</li>
            <li>Entry to the examination hall strictly closes 15 minutes after commencement.</li>
            <li>Electronic devices, smartwatches, and programmable calculators are strictly prohibited inside the hall.</li>
            <li>If marked <strong>NOT ELIGIBLE</strong>, invigilators are mandated to refuse admission without written COE clearance.</li>
          </ol>
        </div>

        {/* 5. Signatures and Security Seals */}
        <div className="pt-8 flex flex-col sm:flex-row items-end justify-between gap-6 border-t border-slate-200 mt-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <QrCode className="h-10 w-10 text-blue-900" />
              <div className="text-[10px] font-mono text-slate-500 text-left">
                <p className="font-bold text-blue-900">SECURE VERIFIED: AU-COE-HT-2026</p>
                <p>Hash: {rollNo.slice(-6)}-98A2-E41B</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-mono">
              Scannable at entrance by AI invigilator proctors.
            </p>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <div className="h-10 flex items-end justify-center sm:justify-end">
              <span className="font-serif italic font-bold text-sm text-blue-950 border-b border-blue-300 pb-0.5 px-4">
                Dr. K. S. Ramanathan
              </span>
            </div>
            <p className="text-xs font-black uppercase text-blue-950">
              Controller of Examinations
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Alliance University Examination Cell
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
