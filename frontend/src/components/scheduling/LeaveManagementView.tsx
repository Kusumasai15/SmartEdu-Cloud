"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Calendar,
  Users,
  Building,
  Check,
  ArrowRight,
  Info,
  CalendarDays,
  UserX,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useAcademicData,
  FacultyLeaveRequest,
  FacultyLeaveSubstitution,
} from "@/context/AcademicDataContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeaveManagementViewProps {
  canReview?: boolean; // For HOD / Admin
}

const LEAVE_TYPES = [
  { id: "CASUAL", name: "Casual Leave (CL)" },
  { id: "MEDICAL", name: "Medical Leave (ML)" },
  { id: "DUTY", name: "Academic / Conference Duty Leave (OD)" },
  { id: "RESEARCH", name: "Research Sabbatical" },
  { id: "EMERGENCY", name: "Emergency Leave" },
];

export function LeaveManagementView({ canReview = false }: LeaveManagementViewProps) {
  const { user } = useAuth();
  const {
    users,
    calendarSchedules,
    facultyLeaves,
    applyFacultyLeave,
    respondToSubstitution,
    reviewFacultyLeave,
  } = useAcademicData();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<"CASUAL" | "MEDICAL" | "DUTY" | "RESEARCH" | "EMERGENCY">("CASUAL");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [reason, setReason] = useState("");
  const [substitutions, setSubstitutions] = useState<Record<string, { facultyId: string; facultyName: string }>>({});
  const [reviewNote, setReviewNote] = useState("");
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState<FacultyLeaveRequest | null>(null);

  // Available colleague faculty for substitution
  const facultyColleagues = useMemo(() => {
    return users.filter(
      (u) =>
        (u.role === "FACULTY" || u.role === "HOD") &&
        u.id !== user?.id &&
        u.email !== user?.email
    );
  }, [users, user]);

  // Find lectures that fall in the selected faculty's leave period
  const conflictingLectures = useMemo(() => {
    if (!user) return [];
    const facultyName = `${user.first_name} ${user.last_name || ""}`.trim().toLowerCase();

    return calendarSchedules.filter((ev) => {
      const isMyClass =
        ev.faculty?.toLowerCase().includes(facultyName) ||
        ev.facultyEmail?.toLowerCase() === user.email.toLowerCase();

      // Check if day/date matches
      return isMyClass;
    });
  }, [calendarSchedules, user]);

  // Leave applications relevant to this user
  const relevantLeaves = useMemo(() => {
    if (canReview) return facultyLeaves;
    return facultyLeaves.filter(
      (l) => l.facultyId === user?.id || l.facultyName.toLowerCase().includes((user?.first_name || "").toLowerCase())
    );
  }, [facultyLeaves, user, canReview]);

  // Substitutions requested of this user
  const pendingSubstitutionRequests = useMemo(() => {
    if (!user) return [];
    const myId = user.id;
    const myEmail = user.email.toLowerCase();
    const myName = `${user.first_name} ${user.last_name || ""}`.trim().toLowerCase();

    const list: Array<{ leave: FacultyLeaveRequest; sub: FacultyLeaveSubstitution }> = [];

    facultyLeaves.forEach((leave) => {
      leave.substitutions.forEach((sub) => {
        if (
          (sub.substituteFacultyId === myId ||
            sub.substituteFacultyName.toLowerCase().includes(myName)) &&
          sub.status === "PENDING" &&
          leave.status === "PENDING"
        ) {
          list.push({ leave, sub });
        }
      });
    });

    return list;
  }, [facultyLeaves, user]);

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      alert("Please fill in all leave dates and reason.");
      return;
    }

    if (conflictingLectures.some((lecture) => !substitutions[lecture.id])) {
      alert("Select a substitute faculty member for every affected class.");
      return;
    }

    // Check that every conflicting lecture has an assigned substitute
    const substitutionList: FacultyLeaveSubstitution[] = conflictingLectures.map((lec) => {
      const assigned = substitutions[lec.id];
      return {
        id: `sub-${lec.id}-${Date.now()}`,
        eventId: lec.id,
        courseCode: lec.courseCode,
        courseName: lec.courseName,
        sessionDate: startDate,
        sessionTime: `${lec.startTime} - ${lec.endTime}`,
        room: lec.room,
        substituteFacultyId: assigned.facultyId,
        substituteFacultyName: assigned.facultyName,
        status: "PENDING",
      };
    });

    const deptName = typeof user?.department === "string" ? user.department : (user?.department as any)?.name || "";

    applyFacultyLeave({
      facultyId: user?.id || "",
      facultyName: user ? `${user.first_name} ${user.last_name || ""}`.trim() : "",
      department: deptName,
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      substitutions: substitutionList,
    });

    setIsApplyOpen(false);
    setReason("");
    setSubstitutions({});
  };

  const handleReviewAction = (status: "APPROVED" | "REJECTED") => {
    if (!selectedLeaveForReview) return;
    reviewFacultyLeave(
      selectedLeaveForReview.id,
      status,
      user ? `${user.first_name} ${user.last_name || ""}`.trim() : "HOD / Academic Dean",
      reviewNote || undefined
    );
    setSelectedLeaveForReview(null);
    setReviewNote("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Apply CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <span>Faculty Leave Management &amp; Lecture Substitution</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit leave requests with mandatory peer lecture substitution. Once substitutions are accepted and approved by HOD, timetables update automatically for students.
          </p>
        </div>

        <Button
          onClick={() => setIsApplyOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl h-10 px-5 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* Pending Substitution Requests for Current Faculty */}
      {pendingSubstitutionRequests.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="font-extrabold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Pending Peer Substitution Requests ({pendingSubstitutionRequests.length})
            </h3>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            A colleague has requested you to substitute their lectures during their leave. Please accept or decline:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingSubstitutionRequests.map(({ leave, sub }) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 space-y-2 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {sub.courseName || sub.courseCode} ({sub.courseCode})
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                    Requested by {leave.facultyName}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                  <p>📅 <strong>Date:</strong> {sub.sessionDate} &bull; ⏰ <strong>Time:</strong> {sub.sessionTime}</p>
                  <p>📍 <strong>Room:</strong> {sub.room || "Assigned Classroom"}</p>
                  <p className="text-slate-400 italic">Leave Reason: "{leave.reason}"</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => respondToSubstitution(leave.id, sub.id, "REJECTED")}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToSubstitution(leave.id, sub.id, "ACCEPTED")}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    <span>Accept Substitution</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Records Table / Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
          {canReview ? "All Institutional Leave Applications" : "My Leave History & Substitution Status"} ({relevantLeaves.length})
        </h3>

        {relevantLeaves.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Calendar className="h-8 w-8 text-slate-400 mx-auto opacity-50" />
            <p className="text-xs text-slate-500 font-bold">No leave applications found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantLeaves.map((leave) => {
              const isApproved = leave.status === "APPROVED";
              const isRejected = leave.status === "REJECTED";
              const isPending = leave.status === "PENDING";

              return (
                <div
                  key={leave.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {leave.leaveType[0]}L
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {leave.facultyName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                            {leave.leaveType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {leave.department} &bull; Applied on {new Date(leave.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge & Review Button */}
                    <div className="flex items-center gap-2">
                      {isApproved && (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Approved &bull; Lectures Substituted</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Pending HOD Approval</span>
                        </span>
                      )}

                      {canReview && isPending && (
                        <button
                          type="button"
                          onClick={() => setSelectedLeaveForReview(leave)}
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                        >
                          Review Leave
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dates & Reason */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                    <p className="text-slate-700 dark:text-slate-300">
                      📅 <strong>Period:</strong> {leave.startDate} to {leave.endDate}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      📝 <strong>Reason:</strong> "{leave.reason}"
                    </p>
                  </div>

                  {/* Substitutions Accordion */}
                  {leave.substitutions && leave.substitutions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Assigned Class Substitutions ({leave.substitutions.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {leave.substitutions.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <strong className="text-slate-900 dark:text-white block">
                                {sub.courseCode}: {sub.courseName || "Lecture"}
                              </strong>
                              <span className="text-slate-400">
                                Substitute: <strong>Prof. {sub.substituteFacultyName}</strong>
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                sub.status === "ACCEPTED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : sub.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {sub.status === "ACCEPTED" ? "Peer Accepted" : sub.status === "REJECTED" ? "Declined" : "Pending Acceptance"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {leave.reviewComment && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                      HOD / Reviewer Remark: "{leave.reviewComment}" (by {leave.reviewedBy})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {isApplyOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-xs my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Apply for Faculty Leave
                </h3>
                <p className="text-slate-400 text-[11px]">
                  All scheduled lectures during the leave period must be assigned a substitute
                </p>
              </div>
              <button
                onClick={() => setIsApplyOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Attending IEEE International Conference on Cloud AI / Medical Consultation..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Mandatory Lecture Substitution Section */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                    Mandatory Lecture Substitution ({conflictingLectures.length} Classes Found)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a substitute faculty colleague for each session. They will be notified to take your lecture:
                </p>

                {conflictingLectures.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic bg-white dark:bg-slate-900 p-2 rounded-xl">
                    No conflicting classes found in timetable during this period.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conflictingLectures.map((lec) => (
                      <div
                        key={lec.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 dark:text-white">
                            {lec.courseCode}: {lec.courseName}
                          </strong>
                          <span className="font-mono text-slate-400 text-[10px]">
                            {lec.startTime} - {lec.endTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold shrink-0">Assign Colleague:</span>
                          <select
                            onChange={(e) => {
                              const facId = e.target.value;
                              const match = facultyColleagues.find((f) => f.id === facId);
                              if (match) {
                                setSubstitutions({
                                  ...substitutions,
                                  [lec.id]: {
                                    facultyId: match.id,
                                    facultyName: `${match.first_name} ${match.last_name || ""}`.trim(),
                                  },
                                });
                              }
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold"
                          >
                            {facultyColleagues.map((f) => (
                              <option key={f.id} value={f.id}>
                                Prof. {f.first_name} {f.last_name || ""} ({f.department || "Faculty"})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Submit Application with Substitutions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal for HOD / Admin */}
      {selectedLeaveForReview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Review Leave Application
              </h3>
              <button
                onClick={() => setSelectedLeaveForReview(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-slate-700 dark:text-slate-300">
              <p><strong>Faculty:</strong> Prof. {selectedLeaveForReview.facultyName}</p>
              <p><strong>Type:</strong> {selectedLeaveForReview.leaveType}</p>
              <p><strong>Dates:</strong> {selectedLeaveForReview.startDate} to {selectedLeaveForReview.endDate}</p>
              <p><strong>Reason:</strong> "{selectedLeaveForReview.reason}"</p>
              <p><strong>Substituted Lectures:</strong> {selectedLeaveForReview.substitutions.length} class(es)</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                HOD Decision Remarks
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Optional approval/rejection remarks..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleReviewAction("REJECTED")}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Reject Leave
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction("APPROVED")}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Approve &amp; Substitute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
