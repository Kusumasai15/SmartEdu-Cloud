"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { Course, Semester } from "@/types";

export function HodCoursesTab({ departmentId }: { departmentId: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: semesters } = useApiResource<Semester[]>("/semesters");
  const { data: courses, loading, error: loadError, refresh } = useApiResource<Course[]>(
    `/courses?department_id=${encodeURIComponent(departmentId)}&page=${page}&page_size=20&search=${encodeURIComponent(query)}`
  );
  const createCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError(null);
    try {
      await apiClient.post("/courses", {
        course_code: String(fields.get("code")).trim().toUpperCase(),
        name: String(fields.get("name")).trim(),
        description: String(fields.get("description")).trim() || null,
        credits: Number(fields.get("credits")),
        semester_id: fields.get("semester"), department_id: departmentId, is_active: true,
      });
      setCreating(false); form.reset(); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Course could not be saved."); }
    finally { setBusy(false); }
  };
  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Department Courses</h2><button onClick={() => setCreating(!creating)} className="btn-saas-primary inline-flex items-center gap-2"><Plus className="h-4 w-4" />Add Course</button></div>
    {(error || loadError) && <p role="alert" className="text-sm text-red-600">{error || loadError}</p>}
    {creating && <form onSubmit={createCourse} className="grid gap-4 border-y border-border py-5 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Course code<input name="code" required minLength={2} maxLength={30} className="block w-full rounded-md border border-border bg-background p-2" /></label>
      <label className="space-y-1 text-sm">Course name<input name="name" required minLength={2} maxLength={200} className="block w-full rounded-md border border-border bg-background p-2" /></label>
      <label className="space-y-1 text-sm">Credits<input name="credits" type="number" min={1} max={12} defaultValue={3} required className="block w-full rounded-md border border-border bg-background p-2" /></label>
      <label className="space-y-1 text-sm">Term<select name="semester" required defaultValue="" className="block w-full rounded-md border border-border bg-background p-2"><option value="" disabled>Select term</option>{semesters?.map(term => <option key={term.id} value={term.id}>{term.name} {term.academic_year}</option>)}</select></label>
      <label className="space-y-1 text-sm sm:col-span-2">Description<textarea name="description" rows={3} className="block w-full rounded-md border border-border bg-background p-2" /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy || !semesters?.length} className="btn-saas-primary disabled:opacity-50">{busy ? "Saving..." : "Save Course"}</button><button type="button" disabled={busy} onClick={() => setCreating(false)} className="btn-saas-secondary">Cancel</button></div>
      {semesters?.length === 0 && <p className="text-sm text-muted-foreground sm:col-span-2">An administrator must add an academic term first.</p>}
    </form>}
    <form onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search); }} className="flex max-w-lg gap-2"><input aria-label="Search courses" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search courses" className="min-w-0 flex-1 rounded-md border border-border bg-background p-2 text-sm" /><button title="Search" aria-label="Search" className="rounded-md border border-border p-2"><Search className="h-5 w-5" /></button></form>
    {loading ? <p role="status">Loading courses...</p> : <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-secondary"><tr>{["Course", "Term", "Faculty", "Students", "Credits", ""].map((label, index) => <th key={index} className="p-3">{label}</th>)}</tr></thead><tbody>{courses?.map(course => <tr key={course.id} className="border-t border-border"><td className="p-3"><strong>{course.course_code}</strong><div>{course.name}</div></td><td className="p-3">{course.semester_name}</td><td className="p-3">{course.instructors.map(instructor => instructor.faculty_name).join(", ") || "Not assigned"}</td><td className="p-3">{course.enrolled_count}</td><td className="p-3">{course.credits}</td><td className="p-3"><Link className="text-primary underline" href={`/courses/${course.id}/learn`}>Open</Link></td></tr>)}{!loadError && courses?.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No matching courses.</td></tr>}</tbody></table></div>}
    <div className="flex items-center justify-end gap-3 text-sm"><button title="Previous page" aria-label="Previous page" disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Page {page}</span><button title="Next page" aria-label="Next page" disabled={!courses || courses.length < 20 || loading} onClick={() => setPage(page + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
  </section>;
}
