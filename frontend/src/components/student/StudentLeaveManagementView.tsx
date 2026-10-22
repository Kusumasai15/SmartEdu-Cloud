"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Plus,
  X,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Building,
  Filter,
  Search,
  LayoutGrid,
  List,
  Eye,
  UserCheck,
} from "lucide-react";
import { useAcademicData, StudentLeaveRequest, StudentLeaveType } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface StudentLeaveManagementViewProps {
  enrolledCourseCodes?: string[];
}

export function StudentLeaveManagementView({ enrolledCourseCodes = [] }: StudentLeaveManagementViewProps) {
  const { user } = useAuth();
  const { studentLeaves, applyStudentLeave, users, departments, courses } = useAcademicData();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedProofPreview, setSelectedProofPreview] = useState<{ title: string; url?: string; fileName?: string } | null>(null);

  // Form State
  const [leaveType, setLeaveType] = useState<StudentLeaveType>("EVENT");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [reason, setReason] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const [proofFileUrl, setProofFileUrl] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(enrolledCourseCodes);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveViewMode, setLeaveViewMode] = useState<"table" | "grid">("table");
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<StudentLeaveRequest | null>(null);

  // Filter current student's leaves
  const myLeaves = useMemo(() => {
    const myId = user?.id;
    const myEmail = user?.email?.toLowerCase().trim();
    const myRoll = user?.student_identifier?.toLowerCase().trim();

    return studentLeaves.filter((l) => {
      if (myId && l.studentId === myId) return true;
      if (myEmail && l.studentEmail?.toLowerCase().trim() === myEmail) return true;
      if (myRoll && l.studentRollNo?.toLowerCase().trim() === myRoll) return true;
      return false;
    });
  }, [studentLeaves, user]);

  const pendingCount = useMemo(
    () => myLeaves.filter((l) => l.status === "PENDING_ADVISOR" || l.status === "PENDING_HOD").length,
    [myLeaves]
  );
  const approvedCount = useMemo(
    () => myLeaves.filter((l) => l.status === "APPROVED" || l.attendanceCredited).length,
    [myLeaves]
  );
  const rejectedCount = useMemo(
    () => myLeaves.filter((l) => l.status === "REJECTED").length,
    [myLeaves]
  );

  const filteredLeaves = useMemo(() => {
    let list = myLeaves;
    if (statusFilter === "PENDING") {
      list = list.filter((l) => l.status === "PENDING_ADVISOR" || l.status === "PENDING_HOD");
    } else if (statusFilter === "APPROVED") {
      list = list.filter((l) => l.status === "APPROVED" || l.attendanceCredited);
    } else if (statusFilter === "REJECTED") {
      list = list.filter((l) => l.status === "REJECTED");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          (l.reason || "").toLowerCase().includes(q) ||
          (l.leaveType || "").toLowerCase().includes(q) ||
          (l.startDate || "").toLowerCase().includes(q) ||
          (l.endDate || "").toLowerCase().includes(q) ||
          (l.affectedCourseCodes || []).some((c) => c.toLowerCase().includes(q))
      );
    }

    return list;
  }, [myLeaves, statusFilter, searchQuery]);

  // Advisor Info for user's section
  const sectionAdvisor = useMemo(() => {
    if ((user as any)?.advisor_name) {
      return {
        name: (user as any).advisor_name,
        email: (user as any).advisor_email || "",
      };
    }
    const userClass = (user?.className || (user as any)?.class_name || "").toLowerCase().trim();
    if (userClass && departments) {
      for (const dept of departments) {
        for (const cohort of dept.cohorts || []) {
          const cName = (cohort.name || cohort.id || "").toLowerCase().trim();
          if (cName === userClass || userClass.includes(cName) || cName.includes(userClass)) {
            if (cohort.classAdvisor && cohort.classAdvisor !== "Not assigned") {
              return {
                name: cohort.classAdvisor,
                email: cohort.classAdvisorEmail || "",
              };
            }
          }
        }
      }
    }
    return { name: "Class Advisor", email: "" };
  }, [user, departments]);
  const sectionAdvisorName = sectionAdvisor.name;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      // Read as data URL for instant client preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCourseSelection = (code: string) => {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "Student");

    applyStudentLeave({
      studentId: user?.id || "",
      studentName: fullName,
      studentRollNo: user?.student_identifier || "",
      studentEmail: user?.email || "",
      className: user?.className || (user as any)?.class_name || "",
      department: (user?.department as any)?.name || (typeof user?.department === "string" ? user?.department : "") || "Department",
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      proofFileName: proofFileName || "Official_Documentation_Slip.pdf",
      proofUrl: proofFileUrl || undefined,
      affectedCourseCodes: selectedCourses.length > 0 ? selectedCourses : enrolledCourseCodes,
      advisorName: sectionAdvisor.name,
      advisorEmail: sectionAdvisor.email,
    });

    setSubmitting(false);
    setIsApplyModalOpen(false);
    setReason("");
    setProofFileName("");
    setProofFileUrl("");
  };

  // Stats calculation
  const creditedSessionsTotal = myLeaves
    .filter((l) => l.status === "APPROVED" && l.attendanceCredited)
    .reduce((acc, l) => acc + (l.creditedSessionsCount || 1), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ─── COMPACT HEADER & APPLY ACTION ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Two-Tier Institutional Governance</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Leave &amp; On-Duty (OD) Applications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Apply for excused absence. Once endorsed by your Class Advisor and sanctioned by the HOD, attendance is automatically credited.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCourses(enrolledCourseCodes);
            setIsApplyModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Apply for Leave / OD</span>
        </button>
      </div>

      {/* ─── SLEEK METRIC STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Filed</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">{myLeaves.length}</p>
          <span className="text-[10px] text-slate-400">Official applications</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">In Review</span>
          <p className="text-xl font-black text-amber-500 font-mono">{pendingCount}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">Advisor / HOD Stage</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">Sanctioned</span>
          <p className="text-xl font-black text-emerald-600 font-mono">{approvedCount}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">HOD Sanction Granted</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Auto-Credited</span>
          <p className="text-xl font-black text-blue-600 font-mono">{creditedSessionsTotal}</p>
          <span className="text-[10px] text-blue-600 dark:text-blue-400">Class Sessions Added</span>
        </div>
      </div>

      {/* ─── FILTER & SEARCH BAR WITH VIEW TOGGLE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <span>All ({myLeaves.length})</span>
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
              statusFilter === "PENDING"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs font-bold"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/70"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>In Review ({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
              statusFilter === "APPROVED"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/70"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Approved ({approvedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
              statusFilter === "REJECTED"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs font-bold"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/70"
            }`}
          >
            <AlertCircle className="h-3 w-3" />
            <span>Rejected ({rejectedCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leaves..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 w-32 sm:w-44"
            />
          </div>

          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setLeaveViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                leaveViewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLeaveViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                leaveViewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── APPLICATIONS LIST / TABLE / CARDS ─── */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
          <FileText className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Leave Applications Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No requests match "${searchQuery}". Clear your search or change filters.`
              : "You haven't filed any leave requests under this category. Click 'Apply for Leave / OD' above to submit one."}
          </p>
        </div>
      ) : leaveViewMode === "table" ? (
        /* ─── COMPACT MODERN TABLE VIEW ─── */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Leave Category &amp; Dates</th>
                  <th className="py-3 px-4">Purpose &amp; Affected Subjects</th>
                  <th className="py-3 px-3 text-center">Supporting Proof</th>
                  <th className="py-3 px-4">Workflow Standing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeaves.map((leave) => {
                  const isApproved = leave.status === "APPROVED" || !!leave.attendanceCredited;
                  const isRejected = !isApproved && leave.status === "REJECTED";
                  const isPendingAdvisor = !isApproved && !isRejected && leave.status === "PENDING_ADVISOR";
                  const isPendingHod = !isApproved && !isRejected && leave.status === "PENDING_HOD";

                  return (
                    <tr
                      key={leave.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                              leave.leaveType === "EVENT"
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200"
                                : leave.leaveType === "MEDICAL"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                            }`}
                          >
                            {leave.leaveType === "EVENT"
                              ? "🏆 Hackathon / Event"
                              : leave.leaveType === "MEDICAL"
                              ? "🏥 Medical Emergency"
                              : "🎖️ On-Duty (OD)"}
                          </span>
                          <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{leave.startDate} &rarr; {leave.endDate}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="space-y-1">
                          <p className="text-slate-800 dark:text-slate-200 font-medium line-clamp-2 leading-relaxed">
                            {leave.reason}
                          </p>
                          {leave.affectedCourseCodes && leave.affectedCourseCodes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {leave.affectedCourseCodes.map((c) => (
                                <span
                                  key={c}
                                  className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-top text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProofPreview({
                              title: `${leave.leaveType} Proof • ${leave.studentName}`,
                              fileName: leave.proofFileName,
                              url: leave.proofUrl,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Proof</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div>
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>HOD Sanctioned • Credited</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200">
                              <AlertCircle className="h-3 w-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {isPendingAdvisor && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200">
                              <Clock className="h-3 w-3" />
                              <span>Stage 1: Advisor Review</span>
                            </span>
                          )}
                          {isPendingHod && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200">
                              <Clock className="h-3 w-3" />
                              <span>Stage 2: Awaiting HOD</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLeaveDetail(leave)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 font-bold text-[11px] shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── COMPACT MODERN GRID CARDS VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredLeaves.map((leave) => {
            const isApproved = leave.status === "APPROVED" || !!leave.attendanceCredited;
            const isRejected = !isApproved && leave.status === "REJECTED";
            const isPendingAdvisor = !isApproved && !isRejected && leave.status === "PENDING_ADVISOR";
            const isPendingHod = !isApproved && !isRejected && leave.status === "PENDING_HOD";

            return (
              <div
                key={leave.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-xs space-y-3 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        leave.leaveType === "EVENT"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200"
                          : leave.leaveType === "MEDICAL"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                      }`}
                    >
                      {leave.leaveType === "EVENT"
                        ? "🏆 Event"
                        : leave.leaveType === "MEDICAL"
                        ? "🏥 Medical"
                        : "🎖️ On-Duty"}
                    </span>

                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {leave.startDate} &rarr; {leave.endDate}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2 leading-relaxed">
                    {leave.reason}
                  </p>

                  {leave.affectedCourseCodes && leave.affectedCourseCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {leave.affectedCourseCodes.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    {isApproved && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Sanctioned</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                    {isPendingAdvisor && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Advisor Review</span>
                      </span>
                    )}
                    {isPendingHod && (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Awaiting HOD</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProofPreview({
                          title: `${leave.leaveType} Proof`,
                          fileName: leave.proofFileName,
                          url: leave.proofUrl,
                        })
                      }
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                      title="View Proof Document"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLeaveDetail(leave)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-[11px] cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: LEAVE DETAIL DIALOG ─── */}
      {selectedLeaveDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Leave Application Details</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedLeaveDetail.leaveType === "EVENT"
                    ? "🏆 Hackathon / Event Leave"
                    : selectedLeaveDetail.leaveType === "MEDICAL"
                    ? "🏥 Medical Emergency Leave"
                    : "🎖️ On-Duty (OD) Leave"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaveDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Inclusive Dates</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedLeaveDetail.startDate} &rarr; {selectedLeaveDetail.endDate}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Class Advisor</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLeaveDetail.advisorName || "Assigned Advisor"}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Stated Purpose / Justification</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedLeaveDetail.reason}
                </p>
              </div>

              {selectedLeaveDetail.affectedCourseCodes && selectedLeaveDetail.affectedCourseCodes.length > 0 && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Classes Covered For Attendance Credit</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLeaveDetail.affectedCourseCodes.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200/60"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(selectedLeaveDetail.advisorNotes || selectedLeaveDetail.hodNotes) && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Official Remarks</span>
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 text-amber-900 dark:text-amber-200">
                    {selectedLeaveDetail.advisorNotes && (
                      <p><strong className="font-bold">Advisor:</strong> {selectedLeaveDetail.advisorNotes}</p>
                    )}
                    {selectedLeaveDetail.hodNotes && (
                      <p><strong className="font-bold">HOD:</strong> {selectedLeaveDetail.hodNotes}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProofPreview({
                      title: `${selectedLeaveDetail.leaveType} Proof • ${selectedLeaveDetail.studentName}`,
                      fileName: selectedLeaveDetail.proofFileName,
                      url: selectedLeaveDetail.proofUrl,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>View Supporting Document</span>
                  <ExternalLink className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLeaveDetail(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: APPLY FOR LEAVE / ON-DUTY ─── */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Apply for Event, Medical or On-Duty (OD) Leave
                  </h3>
                  <p className="text-xs text-slate-500">
                    Two-Tier Approval Workflow: Class Advisor &rarr; HOD &rarr; Automatic Attendance Credit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitApplication} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* 1. Leave Type Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Select Leave Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { type: "EVENT" as const, title: "Event Leave", desc: "Hackathon, Tech/Cultural Fest", icon: Award },
                    { type: "MEDICAL" as const, title: "Medical Leave", desc: "Illness, Hospital Slip", icon: AlertCircle },
                    { type: "ON_DUTY" as const, title: "On-Duty (OD)", desc: "Representing University, Sports", icon: ShieldCheck },
                  ].map((cat) => (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => setLeaveType(cat.type)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        leaveType === cat.type
                          ? "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:border-blue-600 dark:text-blue-100 shadow-xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-0.5">
                        <cat.icon className="h-4 w-4 text-blue-600" />
                        <span>{cat.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* 3. Affected Courses for Attendance Credit */}
              {enrolledCourseCodes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Classes &amp; Courses Affected (Selected will receive automatic attendance credit upon HOD approval)
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {enrolledCourseCodes.map((code) => {
                      const isSelected = selectedCourses.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleCourseSelection(code)}
                          className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>{code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Purpose / Justification */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Detailed Reason &amp; Official Purpose <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter the official reason and purpose for the leave application..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white leading-relaxed"
                />
              </div>

              {/* 5. Proof / Documentation Upload */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Supporting Proof (Invitation Letter / Medical Prescription / Event Pass) <span className="text-rose-500">*</span>
                </label>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <input
                    type="file"
                    id="leave-proof-file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById("leave-proof-file")?.click()}
                      className="btn-saas-outline px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{proofFileName ? "Change File" : "Upload Official Document (.pdf, .png, .jpg)"}</span>
                    </button>
                  </div>
                  {proofFileName && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs pt-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Attached: {proofFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section Advisor Confirmation */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">
                    Routing to Assigned Class Advisor: {sectionAdvisorName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Your application will first be reviewed by {sectionAdvisorName}. Upon approval, it forwards to HOD for final attendance sanction.
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="btn-saas-secondary text-xs px-4 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="btn-saas-primary text-xs px-5 font-bold"
                >
                  {submitting ? "Submitting..." : "Submit for Class Advisor Approval"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PROOF DOCUMENT PREVIEW ─── */}
      {selectedProofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedProofPreview.title}</h4>
              </div>
              <button
                onClick={() => setSelectedProofPreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
              <FileText className="h-12 w-12 text-blue-500 mx-auto" />
              <div>
                <p className="font-bold text-xs text-slate-800 dark:text-white">
                  {selectedProofPreview.fileName || "Official_Documentation_Certificate.pdf"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authenticated institutional proof on record
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Documentation</span>
              </span>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setSelectedProofPreview(null)}
                className="btn-saas-secondary text-xs px-4 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
