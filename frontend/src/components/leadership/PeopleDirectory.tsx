"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useApiResource } from "@/lib/use-api-resource";

export interface DepartmentFaculty {
  id: string; name: string; email: string; role: string; course_codes: string[];
}
interface Student { id: string; name: string; email: string; student_identifier: string | null }

export function PeopleDirectory({ kind, departmentId }: { kind: "students" | "faculty"; departmentId?: string }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ search: query, offset: String(offset), limit: "50" });
  if (departmentId) params.set("department_id", departmentId);
  const { data, error, loading, refresh } = useApiResource<{ items: Student[]; total: number } | DepartmentFaculty[]>(`/leadership/${kind}?${params}`);
  const faculty = Array.isArray(data) ? data.filter(item => `${item.name} ${item.email} ${item.course_codes.join(" ")}`.toLowerCase().includes(query.toLowerCase())) : [];
  const students = data && !Array.isArray(data) ? data : null;
  const rows = kind === "students" ? students?.items || [] : faculty;
  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{kind === "students" ? "Students" : "Faculty"}</h2>
      <button className="btn-saas-secondary" onClick={() => void refresh()}>Refresh</button>
    </div>
    <form className="flex max-w-lg gap-2" onSubmit={event => { event.preventDefault(); setOffset(0); setQuery(search.trim()); }}>
      <input aria-label="Search by name or email" className="min-w-0 flex-1 rounded-md border border-border bg-background p-2 text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or email" />
      <button type="submit" title="Search" aria-label="Search" className="rounded-md border border-border p-2"><Search className="h-5 w-5" /></button>
    </form>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {loading ? <p role="status">Loading records...</p> : <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[540px] text-left text-sm">
        <thead className="border-b border-border bg-secondary"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">{kind === "students" ? "Student ID" : "Assigned courses"}</th></tr></thead>
        <tbody>{rows.map(person => <tr key={person.id} className="border-b border-border last:border-0"><td className="p-3">{person.name}</td><td className="p-3 break-all">{person.email}</td><td className="p-3">{"course_codes" in person ? person.course_codes.join(", ") || "No courses assigned" : person.student_identifier || "Not assigned"}</td></tr>)}
        {!error && rows.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No matching records.</td></tr>}</tbody>
      </table>
    </div>}
    {students && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{students.total ? `${offset + 1}-${Math.min(offset + 50, students.total)} of ${students.total}` : "0 students"}</span><div className="flex gap-2"><button title="Previous page" aria-label="Previous page" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 50))} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button title="Next page" aria-label="Next page" disabled={offset + 50 >= students.total || loading} onClick={() => setOffset(offset + 50)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
  </section>;
}
