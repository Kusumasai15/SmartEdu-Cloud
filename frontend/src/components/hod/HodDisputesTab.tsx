"use client";

import React, { useState, useMemo } from "react";
import { UserCheck, CheckCircle2, XCircle, Search, FileText, Check } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";

export interface DisputeRecord {
  id: string;
  studentName: string;
  rollNo: string;
  courseCode: string;
  sessionDate: string;
  claimedStatus: "Present";
  evidenceNote: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface HodDisputesTabProps {
  disputes: DisputeRecord[];
  onResolveDispute: (id: string, decision: "APPROVED" | "REJECTED") => void;
}

export function HodDisputesTab({ disputes, onResolveDispute }: HodDisputesTabProps) {
  const [filter, setFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");

  const pendingCount = disputes.filter((d) => d.status === "PENDING").length;
  const resolvedCount = disputes.filter((d) => d.status !== "PENDING").length;

  const filtered = useMemo(() => {
    return disputes.filter((d) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "PENDING" && d.status === "PENDING") ||
        (filter === "RESOLVED" && d.status !== "PENDING");

      const matchesSearch =
        d.studentName.toLowerCase().includes(search.toLowerCase()) ||
        d.rollNo.toLowerCase().includes(search.toLowerCase()) ||
        d.courseCode.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [disputes, filter, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Student Attendance Correction Requests"
        description="Review student attendance correction requests and medical notes."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border shadow-xs space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Pending Review</span>
          <p className="text-xl font-semibold text-foreground font-mono">{pendingCount} Requests</p>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Needs review</span>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-xs space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Resolved This Term</span>
          <p className="text-xl font-semibold text-foreground font-mono">{resolvedCount} Processed</p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Attendance updated</span>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-xs space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Average Review Time</span>
          <p className="text-xl font-semibold text-foreground font-mono">&lt; 24 Hours</p>
          <span className="text-xs text-muted-foreground">Standard turnaround</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or course..."
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-border bg-secondary/50 text-foreground text-xs font-medium focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: "PENDING", label: `Pending (${pendingCount})` },
            { id: "RESOLVED", label: `Resolved (${resolvedCount})` },
            { id: "ALL", label: `All (${disputes.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Course</th>
              <th className="p-3">Session Date</th>
              <th className="p-3">Claimed Status</th>
              <th className="p-3">Reason / Note</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">
                  No attendance correction requests found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="p-3">
                    <strong className="text-foreground block font-semibold">{d.studentName}</strong>
                    <span className="text-[10px] text-muted-foreground font-mono">{d.rollNo}</span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-primary">{d.courseCode}</td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">{d.sessionDate}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      ● Present
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-xs leading-relaxed">
                    {d.evidenceNote}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold ${
                        d.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : d.status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      ● {d.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {d.status === "PENDING" ? (
                      <>
                        <button
                          onClick={() => onResolveDispute(d.id, "APPROVED")}
                          className="btn-saas-primary text-xs px-3 py-1 font-semibold shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onResolveDispute(d.id, "REJECTED")}
                          className="px-3 py-1 rounded-lg border border-border text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/10 cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span>Resolved ({d.status})</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
