"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, Building2, Search, Users } from "lucide-react";
import { LeadershipOverview } from "@/types";

type DepartmentRow = LeadershipOverview["departments"][number];

export function VcDepartmentsTab({ departments }: { departments: DepartmentRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => departments.filter((department) =>
    `${department.name} ${department.code}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [departments, search]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Departments</h2>
          <p className="text-xs text-muted-foreground">Current people, courses, and result reviews by department.</p>
        </div>
        <label className="relative block w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search departments</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search departments"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground"
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-semibold">Department</th>
              <th className="p-3 font-semibold">School</th>
              <th className="p-3 font-semibold">Students</th>
              <th className="p-3 font-semibold">Faculty</th>
              <th className="p-3 font-semibold">Courses</th>
              <th className="p-3 font-semibold">Active enrollments</th>
              <th className="p-3 font-semibold">Results to review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((department) => (
              <tr key={department.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground">
                  <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{department.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{department.code}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {department.school || "School not assigned"}
                  </span>
                </td>
                <td className="p-3 text-foreground"><Users className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />{department.students}</td>
                <td className="p-3 text-foreground">{department.faculty}</td>
                <td className="p-3 text-foreground"><BookOpen className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />{department.courses}</td>
                <td className="p-3 text-foreground">{department.enrollments}</td>
                <td className="p-3 text-foreground">{department.pending_result_courses}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No departments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
