"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  BookOpen,
  CalendarCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { PaginationControls } from "@/components/ui/PaginationControls";

export interface AcademicTerm {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export function AcademicTermsView() {
  const { data: rawData, error, loading, refresh } = useApiResource<AcademicTerm[]>("/semesters");

  const terms: AcademicTerm[] = useMemo(() => {
    if (!rawData) return [];
    return Array.isArray(rawData) ? rawData : (rawData as any).data || [];
  }, [rawData]);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<AcademicTerm | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    academic_year: "2026-2027",
    start_date: "2026-08-01",
    end_date: "2026-12-31",
    is_current: false,
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const academicYears = useMemo(() => {
    const set = new Set<string>();
    terms.forEach((t) => {
      if (t.academic_year) set.add(t.academic_year);
    });
    return Array.from(set).sort().reverse();
  }, [terms]);

  const filteredTerms = useMemo(() => {
    return terms.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        t.name.toLowerCase().includes(q) ||
        t.academic_year.toLowerCase().includes(q);

      const matchesYear = yearFilter === "ALL" || t.academic_year === yearFilter;
      return matchesSearch && matchesYear;
    });
  }, [terms, search, yearFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTerms.length / pageSize));
  const paginatedTerms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTerms.slice(start, start + pageSize);
  }, [filteredTerms, currentPage, pageSize]);

  const currentActiveTerm = useMemo(() => {
    return terms.find((t) => t.is_current) || terms[0];
  }, [terms]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      academic_year: "2026-2027",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_current: false,
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (t: AcademicTerm) => {
    setEditingTerm(t);
    setFormData({
      name: t.name,
      academic_year: t.academic_year,
      start_date: t.start_date ? t.start_date.split("T")[0] : "",
      end_date: t.end_date ? t.end_date.split("T")[0] : "",
      is_current: t.is_current,
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Please enter an academic term name.", "error");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post("/semesters", {
        name: formData.name.trim(),
        academic_year: formData.academic_year.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: formData.is_current,
      });
      setIsAddOpen(false);
      await refresh();
      showToast(`✓ Academic term "${formData.name.trim()}" added.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create term.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;
    setBusy(true);
    try {
      await apiClient.patch(`/semesters/${editingTerm.id}`, {
        name: formData.name.trim(),
        academic_year: formData.academic_year.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: formData.is_current,
      });
      setEditingTerm(null);
      await refresh();
      showToast(`✓ Academic term "${formData.name.trim()}" updated.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update term.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSetCurrent = async (t: AcademicTerm) => {
    setBusy(true);
    try {
      await apiClient.patch(`/semesters/${t.id}`, {
        is_current: true,
      });
      await refresh();
      showToast(`✓ "${t.name}" set as current active university semester.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to set current term.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTerm) return;
    setBusy(true);
    try {
      await apiClient.delete(`/semesters/${deletingTerm.id}`);
      setDeletingTerm(null);
      await refresh();
      showToast(`✓ Academic term "${deletingTerm.name}" deleted.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete term.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs border ${
            toast.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Total Terms</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{terms.length}</p>
          <span className="text-xs text-[#737A90]">Configured Semesters</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Current Term</span>
          <p className="text-base font-black text-[#22B573] truncate">
            {currentActiveTerm?.name || "None active"}
          </p>
          <span className="text-xs text-[#22B573] font-bold">● Active Session</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Academic Year</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {currentActiveTerm?.academic_year || "2026-2027"}
          </p>
          <span className="text-xs text-[#737A90]">Current University Cycle</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Status</span>
          <p className="text-2xl font-black text-emerald-600 font-mono">Live</p>
          <span className="text-xs text-[#737A90]">Timetables &amp; Roster Synced</span>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B] rounded-[24px] shadow-xs overflow-hidden">
        <CardHeader className="p-6 border-b border-[#E8EAF1] dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-[#171A2B] dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Academic Terms &amp; Semesters Governance</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#737A90] mt-0.5">
                Configure institutional semester schedules, start &amp; end dates, active terms, and academic year cycles.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Academic Term</span>
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search terms, academic years..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Academic Years</option>
                {academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        {/* Terms Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800/30 text-[#737A90] font-black uppercase text-[10px] tracking-wider">
                <th className="p-4">Academic Term</th>
                <th className="p-4">Academic Year</th>
                <th className="p-4">Duration &amp; Schedule</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
              {paginatedTerms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-slate-300 opacity-60" />
                    <p className="font-bold text-sm">No academic terms found.</p>
                    <p className="text-xs mt-1">Click &quot;+ Add Academic Term&quot; to configure your institution&apos;s semester schedule.</p>
                  </td>
                </tr>
              ) : (
                paginatedTerms.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/60">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold block">{t.name}</strong>
                          <span className="text-[10px] text-slate-400">ID: {t.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                        {t.academic_year}
                      </span>
                    </td>

                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {t.start_date ? t.start_date.split("T")[0] : "TBD"} &rarr; {t.end_date ? t.end_date.split("T")[0] : "TBD"}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      {t.is_current ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active (Current)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCurrent(t)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 transition-colors cursor-pointer"
                          title="Click to activate as current term"
                        >
                          <span>Make Current</span>
                        </button>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Academic Term"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingTerm(t)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Academic Term"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredTerms.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="academic terms"
        />
      </Card>

      {/* CREATE TERM MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-[#171A2B] dark:text-white">Add Academic Term</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Term Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fall Semester 2026 (Odd Sem)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">Set as Current Active University Term</span>
              </label>

              <div className="pt-3 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  {busy ? "Saving..." : "Create Academic Term"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TERM MODAL */}
      {editingTerm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-[#171A2B] dark:text-white">Edit Academic Term</h3>
              </div>
              <button onClick={() => setEditingTerm(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Term Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">Active Current Term</span>
              </label>

              <div className="pt-3 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTerm(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  {busy ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTerm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-rose-200 dark:border-rose-900/60 p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Academic Term</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete this term?</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{deletingTerm.name}</p>
              <p className="text-slate-500 font-mono">Academic Year: {deletingTerm.academic_year}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDeletingTerm(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmDelete} disabled={busy} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
                {busy ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
