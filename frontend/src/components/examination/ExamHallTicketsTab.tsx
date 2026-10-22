"use client";

import React, { useState, useMemo } from "react";
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Printer,
  Search,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Lock,
  Unlock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { exportToExcel } from "@/lib/excel-utils";
import { getUserAvatarUrl } from "@/lib/avatar";
import {
  generateInstitutionalCandidatePool,
  ScalableStudentCandidate,
} from "@/lib/exam-scale-data";

interface Props {
  showToast: (msg: string) => void;
}

export function ExamHallTicketsTab({ showToast }: Props) {
  const {
    users,
    courses,
    isHallTicketsReleased,
    toggleHallTicketRelease,
  } = useAcademicData();

  const [complianceFilter, setComplianceFilter] = useState<"ALL" | "ELIGIBLE" | "CONDONATION" | "DETAINED" | "PENDING">("ALL");
  const [selectedSemester, setSelectedSemester] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewCandidate, setPreviewCandidate] = useState<ScalableStudentCandidate | null>(null);

  // Pagination keeps large registered cohorts responsive.
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Candidate records are derived only from registered student accounts.
  const candidateAudits = useMemo(() => {
    return generateInstitutionalCandidatePool(users);
  }, [users]);

  // Section options
  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    candidateAudits.forEach((c) => set.add(c.section));
    return Array.from(set).sort();
  }, [candidateAudits]);

  const eligibleCount = useMemo(() => candidateAudits.filter((c) => c.eligibilityStatus === "ELIGIBLE").length, [candidateAudits]);
  const condonationCount = useMemo(() => candidateAudits.filter((c) => c.eligibilityStatus === "CONDONATION").length, [candidateAudits]);
  const detainedCount = useMemo(() => candidateAudits.filter((c) => c.eligibilityStatus === "DETAINED").length, [candidateAudits]);
  const pendingCount = useMemo(() => candidateAudits.filter((c) => c.eligibilityStatus === "PENDING").length, [candidateAudits]);

  // Filtered
  const filteredCandidates = useMemo(() => {
    return candidateAudits.filter((c) => {
      if (complianceFilter !== "ALL" && c.eligibilityStatus !== complianceFilter) return false;
      if (selectedSemester !== "ALL" && c.semester !== selectedSemester) return false;
      if (selectedSection !== "ALL" && c.section !== selectedSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          c.name.toLowerCase().includes(q) ||
          c.rollNo.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [candidateAudits, complianceFilter, selectedSemester, selectedSection, searchQuery]);

  // Paginated Slicing
  const totalItems = filteredCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const pageItems = filteredCandidates.slice(startIndex, startIndex + pageSize);

  const handleToggleRelease = () => {
    if (!isHallTicketsReleased && (eligibleCount === 0 || pendingCount > 0)) {
      showToast("Hall tickets cannot be released until attendance eligibility is calculated for every candidate.");
      return;
    }
    toggleHallTicketRelease();
    if (!isHallTicketsReleased) {
      showToast(`Official hall tickets released to ${eligibleCount.toLocaleString()} eligible candidates.`);
    } else {
      showToast("Hall tickets access locked.");
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredCandidates.map((c) => ({
      "Roll Number": c.rollNo,
      "Student Name": c.name,
      "Academic Semester": c.semester,
      "Section / Class": c.section,
      "Attendance %": c.attendancePct === null ? "Not calculated" : `${c.attendancePct}%`,
      "Eligibility Status": c.eligibilityStatus,
      "Hall Ticket ID": c.hallTicketId,
      "Assigned Hall": c.assignedHall,
      "Desk Assigned": c.assignedDesk,
    }));
    exportToExcel(exportData, `Enterprise_Hall_Ticket_Audit_${selectedSemester}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ATTENDANCE ELIGIBILITY AUDIT
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {candidateAudits.length.toLocaleString()} Active Candidates Evaluated
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Pre-Exam Clearance &amp; Admit Card Dispatch
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review persisted attendance eligibility and saved hall assignments before releasing hall tickets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Clearance Audit</span>
          </button>

          <button
            onClick={handleToggleRelease}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isHallTicketsReleased
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isHallTicketsReleased ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            <span>
              {isHallTicketsReleased ? "Revoke Hall Tickets" : "Release Hall Tickets to Students"}
            </span>
          </button>
        </div>
      </div>

      {/* Compliance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => {
            setComplianceFilter(complianceFilter === "ELIGIBLE" ? "ALL" : "ELIGIBLE");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            complianceFilter === "ELIGIBLE"
              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Eligible to Sit (&ge; 75%)
            </span>
            <span className="font-mono text-xs font-bold text-emerald-600">Cleared</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {eligibleCount.toLocaleString()} Candidates
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Full hall ticket release authorized</p>
        </div>

        <div
          onClick={() => {
            setComplianceFilter(complianceFilter === "CONDONATION" ? "ALL" : "CONDONATION");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            complianceFilter === "CONDONATION"
              ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Condonation (65% &ndash; 74.9%)
            </span>
            <span className="font-mono text-xs font-bold text-amber-600">Medical / OD</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {condonationCount.toLocaleString()} Candidates
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Deanery condonation slip reviewed</p>
        </div>

        <div
          onClick={() => {
            setComplianceFilter(complianceFilter === "DETAINED" ? "ALL" : "DETAINED");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            complianceFilter === "DETAINED"
              ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600" />
              Detained (&lt; 65%)
            </span>
            <span className="font-mono text-xs font-bold text-rose-600">Barred</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {detainedCount.toLocaleString()} Candidates
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Severe attendance shortage</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Filter Semester:
          </label>
          <select
            value={selectedSemester}
            onChange={(e) => {
              setSelectedSemester(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
          >
            <option value="ALL">All Semesters (1, 3, 5, 7)</option>
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 3">Semester 3</option>
            <option value="Semester 5">Semester 5</option>
            <option value="Semester 7">Semester 7</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Filter section:
          </label>
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium truncate"
          >
            <option value="ALL">All Sections</option>
            {sectionOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Search Candidate:
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Roll or candidate name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Results Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>
          Showing <strong>{startIndex + 1}</strong> &ndash;{" "}
          <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> of{" "}
          <strong>{totalItems.toLocaleString()}</strong> candidates
        </span>
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {/* Paginated Audit Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Candidate &amp; Roll No</th>
                <th className="py-3.5 px-4">Semester &amp; Section</th>
                <th className="py-3.5 px-4">Attendance %</th>
                <th className="py-3.5 px-4">Clearance Status</th>
                <th className="py-3.5 px-4">Assigned Hall &amp; Desk</th>
                <th className="py-3.5 px-4 text-right">Hall Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageItems.length > 0 ? (
                pageItems.map((c) => {
                  const isEligible = c.eligibilityStatus === "ELIGIBLE";
                  const isCondonation = c.eligibilityStatus === "CONDONATION";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={c.photoUrl || getUserAvatarUrl({ name: c.name, email: c.email })}
                            alt={c.name}
                            className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block leading-tight">
                              {c.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 font-semibold">
                              {c.rollNo}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {c.section}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${
                            isEligible ? "text-emerald-600 dark:text-emerald-400" : isCondonation ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {c.attendancePct === null ? "Not calculated" : `${c.attendancePct}%`}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isEligible ? "bg-emerald-500" : isCondonation ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${c.attendancePct === null ? 0 : Math.min(100, c.attendancePct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isEligible
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                            : isCondonation
                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                            : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200"
                        }`}>
                          {isEligible ? "CLEARED" : isCondonation ? "CONDONATION" : "SHORTAGE DETAINED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.assignedHall || "Not assigned"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Desk: {c.assignedDesk || "Not assigned"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setPreviewCandidate(c)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Ticket</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No candidates found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="font-bold text-slate-700 dark:text-slate-300">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── MODAL: HALL TICKET PREVIEW ─── */}
      {previewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  OFFICIAL EXAMINATION ADMIT CARD
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  SEMESTER EXAMINATION HALL TICKET
                </h3>
                <p className="text-xs text-slate-400">Institutional Examination Registry &bull; Autumn 2026 Term</p>
              </div>
              <button
                onClick={() => setPreviewCandidate(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={previewCandidate.photoUrl || getUserAvatarUrl({ name: previewCandidate.name, email: previewCandidate.email })}
                alt={previewCandidate.name}
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-600 shadow-sm shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                }}
              />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs w-full">
                <div>
                  <span className="text-slate-400 block text-[11px]">Candidate Name:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{previewCandidate.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Roll Identifier:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{previewCandidate.rollNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Academic Cohort &amp; Section:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{previewCandidate.section}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Allocated Hall &amp; Desk:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {previewCandidate.assignedHall || "Hall not assigned"} &bull; Desk {previewCandidate.assignedDesk || "Not assigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* Registered Examination Papers Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Authorised Examination Schedule
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Subject Title</th>
                      <th className="py-2.5 px-3">Exam Date</th>
                      <th className="py-2.5 px-3">Session Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold">CS-01</td>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200">Python Programming</td>
                      <td className="py-2 px-3 font-mono">Nov 2, 2026</td>
                      <td className="py-2 px-3 font-mono text-[11px]">09:30 AM - 12:30 PM</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold">CS-02</td>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200">Compiler Design</td>
                      <td className="py-2 px-3 font-mono">Nov 5, 2026</td>
                      <td className="py-2 px-3 font-mono text-[11px]">09:30 AM - 12:30 PM</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold">CS-03</td>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200">Java Programming</td>
                      <td className="py-2 px-3 font-mono">Nov 8, 2026</td>
                      <td className="py-2 px-3 font-mono text-[11px]">02:00 PM - 05:00 PM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified by Office of the Controller of Examinations</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewCandidate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
