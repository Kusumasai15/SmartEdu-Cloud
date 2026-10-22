"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  CalendarCheck,
  Upload,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  Tag,
  FileText,
  Search,
  Trash2,
  Eye,
  Plus,
  X,
  Send,
  Building2,
  GraduationCap,
  ClipboardPaste,
  Check,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { exportToExcel, importFromExcel } from "@/lib/excel-utils";
import { generateInstitutionalCandidatePool } from "@/lib/exam-scale-data";

export interface SpreadsheetRow {
  id: string;
  rollNo: string;
  studentName: string;
  department: string;
  section: string;
  dutyType: "PRESENT_ON_DUTY" | "VOLUNTEER" | "DELEGATE" | "EXEMPTED";
  remarks: string;
  isRecognized?: boolean;
}

export interface EventAttendanceRecord {
  id: string;
  eventName: string;
  category: string;
  eventDate: string;
  timingType: "FULL_DAY" | "FORENOON" | "AFTERNOON" | "CUSTOM";
  customTiming?: string;
  notes: string;
  attendees: Array<{
    rollNo: string;
    studentName: string;
    department: string;
    section: string;
    dutyType?: string;
    remarks?: string;
  }>;
  totalCredited: number;
  grantedBy: string;
  grantedAt: string;
}

export function AdminEventAttendanceView() {
  const { users, departments, dispatchCampusAlert } = useAcademicData();

  // Reference candidate pool for validating and auto-completing roll numbers
  const candidatePool = useMemo(() => {
    return generateInstitutionalCandidatePool(users);
  }, [users]);

  // Roll number to candidate lookup map
  const candidateLookup = useMemo(() => {
    const map = new Map<string, { name: string; department: string; section: string }>();
    candidatePool.forEach((c) => {
      map.set(c.rollNo.toUpperCase().trim(), {
        name: c.name,
        department: c.department,
        section: c.section,
      });
    });
    // Also add real users
    (users || []).forEach((u) => {
      const roll = ((u as any).rollNo || (u as any).student_identifier || (u as any).roll_number || "").toUpperCase().trim();
      if (roll) {
        map.set(roll, {
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || roll,
          department: u.department || "Computer Science & Engineering",
          section: (u as any).className || "Section A",
        });
      }
    });
    return map;
  }, [candidatePool, users]);

  // Event Meta Form State
  const [eventName, setEventName] = useState("");
  const [eventCategory, setEventCategory] = useState("Technical & Hackathons");
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [timingType, setTimingType] = useState<"FULL_DAY" | "FORENOON" | "AFTERNOON" | "CUSTOM">("FULL_DAY");
  const [customTiming, setCustomTiming] = useState("10:00 AM - 02:00 PM");
  const [eventNotes, setEventNotes] = useState("");

  // Live Interactive Spreadsheet Rows State
  const [gridRows, setGridRows] = useState<SpreadsheetRow[]>([
    {
      id: "row-1",
      rollNo: "24BCSE001",
      studentName: "Manav Nagpal",
      department: "Computer Science & Engineering",
      section: "CSE - Semester 5 (Section A)",
      dutyType: "PRESENT_ON_DUTY",
      remarks: "Team Lead / Hackathon Finalist",
      isRecognized: true,
    },
    {
      id: "row-2",
      rollNo: "24BCSE002",
      studentName: "Punith Raj",
      department: "Computer Science & Engineering",
      section: "CSE - Semester 5 (Section A)",
      dutyType: "PRESENT_ON_DUTY",
      remarks: "Participant",
      isRecognized: true,
    },
    {
      id: "row-3",
      rollNo: "STU-1010",
      studentName: "Aryan Sharma",
      department: "Information Technology",
      section: "IT - Semester 5 AIDs",
      dutyType: "VOLUNTEER",
      remarks: "Technical Operations Volunteer",
      isRecognized: true,
    },
  ]);

  // Live Spreadsheet Search Filter
  const [gridSearchFilter, setGridSearchFilter] = useState("");

  // Paste Data Modal State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState("");

  // Excel Upload ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status & Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Persisted Past Event Records in localStorage
  const [historyRecords, setHistoryRecords] = useState<EventAttendanceRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("smartedu_admin_event_attendance_records_v2");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: "ev-rec-1",
        eventName: "Annual Inter-University Hackathon 2026",
        category: "Technical & Hackathons",
        eventDate: "2026-10-18",
        timingType: "FULL_DAY",
        notes: "Campus representation team in State Hackathon Finale.",
        attendees: [
          { rollNo: "24BCSE001", studentName: "Manav Nagpal", department: "Computer Science & Engineering", section: "CSE - Semester 5 (Section A)", dutyType: "PRESENT_ON_DUTY", remarks: "Finalist" },
          { rollNo: "24BCSE002", studentName: "Punith Raj", department: "Computer Science & Engineering", section: "CSE - Semester 5 (Section A)", dutyType: "PRESENT_ON_DUTY", remarks: "Finalist" },
          { rollNo: "STU-1010", studentName: "Aryan Sharma", department: "Information Technology", section: "IT - Semester 5 AIDs", dutyType: "VOLUNTEER", remarks: "Operations" },
        ],
        totalCredited: 3,
        grantedBy: "Dean of Student Affairs / Administration",
        grantedAt: "2026-10-18T16:30:00.000Z",
      },
    ];
  });

  // Selected event for detail modal view
  const [selectedRecordForView, setSelectedRecordForView] = useState<EventAttendanceRecord | null>(null);

  // Search in History
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // Update a single cell in the live spreadsheet grid
  const handleUpdateRowCell = (rowId: string, field: keyof SpreadsheetRow, value: string) => {
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (field === "rollNo") {
          const cleanRoll = value.trim().toUpperCase();
          const match = candidateLookup.get(cleanRoll);
          return {
            ...row,
            rollNo: cleanRoll,
            studentName: match?.name || row.studentName || "Student Candidate",
            department: match?.department || row.department || "Engineering",
            section: match?.section || row.section || "Section A",
            isRecognized: Boolean(match),
          };
        }

        return { ...row, [field]: value };
      })
    );
  };

  // Add 1 New Row to the Spreadsheet
  const handleAddRow = () => {
    const newRow: SpreadsheetRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      rollNo: "",
      studentName: "",
      department: "Computer Science & Engineering",
      section: "Section A",
      dutyType: "PRESENT_ON_DUTY",
      remarks: "Participant",
      isRecognized: false,
    };
    setGridRows((prev) => [...prev, newRow]);
  };

  // Add 5 Rows at once
  const handleAddFiveRows = () => {
    const newRows: SpreadsheetRow[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      rollNo: "",
      studentName: "",
      department: "Computer Science & Engineering",
      section: "Section A",
      dutyType: "PRESENT_ON_DUTY",
      remarks: "Participant",
      isRecognized: false,
    }));
    setGridRows((prev) => [...prev, ...newRows]);
  };

  // Remove a row
  const handleDeleteRow = (rowId: string) => {
    setGridRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Clear all rows
  const handleClearAllRows = () => {
    if (confirm("Are you sure you want to clear all candidate rows in the spreadsheet?")) {
      setGridRows([]);
    }
  };

  // Multi-line Paste Handler (Supports Excel tab-separated or comma-separated rows)
  const handleProcessPastedData = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedRows: SpreadsheetRow[] = [];

    lines.forEach((line, idx) => {
      // Split by tab (Excel copy) or comma
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      const rawRoll = (parts[0] || "").trim().toUpperCase();
      if (!rawRoll) return;

      const match = candidateLookup.get(rawRoll);
      const studentName = (parts[1] || "").trim() || match?.name || "Student Candidate";
      const department = (parts[2] || "").trim() || match?.department || "Engineering";
      const section = (parts[3] || "").trim() || match?.section || "Section A";
      const remarks = (parts[4] || "").trim() || "Participant";

      parsedRows.push({
        id: `paste-${Date.now()}-${idx}`,
        rollNo: rawRoll,
        studentName,
        department,
        section,
        dutyType: "PRESENT_ON_DUTY",
        remarks,
        isRecognized: Boolean(match),
      });
    });

    if (parsedRows.length === 0) {
      showToast("No valid candidate rows could be parsed.");
      return;
    }

    setGridRows((prev) => [...prev, ...parsedRows]);
    setPasteRawText("");
    setIsPasteModalOpen(false);
    showToast(`✓ Added ${parsedRows.length} candidates from clipboard to live spreadsheet!`);
  };

  // Excel File Upload into Live Spreadsheet
  const handleExcelImportToGrid = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromExcel(file);
      if (!Array.isArray(data) || data.length === 0) {
        showToast("Uploaded Excel spreadsheet contains no rows.");
        return;
      }

      const imported: SpreadsheetRow[] = [];
      data.forEach((row: any, idx) => {
        const rollVal =
          row["Roll Number"] ||
          row["Roll No"] ||
          row["Registration No"] ||
          row["Registration Number"] ||
          row["RollNo"] ||
          row["Student ID"] ||
          row["ID"] ||
          Object.values(row)[0];

        if (rollVal) {
          const cleanRoll = String(rollVal).trim().toUpperCase();
          const match = candidateLookup.get(cleanRoll);
          const studentName = row["Student Name"] || row["Name"] || match?.name || "Student Candidate";
          const department = row["Department"] || match?.department || "Engineering";
          const section = row["Section"] || match?.section || "Section A";
          const remarks = row["Remarks"] || row["Role"] || "Participant";

          imported.push({
            id: `excel-${Date.now()}-${idx}`,
            rollNo: cleanRoll,
            studentName: String(studentName),
            department: String(department),
            section: String(section),
            dutyType: "PRESENT_ON_DUTY",
            remarks: String(remarks),
            isRecognized: Boolean(match),
          });
        }
      });

      if (imported.length === 0) {
        showToast("No valid roll numbers identified in the spreadsheet.");
        return;
      }

      setGridRows((prev) => [...prev, ...imported]);
      showToast(`✓ Imported ${imported.length} rows directly into the live spreadsheet grid!`);
    } catch (err: any) {
      showToast(err.message || "Failed to process Excel file.");
    } finally {
      e.target.value = "";
    }
  };

  // Export Current Live Grid to Excel
  const handleExportGridToExcel = () => {
    if (gridRows.length === 0) {
      showToast("Spreadsheet is currently empty. Add candidate rows first.");
      return;
    }
    const exportData = gridRows.map((r, i) => ({
      "Sl No": i + 1,
      "Roll Number": r.rollNo,
      "Student Name": r.studentName,
      "Department": r.department,
      "Section": r.section,
      "Duty Status": r.dutyType,
      "Remarks / Notes": r.remarks,
    }));
    exportToExcel(exportData, `Live_Event_Attendance_Grid_${new Date().toISOString().split("T")[0]}`);
    showToast("✓ Exported live spreadsheet grid to Excel.");
  };

  // Download a blank import template
  const handleDownloadSampleExcel = () => {
    const templateRows = [
      { "Roll Number": "24BCSE001", "Student Name": "Manav Nagpal", "Department": "Computer Science & Engineering", "Section": "CSE - Semester 5 (Section A)", "Remarks": "Hackathon Delegate" },
      { "Roll Number": "24BCSE002", "Student Name": "Punith Raj", "Department": "Computer Science & Engineering", "Section": "CSE - Semester 5 (Section A)", "Remarks": "Core Committee" },
      { "Roll Number": "STU-1010", "Student Name": "Aryan Sharma", "Department": "Information Technology", "Section": "IT - Semester 5 AIDs", "Remarks": "Volunteer" },
    ];
    exportToExcel(templateRows, "Event_Attendance_Live_Template");
    showToast("✓ Downloaded template spreadsheet.");
  };

  // Valid candidates in current spreadsheet
  const validCandidates = useMemo(() => {
    return gridRows.filter((r) => r.rollNo.trim().length >= 2);
  }, [gridRows]);

  // Grant Attendance Action
  const handleGrantEventAttendance = () => {
    if (!eventName.trim()) {
      showToast("Please enter an official Event or Function name.");
      return;
    }
    if (validCandidates.length === 0) {
      showToast("Please enter at least one candidate with a valid roll number in the spreadsheet.");
      return;
    }

    const newRecord: EventAttendanceRecord = {
      id: `ev-rec-${Date.now()}`,
      eventName: eventName.trim(),
      category: eventCategory,
      eventDate,
      timingType,
      customTiming: timingType === "CUSTOM" ? customTiming : undefined,
      notes: eventNotes.trim() || "Institutional event attendance grant approved by administration.",
      attendees: validCandidates.map((c) => ({
        rollNo: c.rollNo,
        studentName: c.studentName,
        department: c.department,
        section: c.section,
        dutyType: c.dutyType,
        remarks: c.remarks,
      })),
      totalCredited: validCandidates.length,
      grantedBy: "Central University Administration",
      grantedAt: new Date().toISOString(),
    };

    const nextHistory = [newRecord, ...historyRecords];
    setHistoryRecords(nextHistory);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smartedu_admin_event_attendance_records_v2", JSON.stringify(nextHistory));
      } catch {}
    }

    const timingDisplay =
      timingType === "FULL_DAY"
        ? "Full Day"
        : timingType === "FORENOON"
        ? "Forenoon (09:00 AM - 01:00 PM)"
        : timingType === "AFTERNOON"
        ? "Afternoon (01:30 PM - 05:00 PM)"
        : customTiming;

    dispatchCampusAlert(
      `✓ Event Attendance Credited: ${validCandidates.length} students granted On-Duty attendance for "${eventName}" on ${eventDate} (${timingDisplay}).`
    );

    // Reset Form
    setEventName("");
    setEventNotes("");
    showToast(`✓ Success! Event attendance credited for ${validCandidates.length} students.`);
  };

  // Revoke Record
  const handleRevokeRecord = (id: string) => {
    if (!confirm("Are you sure you want to revoke this event attendance credit?")) return;
    const nextHistory = historyRecords.filter((r) => r.id !== id);
    setHistoryRecords(nextHistory);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smartedu_admin_event_attendance_records_v2", JSON.stringify(nextHistory));
      } catch {}
    }
    showToast("Event attendance record revoked.");
  };

  // Filtered Spreadsheet Grid Rows based on search
  const filteredGridRows = useMemo(() => {
    if (!gridSearchFilter.trim()) return gridRows;
    const q = gridSearchFilter.toLowerCase().trim();
    return gridRows.filter(
      (r) =>
        r.rollNo.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q)
    );
  }, [gridRows, gridSearchFilter]);

  // Filtered History Records
  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return historyRecords;
    const q = historySearchQuery.toLowerCase().trim();
    return historyRecords.filter(
      (r) =>
        r.eventName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.attendees.some((a) => a.rollNo.toLowerCase().includes(q) || a.studentName.toLowerCase().includes(q))
    );
  }, [historyRecords, historySearchQuery]);

  const categoryOptions = [
    "Technical & Hackathons",
    "Cultural & Arts Festival",
    "Sports & Athletics Olympiad",
    "Academic Conference / Guest Lecture",
    "NSS & Social Outreach Volunteer",
    "Campus Placement / Recruitment Drive",
    "University Delegation / Official OD",
    "Other Institutional Function",
  ];

  const totalEventsCount = historyRecords.length;
  const totalCreditedStudents = historyRecords.reduce((acc, r) => acc + r.totalCredited, 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleExcelImportToGrid}
        className="hidden"
      />

      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-7 sm:p-9 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              UNIVERSITY ACADEMIC GOVERNANCE
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Live Interactive Spreadsheet &amp; OD Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
            Institutional Event &amp; Mass-Attendance Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Grant official On-Duty (OD) attendance credit with our live spreadsheet editor. Edit rows inline, auto-complete student details from roll numbers, paste multi-row tables from Excel, and credit students in bulk.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Functions</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{totalEventsCount}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Students Credited</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalCreditedStudents.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Grid Candidates</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">{validCandidates.length} Rows</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Editor Mode</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">Live Grid</span>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 pointer-events-none opacity-5 dark:opacity-10 text-slate-900 dark:text-white">
          <CalendarCheck className="h-80 w-80" />
        </div>
      </div>

      {/* ─── EVENT INFORMATION & TIMING CONFIGURATION ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-600" />
            <span>1. Event Details &amp; Attendance Timing Schedule</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure the function information and select the session hours that will be credited as On-Duty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              Event / Function Name *
            </label>
            <input
              type="text"
              placeholder="e.g. National Level Hackathon 2026, Annual Sports Olympiad..."
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              Function Category *
            </label>
            <select
              value={eventCategory}
              onChange={(e) => setEventCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              Event Date *
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
            />
          </div>
        </div>

        {/* Timing Schedule Slots */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
            Attendance Timing Schedule (Fixed Format &amp; Slots):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setTimingType("FULL_DAY")}
              className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                timingType === "FULL_DAY"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="block text-xs">Full Day Attendance</span>
              <span className="text-[10px] font-normal opacity-80 block mt-0.5">
                All daily class periods credited as On-Duty (OD)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimingType("FORENOON")}
              className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                timingType === "FORENOON"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="block text-xs">Forenoon (Morning)</span>
              <span className="text-[10px] font-normal opacity-80 block mt-0.5">
                09:00 AM &ndash; 01:00 PM sessions credited
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimingType("AFTERNOON")}
              className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                timingType === "AFTERNOON"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="block text-xs">Afternoon (Post-Lunch)</span>
              <span className="text-[10px] font-normal opacity-80 block mt-0.5">
                01:30 PM &ndash; 05:00 PM sessions credited
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimingType("CUSTOM")}
              className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                timingType === "CUSTOM"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="block text-xs">Custom Time Slot</span>
              <span className="text-[10px] font-normal opacity-80 block mt-0.5">
                Specify custom start and end hours
              </span>
            </button>
          </div>

          {timingType === "CUSTOM" && (
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Custom Hours Window:
              </label>
              <input
                type="text"
                value={customTiming}
                onChange={(e) => setCustomTiming(e.target.value)}
                placeholder="e.g. 10:00 AM - 02:00 PM"
                className="w-full sm:w-80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>
          )}
        </div>

        {/* Official Notes / Description */}
        <div className="text-xs">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
            Event Notes &amp; Official Sanction Justification
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Official university team representing institution in state-level championship finals."
            value={eventNotes}
            onChange={(e) => setEventNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* ─── LIVE INTERACTIVE SPREADSHEET EDITOR ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        {/* Spreadsheet Header & Action Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                LIVE SPREADSHEET GRID
              </span>
              <span className="text-xs text-slate-500">
                {validCandidates.length} Candidates Ready to Credit
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              2. Candidate Attendance Spreadsheet Editor
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit candidate rows live in the grid below. Type roll numbers to auto-detect student records, paste from Excel, or import files.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={handleAddFiveRows}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add 5 Rows</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-indigo-600" />
              <span>Paste from Excel</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Import .xlsx</span>
            </button>

            <button
              type="button"
              onClick={handleExportGridToExcel}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Grid</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllRows}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Clear All Rows"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search within grid */}
        <div className="flex items-center justify-between text-xs">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search in live spreadsheet..."
              value={gridSearchFilter}
              onChange={(e) => setGridSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Total in Grid:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{gridRows.length} Rows</span>
          </div>
        </div>

        {/* Live Editable Spreadsheet Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 min-w-[140px]">Roll Number *</th>
                  <th className="p-3 min-w-[180px]">Student Name</th>
                  <th className="p-3 min-w-[160px]">Department</th>
                  <th className="p-3 min-w-[140px]">Section / Cohort</th>
                  <th className="p-3 min-w-[150px]">Attendance Status</th>
                  <th className="p-3 min-w-[180px]">Duty Role / Remarks</th>
                  <th className="p-3 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGridRows.length > 0 ? (
                  filteredGridRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 text-center font-mono text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Roll Number Input with auto-detection */}
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. 24BCSE001"
                            value={row.rollNo}
                            onChange={(e) => handleUpdateRowCell(row.id, "rollNo", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                          {row.rollNo && (
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                row.isRecognized ? "bg-emerald-500" : "bg-amber-400"
                              }`}
                              title={row.isRecognized ? "Recognized Student in SIS" : "Custom Student ID"}
                            />
                          )}
                        </div>
                      </td>

                      {/* Student Name */}
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Student Name"
                          value={row.studentName}
                          onChange={(e) => handleUpdateRowCell(row.id, "studentName", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Department */}
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Department"
                          value={row.department}
                          onChange={(e) => handleUpdateRowCell(row.id, "department", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none truncate"
                        />
                      </td>

                      {/* Section */}
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Section"
                          value={row.section}
                          onChange={(e) => handleUpdateRowCell(row.id, "section", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none truncate"
                        />
                      </td>

                      {/* Attendance Duty Type */}
                      <td className="p-2">
                        <select
                          value={row.dutyType}
                          onChange={(e) => handleUpdateRowCell(row.id, "dutyType", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="PRESENT_ON_DUTY">PRESENT (ON-DUTY)</option>
                          <option value="VOLUNTEER">VOLUNTEER (OD)</option>
                          <option value="DELEGATE">DELEGATE (OD)</option>
                          <option value="EXEMPTED">EXEMPTED</option>
                        </select>
                      </td>

                      {/* Remarks / Role */}
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="e.g. Organizer / Speaker"
                          value={row.remarks}
                          onChange={(e) => handleUpdateRowCell(row.id, "remarks", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Delete Row Button */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No candidate rows in the spreadsheet. Click &quot;+ Add Row&quot; or &quot;Paste from Excel&quot; to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Execution & Grant Action Footer */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              <strong>{validCandidates.length}</strong> candidates will receive official On-Duty Attendance for <strong>{timingType === "FULL_DAY" ? "Full Day" : timingType}</strong>.
            </span>
          </div>

          <button
            type="button"
            onClick={handleGrantEventAttendance}
            disabled={validCandidates.length === 0 || !eventName.trim()}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer self-end"
          >
            <Send className="h-4 w-4" />
            <span>Grant Event Attendance ({validCandidates.length} Candidates)</span>
          </button>
        </div>
      </div>

      {/* ─── PAST EVENT ATTENDANCE GRANTS & AUDIT ROSTER ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Event Attendance Audit History ({filteredHistory.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent register of all mass event attendance grants across university functions.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search event name, roll or note..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event / Function</th>
                  <th className="py-3 px-4">Date &amp; Timing Slot</th>
                  <th className="py-3 px-4 text-center">Credited Students</th>
                  <th className="py-3 px-4">Admin Remarks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {rec.eventName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block mt-0.5">
                          {rec.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {rec.eventDate}
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans">
                        {rec.timingType === "FULL_DAY"
                          ? "Full Day Exemption"
                          : rec.timingType === "FORENOON"
                          ? "Forenoon (09:00 - 13:00)"
                          : rec.timingType === "AFTERNOON"
                          ? "Afternoon (13:30 - 17:00)"
                          : rec.customTiming}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {rec.totalCredited} Attendees
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                      {rec.notes}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRecordForView(rec)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Attendees</span>
                        </button>
                        <button
                          onClick={() => {
                            const exportData = rec.attendees.map((a) => ({
                              "Event Name": rec.eventName,
                              "Category": rec.category,
                              "Event Date": rec.eventDate,
                              "Timing": rec.timingType,
                              "Student Roll No": a.rollNo,
                              "Student Name": a.studentName,
                              "Department": a.department,
                              "Section": a.section,
                              "Attendance Status": a.dutyType || "PRESENT_ON_DUTY",
                              "Remarks": a.remarks || "",
                            }));
                            exportToExcel(exportData, `Event_Attendance_${rec.eventName.replace(/[\s\W]+/g, "_")}`);
                          }}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-emerald-600 cursor-pointer"
                          title="Export Attendee Excel"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevokeRecord(rec.id)}
                          className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 cursor-pointer"
                          title="Revoke Attendance"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No event attendance records match your search.
          </div>
        )}
      </div>

      {/* ─── PASTE DATA MODAL ─── */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Paste Multiple Rows from Clipboard / Excel
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Copy a range of rows from Excel or Google Sheets and paste here. Format: <code>Roll Number [Tab] Name [Tab] Department [Tab] Section</code> or simply a list of roll numbers separated by line breaks.
            </p>

            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="24BCSE001&#9;Manav Nagpal&#9;CSE&#9;Section A&#10;24BCSE002&#9;Punith Raj&#9;CSE&#9;Section A&#10;STU-1010&#9;Aryan Sharma&#9;IT&#9;Section B"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPastedData}
                disabled={!pasteRawText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Insert Rows to Spreadsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ATTENDEE DETAIL MODAL ─── */}
      {selectedRecordForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {selectedRecordForView.eventName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRecordForView.category} &bull; {selectedRecordForView.eventDate} &bull; {selectedRecordForView.totalCredited} Attendees
                </p>
              </div>
              <button
                onClick={() => setSelectedRecordForView(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-2">Roll Number</th>
                    <th className="p-2">Candidate Name</th>
                    <th className="p-2">Department &amp; Section</th>
                    <th className="p-2">Duty Role</th>
                    <th className="p-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedRecordForView.attendees.map((a, idx) => (
                    <tr key={`${a.rollNo}-${idx}`}>
                      <td className="p-2 font-mono font-bold text-blue-600">{a.rollNo}</td>
                      <td className="p-2 font-semibold text-slate-900 dark:text-white">{a.studentName}</td>
                      <td className="p-2 text-slate-500">{a.department} &bull; {a.section}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-400">{a.remarks || "Participant"}</td>
                      <td className="p-2 text-right">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {a.dutyType || "PRESENT (OD)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setSelectedRecordForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}