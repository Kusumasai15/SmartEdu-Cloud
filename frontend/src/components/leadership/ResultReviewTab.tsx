"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { LeadershipOverview } from "@/types";

type ResultCourse = LeadershipOverview["result_courses"][number];

export function ResultReviewTab({
  results,
  onChanged,
}: {
  results: ResultCourse[];
  onChanged: () => Promise<void>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (result: ResultCourse) => {
    const key = `${result.course_id}-${result.semester_id}-${result.status}`;
    if (busyKey) return;
    setBusyKey(key);
    setError(null);
    setMessage(null);
    try {
      const path = `/results/courses/${result.course_id}`;
      const query = `?semester_id=${encodeURIComponent(result.semester_id)}`;
      if (result.status === "SUBMITTED") {
        await apiClient.post(`${path}/review${query}`, { approval_status: "APPROVED" });
        setMessage(`${result.course_code} results approved.`);
      } else if (result.status === "APPROVED") {
        await apiClient.post(`${path}/publish${query}`);
        setMessage(`${result.course_code} results published to student transcripts.`);
      }
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The result update failed.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Course Results</h2>
        <p className="text-xs text-muted-foreground">Review submitted results and publish approved results.</p>
      </div>
      {error && <p role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[660px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-semibold">Course</th>
              <th className="p-3 font-semibold">Students</th>
              <th className="p-3 font-semibold">Average GPA</th>
              <th className="p-3 font-semibold">Pass rate</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const key = `${result.course_id}-${result.semester_id}-${result.status}`;
              return <tr key={key} className="border-b border-border last:border-0">
                <td className="p-3 text-foreground"><strong>{result.course_code}</strong><span className="ml-2 text-muted-foreground">{result.course_name}</span></td>
                <td className="p-3 text-foreground">{result.student_count}</td>
                <td className="p-3 text-foreground">{result.average_gpa.toFixed(2)}</td>
                <td className="p-3 text-foreground">{result.pass_rate.toFixed(1)}%</td>
                <td className="p-3 text-foreground">{result.status === "SUBMITTED" ? "Needs review" : result.status === "APPROVED" ? "Approved" : "Published"}</td>
                <td className="p-3 text-right">
                  {result.status === "PUBLISHED" ? <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" aria-label="Published" /> : (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => runAction(result)}
                      className="inline-flex min-w-24 items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busyKey === key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {result.status === "SUBMITTED" ? "Approve" : "Publish"}
                    </button>
                  )}
                </td>
              </tr>;
            })}
            {results.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No submitted results are available.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
