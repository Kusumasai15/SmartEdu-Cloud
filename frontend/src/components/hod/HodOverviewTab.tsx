"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Award,
  ArrowRight,
  Plus,
  Layers,
  GraduationCap,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncCourse } from "@/context/AcademicDataContext";

interface HodOverviewTabProps {
  hodName: string;
  deptName: string;
  courses: SyncCourse[];
  facultyCount: number;
  studentCount: number;
  pendingApprovalsCount: number;
  pendingDisputesCount?: number;
  onSelectTab: (tabId: string) => void;
  onOpenCreateCourse: () => void;
  onOpenBroadcast: () => void;
}

export function HodOverviewTab({
  hodName,
  deptName,
  courses,
  facultyCount,
  studentCount,
  pendingApprovalsCount,
  onSelectTab,
  onOpenCreateCourse,
}: HodOverviewTabProps) {
  const { modules } = useAcademicData();

  return (
    <div className="space-y-6">
      {/* 4 Interactive Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Faculty Directory */}
        <button
          onClick={() => onSelectTab("faculty")}
          className="text-left bg-card rounded-xl p-4 border border-border shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex items-center gap-3.5 cursor-pointer"
        >
          <div className="h-10 w-10 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground block">Faculty</span>
            <span className="text-lg font-semibold text-foreground font-mono block">{facultyCount} Members</span>
            <span className="text-[11px] text-muted-foreground block">Department teaching staff</span>
          </div>
        </button>

        {/* 2. Active Courses */}
        <button
          onClick={() => onSelectTab("courses")}
          className="text-left bg-card rounded-xl p-4 border border-border shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex items-center gap-3.5 cursor-pointer"
        >
          <div className="h-10 w-10 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground block">Courses</span>
            <span className="text-lg font-semibold text-foreground font-mono block">{courses.length} Active</span>
            <span className="text-[11px] text-muted-foreground block">Curriculum catalog</span>
          </div>
        </button>

        {/* 3. Grade Approvals */}
        <button
          onClick={() => onSelectTab("approvals")}
          className="text-left bg-card rounded-xl p-4 border border-border shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex items-center gap-3.5 cursor-pointer"
        >
          <div className="h-10 w-10 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground block">Grade Approvals</span>
            <span className="text-lg font-semibold text-foreground font-mono block">
              {pendingApprovalsCount} Pending
            </span>
            <span className="text-[11px] text-muted-foreground block">Awaiting sign-off</span>
          </div>
        </button>

        {/* 4. Student Enrollment */}
        <button
          onClick={() => onSelectTab("students")}
          className="text-left bg-card rounded-xl p-4 border border-border shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex items-center gap-3.5 cursor-pointer"
        >
          <div className="h-10 w-10 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground block">Students</span>
            <span className="text-lg font-semibold text-foreground font-mono block">{studentCount} Enrolled</span>
            <span className="text-[11px] text-muted-foreground block">Active student class roster</span>
          </div>
        </button>
      </div>

      {/* Main Grid: Left 2 Cols (Courses & Modules) + Right 1 Col (Approvals & Timetable) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Course Curriculum Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Department Courses</h2>
              <p className="text-xs text-muted-foreground">Courses, assigned faculty, and module progress</p>
            </div>
            <button
              onClick={onOpenCreateCourse}
              className="btn-saas-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Course</span>
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="bg-card rounded-xl p-8 border border-border text-center shadow-xs">
              <BookOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No Department Courses Active</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                No courses currently assigned to this department. Create a course to publish syllabus and lesson modules.
              </p>
              <button
                onClick={onOpenCreateCourse}
                className="btn-saas-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Course</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => {
                const courseModules = modules.filter((m) => m.courseCode === course.code);

                return (
                  <div
                    key={course.code}
                    className="bg-card rounded-xl p-5 border border-border shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md font-mono font-semibold text-xs bg-secondary text-foreground border border-border">
                          {course.code}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {course.credits} Credits
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {course.name}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description || "Core department curriculum course syllabus."}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                        <span>Teacher: <strong className="text-foreground">{course.instructor || "Not assigned"}</strong></span>
                        <span>Lessons: <strong className="text-primary font-mono">{courseModules.length}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                      <button
                        onClick={() => onSelectTab("modules")}
                        className="font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Review Lessons</span>
                      </button>

                      <Link
                        href={`/courses/${course.code}/learn`}
                        className="font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Pending Grade Authorizations & Schedule */}
        <div className="space-y-6">
          {/* Pending Approvals Card */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-foreground">Grades To Review</h3>
              <button
                onClick={() => onSelectTab("approvals")}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Sign Off
              </button>
            </div>

            <div className="space-y-2.5">
              {pendingApprovalsCount === 0 ? (
                <div className="p-4 rounded-xl bg-secondary/40 border border-border text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <p className="font-medium text-foreground">All Grade Sheets Reviewed</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">No faculty submissions pending sign-off.</p>
                </div>
              ) : (
                courses.slice(0, 2).map((c) => (
                  <div key={c.code} className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-card text-foreground border border-border">
                        {c.code}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                        Needs Review
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Waiting for department review
                    </p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onSelectTab("approvals")}
              className="btn-saas-primary w-full text-xs font-semibold text-center"
            >
              Open Grade Approval
            </button>
          </div>

          {/* Department Timetable Overview */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-foreground">Department Timetable</h3>
              <button
                onClick={() => onSelectTab("timetable")}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Schedule
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border text-center text-xs text-muted-foreground">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="font-medium text-foreground">No scheduled sessions for today</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Use the Timetable builder to allocate classroom hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
