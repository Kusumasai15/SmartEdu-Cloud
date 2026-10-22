"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
interface Correction { id: string; student_name: string; course_code: string; session_date: string; original_status: string; requested_status: string; reason: string }
export function AttendanceRequests() {
  const { data, error, loading, refresh } = useApiResource<Correction[]>("/hod/attendance/pending-corrections");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const review = async (id: string, decision: string) => {
    setBusy(true); setActionError(null);
    try { await apiClient.patch(`/attendance/corrections/${id}`, { approval_status: decision }); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "The request could not be updated."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4"><h2 className="text-lg font-semibold">Attendance Corrections</h2>{(error || actionError) && <p role="alert" className="text-sm text-red-600">{error || actionError}</p>}{loading && <p role="status">Loading requests...</p>}<div className="divide-y divide-border">{data?.map(request => <article key={request.id} className="space-y-2 py-4"><h3 className="font-medium">{request.student_name} · {request.course_code}</h3><p className="text-sm text-muted-foreground">{request.session_date}: {request.original_status.toLowerCase()} to {request.requested_status.toLowerCase()}</p><p className="whitespace-pre-wrap break-words text-sm">{request.reason}</p><div className="flex gap-2"><button disabled={busy} onClick={() => void review(request.id, "APPROVED")} className="btn-saas-primary disabled:opacity-40">Approve</button><button disabled={busy} onClick={() => void review(request.id, "REJECTED")} className="btn-saas-secondary disabled:opacity-40">Reject</button></div></article>)}</div>{!error && !loading && data?.length === 0 && <p className="text-sm text-muted-foreground">No pending attendance corrections.</p>}</section>;
}
