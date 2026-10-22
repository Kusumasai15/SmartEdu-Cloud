"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  Flame,
  Award,
  Sparkles,
  Zap,
  TrendingUp,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Star,
  Target,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Crown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData, ClassLeaderboardEntry } from "@/context/AcademicDataContext";
import { getUserAvatarUrl } from "@/lib/avatar";

export function ClassLeaderboardView() {
  const { user } = useAuth();
  const { leaderboard, addLeaderboardXp } = useAcademicData();

  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<string>("ALL");

  // Determine current student identifier
  const currentStudentName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "";
  const currentStudentEmail = user?.email || "";

  // Filtered leaderboard
  const filteredList = useMemo(() => {
    return leaderboard.filter((item) => {
      const matchSection = sectionFilter === "ALL" || item.section === sectionFilter;
      const matchSearch =
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBadge = selectedBadge === "ALL" || item.badges.includes(selectedBadge);
      return matchSection && matchSearch && matchBadge;
    });
  }, [leaderboard, sectionFilter, searchTerm, selectedBadge]);

  // Current student entry in leaderboard
  const myEntry = useMemo(() => {
    return (
      leaderboard.find(
        (e) =>
          e.name.toLowerCase() === currentStudentName.toLowerCase() ||
          e.studentId === user?.id ||
          (currentStudentEmail && e.rollNo.toLowerCase().includes("042"))
      ) || leaderboard[3]
    );
  }, [leaderboard, currentStudentName, user?.id, currentStudentEmail]);

  // Unique badges for filter chips
  const allBadges = useMemo(() => {
    const s = new Set<string>();
    leaderboard.forEach((e) => e.badges.forEach((b) => s.add(b)));
    return Array.from(s);
  }, [leaderboard]);

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── HERO HEADER BANNER (PROFESSIONAL BLUE & WHITE) ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/20">
              <Trophy className="h-3.5 w-3.5 text-blue-200" />
              <span>Fall Semester 2026 Academic Season</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Class Academic &amp; Coding Leaderboard
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
              Earn XP and climb the class rankings by attending lectures on time, completing coding assignments,
              passing automated test cases, and winning fast-paced live quizzes.
            </p>
          </div>

          {/* Quick Your Rank Micro Card */}
          {myEntry && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center min-w-[240px] space-y-3 shrink-0 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100 block">
                Your Current Standing
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black text-white font-mono">#{myEntry.rank}</span>
                <div className="text-left text-xs">
                  <span className="font-bold text-white block">{myEntry.name}</span>
                  <span className="text-blue-100 text-[11px]">{myEntry.className}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/15">
                <span className="text-blue-100 flex items-center gap-1 font-mono">
                  <Zap className="h-3.5 w-3.5 text-white" />
                  <strong className="text-white">{myEntry.xpPoints.toLocaleString()}</strong> XP
                </span>
                <span className="text-white flex items-center gap-1 font-mono font-bold">
                  <Flame className="h-3.5 w-3.5 text-rose-300" />
                  {myEntry.streakDays}d Streak
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TOP 3 PODIUM DISPLAY (CLEAN ENTERPRISE LIGHT CARDS) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* 2nd Place */}
        {topThree[1] && (
          <div className="order-2 md:order-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="h-1.5 w-full bg-slate-300 dark:bg-slate-700 absolute top-0 left-0" />
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm font-mono border border-slate-200 dark:border-slate-700">
                #2
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Medal className="h-3 w-3 text-slate-500" />
                Silver Scholar
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{topThree[1].name}</h3>
              <p className="text-xs text-slate-500 font-mono">{topThree[1].rollNo} • {topThree[1].section}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Points</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{topThree[1].xpPoints.toLocaleString()} XP</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Day Streak</span>
                <span className="font-mono font-bold text-blue-600 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-blue-500" />
                  {topThree[1].streakDays} Days
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {topThree[1].badges.map((b, i) => (
                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 1st Place (Champion Centerpiece) */}
        {topThree[0] && (
          <div className="order-1 md:order-2 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-500/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="h-1.5 w-full bg-blue-600 absolute top-0 left-0" />
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base font-mono shadow-xs">
                #1
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Crown className="h-3.5 w-3.5 text-blue-600" />
                Class Champion
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{topThree[0].name}</span>
                <Sparkles className="h-4 w-4 text-blue-600" />
              </h3>
              <p className="text-xs text-slate-500 font-mono">{topThree[0].rollNo} • {topThree[0].section}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Points</span>
                <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-base">
                  {topThree[0].xpPoints.toLocaleString()} XP
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Live Quizzes Won</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-blue-600" />
                  {topThree[0].quizzesWon} Wins
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {topThree[0].badges.map((b, i) => (
                <span
                  key={i}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <div className="order-3 md:order-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="h-1.5 w-full bg-slate-300 dark:bg-slate-700 absolute top-0 left-0" />
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm font-mono border border-slate-200 dark:border-slate-700">
                #3
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Medal className="h-3 w-3 text-slate-500" />
                Bronze Scholar
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{topThree[2].name}</h3>
              <p className="text-xs text-slate-500 font-mono">{topThree[2].rollNo} • {topThree[2].section}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Points</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{topThree[2].xpPoints.toLocaleString()} XP</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Attendance</span>
                <span className="font-mono font-bold text-blue-600">
                  {topThree[2].attendancePct}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {topThree[2].badges.map((b, i) => (
                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── CONTROLS & FILTER BAR ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex-wrap gap-1">
            {Array.from(new Set(["ALL", ...leaderboard.map((item) => item.section).filter(Boolean)])).map((sec) => (
              <button
                key={sec}
                onClick={() => setSectionFilter(sec)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  sectionFilter === sec
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {sec === "ALL" ? "All Sections" : sec}
              </button>
            ))}
          </div>

          {/* Badge Filter Selector */}
          <select
            value={selectedBadge}
            onChange={(e) => setSelectedBadge(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Filter by Badge: All</option>
            {allBadges.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search classmate by name or roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ─── FULL CLASS LEADERBOARD TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class Roster ({filteredList.length} Students)</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Updated in Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 text-center">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4 text-center">Day Streak</th>
                <th className="py-3 px-4 text-center">Quizzes Won</th>
                <th className="py-3 px-4 text-center">Attendance</th>
                <th className="py-3 px-4">Badges &amp; Recognitions</th>
                <th className="py-3 px-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.map((entry) => {
                const isMe =
                  entry.name.toLowerCase() === currentStudentName.toLowerCase() ||
                  entry.studentId === user?.id ||
                  entry.id === myEntry?.id;

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isMe
                        ? "bg-blue-50/70 dark:bg-blue-950/40 font-semibold border-l-4 border-l-blue-600"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center h-7 w-7 rounded-xl text-xs font-mono font-bold ${
                          entry.rank === 1
                            ? "bg-blue-600 text-white shadow-2xs"
                            : entry.rank === 2
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                            : entry.rank === 3
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                            : "text-slate-500"
                        }`}
                      >
                        {entry.rank}
                      </span>
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getUserAvatarUrl({ name: entry.name, rollNumber: entry.rollNo })}
                          alt={entry.name}
                          className="h-8 w-8 rounded-xl object-cover shrink-0 border border-blue-100 dark:border-blue-900/50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                          }}
                        />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {entry.name}
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-semibold">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">{entry.rollNo}</span>
                        </div>
                      </div>
                    </td>

                    {/* Section */}
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">{entry.section}</td>

                    {/* Day Streak */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-600">
                        <Flame className="h-3.5 w-3.5 text-blue-500" />
                        {entry.streakDays}d
                      </span>
                    </td>

                    {/* Quizzes Won */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {entry.quizzesWon}
                    </td>

                    {/* Attendance */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`font-bold ${
                          entry.attendancePct >= 90
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {entry.attendancePct}%
                      </span>
                    </td>

                    {/* Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {entry.badges.map((b, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Total XP */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-blue-600">
                        {entry.xpPoints.toLocaleString()} XP
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
