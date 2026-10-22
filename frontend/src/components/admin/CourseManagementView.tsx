"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  Users,
  GraduationCap,
  Layers,
  Archive,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncCourse } from "@/context/AcademicDataContext";
import { PaginationControls } from "@/components/ui/PaginationControls";

export function CourseManagementView() {
  const { courses, addCourse, updateCourse, deleteCourse, toggleCourseStatus, assignClassesToCourse, departments, users } = useAcademicData();

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SyncCourse | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<SyncCourse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    department: string;
    departmentCode: string;
    instructor: string;
    credits: number;
    semester: string;
    maxCapacity: number;
    type: SyncCourse["type"];
    description: string;
    assignedClasses: string[];
  }>({
    code: "",
    name: "",
    department: "Computer Science & Engineering",
    departmentCode: "CSE",
    instructor: "Faculty Instructor",
    credits: 4,
    semester: "Master Course Bucket",
    maxCapacity: 60,
    type: "Core",
    description: "",
    assignedClasses: [],
  });

  const allCohorts = useMemo(() => {
    const list: { name: string; dept: string }[] = [];
    departments.forEach((d) => {
      if (d.cohorts && d.cohorts.length > 0) {
        d.cohorts.forEach((c) => list.push({ name: c.name, dept: d.code }));
      } else if (d.classes && d.classes.length > 0) {
        d.classes.forEach((c) => list.push({ name: c, dept: d.code }));
      }
    });
    return list;
  }, [departments]);

  const facultyOptions = useMemo(() => {
    const selectedDepartment = departments.find((department) => department.code === formData.departmentCode);
    return users.filter((user) =>
      (user.role === "FACULTY" || user.role === "HOD") &&
      (!selectedDepartment || user.department === selectedDepartment.name || user.department === selectedDepartment.code)
    );
  }, [users, departments, formData.departmentCode]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor.toLowerCase().includes(search.toLowerCase()) ||
        c.department.toLowerCase().includes(search.toLowerCase());

      const matchesDept = selectedDept === "ALL" || c.departmentCode === selectedDept;
      const matchesType = selectedType === "ALL" || c.type === selectedType;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [courses, search, selectedDept, selectedType]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDept, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const handleOpenAdd = () => {
    const firstDepartment = departments[0];
    setFormData({
      code: "",
      name: "",
      department: firstDepartment?.name || "",
      departmentCode: firstDepartment?.code || "",
      instructor: "",
      credits: 4,
      semester: "Master Course Bucket",
      maxCapacity: 60,
      type: "Core",
      description: "",
      assignedClasses: [],
    });
    setIsAddOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.departmentCode || !formData.instructor) return;

    const courseCode = formData.code.toUpperCase().trim();
    try {
      await addCourse({
        code: courseCode,
        name: formData.name.trim(),
        department: formData.department,
        departmentCode: formData.departmentCode,
        instructor: formData.instructor.trim(),
        credits: Number(formData.credits) || 3,
        semester: formData.semester || "Master Course Bucket",
        enrolledStudents: 0,
        maxCapacity: Number(formData.maxCapacity) || 60,
        type: formData.type,
        status: "Active",
        description: formData.description.trim() || "Course syllabus approved by university academic board.",
        assignedClasses: formData.assignedClasses,
      });
      setIsAddOpen(false);
      showToast(`✓ Subject "${formData.name.trim()}" (${courseCode}) published to curriculum bucket.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Course could not be created.", "error");
    }
  };

  const handleOpenEdit = (c: SyncCourse) => {
    setEditingCourse(c);
    setFormData({
      code: c.code,
      name: c.name,
      department: c.department,
      departmentCode: c.departmentCode,
      instructor: c.instructor,
      credits: c.credits,
      semester: c.semester,
      maxCapacity: c.maxCapacity,
      type: c.type,
      description: c.description,
      assignedClasses: c.assignedClasses || [],
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const courseCode = formData.code.toUpperCase().trim();
    try {
      await updateCourse({
        ...editingCourse,
        code: courseCode,
        name: formData.name.trim(),
        department: formData.department,
        departmentCode: formData.departmentCode,
        instructor: formData.instructor.trim(),
        credits: Number(formData.credits) || 3,
        semester: formData.semester,
        maxCapacity: Number(formData.maxCapacity) || 60,
        type: formData.type,
        description: formData.description.trim(),
        assignedClasses: formData.assignedClasses,
      });
      setEditingCourse(null);
      showToast(`✓ Course ${courseCode} updated.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Course could not be updated.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    try {
      await deleteCourse(deletingCourse.id);
      showToast(`✓ Course ${deletingCourse.code} removed from catalog bucket.`, "success");
      setDeletingCourse(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Course could not be deleted.", "error");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleCourseStatus(id);
      const target = courses.find((c) => c.id === id);
      showToast(`✓ Course ${target?.code} status changed.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Course status could not be changed.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs border ${
            toast.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header & Primary KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Total Courses</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{courses.length}</p>
          <span className="text-xs text-[#737A90]">Active in Catalog</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Core Curriculum</span>
          <p className="text-2xl font-black text-[#171A2B] dark:text-white font-mono">
            {courses.filter((c) => c.type === "Core").length}
          </p>
          <span className="text-xs text-[#22B573] font-bold">Mandatory Subjects</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Electives &amp; Labs</span>
          <p className="text-2xl font-black text-[#7C5CFC] font-mono">
            {courses.filter((c) => c.type !== "Core").length}
          </p>
          <span className="text-xs text-[#737A90]">Specialized Tracks</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#737A90] tracking-wider">Total Enrolled</span>
          <p className="text-2xl font-black text-[#22B573] font-mono">
            {courses.reduce((acc, c) => acc + c.enrolledStudents, 0)}
          </p>
          <span className="text-xs text-[#22B573] font-bold">Active Student Seats</span>
        </div>
      </div>

      {/* Course Catalog Table Card */}
      <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
        <CardHeader className="p-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <BookOpen className="h-5 w-5 text-slate-900 dark:text-slate-100" />
              <span>Curriculum &amp; Course Catalog Management</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Create, edit, assign faculty professors, update credits, and configure student capacity limits.
            </CardDescription>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Course</span>
          </Button>
        </CardHeader>

        {/* Filters Bar */}
        <div className="px-5 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737A90]" />
            <input
              type="text"
              placeholder="Search courses, codes, or professors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900 font-bold"
            >
              <option value="ALL">All Faculties</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900 font-bold"
            >
              <option value="ALL">All Course Types</option>
              <option value="Core">Core Mandatory</option>
              <option value="Elective">Elective</option>
              <option value="Lab">Lab Practical</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-[#E8EAF1] dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F8FC] dark:bg-slate-800/60 text-[#737A90] uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Course Code &amp; Title</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Assigned Instructor</th>
                <th className="p-3.5">Credits</th>
                <th className="p-3.5">Enrollment / Cap</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAF1] dark:border-slate-800">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#737A90]">
                    No courses match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                          {c.code}
                        </span>
                        <div>
                          <strong className="text-[#171A2B] dark:text-white block">{c.name}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-[#737A90]">{c.semester}</span>
                            {(c.assignedClasses || []).length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-[#737A90]">&bull;</span>
                                {c.assignedClasses!.map((cls) => (
                                  <span
                                    key={cls}
                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  >
                                    {cls}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium capitalize">{c.department}</td>

                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{c.instructor}</td>

                    <td className="p-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{c.credits} Credits</td>

                    <td className="p-3.5 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">{c.enrolledStudents}</span>
                      <span className="text-slate-400"> / {c.maxCapacity} Seats</span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          c.type === "Core"
                            ? "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                            : c.type === "Lab"
                            ? "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleStatus(c.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                          c.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${c.status === "Active" ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-slate-400"}`} />
                        <span>{c.status}</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Course"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCourse(c)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Course"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCourses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="courses"
        />
      </Card>

      {/* CREATE COURSE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Create New Course / Subject</h3>
                  <p className="text-[10px] text-[#737A90]">Master curriculum bucket. Courses can be assigned to classes each semester.</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-[#737A90] hover:text-[#171A2B]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="CS-402"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Compiler Design & Optimization"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Faculty / Department</label>
                  <select
                    value={formData.departmentCode}
                    onChange={(e) => {
                      const selected = departments.find((d) => d.code === e.target.value);
                      setFormData({
                        ...formData,
                        departmentCode: e.target.value,
                        department: selected?.name || "",
                        instructor: "",
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Primary Instructor</label>
                  <select
                    required
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  >
                    <option value="">Select faculty member</option>
                    {facultyOptions.map((faculty) => {
                      const name = `${faculty.first_name} ${faculty.last_name || ""}`.trim();
                      return <option key={faculty.id} value={name}>{name} ({faculty.email})</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SyncCourse["type"] })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="Core">Core Mandatory</option>
                    <option value="Elective">Elective</option>
                    <option value="Lab">Lab Practical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                  Academic Term / Semester Bucket <span className="text-[#737A90] font-normal text-[11px]">(Optional — course is saved to central bucket)</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                >
                  <option value="Master Course Bucket">Course catalog (unassigned)</option>
                  {Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={`Semester ${index + 1}`}>Semester {index + 1}</option>)}
                </select>
              </div>

              {/* Multi-Class Cohorts Assignment */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block">
                  Assign to Class Cohorts / Sections ({formData.assignedClasses.length} Selected)
                </label>
                <p className="text-[11px] text-[#737A90]">
                  Select the classes or sections that will take this subject in their timetable.
                </p>
                {allCohorts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic p-2 bg-[#F7F8FC] dark:bg-slate-800/60 rounded-xl">
                    No classes created yet. You can assign classes later from Academic Departments.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#F7F8FC] dark:bg-slate-900 rounded-xl border border-[#E8EAF1] dark:border-slate-800">
                    {allCohorts.map((coh) => {
                      const isChecked = formData.assignedClasses.includes(coh.name);
                      return (
                        <label
                          key={coh.name}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assignedClasses: [...formData.assignedClasses, coh.name],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assignedClasses: formData.assignedClasses.filter((cn) => cn !== coh.name),
                                });
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="truncate">{coh.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Syllabus &amp; Course Scope</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline topics covered, prerequisites, learning outcomes, and assessment methods..."
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold">
                  Publish Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Edit Course Details</h3>
              </div>
              <button onClick={() => setEditingCourse(null)} className="text-[#737A90] hover:text-[#171A2B]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Primary Instructor</label>
                  <select
                    required
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  >
                    <option value="">Select faculty member</option>
                    {facultyOptions.map((faculty) => {
                      const name = `${faculty.first_name} ${faculty.last_name || ""}`.trim();
                      return <option key={faculty.id} value={name}>{name} ({faculty.email})</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SyncCourse["type"] })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="Core">Core Mandatory</option>
                    <option value="Elective">Elective</option>
                    <option value="Lab">Lab Practical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Multi-Class Cohorts Assignment in Edit Modal */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block">
                  Assigned Class Cohorts / Sections ({formData.assignedClasses.length} Selected)
                </label>
                <p className="text-[11px] text-[#737A90]">
                  Select the classes or sections that will take this subject in their timetable.
                </p>
                {allCohorts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic p-2 bg-[#F7F8FC] dark:bg-slate-800/60 rounded-xl">
                    No classes created yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#F7F8FC] dark:bg-slate-900 rounded-xl border border-[#E8EAF1] dark:border-slate-800">
                    {allCohorts.map((coh) => {
                      const isChecked = formData.assignedClasses.includes(coh.name);
                      return (
                        <label
                          key={coh.name}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assignedClasses: [...formData.assignedClasses, coh.name],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assignedClasses: formData.assignedClasses.filter((cn) => cn !== coh.name),
                                });
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="truncate">{coh.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Syllabus Scope</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800 shrink-0">
                <Button type="button" variant="outline" onClick={() => setEditingCourse(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold">Remove Course from Catalog</h3>
            </div>
            <p className="text-xs text-[#737A90] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#171A2B] dark:text-white">{deletingCourse.code}: {deletingCourse.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button variant="outline" onClick={() => setDeletingCourse(null)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4">
                Remove Course
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
