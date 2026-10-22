"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Users,
  Search,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { exportToExcel } from "@/lib/excel-utils";
import { generateInstitutionalCandidatePool } from "@/lib/exam-scale-data";

interface Props {
  showToast: (msg: string) => void;
}

export function ExamSeatingTab({ showToast: _showToast }: Props) {
  const { users, classrooms } = useAcademicData();
  const availableHalls = useMemo(() => classrooms.filter((room) => room.status === "AVAILABLE"), [classrooms]);

  // Filters
  const [selectedHall, setSelectedHall] = useState<string>("ALL");
  const [selectedSemester, setSelectedSemester] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination (Crucial for 1,000+ to 3,000+ candidates)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Scalable Candidates Pool
  const candidatePool = useMemo(() => {
    return generateInstitutionalCandidatePool(users);
  }, [users]);

  // Distinct sections for filter dropdown
  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    candidatePool.forEach((c) => set.add(c.section));
    return Array.from(set).sort();
  }, [candidatePool]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidatePool.filter((c) => {
      if (selectedHall !== "ALL" && !c.assignedHall.includes(selectedHall)) return false;
      if (selectedSemester !== "ALL" && c.semester !== selectedSemester) return false;
      if (selectedSection !== "ALL" && c.section !== selectedSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          c.rollNo.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.assignedDesk.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q) ||
          c.assignedHall.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [candidatePool, selectedHall, selectedSemester, selectedSection, searchQuery]);

  // Paginated Slicing
  const totalItems = filteredCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const pageItems = filteredCandidates.slice(startIndex, startIndex + pageSize);

  const handleExportExcel = () => {
    const exportData = filteredCandidates.map((p) => ({
      "Roll Number": p.rollNo,
      "Candidate Name": p.name,
      "Academic Semester": p.semester,
      "Section / Cohort": p.section,
      "Department": p.department,
      "Allocated Hall": p.assignedHall,
      "Desk Assigned": p.assignedDesk,
      "Assignment Status": p.assignedHall && p.assignedDesk ? "ASSIGNED" : "NOT ASSIGNED",
    }));
    exportToExcel(exportData, `Enterprise_Seating_Allocation_${selectedSemester}_${selectedHall}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
              SAVED SEATING ASSIGNMENTS
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {candidatePool.length.toLocaleString()} registered candidates
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Examination Seating Assignments
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Displays room and desk assignments stored for registered students. Unassigned candidates remain clearly marked.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
            <span>Export Seating Chart</span>
          </button>
        </div>
      </div>

      {/* Hall Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {availableHalls.slice(0, 4).map((h) => {
          const seatedCount = candidatePool.filter((c) => c.assignedHall.includes(h.roomNumber)).length;
          const cap = h.capacity;
          const pct = Math.min(100, Math.round((seatedCount / cap) * 100));

          return (
            <div
              key={h.roomNumber}
              onClick={() => setSelectedHall(selectedHall === h.roomNumber ? "ALL" : h.roomNumber)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedHall === h.roomNumber
                  ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {h.roomNumber}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{h.floor}</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 truncate">
                {h.building.split("-")[0].trim()}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">Seated:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {seatedCount} / {cap}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* High-Scale Multi-Filter Controls */}
      <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Semester Filter */}
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

        {/* Section Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Filter Section:
          </label>
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium truncate"
          >
            <option value="ALL">All registered sections</option>
            {sectionOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Hall Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Examination Hall:
          </label>
          <select
            value={selectedHall}
            onChange={(e) => {
              setSelectedHall(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
          >
            <option value="ALL">All Campus Halls</option>
            {availableHalls.map((h) => (
              <option key={h.roomNumber} value={h.roomNumber}>
                {h.roomNumber} (Cap: {h.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Search Candidate:
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Roll, name, or desk..."
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

      {/* Results Meta & Page Size */}
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

      {/* Paginated Seating Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Desk Number</th>
                <th className="py-3.5 px-4">Roll Identifier</th>
                <th className="py-3.5 px-4">Candidate Name</th>
                <th className="py-3.5 px-4">Semester &amp; Section</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Allocated Hall</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageItems.length > 0 ? (
                pageItems.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {c.assignedDesk}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {c.rollNo}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {c.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {c.department}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{c.assignedHall}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Check className="h-3 w-3" /> CONFIRMED
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No candidates found matching the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Controls */}
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
    </div>
  );
}
