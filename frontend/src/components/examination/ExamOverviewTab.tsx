"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Award, Building2, Calendar, ChevronRight, FileCheck, Users } from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";

interface Props { onNavigateTab: (tabId: string) => void; showToast: (message: string) => void; }

export function ExamOverviewTab({ onNavigateTab }: Props) {
  const { users, classrooms } = useAcademicData();
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    apiClient.get<{ exams?: any[] }>("/assessments/scheduled-exams").then((response) => active && setExams(response.exams || [])).catch(() => active && setExams([]));
    return () => { active = false; };
  }, []);

  const students = useMemo(() => users.filter((user) => user.role === "STUDENT" && user.is_active), [users]);
  const submittedAttempts = useMemo(() => exams.reduce((total, exam) => total + Object.keys(exam.attempts || {}).length, 0), [exams]);
  const publishedResults = exams.filter((exam) => exam.resultsReleased).length;
  const metrics = [
    { label: "Scheduled assessments", value: exams.length, icon: Calendar, tab: "schedules" },
    { label: "Active students", value: students.length, icon: Users, tab: "hall-tickets" },
    { label: "Available rooms", value: classrooms.filter((room) => room.status === "AVAILABLE").length, icon: Building2, tab: "seating" },
    { label: "Submitted attempts", value: submittedAttempts, icon: FileCheck, tab: "evaluations" },
  ];

  return <div className="space-y-5">
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase text-blue-700">Office of the Controller of Examinations</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">Examination operations</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Schedule assessments, review saved question banks, allocate registered rooms, monitor real submissions, and publish verified results.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onNavigateTab("schedules")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"><Calendar className="h-4 w-4" />Manage schedules</button><button onClick={() => onNavigateTab("evaluations")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-800"><Award className="h-4 w-4" />Review results</button></div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon, tab }) => <button key={label} onClick={() => onNavigateTab(tab)} className="flex min-h-28 items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"><div><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value.toLocaleString()}</p></div><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Icon className="h-5 w-5" /></div></button>)}</section>
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Publication status</h2><p className="mt-1 text-sm text-slate-600">{publishedResults} of {exams.length} saved assessments have released results.</p></div><button onClick={() => onNavigateTab("evaluations")} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Open evaluations<ChevronRight className="h-4 w-4" /></button></div></section>
  </div>;
}
