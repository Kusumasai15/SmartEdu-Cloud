"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ExternalLink,
  X,
  Check,
  Building,
  GraduationCap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useAcademicData, StudentLeaveRequest } from "@/context/AcademicDataContext";
import { getUserAvatarUrl } from "@/lib/avatar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function FacultyStudentLeaveApprovals() {
  const { user } = useAuth();
  const {
    studentLeaves,
    reviewStudentLeaveByAdvisor,
    reviewStudentLeaveByHod,
    departments,
    courses,
    users: syncUsers,
  } = useAcademicData();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [advisorNotesMap, setAdvisorNotesMap] = useState<Record<string, string>>({});
  const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);
  const [selectedProofPreview, setSelectedProofPreview] = useState<{ title: string; url?: string; fileName?: string } | null>(null);
  const [actionNotification, setActionNotification] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const facultyName = user ? (`${user.first_name || ""} ${user.last_name || ""}`.trim() || (user as any).username || "Class Advisor") : "Class Advisor";
  const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim().toLowerCase();
  const userFirstName = (user?.first_name || "").trim().toLowerCase();
  const userEmail = (user?.email || "").toLowerCase().trim();
  const userRoleStr = (
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || "FACULTY"
  ).toUpperCase();
  const isHodOrAdmin = userRoleStr === "HOD" || userRoleStr === "ADMIN";

  const myFacultyCourseCodes = useMemo(() => {
    return new Set(
      (courses || [])
        .map((c) => ((c as any).course_code || c.code || "").toLowerCase().trim())
        .filter(Boolean)
    );
  }, [courses]);

  // Cohorts where this faculty member is the designated Class Advisor
  const myAdvisedCohorts = useMemo(() => {
    const cohorts = new Set<string>();
    (departments || []).forEach((dept) => {
      dept.cohorts?.forEach((cohort) => {
        const advEmail = (cohort.classAdvisorEmail || "").toLowerCase().trim();
        const advName = (cohort.classAdvisor || "").toLowerCase().trim();
        const matchesAdvisor =
          (advEmail && advEmail === userEmail) ||
          (advName && advName !== "not assigned" && (
            advName === userFullName ||
            advName.includes(userFullName) ||
            userFullName.includes(advName) ||
            (userFirstName.length >= 3 && advName.includes(userFirstName))
          ));
        if (matchesAdvisor) {
          if (cohort.name) cohorts.add(cohort.name.toLowerCase().trim());
          if (cohort.id) cohorts.add(cohort.id.toLowerCase().trim());
          if (cohort.section) cohorts.add(cohort.section.toLowerCase().trim());
        }
      });
    });
    return cohorts;
  }, [departments, userEmail, userFullName, userFirstName]);

  const cohortNameByKey = useMemo(() => {
    const names = new Map<string, string>();
    (departments || []).forEach((department) => {
      department.cohorts?.forEach((cohort) => {
        const displayName = cohort.name?.trim();
        if (!displayName) return;
        [cohort.id, cohort.name, cohort.section].filter(Boolean).forEach((key) => {
          names.set(String(key).trim().toLowerCase(), displayName);
        });
      });
    });
    return names;
  }, [departments]);

  const advisedCohortLabels = useMemo(
    () => Array.from(new Set(Array.from(myAdvisedCohorts).map((key) => cohortNameByKey.get(key)).filter(Boolean))),
    [myAdvisedCohorts, cohortNameByKey]
  );

  const resolveClassName = useCallback((leave: StudentLeaveRequest) => {
    const raw = leave.className?.trim();
    if (raw && raw !== "Class not assigned") {
      const mapped = cohortNameByKey.get(raw.toLowerCase());
      if (mapped) return mapped;
      return raw;
    }
    // Lookup student in syncUsers by ID, roll number, email, or name
    const studentUser = (syncUsers || []).find(
      (u) =>
        (leave.studentId && u.id === leave.studentId) ||
        (leave.studentRollNo && (u.student_identifier === leave.studentRollNo || (u as any).rollNumber === leave.studentRollNo)) ||
        (leave.studentEmail && u.email?.toLowerCase() === leave.studentEmail?.toLowerCase()) ||
        (leave.studentName && `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase() === leave.studentName?.toLowerCase().trim())
    );
    if (studentUser) {
      const cls = studentUser.className || (studentUser as any).class_name || studentUser.department || (studentUser as any).cohort;
      if (cls && cls.trim() && cls.trim() !== "Class not assigned") {
        const mapped = cohortNameByKey.get(cls.trim().toLowerCase());
        return mapped || cls.trim();
      }
    }
    // Fallback to primary department cohort
    return departments?.[0]?.cohorts?.[0]?.name || "CSE - Section A (2023-27)";
  }, [cohortNameByKey, syncUsers, departments]);

  // Leaves assigned to this Class Advisor (or all if HOD/Admin)
  const myScopedLeaves = useMemo(() => {
    return (studentLeaves || []).filter((l) => {
      if (isHodOrAdmin) return true;

      // 1. Explicit advisor email match
      if (l.advisorEmail && l.advisorEmail.toLowerCase().trim() === userEmail) {
        return true;
      }

      // 2. Explicit advisor name match
      if (l.advisorName) {
        const advName = l.advisorName.toLowerCase().trim();
        if (
          advName &&
          advName !== "class advisor" &&
          (advName === userFullName ||
            advName.includes(userFullName) ||
            userFullName.includes(advName) ||
            (userFirstName.length >= 3 && advName.includes(userFirstName)))
        ) {
          return true;
        }
      }

      // 3. Cohort / Class name match (Class Advisor for this student's section)
      const resolvedClass = resolveClassName(l).toLowerCase().trim();
      if (myAdvisedCohorts.has(resolvedClass)) return true;
      for (const advised of Array.from(myAdvisedCohorts)) {
        if (resolvedClass.includes(advised) || advised.includes(resolvedClass)) return true;
      }

      // Note: General course instructors do NOT approve leaves for classes they do not advise.
      // Approval authority is strictly restricted to designated Class Advisor and HOD.
      return false;
    });
  }, [studentLeaves, isHodOrAdmin, userEmail, userFullName, userFirstName, myAdvisedCohorts, resolveClassName]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return myScopedLeaves.filter((l) => {
      // Status filter
      if (statusFilter === "PENDING") {
        if (l.status !== "PENDING_ADVISOR" && l.status !== "PENDING_HOD") return false;
      } else if (statusFilter !== "ALL" && l.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (l.studentName || "").toLowerCase().includes(q);
        const matchesRoll = (l.studentRollNo || "").toLowerCase().includes(q);
        const matchesClass = (l.className || "").toLowerCase().includes(q);
        const matchesReason = (l.reason || "").toLowerCase().includes(q);
        const matchesType = (l.leaveType || "").toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesClass && !matchesReason && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [myScopedLeaves, statusFilter, searchQuery]);

  const pendingAdvisorCount = useMemo(() => {
    return myScopedLeaves.filter((l) => l.status === "PENDING_ADVISOR").length;
  }, [myScopedLeaves]);

  const pendingHodCount = useMemo(() => {
    return myScopedLeaves.filter((l) => l.status === "PENDING_HOD").length;
  }, [myScopedLeaves]);

  const approvedCount = useMemo(() => {
    return myScopedLeaves.filter((l) => l.status === "APPROVED").length;
  }, [myScopedLeaves]);

  const calculateDays = (start?: string, end?: string) => {
    if (!start) return 1;
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : s;
    if (isNaN(s) || isNaN(e)) return 1;
    const diff = Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24))) + 1;
    return diff || 1;
  };

  const handleAdvisorReview = async (leaveId: string, action: "APPROVE" | "REJECT", directApprove = false) => {
    setProcessingId(leaveId);
    const notes =
      advisorNotesMap[leaveId] ||
      (action === "APPROVE"
        ? (directApprove ? "Leave application verified & approved by Class Advisor. Attendance authorized." : "Class Advisor verified valid student documentation. Forwarded with recommendation to HOD.")
        : "Documentation insufficient or conflicts with scheduled laboratory/exam session.");

    try {
      if (directApprove && action === "APPROVE") {
        reviewStudentLeaveByHod(leaveId, "APPROVE", notes, facultyName);
        setActionNotification(`Leave application #${leaveId.slice(-6)} directly approved & attendance credited!`);
      } else {
        reviewStudentLeaveByAdvisor(leaveId, action, notes, facultyName);
        setActionNotification(
          action === "APPROVE"
            ? `Application approved and forwarded to Head of Department for sanction.`
            : `Application rejected by Class Advisor.`
        );
      }
      setTimeout(() => setActionNotification(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in">
      {/* Toast Notification */}
      {actionNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionNotification}</span>
          </div>
          <button onClick={() => setActionNotification(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Metric Strip */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Student Leave Approvals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and sanction leave and On-Duty requests in an organized list.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-900">
              {isHodOrAdmin ? `Role: ${facultyName} (${userRoleStr})` : `Class Advisor: ${facultyName}`}
              {!isHodOrAdmin && advisedCohortLabels.length > 0 && ` • ${advisedCohortLabels.join(", ")}`}
            </span>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
          <div className="p-3">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Pending Advisor Review</span>
            </div>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{pendingAdvisorCount}</p>
          </div>

          <div className="p-3">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
              <Building className="h-3.5 w-3.5 text-blue-500" />
              <span>Pending HOD Sanction</span>
            </div>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{pendingHodCount}</p>
          </div>

          <div className="p-3">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Approved &amp; Credited</span>
            </div>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{approvedCount}</p>
          </div>

          <div className="p-3">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
              <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
              <span>Total Applications</span>
            </div>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{myScopedLeaves.length}</p>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll no, section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {st === "PENDING" ? `Pending (${pendingAdvisorCount + pendingHodCount})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Sleek List / Table View */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Leave Applications Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter === "PENDING"
              ? "All student leave and On-Duty requests have been reviewed!"
              : "No requests match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Header Bar */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">Student &amp; Class</div>
            <div className="col-span-2">Type &amp; Duration</div>
            <div className="col-span-3">Reason &amp; Affected Courses</div>
            <div className="col-span-2">Status &amp; Verification</div>
            <div className="col-span-2 text-right">Quick Actions</div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLeaves.map((leave) => {
              const isPendingAdvisor = leave.status === "PENDING_ADVISOR";
              const isPendingHod = leave.status === "PENDING_HOD";
              const isApproved = leave.status === "APPROVED";
              const isRejected = leave.status === "REJECTED";
              const isExpanded = expandedLeaveId === leave.id;
              const durationDays = calculateDays(leave.startDate, leave.endDate);

              return (
                <div
                  key={leave.id}
                  className={`transition-colors ${
                    isExpanded ? "bg-slate-50/90 dark:bg-slate-800/40" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                    {/* 1. Student Info (3 Cols) */}
                    <div className="lg:col-span-3 flex items-center gap-2.5">
                      <img
                        src={getUserAvatarUrl({ name: leave.studentName, rollNumber: leave.studentRollNo })}
                        alt={leave.studentName}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {leave.studentName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{leave.studentRollNo || "Roll N/A"}</span>
                          <span>•</span>
                          <span className="truncate max-w-[140px] font-medium text-slate-700 dark:text-slate-300">
                            {resolveClassName(leave)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Type & Duration (2 Cols) */}
                    <div className="lg:col-span-2 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {leave.leaveType || "Standard"}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {durationDays} {durationDays === 1 ? "Day" : "Days"}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{leave.startDate} → {leave.endDate}</span>
                      </p>
                    </div>

                    {/* 3. Reason & Affected Courses (3 Cols) */}
                    <div className="lg:col-span-3 space-y-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1 font-medium" title={leave.reason}>
                        {leave.reason || "No explicit reason provided."}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {leave.affectedCourseCodes && leave.affectedCourseCodes.length > 0 ? (
                          leave.affectedCourseCodes.map((code: string) => (
                            <span
                              key={code}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                            >
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No courses tagged</span>
                        )}
                        {leave.proofFileName || leave.proofUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedProofPreview({
                                title: `${leave.studentName} - Leave Proof`,
                                fileName: leave.proofFileName,
                                url: leave.proofUrl,
                              })
                            }
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span>Proof</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* 4. Status Badge (2 Cols) */}
                    <div className="lg:col-span-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          isApproved
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            : isRejected
                            ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                            : isPendingHod
                            ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                            : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Approved &amp; Credited</span>
                          </>
                        ) : isRejected ? (
                          <>
                            <X className="h-3 w-3 text-rose-600" />
                            <span>Rejected</span>
                          </>
                        ) : isPendingHod ? (
                          <>
                            <Building className="h-3 w-3 text-blue-600" />
                            <span>Pending HOD</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Awaiting Advisor</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* 5. Actions (2 Cols) */}
                    <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                      {isPendingAdvisor || isPendingHod ? (
                        <>
                          {isPendingAdvisor && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={processingId === leave.id}
                              onClick={() => handleAdvisorReview(leave.id, "APPROVE", false)}
                              className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                              title="Verify & recommend to HOD"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Verify
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={processingId === leave.id}
                            onClick={() => handleAdvisorReview(leave.id, "APPROVE", true)}
                            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                            title="Direct sanction and credit attendance"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sanction
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={processingId === leave.id}
                            onClick={() => handleAdvisorReview(leave.id, "REJECT")}
                            className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-[11px] cursor-pointer"
                            title="Reject request"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <button
                            type="button"
                            onClick={() => setExpandedLeaveId(isExpanded ? null : leave.id)}
                            className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            title="Add note / view details"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedLeaveId(isExpanded ? null : leave.id)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Details</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Review Details Drawer */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <div>
                          <strong>Full Statement:</strong> {leave.reason || "No detailed statement."}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Applied: {leave.appliedAt ? new Date(leave.appliedAt).toLocaleString() : "Recently"}
                        </div>
                      </div>

                      {leave.advisorNotes && (
                        <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Advisor Note ({leave.advisorName || "Advisor"}):</span>{" "}
                          <span className="text-slate-600 dark:text-slate-300">{leave.advisorNotes}</span>
                        </div>
                      )}

                      {leave.hodNotes && (
                        <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-slate-800 dark:text-slate-200">HOD Sanction Note:</span>{" "}
                          <span className="text-slate-600 dark:text-slate-300">{leave.hodNotes}</span>
                        </div>
                      )}

                      {(isPendingAdvisor || isPendingHod) && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add verification note or specific instructions before sanctioning..."
                            value={advisorNotesMap[leave.id] || ""}
                            onChange={(e) =>
                              setAdvisorNotesMap({ ...advisorNotesMap, [leave.id]: e.target.value })
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {selectedProofPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">{selectedProofPreview.title}</h3>
              </div>
              <button onClick={() => setSelectedProofPreview(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center space-y-3">
              <FileText className="h-10 w-10 text-blue-500 mx-auto" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedProofPreview.fileName || "Uploaded_Document.pdf"}
              </p>
              <p className="text-[11px] text-slate-500">
                Official medical certificate / event OD invitation document submitted by student.
              </p>
              {selectedProofPreview.url && (
                <a
                  href={selectedProofPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Attached Document</span>
                </a>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProofPreview(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
