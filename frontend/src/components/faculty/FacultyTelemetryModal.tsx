"use client";

import React from "react";
import { X, Camera, Monitor, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveExamTelemetryRecord } from "./FacultyExamsTab";

interface FacultyTelemetryModalProps {
  student: LiveExamTelemetryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onWaiveStrikes: (studentId: string) => void;
}

export function FacultyTelemetryModal({
  student,
  isOpen,
  onClose,
  onWaiveStrikes,
}: FacultyTelemetryModalProps) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Exam Review: {student.studentName}
            </h3>
            <p className="text-xs text-slate-400 font-mono">{student.studentRollNo}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-950 rounded-2xl text-center space-y-2">
          <div className="h-44 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
            <div className="text-slate-400 space-y-1">
              <Camera className="h-10 w-10 mx-auto text-emerald-500 animate-pulse" />
              <p className="text-xs font-mono font-bold text-emerald-400">Camera monitoring active</p>
              <p className="text-[10px] text-slate-500">Review ID: {student.id}</p>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Warnings:</span>
            <strong className="text-rose-600 font-mono">{student.strikeCount} / 3</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Latest Note:</span>
            <strong className="text-slate-900 dark:text-white">{student.lastViolation}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Screen Status:</span>
            <span className={`font-bold ${student.fullscreenStatus === "LOCKED" ? "text-emerald-600" : "text-rose-600"}`}>
              {student.fullscreenStatus}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onWaiveStrikes(student.id);
              onClose();
            }}
            className="text-xs text-emerald-600"
          >
            Clear Warnings
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="btn-saas-primary text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
