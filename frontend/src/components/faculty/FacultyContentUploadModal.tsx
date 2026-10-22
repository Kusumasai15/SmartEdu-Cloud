"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  FileText,
  Video,
  Code,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import { DocumentCompressor } from "@/components/ui/DocumentCompressor";

interface FacultyContentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: FacultyCourse[];
  initialCourseId?: string;
  onUploadSuccess: (contentMeta: { courseCode: string; title: string; type: string }) => void;
}

export function FacultyContentUploadModal({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  onUploadSuccess,
}: FacultyContentUploadModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || courses[0]?.id || "");
  const [unitModule, setUnitModule] = useState<string>("");
  const [contentType, setContentType] = useState<"SLIDES" | "VIDEO" | "CODE_LAB" | "NOTES">("SLIDES");
  const [contentTitle, setContentTitle] = useState<string>("");
  const [contentDescription, setContentDescription] = useState<string>("");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      if (!contentTitle) {
        setContentTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim()) {
      alert("Please provide a title for the lecture content.");
      return;
    }
    const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
    if (!selectedCourse) {
      alert("Please select a course before publishing material.");
      return;
    }

    setIsUploading(true);

    const typeLabel =
      contentType === "SLIDES"
        ? "PDF / Slide Deck"
        : contentType === "VIDEO"
        ? "Video Lecture"
        : contentType === "CODE_LAB"
        ? "Code Lab Worksheet"
        : "Lecture Notes";

    const newMaterial = {
      id: `mat-${Date.now()}`,
      title: contentTitle.trim(),
      type: typeLabel,
      url: externalUrl.trim(),
      date: new Date().toISOString().split("T")[0],
      size: "",
      description: contentDescription.trim(),
      targetClasses: [],
    };

    setTimeout(() => {
      setIsUploading(false);
      onUploadSuccess({
        courseCode: selectedCourse.course_code,
        title: contentTitle.trim(),
        type: typeLabel,
      });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 border border-slate-100 dark:border-slate-800 shadow-2xl animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Upload Lecture Content &amp; Curriculum Materials
              </h3>
              <p className="text-xs text-slate-400">
                Publish lecture slides, video recordings, coding sheets, and notes to student portals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Course & Unit Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Curriculum Module / Unit</label>
              <select
                value={unitModule}
                onChange={(e) => setUnitModule(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="">Select a curriculum module</option>
              </select>
            </div>
          </div>

          {/* Content Type Selector */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Material Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setContentType("SLIDES")}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  contentType === "SLIDES"
                    ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>PDF Slides</span>
              </button>

              <button
                type="button"
                onClick={() => setContentType("VIDEO")}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  contentType === "VIDEO"
                    ? "bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Video className="h-4 w-4" />
                <span>Video Lecture</span>
              </button>

              <button
                type="button"
                onClick={() => setContentType("CODE_LAB")}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  contentType === "CODE_LAB"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Code className="h-4 w-4" />
                <span>Code Lab</span>
              </button>

              <button
                type="button"
                onClick={() => setContentType("NOTES")}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  contentType === "NOTES"
                    ? "bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Lecture Notes</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Material Title</label>
            <input
              type="text"
              required
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
              placeholder="e.g. Lecture 12: AVL Rotations & Rebalancing Proofs"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Video Stream URL if Video */}
          {contentType === "VIDEO" ? (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Recording / Stream URL</label>
              <div className="relative">
                <LinkIcon className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://lecture.smartedu.edu/recordings/cs301-lec12"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Upload Document / Code File</label>
              <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                <FileUp className="h-8 w-8 text-blue-600" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {selectedFileName ? selectedFileName : "Click to select PDF, PPTX, or Code file"}
                </span>
                <span className="text-[11px] text-slate-400">Supports PDF, PPTX, ZIP, C++, PY up to 50MB</span>
                <input type="file" onChange={handleFileChange} className="hidden" />
              </label>

              {selectedFileName && (
                <div className="mt-3">
                  <DocumentCompressor
                    fileName={selectedFileName}
                    originalSizeKB={5600}
                  />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes / Instructions for Students</label>
            <textarea
              rows={2}
              value={contentDescription}
              onChange={(e) => setContentDescription(e.target.value)}
              placeholder="Provide a brief summary of concepts covered in this module..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-blue-600">
                <span>Publishing to Student Learning Portal...</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full animate-pulse"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading} className="btn-saas-primary text-xs px-6">
              {isUploading ? "Uploading..." : "Publish Material"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
