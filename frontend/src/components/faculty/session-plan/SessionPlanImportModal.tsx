"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  CourseSessionPlan,
  generateSampleSessionPlanCsv,
  parseSessionPlanCsv,
} from "@/types/sessionPlan";

interface SessionPlanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseCode: string;
  courseName: string;
  onImportSuccess: (importedPlan: CourseSessionPlan) => void;
}

export function SessionPlanImportModal({
  isOpen,
  onClose,
  courseCode,
  courseName,
  onImportSuccess,
}: SessionPlanImportModalProps) {
  const [activeMode, setActiveMode] = useState<"IMPORT_FILE" | "MODULE_SETUP">("IMPORT_FILE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Manual Module Count Setup
  const [moduleCount, setModuleCount] = useState<number>(5);
  const [customTitles, setCustomTitles] = useState<string[]>([
    "Foundations & Architectural Strategy",
    "Linguistic Analysis & Preprocessing",
    "Semantic Models & Taxonomies",
    "Model Optimization & Classification",
    "Deployment, Governance & Project Defense",
  ]);

  if (!isOpen) return null;

  // Handle Download Sample Excel/CSV
  const handleDownloadSample = () => {
    const csvData = generateSampleSessionPlanCsv(courseCode, courseName);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Session_Plan_${courseCode}_Sample.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFileContent(text || "");
      };
      reader.readAsText(file);
    }
  };

  // Handle CSV Import
  const handleProcessImport = () => {
    if (!fileContent.trim()) {
      setErrorMsg("Please select a valid CSV or Excel exported file first.");
      return;
    }

    try {
      setIsProcessing(true);
      const parsedPlan = parseSessionPlanCsv(fileContent, courseCode, courseName);
      onImportSuccess(parsedPlan);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse session plan file. Please check column format.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Manual Custom Module Generation
  const handleCreateCustomModules = () => {
    const defaultModules = Array.from({ length: moduleCount }).map((_, i) => {
      const modNo = i + 1;
      const title = customTitles[i] || `Module ${modNo}: Core Engineering Curriculum`;
      return {
        moduleNumber: modNo,
        title,
        lectures: [
          {
            id: `custom-lec-${modNo}-1`,
            lectureNo: (modNo - 1) * 4 + 1,
            moduleNumber: modNo,
            moduleTitle: title,
            proposedDate: `2026-08-${String(modNo * 4).padStart(2, "0")}`,
            topic: `Core concepts and architecture overview for ${title}`,
            methodology: "Lecture" as const,
            courseOutcome: `CO${Math.min(modNo, 5)}` as any,
            bloomsLevel: "Understanding" as const,
            studyMaterialRef: `Unit ${modNo} Slides`,
            conductedDate: null,
            isConducted: false,
          },
          {
            id: `custom-lec-${modNo}-2`,
            lectureNo: (modNo - 1) * 4 + 2,
            moduleNumber: modNo,
            moduleTitle: title,
            proposedDate: `2026-08-${String(modNo * 4 + 2).padStart(2, "0")}`,
            topic: `Practical implementation and laboratory drill for ${title}`,
            methodology: "Practical" as const,
            courseOutcome: `CO${Math.min(modNo, 5)}` as any,
            bloomsLevel: "Applying" as const,
            studyMaterialRef: `Lab Manual Exercise ${modNo}`,
            conductedDate: null,
            isConducted: false,
          },
        ],
      };
    });

    const newPlan: CourseSessionPlan = {
      courseCode,
      courseName,
      academicYear: "2026-2027",
      semester: "Semester 1",
      totalModules: moduleCount,
      modules: defaultModules,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    onImportSuccess(newPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#16A34A]/10 text-[#16A34A]">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Configure Session Plan: {courseCode}
              </h2>
              <p className="text-xs text-slate-500">
                Import from institutional Excel / CSV spreadsheet or define custom curriculum modules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode("IMPORT_FILE")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeMode === "IMPORT_FILE"
                ? "bg-white dark:bg-slate-700 text-[#16A34A] dark:text-emerald-300 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Import Excel / CSV Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("MODULE_SETUP")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeMode === "MODULE_SETUP"
                ? "bg-white dark:bg-slate-700 text-[#16A34A] dark:text-emerald-300 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Define Custom Module Structure
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODE 1: FILE IMPORT & SAMPLE DOWNLOAD */}
        {activeMode === "IMPORT_FILE" && (
          <div className="space-y-4">
            {/* Step 1: Download Sample */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Official University Syllabus Template
                </span>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Includes pre-sequenced proposed dates, 5 standard modules, CO mappings, and Bloom&apos;s levels.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Sample Template (.CSV)</span>
              </button>
            </div>

            {/* Step 2: Upload File Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Upload Completed Session Plan Spreadsheet
              </label>

              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#16A34A] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : "Click to browse or drag & drop CSV/Excel export"}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Supports UTF-8 CSV, Comma-delimited spreadsheets
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={!selectedFile || isProcessing}
                className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-md shadow-[#16A34A]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? "Validating..." : "Import & Apply Session Plan"}
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: CUSTOM MODULE SETUP */}
        {activeMode === "MODULE_SETUP" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Modules for Curriculum:
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setModuleCount(num)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      moduleCount === num
                        ? "bg-[#16A34A] text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                    }`}
                  >
                    {num} Modules
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Module Titles List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Array.from({ length: moduleCount }).map((_, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[11px] font-mono font-bold text-slate-500">
                    Module {idx + 1} Title
                  </label>
                  <input
                    type="text"
                    value={customTitles[idx] || ""}
                    onChange={(e) => {
                      const copy = [...customTitles];
                      copy[idx] = e.target.value;
                      setCustomTitles(copy);
                    }}
                    placeholder={`e.g. Unit ${idx + 1} Foundation & Advanced Topics`}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomModules}
                className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-md shadow-[#16A34A]/20 transition-all cursor-pointer"
              >
                Generate {moduleCount}-Module Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
