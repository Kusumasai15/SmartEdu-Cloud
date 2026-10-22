"use client";
import { useState } from "react";
import { X, Send } from "lucide-react";
import { FacultyCourse } from "@/types";
import { apiClient } from "@/lib/api-client";

interface FacultyBroadcastModalProps {
  isOpen: boolean; onClose: () => void; courses: FacultyCourse[];
  onBroadcastSuccess: (meta: { title: string; audience: string; channel: string }) => void;
}
export function FacultyBroadcastModal({ isOpen, onClose, courses, onBroadcastSuccess }: FacultyBroadcastModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const courseId = String(fields.get("course"));
    const title = String(fields.get("title")).trim();
    setBusy(true); setError(null);
    try {
      await apiClient.post("/announcements", {
        title, content: String(fields.get("content")).trim(), scope_type: "COURSE",
        scope_id: courseId, priority: fields.get("priority"), publish_now: true,
      });
      onBroadcastSuccess({ title, audience: courses.find(course => course.id === courseId)?.course_code || "", channel: "course notices" });
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Notice could not be published."); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="notice-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between"><h2 id="notice-title" className="text-lg font-semibold">Course Notice</h2><button disabled={busy} onClick={onClose} aria-label="Close" title="Close"><X className="h-5 w-5" /></button></div>
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <label className="block text-sm">Course<select required name="course" defaultValue="" className="mt-1 block w-full rounded-md border border-border bg-background p-2"><option value="" disabled>Select a course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.course_code}: {course.name}</option>)}</select></label>
        <label className="block text-sm">Title<input required name="title" maxLength={200} className="mt-1 block w-full rounded-md border border-border bg-background p-2" /></label>
        <label className="block text-sm">Message<textarea required name="content" rows={4} className="mt-1 block w-full rounded-md border border-border bg-background p-2" /></label>
        <label className="block text-sm">Priority<select name="priority" className="mt-1 block w-full rounded-md border border-border bg-background p-2"><option value="NORMAL">Normal</option><option value="IMPORTANT">Important</option><option value="CRITICAL">Urgent</option></select></label>
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="btn-saas-secondary">Cancel</button><button disabled={busy || courses.length === 0} className="btn-saas-primary inline-flex items-center gap-2 disabled:opacity-50"><Send className="h-4 w-4" />{busy ? "Publishing..." : "Publish Notice"}</button></div>
      </form>
    </section>
  </div>;
}
