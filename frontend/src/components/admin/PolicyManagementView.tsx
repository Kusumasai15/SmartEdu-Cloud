"use client";

import React, { useState } from "react";
import {
  Scale,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  Save,
  Award,
  Calculator,
  Sliders,
  Clock,
  RotateCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncPolicy, BatchEvaluationCriteria, defaultBatchCriteriaList } from "@/context/AcademicDataContext";

export function PolicyManagementView() {
  const {
    policies,
    addPolicy,
    updatePolicy,
    togglePolicyEnforcement,
    deletePolicy,
    attendanceWindowHours,
    updateAttendanceWindowHours,
    batchCriteria,
    updateBatchCriteria,
    addBatchCriteria,
    deleteBatchCriteria,
  } = useAcademicData();

  // Batch Criteria Management State
  const effectiveBatchCriteria = batchCriteria.length > 0 ? batchCriteria : defaultBatchCriteriaList;
  const [activeBatchId, setActiveBatchId] = useState<string>(
    effectiveBatchCriteria[0]?.id || "batch-2024-2028"
  );
  const currentBatch = effectiveBatchCriteria.find((b) => b.id === activeBatchId) || effectiveBatchCriteria[0];
  const [editBatchForm, setEditBatchForm] = useState<BatchEvaluationCriteria | null>(null);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    batchName: "",
    academicYear: "2025-2029",
    program: "All Programs",
    dsaWeightagePct: 40,
    seeWeightagePct: 60,
    minPassingScorePct: 40,
    minAttendancePct: 75,
    dsaAssignmentsWeightPct: 25,
    dsaClassTestWeightPct: 25,
    dsaMidTermWeightPct: 25,
    dsaLabPracticalWeightPct: 25,
  });

  const [selectedHours, setSelectedHours] = useState<number>(attendanceWindowHours || 48);
  const [customHoursInput, setCustomHoursInput] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SyncPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<SyncPolicy | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "ACADEMIC" as SyncPolicy["category"],
    threshold: "",
    description: "",
    enforced: true,
    version: "v1.0",
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const filtered = policies.filter(
    (p) => categoryFilter === "ALL" || p.category === categoryFilter
  );

  const handleOpenAdd = () => {
    setFormData({
      title: "",
      category: "ACADEMIC",
      threshold: "75% Minimum",
      description: "",
      enforced: true,
      version: "v1.0",
    });
    setIsAddOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    addPolicy({
      title: formData.title.trim(),
      category: formData.category,
      threshold: formData.threshold.trim(),
      description: formData.description.trim(),
      enforced: formData.enforced,
      version: formData.version || "v1.0",
    });

    setIsAddOpen(false);
    showToast(`✓ University policy "${formData.title}" added and enforced across all portals.`);
  };

  const handleOpenEdit = (p: SyncPolicy) => {
    setEditingPolicy(p);
    setFormData({
      title: p.title,
      category: p.category,
      threshold: p.threshold,
      description: p.description,
      enforced: p.enforced,
      version: p.version,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;

    updatePolicy({
      ...editingPolicy,
      title: formData.title.trim(),
      category: formData.category,
      threshold: formData.threshold.trim(),
      description: formData.description.trim(),
      enforced: formData.enforced,
      version: formData.version,
    });

    const title = formData.title;
    setEditingPolicy(null);
    showToast(`✓ Rule "${title}" updated platform-wide.`);
  };

  const handleToggle = (id: string) => {
    togglePolicyEnforcement(id);
    const target = policies.find((p) => p.id === id);
    showToast(`✓ Rule "${target?.title}" enforcement status updated.`);
  };

  const handleConfirmDelete = () => {
    if (!deletingPolicy) return;
    deletePolicy(deletingPolicy.id);
    showToast(`✓ Rule "${deletingPolicy.title}" removed from active university rules.`);
    setDeletingPolicy(null);
  };

  const handleSaveAttendanceWindow = (hours: number) => {
    if (hours < 1) return;
    updateAttendanceWindowHours(hours);
    setSelectedHours(hours);
    showToast(`✓ Faculty attendance modification grace window updated to ${hours} hours.`);
  };

  const handleSaveActiveBatch = (updates: Partial<BatchEvaluationCriteria>) => {
    if (!currentBatch) return;
    updateBatchCriteria({
      ...currentBatch,
      ...updates,
    });
    showToast(`✓ Evaluation criteria for "${currentBatch.batchName}" saved.`);
  };

  const handleCreateNewBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchForm.batchName.trim()) return;
    addBatchCriteria({
      ...newBatchForm,
    });
    setIsAddBatchOpen(false);
    showToast(`✓ Batch regulations for "${newBatchForm.batchName}" created and active.`);
  };

  const handleDeleteBatch = (id: string, name: string) => {
    if (batchCriteria.length <= 1) {
      alert("Cannot delete the only remaining batch regulation.");
      return;
    }
    deleteBatchCriteria(id);
    const remaining = batchCriteria.filter((b) => b.id !== id);
    if (remaining.length > 0) {
      setActiveBatchId(remaining[0].id);
    }
    showToast(`✓ Batch criteria "${name}" removed.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#22B573]" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── SPECIAL GOVERNANCE: ATTENDANCE MODIFICATION TIME LIMIT (GRACE PERIOD) ─── */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
                  <span>Faculty Roll Call Modification Time Limit (Grace Policy)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    Active: {attendanceWindowHours} Hours
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-[#737A90]">
                  Configure the time window allowed for teachers to submit or update attendance after a class session finishes (e.g. within 48 hours). Records are locked permanently once this period elapses.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: "24 Hours", hours: 24 },
                { label: "48 Hours (Standard)", hours: 48 },
                { label: "72 Hours", hours: 72 },
                { label: "7 Days (168h)", hours: 168 },
              ].map((preset) => (
                <button
                  key={preset.hours}
                  onClick={() => handleSaveAttendanceWindow(preset.hours)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    attendanceWindowHours === preset.hours
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-[#E8EAF1] dark:border-slate-700 text-[#171A2B] dark:text-white hover:border-slate-400"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="px-5 pb-5 pt-1">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#E8EAF1] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#737A90]">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                Current Rule: If a class takes place today, faculty have exactly <strong>{attendanceWindowHours} hours</strong> from conclusion to record or rectify attendance.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-[#737A90]">Custom:</span>
              <input
                type="number"
                min="1"
                max="720"
                value={customHoursInput}
                onChange={(e) => setCustomHoursInput(e.target.value)}
                placeholder="Hours"
                className="w-20 px-2 py-1 text-xs border border-[#E8EAF1] dark:border-slate-700 rounded-lg bg-[#F7F8FC] dark:bg-slate-800 font-mono text-center font-bold"
              />
              <button
                onClick={() => {
                  const val = parseInt(customHoursInput, 10);
                  if (val > 0) {
                    handleSaveAttendanceWindow(val);
                    setCustomHoursInput("");
                  }
                }}
                disabled={!customHoursInput || parseInt(customHoursInput, 10) <= 0}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-[#4D3AC4] text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── BATCH-WISE EVALUATION CRITERIA & REGULATIONS ─── */}
      <Card className="border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/30 via-white to-white dark:from-slate-900 dark:to-slate-900 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <span>Batch-Wise Assessment Regulations &amp; Formula Configurator</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Dynamic Regulations
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure evaluation formula (e.g. Final Score = DSA X% + SEE Y%), pass criteria, and minimum attendance thresholds customized per academic batch/cohort.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAddBatchOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 h-8 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Batch Regulation</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-5 pt-2 space-y-4">
          {/* Prominent Batch Selection Bar & Dropdown Selector */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 shrink-0 text-slate-800 dark:text-slate-200 font-bold text-xs">
                <Sliders className="h-4 w-4 text-blue-600" />
                <span>Selected Cohort:</span>
              </div>
              <div className="relative flex-1 min-w-[240px]">
                <select
                  value={activeBatchId}
                  onChange={(e) => setActiveBatchId(e.target.value)}
                  aria-label="Select Academic Cohort"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {effectiveBatchCriteria.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchName} ({batch.academicYear}) • DSA {batch.dsaWeightagePct}% / SEE {batch.seeWeightagePct}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {effectiveBatchCriteria.length} Cohorts Configured
              </span>
            </div>
          </div>

          {/* Quick-Switch Cohort Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Quick Select Cohort:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {effectiveBatchCriteria.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => setActiveBatchId(batch.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    activeBatchId === batch.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                  }`}
                >
                  <span>{batch.batchName.replace(/ \(.+\)/, "")}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      activeBatchId === batch.id
                        ? "bg-blue-800 text-blue-100"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {batch.dsaWeightagePct}% / {batch.seeWeightagePct}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {currentBatch && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-5">
              {/* Active Batch Summary & Formula Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {currentBatch.batchName}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                      AY {currentBatch.academicYear} • {currentBatch.program}
                    </span>
                  </div>
                  <p className="text-xs text-blue-900 dark:text-blue-200 font-medium">
                    Official Active Formula:{" "}
                    <strong className="font-mono text-blue-700 dark:text-blue-300 text-sm">
                      Final Score = DSA ({currentBatch.dsaWeightagePct}%) + SEE ({currentBatch.seeWeightagePct}%)
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {batchCriteria.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBatch(currentBatch.id, currentBatch.batchName)}
                      className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete Batch
                    </Button>
                  )}
                </div>
              </div>

              {/* Formula Split Visualization */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" />
                    During-Semester Assessment (DSA): {currentBatch.dsaWeightagePct}%
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    Semester End Examination (SEE): {currentBatch.seeWeightagePct}%
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block" />
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    style={{ width: `${currentBatch.dsaWeightagePct}%` }}
                    className="bg-indigo-600 h-full transition-all duration-300"
                  />
                  <div
                    style={{ width: `${currentBatch.seeWeightagePct}%` }}
                    className="bg-blue-600 h-full transition-all duration-300"
                  />
                </div>
              </div>

              {/* Weightage Sliders & Thresholds Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* DSA Weightage */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      DSA Weightage (%)
                    </label>
                    <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                      {currentBatch.dsaWeightagePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={currentBatch.dsaWeightagePct}
                    onChange={(e) => {
                      const dsa = parseInt(e.target.value, 10);
                      const see = 100 - dsa;
                      handleSaveActiveBatch({ dsaWeightagePct: dsa, seeWeightagePct: see });
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Continuous in-semester internal weight.</p>
                </div>

                {/* SEE Weightage */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      SEE Weightage (%)
                    </label>
                    <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-sm">
                      {currentBatch.seeWeightagePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={currentBatch.seeWeightagePct}
                    onChange={(e) => {
                      const see = parseInt(e.target.value, 10);
                      const dsa = 100 - see;
                      handleSaveActiveBatch({ dsaWeightagePct: dsa, seeWeightagePct: see });
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Terminal end-of-semester exam weight.</p>
                </div>

                {/* Min Passing Score */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Min Passing Score (%)
                    </label>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {currentBatch.minPassingScorePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="60"
                    step="5"
                    value={currentBatch.minPassingScorePct}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleSaveActiveBatch({ minPassingScorePct: val });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Threshold required to clear the course.</p>
                </div>

                {/* Min Attendance Requirement */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Min Attendance (%)
                    </label>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                      {currentBatch.minAttendancePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={currentBatch.minAttendancePct}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleSaveActiveBatch({ minAttendancePct: val });
                    }}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Eligibility threshold to write SEE.</p>
                </div>
              </div>

              {/* DSA Sub-Component Split Breakdown */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-blue-600" />
                    <span>DSA Internal Evaluation Breakdown (Must total 100%)</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    Total:{" "}
                    {currentBatch.dsaAssignmentsWeightPct +
                      currentBatch.dsaClassTestWeightPct +
                      currentBatch.dsaMidTermWeightPct +
                      currentBatch.dsaLabPracticalWeightPct}
                    %
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Assignments
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentBatch.dsaAssignmentsWeightPct}
                        onChange={(e) =>
                          handleSaveActiveBatch({
                            dsaAssignmentsWeightPct: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center text-xs"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Class Tests / Quizzes
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentBatch.dsaClassTestWeightPct}
                        onChange={(e) =>
                          handleSaveActiveBatch({
                            dsaClassTestWeightPct: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center text-xs"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Mid-Term Exam
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentBatch.dsaMidTermWeightPct}
                        onChange={(e) =>
                          handleSaveActiveBatch({
                            dsaMidTermWeightPct: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center text-xs"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Lab / Practicals
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentBatch.dsaLabPracticalWeightPct}
                        onChange={(e) =>
                          handleSaveActiveBatch({
                            dsaLabPracticalWeightPct: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-center text-xs"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Header */}
      <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
        <CardHeader className="p-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <Scale className="h-5 w-5 text-slate-900 dark:text-slate-100" />
              <span>University Academic Rules &amp; Policies</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Establish and enforce university-wide rules for attendance bars, examination passing criteria, and student evaluations.
            </CardDescription>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add University Rule</span>
          </Button>
        </CardHeader>

        {/* Filters Bar */}
        <div className="px-5 pb-4 flex items-center gap-2 overflow-x-auto">
          {["ALL", "ACADEMIC", "EXAMINATION", "CAMPUS_SECURITY", "STUDENT_SUPPORT"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-[#F7F8FC] dark:bg-slate-800 text-[#737A90] hover:text-[#171A2B]"
              }`}
            >
              {cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Policies Grid */}
        <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-[#E8EAF1] dark:border-slate-700">
                    {p.version}
                  </span>
                  <span className="text-[10px] font-bold text-[#737A90]">
                    {p.category.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(p.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      p.enforced
                        ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    ● {p.enforced ? "Enforced" : "Disabled"}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1 rounded-lg text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 cursor-pointer"
                    title="Edit Rule"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingPolicy(p)}
                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Delete Rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#171A2B] dark:text-white">{p.title}</h4>
                <p className="text-xs text-[#737A90] mt-1 leading-relaxed">{p.description}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#E8EAF1] dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-[#737A90]">Requirement Threshold:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{p.threshold}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CREATE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Add University Rule</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-[#737A90] hover:text-[#171A2B]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End-Term Attendance Requirement"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as SyncPolicy["category"] })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="ACADEMIC">Academic</option>
                    <option value="EXAMINATION">Examination</option>
                    <option value="CAMPUS_SECURITY">Campus Security</option>
                    <option value="STUDENT_SUPPORT">Student Support</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Threshold Bar</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 75% Attendance"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Directive Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Official instructions on how this rule is applied across courses and examinations..."
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold">
                  Add Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Edit University Rule</h3>
              </div>
              <button onClick={() => setEditingPolicy(null)} className="text-[#737A90] hover:text-[#171A2B]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as SyncPolicy["category"] })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="ACADEMIC">Academic</option>
                    <option value="EXAMINATION">Examination</option>
                    <option value="CAMPUS_SECURITY">Campus Security</option>
                    <option value="STUDENT_SUPPORT">Student Support</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Threshold Bar</label>
                  <input
                    type="text"
                    required
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Directive Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setEditingPolicy(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingPolicy && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold">Confirm Rule Removal</h3>
            </div>
            <p className="text-xs text-[#737A90] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#171A2B] dark:text-white">{deletingPolicy.title}</strong> from active university policies?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button variant="outline" onClick={() => setDeletingPolicy(null)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4">
                Remove Rule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BATCH REGULATION MODAL */}
      {isAddBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Add Batch Academic Regulation</h3>
              </div>
              <button onClick={() => setIsAddBatchOpen(false)} className="text-[#737A90] hover:text-[#171A2B]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBatch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Batch / Cohort Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch 2025-2029"
                  value={newBatchForm.batchName}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, batchName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Academic Span</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025-2029"
                    value={newBatchForm.academicYear}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, academicYear: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Degree Program</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. All Programs / B.Tech"
                    value={newBatchForm.program}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, program: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">DSA Weightage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newBatchForm.dsaWeightagePct}
                    onChange={(e) => {
                      const dsa = parseInt(e.target.value, 10) || 0;
                      setNewBatchForm({ ...newBatchForm, dsaWeightagePct: dsa, seeWeightagePct: 100 - dsa });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">SEE Weightage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newBatchForm.seeWeightagePct}
                    onChange={(e) => {
                      const see = parseInt(e.target.value, 10) || 0;
                      setNewBatchForm({ ...newBatchForm, seeWeightagePct: see, dsaWeightagePct: 100 - see });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Min Passing Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newBatchForm.minPassingScorePct}
                    onChange={(e) =>
                      setNewBatchForm({ ...newBatchForm, minPassingScorePct: parseInt(e.target.value, 10) || 40 })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Min Attendance (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newBatchForm.minAttendancePct}
                    onChange={(e) =>
                      setNewBatchForm({ ...newBatchForm, minAttendancePct: parseInt(e.target.value, 10) || 75 })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsAddBatchOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 font-bold cursor-pointer">
                  Create Batch Regulation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
