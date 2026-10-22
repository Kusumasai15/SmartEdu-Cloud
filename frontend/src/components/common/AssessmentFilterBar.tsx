"use client";

import React from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  LayoutGrid,
  List,
  Sparkles,
  Search,
} from "lucide-react";

export interface AssessmentFilterCounts {
  all: number;
  upcoming?: number;
  inProgress?: number;
  submitted?: number;
  locked?: number;
}

export type AssessmentFilterStatus = "ALL" | "UPCOMING" | "IN_PROGRESS" | "SUBMITTED" | "LOCKED";
export type AssessmentSortOption = "DUE_NEWEST" | "DUE_OLDEST" | "TITLE" | "COURSE";
export type AssessmentViewMode = "grid" | "list";

interface AssessmentFilterBarProps {
  filter: AssessmentFilterStatus;
  onFilterChange: (filter: AssessmentFilterStatus) => void;
  counts: AssessmentFilterCounts;
  sortBy?: AssessmentSortOption;
  onSortChange?: (sort: AssessmentSortOption) => void;
  viewMode?: AssessmentViewMode;
  onViewModeChange?: (mode: AssessmentViewMode) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
}

export function AssessmentFilterBar({
  filter,
  onFilterChange,
  counts,
  sortBy = "DUE_NEWEST",
  onSortChange,
  viewMode = "grid",
  onViewModeChange,
  searchQuery,
  onSearchChange,
  className = "",
}: AssessmentFilterBarProps) {
  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 dark:border-slate-800 shadow-2xs ${className}`}
    >
      {/* ─── LEFT: SEGMENTED PILLS WITH COUNTS (EXACT MATCH TO REFERENCE IMAGE) ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {/* All Pill */}
        <button
          type="button"
          onClick={() => onFilterChange("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filter === "ALL"
              ? "bg-blue-600 text-white shadow-xs font-bold"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>All</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${filter === "ALL" ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"}`}>
            {counts.all ?? 0}
          </span>
        </button>

        {/* Upcoming Pill */}
        {counts.upcoming !== undefined && (
          <button
            type="button"
            onClick={() => onFilterChange("UPCOMING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
              filter === "UPCOMING"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-700"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 opacity-70 shrink-0" />
            <span>Upcoming</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${filter === "UPCOMING" ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"}`}>
              {counts.upcoming}
            </span>
          </button>
        )}

        {/* In Progress Pill */}
        {counts.inProgress !== undefined && (
          <button
            type="button"
            onClick={() => onFilterChange("IN_PROGRESS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
              filter === "IN_PROGRESS"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5 opacity-70 shrink-0" />
            <span>In Progress</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${filter === "IN_PROGRESS" ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"}`}>
              {counts.inProgress}
            </span>
          </button>
        )}

        {/* Submitted Pill */}
        {counts.submitted !== undefined && (
          <button
            type="button"
            onClick={() => onFilterChange("SUBMITTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
              filter === "SUBMITTED"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-700"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 opacity-70 shrink-0" />
            <span>Submitted</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${filter === "SUBMITTED" ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"}`}>
              {counts.submitted}
            </span>
          </button>
        )}

        {/* Locked Pill */}
        {counts.locked !== undefined && (
          <button
            type="button"
            onClick={() => onFilterChange("LOCKED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
              filter === "LOCKED"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-700"
            }`}
          >
            <Lock className="h-3.5 w-3.5 opacity-70 shrink-0" />
            <span>Locked</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${filter === "LOCKED" ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"}`}>
              {counts.locked}
            </span>
          </button>
        )}
      </div>

      {/* ─── RIGHT: SEARCH, SORT DROPDOWN & VIEW TOGGLE (MATCHING IMAGE) ─── */}
      <div className="flex items-center gap-2 sm:gap-2.5 justify-end shrink-0 flex-wrap">
        {onSearchChange !== undefined && (
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 w-28 sm:w-36 transition-all"
            />
          </div>
        )}

        {/* Sort Dropdown */}
        {onSortChange && (
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                Sort by
              </span>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as AssessmentSortOption)}
                aria-label="Sort assessments by"
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 text-xs cursor-pointer focus:outline-hidden leading-tight pr-1"
              >
                <option value="DUE_NEWEST" className="dark:bg-slate-900">Due Date (Newest)</option>
                <option value="DUE_OLDEST" className="dark:bg-slate-900">Due Date (Oldest)</option>
                <option value="COURSE" className="dark:bg-slate-900">Course Code</option>
                <option value="TITLE" className="dark:bg-slate-900">Title (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Grid vs List View Toggle */}
        {onViewModeChange && (
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
