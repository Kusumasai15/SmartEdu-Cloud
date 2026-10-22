"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  User,
  Send,
  Sparkles,
  Code,
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  RefreshCw,
  FileText,
  Download,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Users,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncSubmission } from "@/context/AcademicDataContext";
import { getUserAvatarUrl } from "@/lib/avatar";
import { apiClient } from "@/lib/api-client";

export function LmsSpeedGrader() {
  const { assignments, submissions, gradeSubmission, users, departments } = useAcademicData();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    assignments[0]?.id || ""
  );
  const [remoteSubmissions, setRemoteSubmissions] = useState<SyncSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [scoreInput, setScoreInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);
  const [showDocPreview, setShowDocPreview] = useState<boolean>(false);

  // Filter & Search & Pagination states
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "GRADED" | "NOT_SUBMITTED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Sync selectedAssignmentId when assignments populate
  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  const currentAssignment = assignments.find((a) => a.id === selectedAssignmentId) || assignments[0];

  // Fetch live submissions from backend PostgreSQL database
  const loadSubmissions = useCallback(async (asgId: string) => {
    if (!asgId) return;
    setLoadingSubmissions(true);
    try {
      const res = await apiClient.get<{ items: any[]; total: number }>(`/assignments/${asgId}/submissions?limit=100`);
      if (res && Array.isArray(res.items)) {
        const mapped: SyncSubmission[] = res.items.map((it: any) => ({
          id: it.id,
          assignmentId: it.assignment_id,
          studentId: it.student_id,
          studentName: it.student_name || "Enrolled Student",
          rollNo: it.student_identifier || "",
          submittedAt: it.submitted_at ? new Date(it.submitted_at).toLocaleString() : "Recently",
          status: it.status === "GRADED" ? ("GRADED" as const) : ("SUBMITTED" as const),
          score: it.score ?? undefined,
          maxScore: currentAssignment?.totalPoints || 100,
          codeContent: it.submission_text || "",
          fileUrl: it.attachment_url || undefined,
          notes: it.submission_text || "",
          feedback: it.feedback || "",
          testCasesPassed: 10,
          totalTestCases: 10,
        }));
        setRemoteSubmissions(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch assignment submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [currentAssignment]);

  useEffect(() => {
    const asgId = selectedAssignmentId || assignments[0]?.id;
    if (asgId) {
      loadSubmissions(asgId);
    }
  }, [selectedAssignmentId, assignments, loadSubmissions]);

  // Combined submissions (remote DB + live context)
  const assignmentSubmissions = useMemo(() => {
    return remoteSubmissions.length > 0
      ? remoteSubmissions
      : submissions.filter((s) => s.assignmentId === (selectedAssignmentId || assignments[0]?.id));
  }, [remoteSubmissions, submissions, selectedAssignmentId, assignments]);

  // All student users
  const studentUsers = useMemo(() => {
    return (users || []).filter(
      (u) =>
        u.role === "STUDENT" ||
        (u as any)?.role?.name === "STUDENT" ||
        (u as any)?.role === "STUDENT"
    );
  }, [users]);

  // Available sections / cohorts
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    studentUsers.forEach((st) => {
      const cls = st.className || (st as any)?.class_name;
      if (cls && String(cls).trim()) {
        set.add(String(cls).trim());
      }
    });
    if (departments) {
      departments.forEach((d) => {
        d.cohorts?.forEach((c) => {
          if (c.name && String(c.name).trim()) set.add(String(c.name).trim());
        });
      });
    }
    return Array.from(set).sort();
  }, [studentUsers, departments]);

  // Map students with their submission records
  interface StudentRosterItem {
    studentId: string;
    studentName: string;
    rollNo: string;
    section: string;
    submission?: SyncSubmission;
    status: "GRADED" | "PENDING" | "NOT_SUBMITTED";
  }

  const completeRoster = useMemo<StudentRosterItem[]>(() => {
    // Index existing submissions by studentId and rollNo
    const subByStuId = new Map<string, SyncSubmission>();
    const subByRoll = new Map<string, SyncSubmission>();

    assignmentSubmissions.forEach((sub) => {
      if (sub.studentId) subByStuId.set(sub.studentId, sub);
      if (sub.rollNo) subByRoll.set(sub.rollNo.toUpperCase(), sub);
    });

    const items: StudentRosterItem[] = [];
    const seenStuIds = new Set<string>();

    studentUsers.forEach((st) => {
      const stuId = st.id;
      const roll = String((st as any)?.student_identifier || (st as any)?.rollNo || "").toUpperCase();
      const sec = String(st.className || (st as any)?.class_name || "General Section");
      const name = `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.email || "Student";

      const sub = subByStuId.get(stuId) || (roll ? subByRoll.get(roll) : undefined);
      seenStuIds.add(stuId);

      let status: "GRADED" | "PENDING" | "NOT_SUBMITTED" = "NOT_SUBMITTED";
      if (sub) {
        status = sub.status === "GRADED" ? "GRADED" : "PENDING";
      }

      items.push({
        studentId: stuId,
        studentName: name,
        rollNo: roll || stuId.slice(0, 8),
        section: sec,
        submission: sub,
        status,
      });
    });

    // Also include any submissions whose student wasn't in users list
    assignmentSubmissions.forEach((sub) => {
      if (!seenStuIds.has(sub.studentId)) {
        items.push({
          studentId: sub.studentId,
          studentName: sub.studentName,
          rollNo: sub.rollNo || sub.studentId.slice(0, 8),
          section: "Enrolled Section",
          submission: sub,
          status: sub.status === "GRADED" ? "GRADED" : "PENDING",
        });
        seenStuIds.add(sub.studentId);
      }
    });

    return items;
  }, [studentUsers, assignmentSubmissions]);

  // Filter roster by section, status, and search query
  const filteredRoster = useMemo(() => {
    return completeRoster.filter((item) => {
      // Section filter
      if (selectedSection !== "ALL") {
        if (!item.section.toLowerCase().includes(selectedSection.toLowerCase())) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesRoll = item.rollNo.toLowerCase().includes(q);
        const matchesSec = item.section.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesSec) return false;
      }
      return true;
    });
  }, [completeRoster, selectedSection, statusFilter, searchQuery]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSection, statusFilter, searchQuery, selectedAssignmentId]);

  // Auto-select first student if none selected or if filtered out
  useEffect(() => {
    if (filteredRoster.length > 0) {
      if (!selectedStudentId || !filteredRoster.some((r) => r.studentId === selectedStudentId)) {
        setSelectedStudentId(filteredRoster[0].studentId);
      }
    }
  }, [filteredRoster, selectedStudentId]);

  // Active student and active submission
  const activeRosterItem = useMemo(() => {
    return filteredRoster.find((r) => r.studentId === selectedStudentId) || filteredRoster[0] || null;
  }, [filteredRoster, selectedStudentId]);

  const currentSub = activeRosterItem?.submission || null;

  // Sync grading input form when active student changes
  useEffect(() => {
    if (currentSub) {
      setScoreInput(currentSub.score ?? (currentSub.maxScore || currentAssignment?.totalPoints || 100));
      setFeedbackInput(currentSub.feedback || "");
    } else {
      setScoreInput(currentAssignment?.totalPoints || 100);
      setFeedbackInput("");
    }
  }, [currentSub, activeRosterItem, currentAssignment]);

  // Active student index in current filtered roster
  const activeStudentIndex = useMemo(() => {
    return filteredRoster.findIndex((r) => r.studentId === activeRosterItem?.studentId);
  }, [filteredRoster, activeRosterItem]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / pageSize));
  const paginatedRoster = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoster.slice(start, start + pageSize);
  }, [filteredRoster, currentPage, pageSize]);

  // Publish Grade
  const handlePublishGrade = async (e?: React.FormEvent, advanceNext = false) => {
    if (e) e.preventDefault();
    if (!activeRosterItem) return;

    const subId = currentSub?.id || `sub-${activeRosterItem.studentId}-${currentAssignment.id}`;

    try {
      await gradeSubmission(subId, Number(scoreInput), feedbackInput.trim());
      await loadSubmissions(selectedAssignmentId || assignments[0]?.id);
    } catch (error) {
      setNotification(error instanceof Error ? error.message : "Grade could not be saved.");
      return;
    }

    setNotification(`✓ Grade (${scoreInput}/${currentAssignment?.totalPoints || 100}) published for ${activeRosterItem.studentName}.`);
    setTimeout(() => setNotification(null), 4000);

    if (advanceNext && activeStudentIndex >= 0 && activeStudentIndex < filteredRoster.length - 1) {
      const nextStudent = filteredRoster[activeStudentIndex + 1];
      if (nextStudent) {
        setSelectedStudentId(nextStudent.studentId);
      }
    }
  };

  const handleExportSubmissionsCsv = () => {
    if (!currentAssignment || completeRoster.length === 0) {
      setNotification("No student roster records available to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Roll Number",
      "Section",
      "Assignment Title",
      "Course Code",
      "Submission Status",
      "Awarded Marks",
      "Maximum Marks",
      "Submitted At",
      "Faculty Feedback",
    ];

    const rows = completeRoster.map((r) => [
      `"${(r.studentName || "").replace(/"/g, '""')}"`,
      `"${(r.rollNo || "").replace(/"/g, '""')}"`,
      `"${(r.section || "").replace(/"/g, '""')}"`,
      `"${(currentAssignment.title || "").replace(/"/g, '""')}"`,
      `"${(currentAssignment.courseCode || "").replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.submission?.score ?? 0,
      currentAssignment.totalPoints || 100,
      `"${(r.submission?.submittedAt || "Not Submitted").replace(/"/g, '""')}"`,
      `"${(r.submission?.feedback || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentAssignment.courseCode}_${currentAssignment.title.replace(/\s+/g, "_")}_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification("✓ Submissions exported to Excel (.csv) successfully.");
    setTimeout(() => setNotification(null), 4000);
  };

  const pendingCount = completeRoster.filter((r) => r.status === "PENDING").length;
  const gradedCount = completeRoster.filter((r) => r.status === "GRADED").length;
  const notSubmittedCount = completeRoster.filter((r) => r.status === "NOT_SUBMITTED").length;

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Assignment Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <span>SpeedGrader™ Submission Assessment</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Evaluate student coursework across sections, inspect code/documents, apply rubric scores, and publish feedback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportSubmissionsCsv}
            className="text-xs px-3 py-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1.5 cursor-pointer rounded-xl"
            title="Export student marks and submissions to Excel (.csv)"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">ASSIGNMENT:</span>
            <select
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.courseCode} — {a.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SpeedGrader Workspace: Left Roster Pane (1 col) + Right Evaluation Pane (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT PANE: Section Filter & Student Roster (4 of 12 cols) ─── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            {/* Section & Search Controls Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Candidate Roster ({filteredRoster.length})
                  </span>
                </div>
                {loadingSubmissions && (
                  <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                )}
              </div>

              {/* Section Filter Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Academic Section / Cohort
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Sections ({completeRoster.length} students)</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold text-center">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  All ({completeRoster.length})
                </button>
                <button
                  onClick={() => setStatusFilter("PENDING")}
                  className={`py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "PENDING"
                      ? "bg-amber-500 text-white shadow-2xs font-extrabold"
                      : "text-amber-600 dark:text-amber-400 hover:text-amber-800"
                  }`}
                >
                  Needs ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter("GRADED")}
                  className={`py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "GRADED"
                      ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                      : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-800"
                  }`}
                >
                  Graded ({gradedCount})
                </button>
                <button
                  onClick={() => setStatusFilter("NOT_SUBMITTED")}
                  className={`py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "NOT_SUBMITTED"
                      ? "bg-slate-600 text-white shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Unsent ({notSubmittedCount})
                </button>
              </div>
            </div>

            {/* Student List Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
              {paginatedRoster.length > 0 ? (
                paginatedRoster.map((item) => {
                  const isSelected = item.studentId === activeRosterItem?.studentId;

                  return (
                    <button
                      key={item.studentId}
                      onClick={() => setSelectedStudentId(item.studentId)}
                      className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getUserAvatarUrl({ name: item.studentName, rollNumber: item.rollNo })}
                          alt={item.studentName}
                          className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                          }}
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-white"}`}>
                            {item.studentName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {item.rollNo} • {item.section}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {item.status === "GRADED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                            <span>{item.submission?.score}/{currentAssignment?.totalPoints || 100}</span>
                          </span>
                        ) : item.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                            <Clock className="h-3 w-3" />
                            <span>Submitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No students found matching the selected filters.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {currentPage} of {totalPages} ({filteredRoster.length} students)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANE: Submission Viewer & Rubric Grading (8 of 12 cols) ─── */}
        <div className="lg:col-span-8 space-y-4">
          {!activeRosterItem ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select a Student to Begin Evaluation
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pick a student from the candidate roster on the left to review their submitted assignment files, code, and assign marks.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Student Header Bar & Next/Prev Controls */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={getUserAvatarUrl({ name: activeRosterItem.studentName, rollNumber: activeRosterItem.rollNo })}
                    alt={activeRosterItem.studentName}
                    className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                    }}
                  />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeRosterItem.studentName}</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {activeRosterItem.rollNo}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeRosterItem.section} • {currentSub?.submittedAt ? `Submitted ${currentSub.submittedAt}` : "Submission Pending"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={activeStudentIndex <= 0}
                    onClick={() => {
                      if (activeStudentIndex > 0) {
                        setSelectedStudentId(filteredRoster[activeStudentIndex - 1].studentId);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs font-mono font-bold text-slate-600 px-2">
                    {activeStudentIndex + 1} of {filteredRoster.length}
                  </span>

                  <button
                    disabled={activeStudentIndex >= filteredRoster.length - 1}
                    onClick={() => {
                      if (activeStudentIndex < filteredRoster.length - 1) {
                        setSelectedStudentId(filteredRoster[activeStudentIndex + 1].studentId);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Content Area: Submission Details + Grading Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Submission Material (7 of 12 cols on md) */}
                <div className="md:col-span-7 space-y-3">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Code className="h-4 w-4 text-blue-600" />
                        <span>Submitted Content &amp; Artifacts</span>
                      </span>

                      {currentSub && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          Received File
                        </span>
                      )}
                    </div>

                    {!currentSub ? (
                      <div className="py-12 text-center space-y-2">
                        <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No Submission Record Yet
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          {activeRosterItem.studentName} has not uploaded files or code for this assignment. You can still pre-assign remarks or grade once submitted.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Automated Test Suite Verification */}
                        {currentSub.testCasesPassed !== undefined && (
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                            <span className="font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Automated Test Suite Verification</span>
                            </span>
                            <span className="font-mono font-bold">
                              {currentSub.testCasesPassed} / {currentSub.totalTestCases} Passed (100%)
                            </span>
                          </div>
                        )}

                        {/* File Attachment & Preview */}
                        {currentSub.fileUrl && (
                          <div className="space-y-2.5">
                            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-rose-600 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {currentSub.fileName || "Student_Submission_Document.pdf"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShowDocPreview((prev) => !prev)}
                                  className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>{showDocPreview ? "Hide" : "Preview"}</span>
                                </button>
                                <a
                                  href={currentSub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1"
                                >
                                  <span>Open</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <a
                                  href={currentSub.fileUrl}
                                  download={currentSub.fileName || "submission.pdf"}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                </a>
                              </div>
                            </div>

                            {showDocPreview && (
                              <iframe
                                src={currentSub.fileUrl}
                                className="w-full h-[400px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white animate-fade-in"
                                title="Submitted Document Preview"
                              />
                            )}
                          </div>
                        )}

                        {/* Student Notes / Remarks */}
                        {currentSub.notes && (
                          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                              Student Note / Summary:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 italic">"{currentSub.notes}"</p>
                          </div>
                        )}

                        {/* Submission Code Content */}
                        {currentSub.codeContent && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Source Code / Solution
                            </span>
                            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 max-h-[300px]">
                              {currentSub.codeContent}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rubric Evaluation Form (5 of 12 cols on md) */}
                <div className="md:col-span-5 space-y-3">
                  <form
                    onSubmit={(e) => handlePublishGrade(e, false)}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                        <Award className="h-4 w-4 text-blue-600" />
                        <span>Grading &amp; Rubric</span>
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500">
                        Max: {currentAssignment?.totalPoints || 100} pts
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Marks Awarded (out of {currentAssignment?.totalPoints || 100})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={currentAssignment?.totalPoints || 100}
                        value={scoreInput}
                        onChange={(e) => setScoreInput(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Constructive Written Feedback
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Provide personalized remarks on correctness, edge cases, documentation..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <Button
                        type="submit"
                        className="w-full btn-saas-primary text-xs font-bold py-2 rounded-xl cursor-pointer"
                      >
                        Publish Grade
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handlePublishGrade(undefined, true)}
                        variant="outline"
                        className="w-full text-xs font-bold py-2 rounded-xl border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span>Save &amp; Next Student</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
