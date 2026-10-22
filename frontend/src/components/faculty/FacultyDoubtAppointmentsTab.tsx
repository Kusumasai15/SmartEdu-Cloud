"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MapPin,
  MessageSquare,
  Check,
  Send,
  Building,
  Video,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useAcademicData,
  StudentDoubtSession,
} from "@/context/AcademicDataContext";

export function FacultyDoubtAppointmentsTab() {
  const { user } = useAuth();
  const { doubtSessions, respondToDoubtSession, facultyPresence } = useAcademicData();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "COMPLETED">("ALL");
  const [responseModalSession, setResponseModalSession] = useState<StudentDoubtSession | null>(null);
  const [responseAction, setResponseAction] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  const [customNote, setCustomNote] = useState("Please come to my cabin at the scheduled time with your laptop.");
  const [locationInput, setLocationInput] = useState("Cabin 304, Admin Block");

  const myFacultySessions = useMemo(() => {
    if (!user) return [];
    const myId = user.id;
    const myName = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase();
    const myEmail = (user.email || "").toLowerCase();

    const specific = doubtSessions.filter(
      (s) =>
        s.facultyId === myId ||
        (myName && (s.facultyName.toLowerCase().includes(myName) || myName.includes(s.facultyName.toLowerCase()))) ||
        (s.facultyEmail && s.facultyEmail.toLowerCase() === myEmail)
    );

    return specific;
  }, [doubtSessions, user]);

  const filteredSessions = useMemo(() => {
    if (activeFilter === "ALL") return myFacultySessions;
    return myFacultySessions.filter((s) => s.status === activeFilter);
  }, [myFacultySessions, activeFilter]);

  const handleOpenResponse = (session: StudentDoubtSession, action: "ACCEPTED" | "DECLINED") => {
    setResponseModalSession(session);
    setResponseAction(action);
    if (action === "ACCEPTED") {
      const cabin = facultyPresence[user?.id || user?.email || ""]?.cabinNumber || "Cabin 304, Admin Block";
      setLocationInput(session.meetingMode === "IN_CABIN" ? cabin : "Virtual Google Meet / Teams Room");
      setCustomNote("Accepted. Please bring your code files and doubt notes.");
    } else {
      setCustomNote("Unable to accommodate due to department meeting. Please select another slot.");
    }
  };

  const handleConfirmResponse = () => {
    if (!responseModalSession) return;
    respondToDoubtSession(
      responseModalSession.id,
      responseAction,
      customNote.trim() || undefined,
      locationInput.trim() || undefined
    );
    setResponseModalSession(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
            <span>Student 1:1 Doubt &amp; Consultation Appointments</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review and approve student bookings for office hours, doubt solving, and mentoring sessions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold shrink-0">
          {(["ALL", "PENDING", "ACCEPTED", "COMPLETED"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeFilter === filter
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {filter === "ALL" ? `All (${myFacultySessions.length})` : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Cards */}
      {filteredSessions.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
          <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
            No Consultations Found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When students request 1:1 office hour sessions from their directory, they will appear here for 1-click confirmation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => {
            const isPending = session.status === "PENDING";
            const isAccepted = session.status === "ACCEPTED";
            const isDeclined = session.status === "DECLINED";

            return (
              <div
                key={session.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center text-xs">
                        {session.studentName[0]}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {session.studentName}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Roll: {session.rollNo || "Enrolled"} &bull; {session.courseCode}
                        </p>
                      </div>
                    </div>

                    {isPending && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </span>
                    )}
                    {isAccepted && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Confirmed</span>
                      </span>
                    )}
                    {isDeclined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-bold flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        <span>Declined</span>
                      </span>
                    )}
                  </div>

                  {/* Doubt Question Topic */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Doubt Question / Inquiry:
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      "{session.topic}"
                    </p>
                  </div>

                  {/* Meeting Time & Mode */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>{session.requestedDate} ({session.requestedTime})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="truncate">{session.meetingLocation || "Faculty Cabin"}</span>
                    </div>
                  </div>

                  {session.responseNote && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                      My Note to Student: "{session.responseNote}"
                    </p>
                  )}
                </div>

                {/* Actions for Pending */}
                {isPending && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenResponse(session, "DECLINED")}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenResponse(session, "ACCEPTED")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve &amp; Confirm</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Response Note Modal */}
      {responseModalSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {responseAction === "ACCEPTED" ? "Confirm Doubt Consultation" : "Decline Consultation Request"}
              </h3>
              <button
                onClick={() => setResponseModalSession(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              Student: <strong>{responseModalSession.studentName}</strong> on <strong>"{responseModalSession.topic}"</strong>
            </p>

            {responseAction === "ACCEPTED" && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Meeting Location / Cabin Room
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Cabin 304, Admin Block"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Note / Message for Student
              </label>
              <textarea
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Add special instructions or preparation notes..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResponseModalSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResponse}
                className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer shadow-md ${
                  responseAction === "ACCEPTED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {responseAction === "ACCEPTED" ? "Approve Session" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
