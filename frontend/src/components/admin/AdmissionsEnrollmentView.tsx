"use client";

import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  X,
  Plus,
  ArrowRight,
  Filter,
  Check,
  Award,
  BookOpen,
  Eye,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncUser } from "@/context/AcademicDataContext";
import { PaginationControls } from "@/components/ui/PaginationControls";

interface StudentEnrollmentRecord {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  department: string;
  semester: string;
  academicYear: string;
  registrationStatus: "Approved" | "Pending Approval";
}

export function AdmissionsEnrollmentView() {
  const { users, departments, provisionUser, updateUser } = useAcademicData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [notification, setNotification] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Auto-increment student ID calculator
  const generateNextStudentId = (userList: SyncUser[]) => {
    const existingNumbers: number[] = [];
    userList.forEach((u) => {
      if (u.role === "STUDENT" && u.student_identifier) {
        const idStr = u.student_identifier.toUpperCase();
        if (idStr.includes("STU")) {
          const numMatch = idStr.match(/\d+/g);
          if (numMatch) {
            const parsed = parseInt(numMatch.join(""), 10);
            if (!isNaN(parsed) && parsed >= 1000 && parsed < 999999) {
              existingNumbers.push(parsed);
            }
          }
        }
      }
    });
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    return `STU-${maxNum + 1}`;
  };

  // New Student Admission Form State
  const [newStudent, setNewStudent] = useState({
    first_name: "",
    last_name: "",
    email: "",
    department: departments[0]?.name || "Computer Science & Engineering",
    academicYear: "2024-2028",
    className: "",
    identifier: "",
    password: "",
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenAdd = () => {
    const nextId = generateNextStudentId(users);
    const defaultDept = departments[0]?.name || "Computer Science & Engineering";
    const deptObj = departments.find((d) => d.name === defaultDept || d.code === defaultDept);
    const availableCohorts = Array.from(new Set([...(deptObj?.cohorts?.map((c) => c.name) || []), ...(deptObj?.classes || [])])).filter(Boolean);
    const defaultCohort = availableCohorts[0] || `${deptObj?.code || "CSE"} - Class 1`;

    setNewStudent({
      first_name: "",
      last_name: "",
      email: "",
      department: defaultDept,
      academicYear: "2024-2028",
      className: defaultCohort,
      identifier: nextId,
      password: "",
    });
    setIsAddOpen(true);
  };

  // Derive real student roster from AcademicDataContext
  const studentUsers = useMemo(() => {
    return users.filter((u) => u.role === "STUDENT");
  }, [users]);

  // Build account records from the saved user roster.
  const roster: StudentEnrollmentRecord[] = useMemo(() => {
    return studentUsers.map((stu) => {
      return {
        id: stu.id,
        name: `${stu.first_name} ${stu.last_name}`.trim(),
        rollNo: stu.student_identifier || "",
        email: stu.email,
        department: stu.department || "",
        semester: stu.className || "Semester 1",
        academicYear: stu.academicYear || "2024-2028",
        registrationStatus: stu.is_active ? "Approved" : "Pending Approval",
      };
    });
  }, [studentUsers]);

  const filtered = useMemo(() => {
    return roster.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.rollNo.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase()) ||
        r.semester.toLowerCase().includes(search.toLowerCase()) ||
        r.academicYear.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || r.registrationStatus === statusFilter;
      const matchesDept = deptFilter === "ALL" || r.department.toLowerCase().includes(deptFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [roster, search, statusFilter, deptFilter]);

  const [stuPage, setStuPage] = useState(1);
  const [stuPageSize, setStuPageSize] = useState(10);

  const totalStuPages = Math.max(1, Math.ceil(filtered.length / stuPageSize));
  const paginatedStudents = useMemo(() => {
    const start = (stuPage - 1) * stuPageSize;
    return filtered.slice(start, start + stuPageSize);
  }, [filtered, stuPage, stuPageSize]);

  const handleApprove = async (id: string) => {
    const stu = users.find((u) => u.id === id);
    if (stu) {
      try {
        await updateUser({ ...stu, is_active: true });
        showToast(`Account access enabled for ${stu.first_name} ${stu.last_name}.`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not enable account access.");
      }
    }
  };

  const handleApproveAllPending = async () => {
    const pending = studentUsers.filter((stu) => !stu.is_active);
    const results = await Promise.allSettled(pending.map((stu) => updateUser({ ...stu, is_active: true })));
    const failed = results.filter((result) => result.status === "rejected").length;
    showToast(failed ? `${pending.length - failed} accounts enabled; ${failed} failed.` : `${pending.length} accounts enabled.`);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.first_name.trim() || !newStudent.email.trim()) return;
    if (newStudent.password.trim().length < 12) {
      showToast("Please set an initial password with at least 12 characters.");
      return;
    }

    const finalId = newStudent.identifier.trim() || generateNextStudentId(users);
    const finalCohort = newStudent.className.trim() || `${newStudent.department} - Class 1`;

    try {
      await provisionUser({
        first_name: newStudent.first_name.trim(),
        last_name: newStudent.last_name.trim(),
        email: newStudent.email.trim().toLowerCase(),
        password: newStudent.password.trim(),
        role: "STUDENT",
        department: newStudent.department,
        className: finalCohort,
        academicYear: newStudent.academicYear.trim() || "2024-2028",
        student_identifier: finalId,
        is_active: true,
        twoFactorEnabled: false,
      });
      setIsAddOpen(false);
      showToast(`✓ Admitted student ${newStudent.first_name.trim()} (${finalId}) to ${newStudent.department} (${finalCohort}).`);
      setNewStudent({
        first_name: "",
        last_name: "",
        email: "",
        department: departments[0]?.name || "",
        academicYear: "2024-2028",
        className: "",
        identifier: "",
        password: "",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Student creation failed.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Student Accounts</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{roster.length}</p>
          <span className="text-xs text-[#737A90]">Active in Roster</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Active Accounts</span>
          <p className="text-2xl font-black text-[#22B573] font-mono">
            {roster.filter((r) => r.registrationStatus === "Approved").length}
          </p>
          <span className="text-xs text-[#22B573] font-bold">Access enabled</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Inactive Accounts</span>
          <p className="text-2xl font-black text-amber-600 font-mono">
            {roster.filter((r) => r.registrationStatus !== "Approved").length}
          </p>
          <span className="text-xs text-amber-600 font-bold">Access disabled</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Departments</span>
          <p className="text-2xl font-black text-indigo-600 font-mono">
            {new Set(roster.map((r) => r.department).filter(Boolean)).size}
          </p>
          <span className="text-xs text-[#737A90]">Academic Units</span>
        </div>
      </div>
{/* Main Card */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="p-5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <span>Student Accounts</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Create student accounts and manage account access.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {roster.some((r) => r.registrationStatus !== "Approved") && (
              <Button
                onClick={handleApproveAllPending}
                className="btn-saas-outline text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Enable All Inactive</span>
              </Button>
            )}

            <Button
              onClick={handleOpenAdd}
              className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Student Admission</span>
            </Button>
          </div>
        </CardHeader>

        {/* Search & Filter Controls */}
        <div className="px-5 pb-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full md:w-80">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {["ALL", "Approved", "Pending Approval"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === status
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {status === "Approved" ? "Active" : status === "Pending Approval" ? "Inactive" : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto w-full border-t border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[760px] text-xs text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Student Details</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Batch &amp; Academic Class</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">No student admissions found</p>
                    <p className="text-xs text-slate-400 mt-1">Student admissions and course registrations will appear here.</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <strong className="text-slate-900 dark:text-white block font-bold">{r.name}</strong>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                        <span className="text-indigo-600 font-bold">{r.rollNo}</span>
                        <span>•</span>
                        <span>{r.email}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">{r.department}</td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{r.semester}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">Batch: {r.academicYear}</span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          r.registrationStatus === "Approved"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {r.registrationStatus === "Approved" ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {r.registrationStatus !== "Approved" ? (
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 cursor-pointer"
                        >
                          Enable Access
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={stuPage}
          totalPages={totalStuPages}
          totalItems={filtered.length}
          pageSize={stuPageSize}
          onPageChange={setStuPage}
          onPageSizeChange={setStuPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemLabel="students"
        />
      </Card>

      {/* New Student Admission Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Admit New Student</h3>
                  <p className="text-[10px] text-slate-500">Official student registration into university database and academic department roster.</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="e.g. Rahul"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="e.g. Sharma"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Institutional Student Email *</label>
                <input
                  type="email"
                  required
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
                  placeholder="e.g. rahul.sharma@smartedu.edu"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Department *</label>
                <select
                  value={newStudent.department}
                  onChange={(e) => {
                    const pickedDept = e.target.value;
                    const dObj = departments.find((d) => d.name === pickedDept || d.code === pickedDept);
                    const cohorts = Array.from(new Set([...(dObj?.cohorts?.map((c) => c.name) || []), ...(dObj?.classes || [])])).filter(Boolean);
                    setNewStudent({
                      ...newStudent,
                      department: pickedDept,
                      className: cohorts[0] || `${dObj?.code || "DEPT"} - Class 1`,
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Year / Batch</label>
                  <select
                    required
                    value={newStudent.academicYear}
                    onChange={(e) => setNewStudent({ ...newStudent, academicYear: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  >
                    <option value="">Select academic batch</option>
                    {Array.from(new Set(departments.flatMap((department) => department.cohorts?.map((cohort) => cohort.academicYear).filter(Boolean) || []))).map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Class / Semester</label>
                  {(() => {
                    const dObj = departments.find((d) => d.name === newStudent.department || d.code === newStudent.department);
                    const cohorts = Array.from(new Set([...(dObj?.cohorts?.map((c) => c.name) || []), ...(dObj?.classes || [])])).filter(Boolean);
                    return (
                      <div className="space-y-1">
                        {cohorts.length > 0 ? (
                          <select
                            required
                            value={cohorts.includes(newStudent.className) ? newStudent.className : ""}
                            onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-semibold"
                          >
                            <option value="">Select academic class</option>
                            {cohorts.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">Create an academic class for this department before admitting students.</p>}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Student ID / Roll Number *
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                    ✓ Auto-incremented sequence
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={newStudent.identifier}
                  onChange={(e) => setNewStudent({ ...newStudent, identifier: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 font-mono font-bold text-indigo-700 dark:text-indigo-300"
                  placeholder="e.g. STU-1002"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Password (min. 12 characters) *</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
                  placeholder="Set initial password (at least 12 characters)"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold">
                  Complete Admission
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
