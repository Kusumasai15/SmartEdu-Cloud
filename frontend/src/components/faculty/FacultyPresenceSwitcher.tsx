"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Check,
  ChevronDown,
  Clock,
  Building,
  Coffee,
  BookOpen,
  VolumeX,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";

export function FacultyPresenceSwitcher() {
  const { user } = useAuth();
  const { facultyPresence, updateFacultyPresence, getEffectiveFacultyPresence } = useAcademicData();
  const [isOpen, setIsOpen] = useState(false);

  const facultyKey = user?.id || user?.email || "";
  const facultyFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Course Faculty";
  const currentRecord = getEffectiveFacultyPresence(facultyKey, facultyFullName, user?.email);

  const [cabinInput, setCabinInput] = useState(
    currentRecord.cabinNumber && currentRecord.cabinNumber !== "Not assigned" ? currentRecord.cabinNumber : ""
  );
  const [noteInput, setNoteInput] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (currentRecord.cabinNumber && currentRecord.cabinNumber !== "Not assigned") {
      setCabinInput(currentRecord.cabinNumber);
    }
  }, [currentRecord.cabinNumber]);

  if (!user || (user.role?.name !== "FACULTY" && user.role?.name !== "HOD")) {
    return null;
  }

  const saveCabinLocation = (customLoc?: string) => {
    const loc = (customLoc ?? cabinInput).trim();
    if (!loc) return;
    updateFacultyPresence({
      facultyId: user.id,
      facultyName: facultyFullName,
      email: user.email,
      status: currentRecord.status as any,
      cabinNumber: loc,
      currentRoom: currentRecord.currentRoom,
      customNote: noteInput,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleStatusSelect = (
    status: "IN_CABIN" | "IN_CLASS" | "ON_BREAK" | "BUSY" | "AWAY" | "ON_LEAVE"
  ) => {
    const cleanCabin = cabinInput && cabinInput !== "Not assigned" ? cabinInput : "";
    updateFacultyPresence({
      facultyId: user.id,
      facultyName: facultyFullName,
      email: user.email,
      status,
      cabinNumber: cleanCabin,
      currentRoom: status === "IN_CLASS" ? currentRecord.currentRoom : undefined,
      customNote: noteInput,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
    setIsOpen(false);
  };

  const getStatusBadge = (status: string, isAutoDetected?: boolean) => {
    switch (status) {
      case "IN_CABIN":
        return {
          label: "In Cabin (Available)",
          dotColor: "bg-emerald-500 ring-emerald-400",
          textColor: "text-emerald-700 dark:text-emerald-300",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
          icon: <Building className="h-3.5 w-3.5 text-emerald-600" />,
        };
      case "IN_CLASS":
        return {
          label: isAutoDetected ? `In Class (Auto: ${currentRecord.currentRoom || "Teaching"})` : "In Class / Lecture",
          dotColor: "bg-blue-600 ring-blue-400",
          textColor: "text-blue-700 dark:text-blue-300",
          bgColor: "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800",
          icon: <BookOpen className="h-3.5 w-3.5 text-blue-600" />,
        };
      case "ON_BREAK":
        return {
          label: "On Break / Stepped Out",
          dotColor: "bg-amber-500 ring-amber-400",
          textColor: "text-amber-700 dark:text-amber-300",
          bgColor: "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
          icon: <Coffee className="h-3.5 w-3.5 text-amber-600" />,
        };
      case "BUSY":
        return {
          label: "Busy / Do Not Disturb",
          dotColor: "bg-rose-500 ring-rose-400",
          textColor: "text-rose-700 dark:text-rose-300",
          bgColor: "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800",
          icon: <VolumeX className="h-3.5 w-3.5 text-rose-600" />,
        };
      case "AWAY":
      case "ON_LEAVE":
      default:
        return {
          label: "Away / Off Campus",
          dotColor: "bg-slate-400 ring-slate-300",
          textColor: "text-slate-700 dark:text-slate-300",
          bgColor: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700",
          icon: <LogOut className="h-3.5 w-3.5 text-slate-500" />,
        };
    }
  };

  const badge = getStatusBadge(currentRecord.status, currentRecord.isAutoDetected);

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] ${badge.bgColor}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badge.dotColor}`} />
        </span>

        {badge.icon}
        <span className={badge.textColor}>{badge.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 ${badge.textColor} transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-3 space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-extrabold text-slate-900 dark:text-white">
              Faculty Cabin Presence
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● Live Synced</span>
          </div>

          {/* Auto-detected class alert banner */}
          {currentRecord.isAutoDetected && (
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-200">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Auto-Detected Active Class</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {currentRecord.customNote}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                Venue: {currentRecord.currentRoom}
              </p>
            </div>
          )}

          {/* Quick 1-Click Status Options */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleStatusSelect("IN_CABIN")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                currentRecord.status === "IN_CABIN"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>In Cabin (Available for students)</span>
              </div>
              {currentRecord.status === "IN_CABIN" && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleStatusSelect("IN_CLASS")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                currentRecord.status === "IN_CLASS"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>In Class / Teaching</span>
              </div>
              {currentRecord.status === "IN_CLASS" && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleStatusSelect("ON_BREAK")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                currentRecord.status === "ON_BREAK"
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Out for Break / Meeting</span>
              </div>
              {currentRecord.status === "ON_BREAK" && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleStatusSelect("BUSY")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                currentRecord.status === "BUSY"
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>Busy / Do Not Disturb</span>
              </div>
              {currentRecord.status === "BUSY" && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleStatusSelect("AWAY")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                currentRecord.status === "AWAY"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                <span>Away / Off Campus</span>
              </div>
              {currentRecord.status === "AWAY" && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          </div>

          {/* Cabin Details input */}
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Cabin Room / Location:
              </label>
              {savedFeedback && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={cabinInput}
                onChange={(e) => setCabinInput(e.target.value)}
                onBlur={() => saveCabinLocation()}
                placeholder="e.g. Cabin 304, Admin Block"
                className="flex-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => saveCabinLocation()}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
