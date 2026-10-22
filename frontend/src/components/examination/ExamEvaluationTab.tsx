"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Search, Send, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Props { showToast: (message: string) => void; }

interface ExamAttempt {
  studentId: string;
  studentName: string;
  studentRoll: string;
  score: number;
  maxScore: number;
  status: "SUBMITTED" | "DISQUALIFIED";
  strikes: number;
  submittedAt?: number;
}

interface ExamRecord {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  resultsReleased: boolean;
  attempts: Record<string, ExamAttempt>;
}

export function ExamEvaluationTab({ showToast }: Props) {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get<{ exams?: ExamRecord[] }>("/assessments/scheduled-exams")
      .then((response) => {
        if (!active) return;
        const records = response.exams || [];
        setExams(records);
        setSelectedExamId((current) => current || records[0]?.id || "");
      })
      .catch(() => active && setExams([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId) || null;
  const attempts = useMemo(() => Object.values(selectedExam?.attempts || {}).filter((attempt) => {
    const query = search.trim().toLowerCase();
    return !query || attempt.studentName.toLowerCase().includes(query) || attempt.studentRoll.toLowerCase().includes(query);
  }), [search, selectedExam]);

  const publishResults = async () => {
    if (!selectedExam || attempts.length === 0) return;
    setPublishing(true);
    try {
      await apiClient.post(`/assessments/scheduled-exams/${selectedExam.id}/release-results`, {});
      setExams((current) => current.map((exam) => exam.id === selectedExam.id ? { ...exam, resultsReleased: true } : exam));
      showToast("Assessment results published to enrolled students.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Results could not be published.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-700">Examination results</p>
            <h1 className="mt-1 text-xl font-bold text-slate-950">Evaluation and publication</h1>
            <p className="mt-1 text-sm text-slate-600">Only submitted attempts stored by the assessment service are shown.</p>
          </div>
          <button onClick={publishResults} disabled={!selectedExam || attempts.length === 0 || selectedExam.resultsReleased || publishing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Send className="h-4 w-4" />
            {publishing ? "Publishing..." : selectedExam?.resultsReleased ? "Results published" : "Publish results"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,420px)]">
          <label className="text-sm font-medium text-slate-700">Assessment
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">Select a saved assessment</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.courseCode} - {exam.title || exam.courseName}</option>)}
            </select>
          </label>
          <label className="relative self-end"><span className="sr-only">Search candidates</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate or roll number" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm" /></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Roll number</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Integrity</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((attempt) => <tr key={attempt.studentId}><td className="px-4 py-3 font-semibold text-slate-900">{attempt.studentName}</td><td className="px-4 py-3 text-slate-600">{attempt.studentRoll || "Not provided"}</td><td className="px-4 py-3 font-semibold">{attempt.score} / {attempt.maxScore}</td><td className="px-4 py-3">{attempt.strikes > 0 ? <span className="inline-flex items-center gap-1 text-amber-700"><ShieldAlert className="h-4 w-4" />{attempt.strikes} event(s)</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" />Clear</span>}</td><td className="px-4 py-3">{attempt.status}</td></tr>)}
            </tbody>
          </table>
        </div>
        {!loading && !selectedExam && <div className="p-10 text-center text-sm text-slate-500"><Award className="mx-auto mb-2 h-6 w-6 text-slate-300" />Select a saved assessment to review its submissions.</div>}
        {!loading && selectedExam && attempts.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No submitted attempts are stored for this assessment.</div>}
        {loading && <div className="p-10 text-center text-sm text-slate-500">Loading submitted attempts...</div>}
      </section>
    </div>
  );
}
