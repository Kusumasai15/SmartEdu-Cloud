"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  Award,
  Calendar,
  X,
  Sparkles,
  Search,
} from "lucide-react";
import {
  CourseSessionPlan,
  SessionPlanLecture,
  generateDefaultSessionPlan,
  generateSampleSessionPlanCsv,
} from "@/types/sessionPlan";
import { SessionPlanTable } from "./SessionPlanTable";
import { SessionPlanImportModal } from "./SessionPlanImportModal";

interface SessionPlanTabProps {
  courseCode: string;
  courseName: string;
}

export function SessionPlanTab({ courseCode, courseName }: SessionPlanTabProps) {
  const router = useRouter();

  // Load persisted session plan for this course or initialize standard curriculum
  const [sessionPlan, setSessionPlan] = useState<CourseSessionPlan | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !courseCode) return;
    try {
      const stored = localStorage.getItem(`smartedu_session_plan_${courseCode}`);
      if (stored) {
        setSessionPlan(JSON.parse(stored));
      } else {
        const defaultPlan = generateDefaultSessionPlan(courseCode, courseName);
        setSessionPlan(defaultPlan);
        localStorage.setItem(`smartedu_session_plan_${courseCode}`, JSON.stringify(defaultPlan));
      }
    } catch {
      setSessionPlan(generateDefaultSessionPlan(courseCode, courseName));
    }
  }, [courseCode, courseName]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<SessionPlanLecture | null>(null);
  const [targetModuleForAdd, setTargetModuleForAdd] = useState<number>(1);
  const [searchTopic, setSearchTopic] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const updateSessionPlan = (newPlan: CourseSessionPlan) => {
    setSessionPlan(newPlan);
    if (typeof window !== "undefined" && courseCode) {
      try {
        localStorage.setItem(`smartedu_session_plan_${courseCode}`, JSON.stringify(newPlan));
      } catch (err) {
        console.warn("Session plan save error:", err);
      }
    }
  };

  // Compute analytics
  const allLectures = useMemo(() => {
    return sessionPlan ? sessionPlan.modules.flatMap((m) => m.lectures) : [];
  }, [sessionPlan]);

  const totalPlanned = allLectures.length;
  const conductedLectures = allLectures.filter((l) => !!l.conductedDate);
  const totalConducted = conductedLectures.length;
  const completionPct = totalPlanned > 0 ? Math.round((totalConducted / totalPlanned) * 100) : 0;

  // Filtered session plan for search
  const filteredPlan: CourseSessionPlan | null = useMemo(() => {
    if (!sessionPlan) return null;
    if (!searchTopic.trim()) return sessionPlan;
    const q = searchTopic.toLowerCase();
    const filteredModules = sessionPlan.modules
      .map((mod) => ({
        ...mod,
        lectures: mod.lectures.filter(
          (l) =>
            l.topic.toLowerCase().includes(q) ||
            l.courseOutcome.toLowerCase().includes(q) ||
            l.methodology.toLowerCase().includes(q) ||
            l.studyMaterialRef.toLowerCase().includes(q)
        ),
      }))
      .filter((mod) => mod.lectures.length > 0);

    return {
      ...sessionPlan,
      modules: filteredModules,
    };
  }, [sessionPlan, searchTopic]);

  // Handle Download CSV
  const handleDownloadCsv = () => {
    const csvData = generateSampleSessionPlanCsv(courseCode, courseName);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Session_Plan_${courseCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Session Plan exported as CSV.");
  };

  // Handle Edit Lecture
  const handleOpenEdit = (lecture: SessionPlanLecture) => {
    setEditingLecture(lecture);
    setIsEditModalOpen(true);
  };

  // Handle Delete Lecture
  const handleDeleteLecture = (lectureId: string) => {
    if (!sessionPlan) return;
    const updatedModules = sessionPlan.modules.map((m) => ({
      ...m,
      lectures: m.lectures.filter((l) => l.id !== lectureId),
    }));
    updateSessionPlan({ ...sessionPlan, modules: updatedModules, updatedAt: new Date().toISOString() });
    showToast("Lecture removed from session plan.");
  };

  // Handle Add Lecture to specific module
  const handleOpenAddLecture = (moduleNumber: number) => {
    setTargetModuleForAdd(moduleNumber);
    const maxLecNo = allLectures.length > 0 ? Math.max(...allLectures.map((l) => l.lectureNo)) : 0;
    setEditingLecture({
      id: `lec-new-${Date.now()}`,
      lectureNo: maxLecNo + 1,
      moduleNumber,
      moduleTitle: sessionPlan?.modules.find((m) => m.moduleNumber === moduleNumber)?.title || `Module ${moduleNumber}`,
      proposedDate: new Date().toISOString().split("T")[0],
      topic: "",
      methodology: "Lecture",
      courseOutcome: `CO${Math.min(moduleNumber, 5)}` as any,
      bloomsLevel: "Understanding",
      studyMaterialRef: `Unit ${moduleNumber} Material`,
      conductedDate: null,
      isConducted: false,
    });
    setIsEditModalOpen(true);
  };

  // Save Lecture (from Edit/Add Modal)
  const handleSaveLectureForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLecture || !editingLecture.topic.trim()) return;

    if (!sessionPlan) {
      const newPlan: CourseSessionPlan = {
        courseCode,
        courseName,
        academicYear: "2026-2027",
        semester: "Semester 1",
        totalModules: 1,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
        modules: [
          {
            moduleNumber: editingLecture.moduleNumber || 1,
            title: `Module ${editingLecture.moduleNumber || 1}`,
            lectures: [editingLecture],
          },
        ],
      };
      updateSessionPlan(newPlan);
      setIsEditModalOpen(false);
      setEditingLecture(null);
      showToast(`Lecture ${editingLecture.lectureNo} created.`);
      return;
    }

    let lectureFound = false;
    const updatedModules = sessionPlan.modules.map((m) => {
      const idx = m.lectures.findIndex((l) => l.id === editingLecture.id);
      if (idx !== -1) {
        lectureFound = true;
        const copy = [...m.lectures];
        copy[idx] = editingLecture;
        return { ...m, lectures: copy };
      }
      if (m.moduleNumber === editingLecture.moduleNumber && !lectureFound) {
        return { ...m, lectures: [...m.lectures, editingLecture] };
      }
      return m;
    });

    updateSessionPlan({ ...sessionPlan, modules: updatedModules, updatedAt: new Date().toISOString() });
    setIsEditModalOpen(false);
    setEditingLecture(null);
    showToast(`Lecture ${editingLecture.lectureNo} details updated.`);
  };

  // Direct redirect to take attendance for a specific lecture
  const handleTakeAttendanceForLecture = (lecture: SessionPlanLecture) => {
    router.push(
      `/faculty/attendance/take?courseCode=${encodeURIComponent(
        courseCode
      )}&lectureNo=${lecture.lectureNo}&topic=${encodeURIComponent(lecture.topic)}`
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!sessionPlan || sessionPlan.modules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center mx-auto shadow-sm">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No Session Plan Uploaded Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              No curriculum lesson delivery plan has been uploaded for <strong className="text-slate-700 dark:text-slate-200">{courseCode}: {courseName}</strong>. You can upload a spreadsheet, download our template, or initialize a starter plan.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Session Plan Spreadsheet</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#16A34A]" />
              <span>Download CSV Template</span>
            </button>
            <button
              onClick={() => {
                const def = generateDefaultSessionPlan(courseCode, courseName);
                updateSessionPlan(def);
                showToast("Standard 5-module curriculum session plan initialized.");
              }}
              className="px-4 py-2.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Initialize Starter Template</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Total Planned</span>
                <strong className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block">
                  {totalPlanned} Lectures
                </strong>
                <span className="text-[10px] text-blue-600 font-semibold block">{sessionPlan.modules.length} Modules</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Conducted</span>
                <strong className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block">
                  {totalConducted} Sessions
                </strong>
                <span className="text-[10px] text-emerald-600 font-semibold block">Attendance Synced</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Remaining</span>
                <strong className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block">
                  {Math.max(0, totalPlanned - totalConducted)} Lectures
                </strong>
                <span className="text-[10px] text-purple-600 font-semibold block">In Progress</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Delivery Progress</span>
                <strong className="text-xl font-extrabold text-slate-900 dark:text-white font-mono block">
                  {completionPct}%
                </strong>
                <span className="text-[10px] text-amber-600 font-semibold block">Syllabus Coverage</span>
              </div>
            </div>
          </div>

          {/* Control Bar: Search & Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search topics, course outcomes (COs), methodology..."
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadCsv}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#16A34A]" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import / Setup Modules</span>
              </button>

              <button
                onClick={() => handleOpenAddLecture(sessionPlan.modules[0]?.moduleNumber || 1)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Lecture</span>
              </button>
            </div>
          </div>

          {/* Main Session Plan Table Component */}
          {filteredPlan && (
            <SessionPlanTable
              sessionPlan={filteredPlan}
              onEditLecture={handleOpenEdit}
              onDeleteLecture={handleDeleteLecture}
              onAddLectureToModule={handleOpenAddLecture}
              onOpenTakeAttendance={handleTakeAttendanceForLecture}
            />
          )}
        </>
      )}

      {/* Import / Configure Modal */}
      <SessionPlanImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        courseCode={courseCode}
        courseName={courseName}
        onImportSuccess={(newPlan) => {
          updateSessionPlan(newPlan);
          showToast(`Session plan with ${newPlan.modules.length} modules imported successfully.`);
        }}
      />

      {/* Edit / Add Lecture Modal */}
      {isEditModalOpen && editingLecture && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#16A34A]" />
                <span>Lecture {editingLecture.lectureNo} Details (Module {editingLecture.moduleNumber})</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLectureForm} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Topic (Points to Cover)
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingLecture.topic}
                  onChange={(e) => setEditingLecture({ ...editingLecture, topic: e.target.value })}
                  placeholder="Comprehensive description of topics, demonstration, and hands-on exercises..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Proposed Date</label>
                  <input
                    type="text"
                    required
                    value={editingLecture.proposedDate}
                    onChange={(e) => setEditingLecture({ ...editingLecture, proposedDate: e.target.value })}
                    placeholder="DD/MM/YYYY or YYYY-MM-DD"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Methodology</label>
                  <select
                    value={editingLecture.methodology}
                    onChange={(e) => setEditingLecture({ ...editingLecture, methodology: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="Lecture">Lecture (Theory)</option>
                    <option value="Practical">Practical (Laboratory)</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Seminar">Seminar / Case Study</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Course Outcome (CO)</label>
                  <select
                    value={editingLecture.courseOutcome}
                    onChange={(e) => setEditingLecture({ ...editingLecture, courseOutcome: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="CO1">CO1 - Fundamental Concepts</option>
                    <option value="CO2">CO2 - Design & Analysis</option>
                    <option value="CO3">CO3 - Implementation</option>
                    <option value="CO4">CO4 - Evaluation & Tuning</option>
                    <option value="CO5">CO5 - Advanced Application</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bloom&apos;s Level</label>
                  <select
                    value={editingLecture.bloomsLevel}
                    onChange={(e) => setEditingLecture({ ...editingLecture, bloomsLevel: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="Remembering">Remembering</option>
                    <option value="Understanding">Understanding</option>
                    <option value="Applying">Applying</option>
                    <option value="Analyzing">Analyzing</option>
                    <option value="Evaluating">Evaluating</option>
                    <option value="Creating">Creating</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Study Material Ref.</label>
                <input
                  type="text"
                  value={editingLecture.studyMaterialRef}
                  onChange={(e) => setEditingLecture({ ...editingLecture, studyMaterialRef: e.target.value })}
                  placeholder="e.g. Unit 1 Slides, Lab Manual Exercise 2, Ch. 3"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Conducted Date (Optional — auto-updated when taking attendance)
                </label>
                <input
                  type="text"
                  value={editingLecture.conductedDate || ""}
                  onChange={(e) => setEditingLecture({ ...editingLecture, conductedDate: e.target.value || null })}
                  placeholder="Leave empty or enter DD/MM/YYYY"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-md shadow-[#16A34A]/20"
                >
                  Save Lecture Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
