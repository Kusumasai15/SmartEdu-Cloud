"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Award,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ExternalLink,
  Download,
  X,
  Check,
  Zap,
  Building,
} from "lucide-react";
import { useAcademicData, StudentLeaveRequest } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function HodStudentLeaveApprovals() {
  const { user } = useAuth();
  const {
    studentLeaves,
    reviewStudentLeaveByHod,
    attendanceSessions,
  } = useAcademicData();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "PENDING_HOD" | "PENDING_ADVISOR" | "APPROVED" | "REJECTED" | "ALL">("PENDING_HOD");
  const [hodNotesMap, setHodNotesMap] = useState<Record<string, string>>({});
  const [selectedProofPreview, setSelectedProofPreview] = useState<{ title: string; url?: string; fileName?: string } | null>(null);
  const [actionNotification, setActionNotification] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const hodName = user ? (`${user.first_name || ""} ${user.last_name || ""}`.trim() || (user as any).username || "Head of Department") : "Head of Department";

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return (studentLeaves || []).filter((l) => {
      // Status filter
      if (statusFilter === "PENDING_HOD") {
        if (l.status !== "PENDING_HOD") return false;
      } else if (statusFilter === "PENDING_ADVISOR") {
        if (l.status !== "PENDING_ADVISOR") return false;
      } else if (statusFilter === "PENDING") {
        if (l.status !== "PENDING_HOD" && l.status !== "PENDING_ADVISOR") {
          return false;
        }
      } else if (statusFilter !== "ALL" && l.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (l.studentName || "").toLowerCase().includes(q);
        const matchesRoll = (l.studentRollNo || "").toLowerCase().includes(q);
        const matchesSection = (l.className || "").toLowerCase().includes(q);
        const matchesReason = (l.reason || "").toLowerCase().includes(q);
        const matchesType = (l.leaveType || "").toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesSection && !matchesReason && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [studentLeaves, statusFilter, searchQuery]);

  const pendingCount = useMemo(() => {
    return (studentLeaves || []).filter((l) => l.status === "PENDING_HOD" || l.status === "PENDING_ADVISOR").length;
  }, [studentLeaves]);

  const pendingHodCount = useMemo(() => {
    return (studentLeaves || []).filter((l) => l.status === "PENDING_HOD").length;
  }, [studentLeaves]);

  const pendingAdvisorCount = useMemo(() => {
    return (studentLeaves || []).filter((l) => l.status === "PENDING_ADVISOR").length;
  }, [studentLeaves]);

  const approvedCount = useMemo(() => {
    return (studentLeaves || []).filter((l) => l.status === "APPROVED").length;
  }, [studentLeaves]);

  const advisorReviewRate = useMemo(() => {
    const total = (studentLeaves || []).length;
    if (total === 0) return "—";
    const screened = (studentLeaves || []).filter((l) => l.advisorReviewedAt || l.status !== "PENDING_ADVISOR").length;
    return `${Math.round((screened / total) * 100)}%`;
  }, [studentLeaves]);

  const totalCreditedSessions = useMemo(() => {
    return (studentLeaves || [])
      .filter((l) => l.status === "APPROVED" && l.attendanceCredited)
      .reduce((sum, l) => {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return sum + days * (l.affectedCourseCodes?.length || 2);
      }, 0);
  }, [studentLeaves]);

  const handleHodReview = async (leaveId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(leaveId);
    const notes =
      hodNotesMap[leaveId] ||
      (action === "APPROVE"
        ? "Official On-Duty & Leave Sanctioned by Head of Department. 100% attendance credit authorized and credited."
        : "Documentation insufficient or conflicts with institutional exam schedule.");

    try {
      reviewStudentLeaveByHod(leaveId, action, notes, hodName);
      setActionNotification(
        action === "APPROVE"
          ? "✓ Official leave sanctioned & attendance records automatically credited across all subject sessions!"
          : "✕ Leave application rejected. Student and advisor notified."
      );
      setTimeout(() => setActionNotification(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#181C2B] border border-[#E8EAF1] dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
              Department Academic Governance
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Attendance &amp; Credit Sanction</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student On-Duty (OD) &amp; Leave Sanction Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Review student leaves and official event requests recommended by Class Advisors. Sanctioning an application immediately authorizes and updates attendance records in scheduled course sessions.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Pending HOD Sanction</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </span>
            <span className="text-xs font-medium text-slate-500">Applications</span>
          </div>
          <p className="text-[11px] text-slate-400">Awaiting your final departmental authorization</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Sanctioned Leaves</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
              {approvedCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Approved</span>
          </div>
          <p className="text-[11px] text-slate-400">Verified and approved by Department Head</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Auto-Credited Sessions</span>
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400">
              {totalCreditedSessions}
            </span>
            <span className="text-xs font-medium text-slate-500">Periods</span>
          </div>
          <p className="text-[11px] text-slate-400">Marked as Present / On-Duty in course registers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Advisor Review Rate</span>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
              {advisorReviewRate}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Screened</span>
          </div>
          <p className="text-[11px] text-slate-400">Pre-screened with Section Advisor recommendations</p>
        </div>
      </div>

      {actionNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionNotification}</span>
          </div>
          <button onClick={() => setActionNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              statusFilter === "PENDING"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>All Pending ({pendingCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING_HOD")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              statusFilter === "PENDING_HOD"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ready for Sanction ({pendingHodCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING_ADVISOR")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              statusFilter === "PENDING_ADVISOR"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Awaiting Advisor ({pendingAdvisorCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              statusFilter === "APPROVED"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Sanctioned &amp; Credited ({approvedCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "REJECTED"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <span>Rejected</span>
          </button>

          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <span>All Requests ({(studentLeaves || []).length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, roll no, or event..."
            className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white w-full sm:w-64"
          />
        </div>
      </div>

      {/* Applications Review Feed */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No Applications Requiring Review</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {statusFilter === "PENDING_HOD"
              ? "All Class Advisor recommended leave requests have been sanctioned. Good job!"
              : "No requests found matching your selected filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((leave) => {
            const daysCount = Math.max(
              1,
              Math.round(
                (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1
            );

            const typeBadge =
              leave.leaveType === "EVENT"
                ? { label: "Hackathon / Fest Leave", bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200" }
                : leave.leaveType === "MEDICAL"
                ? { label: "Medical Leave", bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200" }
                : { label: "University On-Duty (OD)", bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" };

            const isPendingAction = leave.status === "PENDING_HOD" || leave.status === "PENDING_ADVISOR";

            return (
              <div
                key={leave.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-3.5"
              >
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {leave.studentName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {leave.studentRollNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/50">
                        {leave.className}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeBadge.bg}`}>
                        {typeBadge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>Applied: {leave.appliedAt}</span>
                      <span>&bull;</span>
                      <span>Assigned Advisor: {leave.advisorName || "Class Advisor"}</span>
                      {leave.studentEmail && (
                        <>
                          <span>&bull;</span>
                          <span className="font-mono">{leave.studentEmail}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dates Banner */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Leave Duration</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 justify-end">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        <span>{leave.startDate} &rarr; {leave.endDate}</span>
                        <span className="text-blue-600 dark:text-blue-400">({daysCount} Days)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason & Affected Curriculum Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div className="md:col-span-2 space-y-1.5">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Student Reason &amp; Official Purpose
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {leave.reason}
                    </p>

                    {/* Advisor Endorsement Note */}
                    {leave.advisorNotes && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200 text-[11px]">
                          <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                          <span>Class Advisor Recommendation ({leave.advisorName || "Section Advisor"}):</span>
                        </div>
                        <p className="text-blue-950 dark:text-blue-300 text-xs italic">
                          &ldquo;{leave.advisorNotes}&rdquo;
                        </p>
                        {leave.advisorReviewedAt && (
                          <span className="text-[10px] text-blue-400 block">Verified on {leave.advisorReviewedAt}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">
                        Courses For Attendance Credit
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {leave.affectedCourseCodes && leave.affectedCourseCodes.length > 0 ? (
                          leave.affectedCourseCodes.map((c: string) => (
                            <span
                              key={c}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">All enrolled subjects</span>
                        )}
                      </div>
                    </div>

                    {leave.proofFileName && (
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">
                          Supporting Documentation
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProofPreview({
                              title: `${leave.studentName} - ${leave.proofFileName}`,
                              url: leave.proofUrl,
                              fileName: leave.proofFileName,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>{leave.proofFileName}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* HOD Action Console */}
                {isPendingAction ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {leave.status === "PENDING_ADVISOR" && (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                          ⏳ Awaiting Class Advisor Review • Direct Department Head Sanction Permitted
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                          Department Head Sanction Order &amp; Official Notes:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Approved. Official participation verified under university sports & hackathon guidelines. Attendance credit authorized."
                          value={hodNotesMap[leave.id] || ""}
                          onChange={(e) =>
                            setHodNotesMap((prev) => ({ ...prev, [leave.id]: e.target.value }))
                          }
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 pt-4 sm:pt-0 shrink-0">
                        <button
                          disabled={processingId === leave.id}
                          onClick={() => handleHodReview(leave.id, "REJECT")}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>

                        <button
                          disabled={processingId === leave.id}
                          onClick={() => handleHodReview(leave.id, "APPROVE")}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Zap className="h-4 w-4" />
                          <span>Sanction &amp; Credit Attendance</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 ${
                          leave.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {leave.status === "APPROVED" ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Sanctioned by HOD &bull; Attendance Automatically Credited</span>
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 text-rose-600" />
                            <span>Application Rejected</span>
                          </>
                        )}
                      </span>

                      {leave.hodNotes && (
                        <span className="text-slate-500 italic">
                          HOD Note: &ldquo;{leave.hodNotes}&rdquo;
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Sanctioned: {leave.hodReviewedAt || leave.appliedAt} by {leave.hodName || "HOD"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Proof Document Preview Modal */}
      {selectedProofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {selectedProofPreview.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedProofPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
              <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedProofPreview.fileName || "Official Proof Attachment"}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Official document uploaded by student. Verified by Section Advisor under University Academic Regulations.
              </p>
              {selectedProofPreview.url && (
                <a
                  href={selectedProofPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download / View Attachment</span>
                </a>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setSelectedProofPreview(null)}
                className="btn-saas-secondary text-xs px-4 font-bold cursor-pointer"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
