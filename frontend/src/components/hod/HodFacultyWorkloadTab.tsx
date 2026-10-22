"use client";

import React, { useState } from "react";
import { Users, Briefcase, Plus, Minus, CheckCircle2, UserCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FacultyMemberRecord {
  id: string;
  name: string;
  designation: string;
  assignedCourses: string[];
  weeklyHours: number;
  maxHours: number;
  studentSatisfaction: number;
  status: "ACTIVE" | "ON_LEAVE" | "SABBATICAL";
}

interface HodFacultyWorkloadTabProps {
  facultyList: FacultyMemberRecord[];
  onUpdateWorkload?: (facultyId: string, hours: number) => void;
}

export function HodFacultyWorkloadTab({ facultyList: initialList }: HodFacultyWorkloadTabProps) {
  const [faculty, setFaculty] = useState<FacultyMemberRecord[]>(initialList);
  const [filter, setFilter] = useState<string>("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const handleAdjustHours = (id: string, delta: number) => {
    setFaculty((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const newHours = Math.max(2, Math.min(f.maxHours + 4, f.weeklyHours + delta));
          return { ...f, weeklyHours: newHours };
        }
        return f;
      })
    );
    const target = faculty.find((f) => f.id === id);
    setNotification(`Updated teaching hours for ${target?.name}.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleStatus = (id: string) => {
    setFaculty((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const nextStatus = f.status === "ACTIVE" ? "ON_LEAVE" : "ACTIVE";
          return { ...f, status: nextStatus };
        }
        return f;
      })
    );
  };

  const filtered = faculty.filter((f) => {
    if (filter === "ALL") return true;
    return f.status === filter;
  });

  const totalAssignedHours = faculty.reduce((acc, f) => acc + f.weeklyHours, 0);
  const totalCapacityHours = faculty.reduce((acc, f) => acc + f.maxHours, 0);
  const avgSatisfaction = faculty.length > 0
    ? (faculty.reduce((acc, f) => acc + f.studentSatisfaction, 0) / faculty.length).toFixed(1)
    : "5.0";

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground">Faculty Teaching Assignments &amp; Workload</h2>
        <p className="text-xs text-muted-foreground">
          Weekly lecture hours, assigned courses, and availability status for department faculty.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border shadow-xs space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Total Teaching Load</span>
          <p className="text-xl font-semibold text-foreground font-mono">{totalAssignedHours} / {totalCapacityHours || 32} hrs</p>
          <span className="text-xs text-muted-foreground">Department capacity utilization</span>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-xs space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Active Faculty Members</span>
          <p className="text-xl font-semibold text-foreground font-mono">{faculty.length} Faculty</p>
          <span className="text-xs text-muted-foreground">Department instructors</span>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-xs space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Student Feedback Score</span>
          <p className="text-xl font-semibold text-foreground font-mono flex items-center gap-1.5">
            <span>{avgSatisfaction} / 5.0</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </p>
          <span className="text-xs text-muted-foreground">High satisfaction rating</span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-secondary/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5">Faculty Name</th>
              <th className="p-3.5">Academic Designation</th>
              <th className="p-3.5">Assigned Courses</th>
              <th className="p-3.5">Weekly Lecture Hours</th>
              <th className="p-3.5">Student Rating</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="font-semibold text-foreground text-sm">No faculty members found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Faculty registered in this department will appear here.</p>
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="p-3.5 font-semibold text-foreground">{f.name}</td>
                  <td className="p-3.5 text-muted-foreground">{f.designation}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {f.assignedCourses.length > 0 ? (
                        f.assignedCourses.map((c) => (
                          <span key={c} className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">No courses assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{f.weeklyHours} hrs/wk</span>
                      <button
                        onClick={() => handleAdjustHours(f.id, -2)}
                        className="p-1 rounded-md border border-border hover:border-primary text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Reduce 2 hours"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleAdjustHours(f.id, +2)}
                        className="p-1 rounded-md border border-border hover:border-primary text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Add 2 hours"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-foreground">
                    <span className="flex items-center gap-1">
                      <span>{f.studentSatisfaction}</span>
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold ${
                        f.status === "ACTIVE"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {f.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleToggleStatus(f.id)}
                      className="px-2.5 py-1 rounded-md border border-border hover:border-primary text-foreground font-medium text-xs cursor-pointer hover:bg-secondary"
                    >
                      Toggle Status
                    </button>
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
