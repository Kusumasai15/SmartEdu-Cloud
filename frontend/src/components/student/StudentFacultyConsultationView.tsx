"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Building,
  Coffee,
  BookOpen,
  VolumeX,
  LogOut,
  Send,
  Plus,
  ChevronRight,
  Info,
  Sparkles,
  CalendarCheck,
  CalendarDays,
  User,
  Phone,
  Mail,
  DoorOpen,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useAcademicData,
  CalendarScheduleEvent,
  StudentDoubtSession,
  SyncUser,
} from "@/context/AcademicDataContext";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

const DAYS_OF_WEEK = [
  { index: 1, name: "Monday", short: "Mon" },
  { index: 2, name: "Tuesday", short: "Tue" },
  { index: 3, name: "Wednesday", short: "Wed" },
  { index: 4, name: "Thursday", short: "Thu" },
  { index: 5, name: "Friday", short: "Fri" },
  { index: 6, name: "Saturday", short: "Sat" },
];

const TIME_SLOTS = [
  "08:00 AM - 08:55 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:15 AM - 12:15 PM",
  "12:15 PM - 01:15 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
];

// Helper: parse time string into minutes from midnight for chronological sorting
const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && h < 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

export function StudentFacultyConsultationView() {
  const { user } = useAuth();
  const {
    users,
    courses,
    calendarSchedules,
    facultyPresence,
    getEffectiveFacultyPresence,
    doubtSessions,
    requestDoubtSession,
  } = useAcademicData();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<SyncUser | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<number>(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 6 ? day : 1;
  });
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [remoteFaculty, setRemoteFaculty] = useState<SyncUser[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ success?: boolean; data?: any[] }>("/faculty-directory")
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setRemoteFaculty(
            list.map((u: any) => ({
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name || "",
              email: u.email,
              role: (u.role || "FACULTY").toUpperCase() as any,
              department: u.department || "Computer Science & Engineering",
              faculty_identifier: u.faculty_identifier || undefined,
              designation: u.designation || "Assistant Professor",
              office_number: u.office_number || "",
              office_hours: u.office_hours || "",
              phone: u.phone || "",
              is_active: true,
              twoFactorEnabled: false,
              lastLoginDate: "",
              created_at: "",
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Booking Form State
  const [topic, setTopic] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [bookingTime, setBookingTime] = useState("03:00 PM - 04:00 PM");
  const [bookingLocationMode, setBookingLocationMode] = useState<"IN_CABIN" | "ONLINE_LINK">("IN_CABIN");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter all faculty and HOD members
  const facultyMembers = useMemo(() => {
    const list = users.filter(
      (u) =>
        u.role === "FACULTY" ||
        u.role === "HOD" ||
        u.email?.toLowerCase().includes("faculty") ||
        u.email?.toLowerCase().includes("hod")
    );
    if (list.length > 0) return list;
    return remoteFaculty;
  }, [users, remoteFaculty]);

  const filteredFaculty = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    return facultyMembers.filter(
      (f) =>
        `${f.first_name} ${f.last_name || ""}`.toLowerCase().includes(term) ||
        (f.department || "").toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        (f.office_number || "").toLowerCase().includes(term)
    );
  }, [facultyMembers, searchTerm]);

  // Selected faculty's weekly classes strictly filtered and sorted chronologically
  const selectedFacultySchedule = useMemo(() => {
    if (!selectedFaculty) return [];
    const curEmail = selectedFaculty.email.toLowerCase().trim();
    const curFullName = `${selectedFaculty.first_name} ${selectedFaculty.last_name || ""}`.toLowerCase().trim();
    const curFirstName = selectedFaculty.first_name.toLowerCase().trim();

    // Courses where this faculty is designated instructor
    const myTaughtCodes = new Set(
      courses
        .filter((c) => {
          const inst = (c.instructor || "").toLowerCase().trim();
          if (!inst) return false;
          if (curFullName && (inst === curFullName || inst.includes(curFullName) || curFullName.includes(inst))) return true;
          if (curFirstName.length >= 3 && inst.includes(curFirstName)) return true;
          return false;
        })
        .map((c) => (((c as any).course_code || (c as any).code || "") as string).toLowerCase().trim())
        .filter(Boolean)
    );

    return calendarSchedules
      .filter((ev) => {
        const evEmail = (ev.facultyEmail || "").toLowerCase().trim();
        const evFaculty = (ev.faculty || "").toLowerCase().trim();

        // 1. Direct email match
        if (evEmail && curEmail && evEmail === curEmail) return true;

        // 2. Direct name match
        if (evFaculty && curFullName) {
          if (evFaculty === curFullName || evFaculty.includes(curFullName) || curFullName.includes(evFaculty)) return true;
          if (curFirstName.length >= 4 && evFaculty.includes(curFirstName)) {
            // Check if another faculty with this first name exists
            const isOther = facultyMembers.some((u) => {
              if (u.id === selectedFaculty.id) return false;
              const oFull = `${u.first_name} ${u.last_name || ""}`.toLowerCase().trim();
              return oFull && evFaculty.includes(oFull) && !curFullName.includes(oFull);
            });
            if (!isOther) return true;
          }
        }

        // 3. Exclude if explicitly assigned to another faculty member
        if (evFaculty && evFaculty !== "faculty teacher" && evFaculty !== "assigned faculty") {
          const assignedToOther = facultyMembers.some((u) => {
            if (u.id === selectedFaculty.id) return false;
            const oFull = `${u.first_name} ${u.last_name || ""}`.toLowerCase().trim();
            const oFirst = u.first_name.toLowerCase().trim();
            return (oFull && evFaculty.includes(oFull)) || (oFirst.length >= 4 && evFaculty.includes(oFirst));
          });
          if (assignedToOther) return false;
        }

        // 4. Course taught by this faculty
        if (ev.courseCode && myTaughtCodes.has(ev.courseCode.toLowerCase().trim())) {
          return true;
        }

        return false;
      })
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }, [selectedFaculty, calendarSchedules, courses, facultyMembers]);

  // Student's personal doubt sessions
  const myDoubtSessions = useMemo(() => {
    if (!user) return [];
    return doubtSessions.filter(
      (s) => s.studentId === user.id || s.studentEmail === user.email
    );
  }, [doubtSessions, user]);

  const getPresenceBadge = (facultyId: string, facultyEmail: string, facultyName?: string) => {
    const record = getEffectiveFacultyPresence(facultyId, facultyName, facultyEmail);

    switch (record.status) {
      case "IN_CABIN":
        return {
          label: "In Cabin (Available)",
          sub: record.cabinNumber || "Cabin 304, Admin Block",
          dot: "bg-emerald-500",
          textColor: "text-emerald-700 dark:text-emerald-300",
          bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800",
          icon: <Building className="h-3.5 w-3.5 text-emerald-600" />,
        };
      case "IN_CLASS":
        return {
          label: record.isAutoDetected ? "In Class (Teaching)" : "In Class",
          sub: record.currentRoom ? `${record.currentRoom} • Class in session` : "Lecture Hall",
          dot: "bg-blue-500",
          textColor: "text-blue-700 dark:text-blue-300",
          bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800",
          icon: <BookOpen className="h-3.5 w-3.5 text-blue-600" />,
        };
      case "ON_BREAK":
        return {
          label: "On Break / Out of Office",
          sub: "Expected back shortly",
          dot: "bg-amber-500",
          textColor: "text-amber-700 dark:text-amber-300",
          bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800",
          icon: <Coffee className="h-3.5 w-3.5 text-amber-600" />,
        };
      case "BUSY":
        return {
          label: "In Meeting / Consultation",
          sub: "Do not disturb",
          dot: "bg-purple-500",
          textColor: "text-purple-700 dark:text-purple-300",
          bg: "bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800",
          icon: <VolumeX className="h-3.5 w-3.5 text-purple-600" />,
        };
      default:
        return {
          label: "Off Campus / Away",
          sub: "Not in cabin",
          dot: "bg-slate-400",
          textColor: "text-slate-700 dark:text-slate-300",
          bg: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700",
          icon: <LogOut className="h-3.5 w-3.5 text-slate-500" />,
        };
    }
  };

  const handleBookSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty || !topic.trim()) return;

    const facultyName = `${selectedFaculty.first_name} ${selectedFaculty.last_name || ""}`.trim();

    requestDoubtSession({
      studentId: user?.id || "student-1",
      studentName: user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student",
      studentEmail: user?.email,
      rollNo: user?.student_identifier || "CS2026-081",
      facultyId: selectedFaculty.id,
      facultyName,
      courseCode,
      topic: topic.trim(),
      requestedDate: bookingDate,
      requestedTime: bookingTime,
      meetingMode: bookingLocationMode,
      meetingLocation:
        bookingLocationMode === "IN_CABIN"
          ? facultyPresence[selectedFaculty.id]?.cabinNumber || selectedFaculty.office_number || "Faculty Cabin"
          : "Virtual Consultation Room",
    });

    setTopic("");
    setIsBookingModalOpen(false);
    setSuccessToast(`1:1 Consultation request dispatched to Prof. ${facultyName}!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const dayEvents = useMemo(() => {
    return selectedFacultySchedule.filter((ev) => ev.dayIndex === selectedDayTab);
  }, [selectedFacultySchedule, selectedDayTab]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Campus Faculty Directory &amp; Office Cabins
            </p>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            Faculty Directory &amp; Cabin Availability
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search for a faculty member by name, department, or cabin to view their live teaching timetable and book a 1:1 consultation
          </p>
        </div>

        {selectedFaculty && (
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 text-xs font-bold rounded-xl h-9 px-4 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            <span>Book 1:1 Consultation Slot</span>
          </Button>
        )}
      </div>

      {/* Prominent Search Bar Only (Until User Types or Selects a Faculty Member) */}
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!e.target.value.trim()) {
                setSelectedFaculty(null);
              }
            }}
            placeholder="Search faculty by name, department, email, or cabin number..."
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedFaculty(null);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1.5 py-0.5 rounded-md cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Only render results and details when user has typed a search query or selected a faculty */}
      {(searchTerm.trim().length > 0 || selectedFaculty) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 Cols): Matching Search Results */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredFaculty.map((f) => {
              const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
              const badge = getPresenceBadge(f.id, f.email, fullName);
              const isSelected = selectedFaculty?.id === f.id;

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFaculty(f)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/30"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center font-bold text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                        {(f.first_name?.[0] || "") + (f.last_name?.[0] || "")}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Prof. {fullName}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {f.designation || "Assistant Professor"} &bull; {f.department}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-blue-600 dark:text-blue-400 translate-x-0.5" : "text-slate-400"}`} />
                  </div>

                  {/* Status & Cabin Info */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                      <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span>{f.office_number || "Cabin C-204"}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.textColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {searchTerm.trim().length > 0 && filteredFaculty.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching faculty found</p>
                <p className="text-[11px] text-slate-400">Try searching with a different professor name or department.</p>
              </div>
            )}
          </div>

        {/* Right Column (7 Cols): Selected Faculty Profile, Timetable Grid, & Appointments */}
        <div className="lg:col-span-7 space-y-6">
          {selectedFaculty ? (
            <>
              {/* Faculty Profile Capsule Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20 shrink-0">
                      {(selectedFaculty.first_name?.[0] || "") + (selectedFaculty.last_name?.[0] || "")}
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Prof. {selectedFaculty.first_name} {selectedFaculty.last_name || ""}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedFaculty.designation || "Faculty Member"} &bull; {selectedFaculty.department}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <DoorOpen className="h-3.5 w-3.5 text-blue-500" />
                          <span>{selectedFaculty.office_number || "Cabin C-204"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>Office: {selectedFaculty.office_hours || "02:00 PM - 04:00 PM"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          <span>{selectedFaculty.email}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Presence Status */}
                  {(() => {
                    const fullName = `${selectedFaculty.first_name} ${selectedFaculty.last_name || ""}`.trim();
                    const badge = getPresenceBadge(selectedFaculty.id, selectedFaculty.email, fullName);
                    return (
                      <div className={`p-3 rounded-xl border ${badge.bg} space-y-0.5 shrink-0 text-right sm:text-left`}>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
                          <span className={badge.textColor}>{badge.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">{badge.sub}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Exact Faculty Teaching Timetable (Day-by-Day View) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-4 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      <span>Official Teaching Timetable</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      View class sessions and free cabin slots across Monday through Saturday
                    </p>
                  </div>

                  {/* Day Selector Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.index}
                        onClick={() => setSelectedDayTab(day.index)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedDayTab === day.index
                            ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Timetable Slots */}
                <div className="space-y-2.5">
                  {dayEvents.length > 0 ? (
                    dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {ev.startTime} - {ev.endTime}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {ev.courseCode}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {ev.courseName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {ev.className || "Class Cohort"} &bull; Venue: {ev.room} ({ev.building || "Academic Block"})
                          </p>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                          Teaching Session
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl space-y-1">
                      <CalendarCheck className="h-6 w-6 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        No Classes Scheduled on {DAYS_OF_WEEK.find((d) => d.index === selectedDayTab)?.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Professor is available in office cabin for student doubt consultations during campus hours.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* My Scheduled Doubt Consultations */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-emerald-600" />
                    <span>My Scheduled Consultation Appointments ({myDoubtSessions.length})</span>
                  </h3>
                </div>

                {myDoubtSessions.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {myDoubtSessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Prof. {s.facultyName} &bull; {s.courseCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : s.status === "DECLINED"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {s.status === "ACCEPTED" ? "Approved" : s.status === "DECLINED" ? "Declined" : "Pending"}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">Topic: {s.topic}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700">
                          <span>
                            {s.requestedDate} ({s.requestedTime})
                          </span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{s.meetingLocation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    You have no scheduled 1:1 consultation appointments yet. Click &ldquo;Book 1:1 Consultation Slot&rdquo; to request a session.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Select a Faculty Member</p>
              <p className="text-xs text-slate-400">Choose a searched professor on the left to inspect their cabin availability and lecture timetable.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Booking Dialog Modal */}
      {isBookingModalOpen && selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Schedule 1:1 Consultation
                </h3>
                <p className="text-slate-400 text-[11px]">
                  With Prof. {selectedFaculty.first_name} {selectedFaculty.last_name || ""}
                </p>
              </div>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleBookSession} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Subject / Course Code
                </label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. IT-303 or Computer Networks"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Doubt Topic &amp; Question Details
                </label>
                <textarea
                  rows={3}
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Specify the topics or questions you wish to clarify..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time Window
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingLocationMode("IN_CABIN")}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      bookingLocationMode === "IN_CABIN"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                        : "bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                    }`}
                  >
                    🏢 Physical Cabin Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingLocationMode("ONLINE_LINK")}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      bookingLocationMode === "ONLINE_LINK"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                        : "bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                    }`}
                  >
                    💻 Online Video Call
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  Confirm &amp; Request Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
