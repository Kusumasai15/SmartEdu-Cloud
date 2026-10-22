"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Users,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Calendar,
  Award,
  ChevronRight,
  ShieldAlert,
  Search,
  School,
  Clock,
  MapPin,
  Mail,
  Phone,
  Bookmark,
  ExternalLink,
  TrendingUp,
  Eye,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useAcademicData,
  SyncDepartment,
  SyncSchool,
  SyncClassCohort,
  SyncCourse,
  SyncUser,
} from "@/context/AcademicDataContext";

export function DepartmentManagementView() {
  const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`;
  const {
    departments,
    schools,
    addSchool,
    updateSchool,
    deleteSchool,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addCohortToDepartment,
    updateCohortInDepartment,
    removeCohortFromDepartment,
    assignAdvisorToCohort,
    assignCoursesToCohort,
    addClassToDepartment,
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    classrooms,
    users,
    provisionUser,
    updateUser,
    calendarSchedules,
  } = useAcademicData();

  // Selected Department for Drilldown View
  const [selectedDeptCode, setSelectedDeptCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cohorts" | "courses" | "students" | "faculty">("cohorts");

  // Filter state for students inside department view
  const [studentCohortFilter, setStudentCohortFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Academic Hierarchy View and School Filter
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>("ALL");
  const [hierarchyViewMode, setHierarchyViewMode] = useState<"grid" | "hierarchy">("grid");

  // Modals state
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isSchoolFormOpen, setIsSchoolFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SyncSchool | null>(null);
  const [editingDept, setEditingDept] = useState<SyncDepartment | null>(null);
  const [deletingDept, setDeletingDept] = useState<SyncDepartment | null>(null);

  // Inspect Class Modal State
  const [inspectingCohort, setInspectingCohort] = useState<SyncClassCohort | null>(null);
  const [inspectTab, setInspectTab] = useState<"overview" | "students" | "subjects" | "timetable">("overview");
  const [inspectStudentSearch, setInspectStudentSearch] = useState("");

  // Add Cohort Modal State
  const [isAddCohortOpen, setIsAddCohortOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<SyncClassCohort | null>(null);
  const [editCohortFormData, setEditCohortFormData] = useState({
    name: "",
    program: "",
    semester: "Semester 1",
    section: "Section A",
    classAdvisor: "",
    classAdvisorEmail: "",
    room: "",
    academicYear: "",
    studentCapacity: 0,
  });
  const [deletingCohort, setDeletingCohort] = useState<SyncClassCohort | null>(null);
  const [isSavingCohort, setIsSavingCohort] = useState(false);
  const [isDeletingCohort, setIsDeletingCohort] = useState(false);
  const [cohortFormData, setCohortFormData] = useState({
    program: "",
    semester: "Semester 1",
    section: "Section A",
    name: "",
    classAdvisor: "",
    classAdvisorEmail: "",
    room: "",
    academicYear: "",
    studentCapacity: 0,
  });

  // Promote Cohort to Next Semester Modal State
  const [promotingCohort, setPromotingCohort] = useState<SyncClassCohort | null>(null);
  const [promoteNextSem, setPromoteNextSem] = useState<string>("Semester 2");
  const [promoteNextName, setPromoteNextName] = useState<string>("");
  const [promoteUpdateStudents, setPromoteUpdateStudents] = useState<boolean>(true);
  const [promoteAllCohorts, setPromoteAllCohorts] = useState<boolean>(false);
  const [isPromoting, setIsPromoting] = useState<boolean>(false);

  // Assign Advisor Modal State
  const [advisorModalCohort, setAdvisorModalCohort] = useState<SyncClassCohort | null>(null);
  const [selectedAdvisorName, setSelectedAdvisorName] = useState("");

  // Assign Subjects / Curriculum Modal State
  const [assignSubjectModalCohort, setAssignSubjectModalCohort] = useState<SyncClassCohort | null>(null);
  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState<string[]>([]);
  const [courseInstructorMap, setCourseInstructorMap] = useState<Record<string, string>>({});

  // Map Subject to Classes & Instructor Modal State
  const [mappingSubject, setMappingSubject] = useState<SyncCourse | null>(null);
  const [mapSelectedClasses, setMapSelectedClasses] = useState<string[]>([]);
  const [mapSelectedInstructor, setMapSelectedInstructor] = useState<string>("Unassigned");
  const [mapClassInstructors, setMapClassInstructors] = useState<Record<string, string>>({});

  // Course Modals State
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SyncCourse | null>(null);
  const [editCourseFormData, setEditCourseFormData] = useState({
    code: "",
    name: "",
    department: "",
    departmentCode: "",
    instructor: "",
    credits: 4,
    semester: "Master Course Bucket",
    maxCapacity: 60,
    type: "Core" as SyncCourse["type"],
    description: "",
    assignedClasses: [] as string[],
  });
  const [deletingCourse, setDeletingCourse] = useState<SyncCourse | null>(null);
  const [courseFormData, setCourseFormData] = useState({
    code: "",
    name: "",
    department: "",
    departmentCode: "",
    instructor: "",
    credits: 4,
    semester: "Master Course Bucket",
    maxCapacity: 60,
    type: "Core" as SyncCourse["type"],
    description: "",
    assignedClasses: [] as string[],
  });

  // Add Student to Dept Modal
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    identifier: "",
    className: "",
    phone: "",
    password: "",
  });

  // Department Form state
  const [deptFormData, setDeptFormData] = useState({
    code: "",
    name: "",
    dean: "",
    programCoordinator: "",
    school: "",
    capacity: 400,
    accreditation: "",
    initialCohortName: "",
    initialAdvisor: "",
  });

  const [notification, setNotification] = useState<{ message: string; isError: boolean } | null>(null);
  const [schoolFormData, setSchoolFormData] = useState({ name: "", code: "", dean: "", description: "" });

  const showToast = (msg: string, isError?: boolean) => {
    const errorFlag =
      isError !== undefined
        ? isError
        : /fail|error|not found|conflict|unable|invalid|cannot|duplicate/i.test(msg);
    setNotification({ message: msg, isError: errorFlag });
    setTimeout(() => setNotification(null), 5000);
  };

  const openSchoolForm = (school?: SyncSchool) => {
    setEditingSchool(school || null);
    setSchoolFormData(school ? {
      name: school.name,
      code: school.code,
      dean: school.dean,
      description: school.description || "",
    } : { name: "", code: "", dean: "", description: "" });
    setIsSchoolFormOpen(true);
  };

  const handleSaveSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        name: schoolFormData.name.trim(),
        code: schoolFormData.code.trim().toUpperCase(),
        dean: schoolFormData.dean.trim(),
        description: schoolFormData.description.trim(),
      };
      if (editingSchool) await updateSchool({ ...editingSchool, ...payload });
      else await addSchool(payload);
      setIsSchoolFormOpen(false);
      showToast(editingSchool ? "School updated." : "School created.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "School could not be saved.");
    }
  };

  // Selected Department Object
  const currentDept = useMemo(() => {
    if (!selectedDeptCode) return null;
    return (
      departments.find(
        (d) =>
          d.code.toLowerCase() === selectedDeptCode.toLowerCase() ||
          d.name.toLowerCase() === selectedDeptCode.toLowerCase()
      ) || null
    );
  }, [departments, selectedDeptCode]);

  // Derived faculty and leadership candidate lists for selection bars
  const allFaculty = useMemo(() => {
    return users.filter((u) => u.role === "FACULTY" || u.role === "HOD" || u.role === "VC");
  }, [users]);

  // Candidate Deans / Directors (HOD, VC, Faculty with doctorate/seniority or registered leaders)
  const candidateDeans = useMemo(() => {
    return users.filter((u) => u.role === "HOD" || u.role === "VC" || u.role === "FACULTY");
  }, [users]);

  // Candidate Department Heads (HOD, Faculty, Staff)
  const candidateHods = useMemo(() => {
    return users.filter((u) => u.role === "HOD" || u.role === "FACULTY" || u.role === "ADMINISTRATOR");
  }, [users]);

  const deptFaculty = useMemo(() => {
    if (!currentDept) return [];
    return users.filter(
      (u) =>
        (u.role === "FACULTY" || u.role === "HOD") &&
        (u.department.toLowerCase() === currentDept.name.toLowerCase() ||
          u.department.toLowerCase() === currentDept.code.toLowerCase() ||
          u.department.toLowerCase().includes(currentDept.code.toLowerCase()))
    );
  }, [users, currentDept]);

  // Derived students for current department
  const deptStudents = useMemo(() => {
    if (!currentDept) return [];
    return users.filter(
      (u) =>
        u.role === "STUDENT" &&
        (u.department.toLowerCase() === currentDept.name.toLowerCase() ||
          u.department.toLowerCase() === currentDept.code.toLowerCase() ||
          u.department.toLowerCase().includes(currentDept.code.toLowerCase()))
    );
  }, [users, currentDept]);

  // Derived courses for current department
  const deptCourses = useMemo(() => {
    if (!currentDept) return [];
    return courses.filter(
      (c) =>
        (c.departmentCode && c.departmentCode.toLowerCase() === currentDept.code.toLowerCase()) ||
        c.department.toLowerCase() === currentDept.name.toLowerCase() ||
        c.department.toLowerCase().includes(currentDept.name.toLowerCase()) ||
        c.department.toLowerCase().includes(currentDept.code.toLowerCase())
    );
  }, [courses, currentDept]);

  // Cohorts are persisted records only. Legacy display-name arrays are not expanded into fabricated records.
  const deptCohorts: SyncClassCohort[] = useMemo(() => {
    if (!currentDept) return [];
    return currentDept.cohorts || [];
  }, [currentDept]);

  // Handle Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.code.trim() || !deptFormData.name.trim()) return;

    const code = deptFormData.code.toUpperCase().trim();
    const hasInitialClass = Boolean(deptFormData.initialCohortName.trim());
    const cohortName = deptFormData.initialCohortName.trim();

    const initialClasses = hasInitialClass ? [cohortName] : [];
    const initialCohorts: SyncClassCohort[] = hasInitialClass
      ? [
          {
            id: crypto.randomUUID(),
            name: cohortName,
            program: deptFormData.name.trim(),
            semester: "Semester 1",
            section: "Section A",
            classAdvisor: deptFormData.initialAdvisor.trim() || "Not assigned",
            room: "",
            academicYear: "",
            studentCapacity: 0,
          },
        ]
      : [];

    try {
      await addDepartment({
        code,
        name: deptFormData.name.trim(),
        dean: deptFormData.dean.trim() || "Not assigned",
        programCoordinator: deptFormData.programCoordinator?.trim() || "",
        school: deptFormData.school,
        studentCount: 0,
        capacity: Number(deptFormData.capacity) || 0,
        averageGpa: 0,
        status: "Active",
        accreditation: deptFormData.accreditation || "Not recorded",
        classes: initialClasses,
        cohorts: initialCohorts,
        sections: [],
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Department could not be created.");
      return;
    }

    setIsAddDeptOpen(false);
    showToast(`✓ Department of ${deptFormData.name} created successfully.`);
  };

  // Handle Update Department
  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    try {
      await updateDepartment({
        ...editingDept,
        name: deptFormData.name.trim(),
        dean: deptFormData.dean.trim(),
        programCoordinator: deptFormData.programCoordinator?.trim() || "",
        school: deptFormData.school || editingDept.school || "",
        capacity: Number(deptFormData.capacity),
        accreditation: deptFormData.accreditation,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Department could not be updated.");
      return;
    }

    setEditingDept(null);
    showToast(`✓ Department of ${deptFormData.name} updated.`);
  };

  // Handle Delete Department (In-App Modal)
  const handleConfirmDeleteDept = async () => {
    if (!deletingDept) return;
    try {
      await deleteDepartment(deletingDept.code);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Department could not be deleted.");
      return;
    }
    if (selectedDeptCode === deletingDept.code) {
      setSelectedDeptCode(null);
    }
    const name = deletingDept.name;
    setDeletingDept(null);
    showToast(`✓ Department of ${name} deleted.`);
  };

  // Handle Add Cohort
  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept) return;

    const finalName = cohortFormData.name.trim() || `${cohortFormData.program} - ${cohortFormData.semester} (${cohortFormData.section})`;
    let finalSection = cohortFormData.section || "Section A";
    if (finalName.toLowerCase().includes("sec b") || finalName.toLowerCase().includes("sec-b") || finalName.toLowerCase().includes("section b")) {
      finalSection = "Section B";
    } else if (finalName.toLowerCase().includes("sec c") || finalName.toLowerCase().includes("sec-c") || finalName.toLowerCase().includes("section c")) {
      finalSection = "Section C";
    } else if (finalName.toLowerCase().includes("sec d") || finalName.toLowerCase().includes("sec-d") || finalName.toLowerCase().includes("section d")) {
      finalSection = "Section D";
    }

    const advisorFaculty = allFaculty.find(
      (f) => `${f.first_name} ${f.last_name}`.toLowerCase() === cohortFormData.classAdvisor.toLowerCase()
    );

    setIsSavingCohort(true);
    try {
      await addCohortToDepartment(currentDept.code, {
        name: finalName,
        program: cohortFormData.program,
        semester: cohortFormData.semester,
        section: finalSection,
        classAdvisor: cohortFormData.classAdvisor || "Not assigned",
        classAdvisorEmail: advisorFaculty?.email || cohortFormData.classAdvisorEmail || "",
        room: cohortFormData.room || "",
        academicYear: cohortFormData.academicYear || "",
        studentCapacity: Number(cohortFormData.studentCapacity) || 0,
        status: "ACTIVE",
      });
      setIsAddCohortOpen(false);
      showToast(`Created class "${finalName}".`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Class could not be created.", true);
    } finally {
      setIsSavingCohort(false);
    }
  };

  // Handle Confirm Delete Cohort (In-App Modal)
  const handleConfirmDeleteCohort = async () => {
    if (!currentDept || !deletingCohort) return;
    const targetName = deletingCohort.name;
    setIsDeletingCohort(true);
    try {
      await removeCohortFromDepartment(currentDept.code, deletingCohort.id);
      setDeletingCohort(null);
      showToast(`Removed academic class "${targetName}".`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Class could not be removed.", true);
    } finally {
      setIsDeletingCohort(false);
    }
  };

  // Handle Save Edit Cohort
  const handleSaveEditCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !editingCohort || !editCohortFormData.name.trim()) return;

    const advisorFaculty = allFaculty.find(
      (f) => `${f.first_name} ${f.last_name}`.toLowerCase() === editCohortFormData.classAdvisor.toLowerCase()
    );

    const updatedCohort: SyncClassCohort = {
      ...editingCohort,
      name: editCohortFormData.name.trim(),
      program: editCohortFormData.program,
      semester: editCohortFormData.semester,
      section: editCohortFormData.section,
      classAdvisor: editCohortFormData.classAdvisor || editingCohort.classAdvisor || "Not assigned",
      classAdvisorEmail: advisorFaculty?.email || editCohortFormData.classAdvisorEmail || editingCohort.classAdvisorEmail || "",
      room: editCohortFormData.room || editingCohort.room || "",
      academicYear: editCohortFormData.academicYear || editingCohort.academicYear || "",
      studentCapacity: Number(editCohortFormData.studentCapacity) || editingCohort.studentCapacity || 0,
    };
    setIsSavingCohort(true);
    try {
      await updateCohortInDepartment(currentDept.code, updatedCohort);
      setEditingCohort(null);
      showToast(`Updated academic class "${updatedCohort.name}".`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Class could not be updated.", true);
    } finally {
      setIsSavingCohort(false);
    }
  };

  // Helper to compute next semester
  const computeNextSemester = (currentSem: string) => {
    const match = currentSem.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num < 8) return `Semester ${num + 1}`;
      return `Semester ${num} (Final Year)`;
    }
    return "Semester 2";
  };

  // Helper to compute incremented class display name
  const computeNextClassName = (currentName: string, targetNextSem: string) => {
    const semNumMatch = targetNextSem.match(/\d+/);
    const nextNum = semNumMatch ? semNumMatch[0] : "";
    if (/Semester\s*\d+/i.test(currentName) && nextNum) {
      return currentName.replace(/Semester\s*\d+/i, `Semester ${nextNum}`);
    }
    if (/Sem\s*\d+/i.test(currentName) && nextNum) {
      return currentName.replace(/Sem\s*\d+/i, `Sem ${nextNum}`);
    }
    return `${currentName} - ${targetNextSem}`;
  };

  const handleOpenPromoteCohort = (cohort: SyncClassCohort, allCohorts: boolean = false) => {
    const nextSem = computeNextSemester(cohort.semester || "Semester 1");
    const nextName = computeNextClassName(cohort.name, nextSem);
    setPromotingCohort(cohort);
    setPromoteNextSem(nextSem);
    setPromoteNextName(nextName);
    setPromoteUpdateStudents(true);
    setPromoteAllCohorts(allCohorts);
  };

  const handleExecutePromoteCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !promotingCohort) return;

    setIsPromoting(true);
    try {
      if (promoteAllCohorts) {
        // Universally advance ALL cohorts in the department
        const allCohorts = currentDept.cohorts || [];
        let totalStudentsUpdated = 0;

        for (const coh of allCohorts) {
          const nextSem = computeNextSemester(coh.semester || "Semester 1");
          const nextName = computeNextClassName(coh.name, nextSem);
          const semNumMatch = nextSem.match(/\d+/);
          const nextSemNum = semNumMatch ? parseInt(semNumMatch[0], 10) : undefined;

          updateCohortInDepartment(currentDept.code, {
            ...coh,
            name: nextName,
            semester: nextSem,
          });

          if (promoteUpdateStudents) {
            const matchingStudents = deptStudents.filter((s) => {
              const sNorm = (s.className || "").trim().toLowerCase();
              const cNorm = (coh.name || "").trim().toLowerCase();
              return sNorm === cNorm || sNorm.includes(cNorm) || cNorm.includes(sNorm);
            });
            for (const stu of matchingStudents) {
              await updateUser({
                ...stu,
                className: nextName,
                ...(nextSemNum ? { semester: nextSemNum } : {}),
              });
              totalStudentsUpdated++;
            }
          }
        }

        showToast(`🎉 Universally promoted all ${allCohorts.length} academic classes & sections in ${currentDept.name}! Updated ${totalStudentsUpdated} student profiles.`, false);
        setPromotingCohort(null);
        return;
      }

      // Single cohort promotion
      if (!promoteNextName.trim()) return;
      const semNumMatch = promoteNextSem.match(/\d+/);
      const nextSemNum = semNumMatch ? parseInt(semNumMatch[0], 10) : undefined;

      const updatedCohort: SyncClassCohort = {
        ...promotingCohort,
        name: promoteNextName.trim(),
        semester: promoteNextSem,
      };

      // 1. Update the cohort in the department
      updateCohortInDepartment(currentDept.code, updatedCohort);

      // 2. If student auto-promotion is enabled, update all enrolled students
      const enrolledStudents = deptStudents.filter((s) => {
        const sNorm = (s.className || "").trim().toLowerCase();
        const cNorm = (promotingCohort.name || "").trim().toLowerCase();
        return sNorm === cNorm || sNorm.includes(cNorm) || cNorm.includes(sNorm);
      });

      if (promoteUpdateStudents && enrolledStudents.length > 0) {
        for (const stu of enrolledStudents) {
          await updateUser({
            ...stu,
            className: promoteNextName.trim(),
            ...(nextSemNum ? { semester: nextSemNum } : {}),
          });
        }
      }

      showToast(`🎉 Advanced "${promotingCohort.name}" to ${promoteNextSem} ("${promoteNextName.trim()}"). Updated ${promoteUpdateStudents ? enrolledStudents.length : 0} student profile(s)!`, false);
      setPromotingCohort(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Semester promotion failed.", true);
    } finally {
      setIsPromoting(false);
    }
  };

  // Handle Assign Advisor
  const handleAssignAdvisor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !advisorModalCohort || !selectedAdvisorName) return;

    const advisorFaculty = allFaculty.find(
      (f) => `${f.first_name} ${f.last_name}`.toLowerCase() === selectedAdvisorName.toLowerCase()
    );

    assignAdvisorToCohort(
      currentDept.code,
      advisorModalCohort.id,
      selectedAdvisorName,
      advisorFaculty?.email
    );

    setAdvisorModalCohort(null);
    showToast(`✓ Assigned ${selectedAdvisorName} as Class Advisor for ${advisorModalCohort.name}.`);
  };

  // Handle Assign Subjects / Curriculum to Cohort
  const handleSaveAssignedSubjects = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !assignSubjectModalCohort) return;

    assignCoursesToCohort(
      currentDept.code,
      assignSubjectModalCohort.id,
      selectedSubjectCodes,
      courseInstructorMap
    );

    const cohortName = assignSubjectModalCohort.name;
    setAssignSubjectModalCohort(null);
    showToast(`✓ Assigned ${selectedSubjectCodes.length} subject(s) to ${cohortName}.`);
  };

  // Open Add Course Modal inside Department
  const handleOpenAddCourse = () => {
    const firstDeptFaculty = deptFaculty[0];
    const defaultInst = firstDeptFaculty ? `${firstDeptFaculty.first_name} ${firstDeptFaculty.last_name || ""}`.trim() : "";
    setCourseFormData({
      code: "",
      name: "",
      department: currentDept?.name || "",
      departmentCode: currentDept?.code || "",
      instructor: defaultInst,
      credits: 4,
      semester: "Master Course Bucket",
      maxCapacity: 60,
      type: "Core",
      description: "",
      assignedClasses: [],
    });
    setIsAddCourseOpen(true);
  };

  // Handle Create Course inside Department
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !courseFormData.code.trim() || !courseFormData.name.trim() || !courseFormData.instructor) return;

    const courseCode = courseFormData.code.toUpperCase().trim();
    try {
      await addCourse({
        code: courseCode,
        name: courseFormData.name.trim(),
        department: courseFormData.department || currentDept.name,
        departmentCode: courseFormData.departmentCode || currentDept.code,
        instructor: courseFormData.instructor.trim(),
        credits: Number(courseFormData.credits) || 4,
        semester: courseFormData.semester || "Master Course Bucket",
        enrolledStudents: 0,
        maxCapacity: Number(courseFormData.maxCapacity) || 60,
        type: courseFormData.type,
        status: "Active",
        description: courseFormData.description.trim() || `Core curriculum approved by university academic board.`,
        assignedClasses: courseFormData.assignedClasses,
      });
      setIsAddCourseOpen(false);
      showToast(`✓ Subject "${courseFormData.name.trim()}" (${courseCode}) published to curriculum bucket.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Course could not be created.");
    }
  };

  // Handle Save Edit Course
  const handleSaveEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !editingCourse || !editCourseFormData.name.trim()) return;

    const courseCode = editCourseFormData.code.toUpperCase().trim() || editingCourse.code;
    try {
      await updateCourse({
        ...editingCourse,
        code: courseCode,
        name: editCourseFormData.name.trim(),
        department: editCourseFormData.department || editingCourse.department,
        departmentCode: editCourseFormData.departmentCode || editingCourse.departmentCode,
        instructor: editCourseFormData.instructor.trim() || editingCourse.instructor,
        credits: Number(editCourseFormData.credits) || editingCourse.credits,
        semester: editCourseFormData.semester || "Master Course Bucket",
        maxCapacity: Number(editCourseFormData.maxCapacity) || 60,
        type: editCourseFormData.type,
        description: editCourseFormData.description.trim(),
        assignedClasses: editCourseFormData.assignedClasses,
      });
      showToast(`✓ Updated subject "${editCourseFormData.name.trim()}".`);
      setEditingCourse(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update subject.");
    }
  };

  // Handle Confirm Delete Course
  const handleConfirmDeleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      await deleteCourse(deletingCourse.id);
      showToast(`✓ Removed subject "${deletingCourse.name}".`);
      setDeletingCourse(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete subject.");
    }
  };

  // Handle Open Map Subject Modal
  const handleOpenMapSubject = (course: SyncCourse) => {
    setMappingSubject(course);
    setMapSelectedClasses(course.assignedClasses || []);
    setMapSelectedInstructor(course.instructor || "Unassigned");

    const initialMap: Record<string, string> = {};
    (currentDept?.cohorts || []).forEach((coh) => {
      if (coh.courseInstructors?.[course.code]) {
        initialMap[coh.name] = coh.courseInstructors[course.code];
      } else {
        initialMap[coh.name] = course.instructor || "Unassigned";
      }
    });
    setMapClassInstructors(initialMap);
  };

  // Handle Save Map Subject to Classes & Instructor
  const handleSaveMapSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingSubject || !currentDept) return;

    try {
      // 1. Update the course record itself
      await updateCourse({
        ...mappingSubject,
        assignedClasses: mapSelectedClasses,
        instructor: mapSelectedInstructor.trim() || "Unassigned",
      });

      // 2. Synchronize each department cohort's assignedCourses & courseInstructors
      const updatedCohorts = (currentDept.cohorts || []).map((coh) => {
        const isMapped = mapSelectedClasses.includes(coh.name);
        const curCourses = new Set(coh.assignedCourses || []);
        const curInstructors = { ...(coh.courseInstructors || {}) };

        if (isMapped) {
          curCourses.add(mappingSubject.code);
          const teacherForThisClass = mapClassInstructors[coh.name] || mapSelectedInstructor || "Unassigned";
          curInstructors[mappingSubject.code] = teacherForThisClass;
        } else {
          curCourses.delete(mappingSubject.code);
          delete curInstructors[mappingSubject.code];
        }

        return {
          ...coh,
          assignedCourses: Array.from(curCourses),
          courseInstructors: curInstructors,
        };
      });

      // 3. Persist cohorts to database via updateDepartment
      await updateDepartment({
        ...currentDept,
        cohorts: updatedCohorts,
      });

      showToast(`✓ Mapped subject "${mappingSubject.name}" (${mappingSubject.code}) with per-class faculty assignments.`);
      setMappingSubject(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to map subject to classes.");
    }
  };

  // Open Unified Onboard Student Modal
  const openOnboardStudentModal = (defaultCohort?: string) => {
    const existingNumbers = users
      .filter((u) => u.role === "STUDENT" && u.student_identifier?.startsWith("STU-"))
      .map((u) => parseInt((u.student_identifier || "").replace("STU-", ""), 10))
      .filter((n) => !isNaN(n));
    const max = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    const newIdentifier = `STU-${max + 1}`;

    const availableCohorts = [
      ...(currentDept?.cohorts?.map((c) => c.name) || []),
      ...(currentDept?.classes || []),
    ];
    const chosenCohort =
      defaultCohort && defaultCohort !== "ALL"
        ? defaultCohort
        : availableCohorts[0] || `${currentDept?.code || "DEPT"} - Class 1`;

    setStudentFormData({
      first_name: "",
      last_name: "",
      email: "",
      identifier: newIdentifier,
      className: chosenCohort,
      phone: "",
      password: "",
    });
    setIsAddStudentOpen(true);
  };

  // Handle Onboard Student inside Department
  const handleOnboardStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept || !studentFormData.first_name || !studentFormData.email) return;

    const assignedCohort = studentFormData.className || deptCohorts[0]?.name || `${currentDept.code} - Class 1`;
    const finalIdentifier = studentFormData.identifier.trim() || `STU-${Date.now().toString().slice(-4)}`;

    try {
      await provisionUser({
      first_name: studentFormData.first_name.trim(),
      last_name: studentFormData.last_name.trim(),
      email: studentFormData.email.trim().toLowerCase(),
      role: "STUDENT",
      department: currentDept.name,
      className: assignedCohort,
      student_identifier: finalIdentifier,
      phone: studentFormData.phone.trim(),
      password: studentFormData.password,
      is_active: true,
      twoFactorEnabled: false,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Student creation failed.");
      return;
    }

    setIsAddStudentOpen(false);
    showToast(`✓ Successfully onboarded ${studentFormData.first_name} ${studentFormData.last_name} (${finalIdentifier}) to ${currentDept.name}.`);
    setStudentFormData({
      first_name: "",
      last_name: "",
      email: "",
      identifier: "",
      className: "",
      phone: "",
      password: "",
    });
  };

  const handleAssignStudentCohort = async (student: SyncUser, cohortName: string) => {
    try {
      await updateUser({ ...student, className: cohortName });
      showToast(`✓ Assigned ${student.first_name} ${student.last_name} to ${cohortName}.`, false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to assign class.", true);
    }
  };

  const handleBatchAssignUnassigned = async (targetCohort: string) => {
    const targets = deptStudents.filter((s) => !s.className || s.className !== targetCohort);
    if (targets.length === 0) return;
    try {
      for (const s of targets) {
        await updateUser({ ...s, className: targetCohort });
      }
      showToast(`✓ Successfully enrolled ${targets.length} student(s) in ${targetCohort}.`, false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Batch assignment failed.", true);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW 2: DEDICATED DEPARTMENT DETAIL HUB (DRILLDOWN VIEW)
  // ───────────────────────────────────────────────────────────────────────────
  if (currentDept) {
    const filteredStudents = deptStudents.filter((s) => {
      const matchCohort =
        studentCohortFilter === "ALL" ||
        (() => {
          if (!s.className) return false;
          if (s.className === studentCohortFilter) return true;
          const sNorm = s.className.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cNorm = studentCohortFilter.toLowerCase().replace(/[^a-z0-9]/g, "");
          return sNorm === cNorm || sNorm.includes(cNorm) || cNorm.includes(sNorm);
        })();
      const matchSearch =
        !searchQuery ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student_identifier && s.student_identifier.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCohort && matchSearch;
    });

    return (
      <div className="space-y-6 animate-fade-in font-sans">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs border transition-all ${
              notification.isError
                ? "bg-red-50 dark:bg-red-950/70 border-red-300 dark:border-red-800 text-red-700 dark:text-red-200"
                : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.isError ? (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Back Button & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDeptCode(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to All Academic Departments</span>
          </button>

          <span className="text-xs font-mono font-semibold text-slate-400">
            University Division &bull; {currentDept.code}
          </span>
        </div>

        {/* Department Hero Card - Clean Light Theme */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 dark:border-slate-800 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{currentDept.school || "School not assigned"}</span>
                </span>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold rounded-lg border border-blue-200/80 dark:border-blue-800">
                  {currentDept.code}
                </span>
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{currentDept.status}</span>
                </span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200/60 dark:border-slate-700">
                  {currentDept.accreditation}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentDept.name}
              </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Head of Department (HOD): <strong className="text-slate-900 dark:text-white">{currentDept.dean && currentDept.dean !== "Unassigned" ? currentDept.dean : "Unassigned"}</strong></span>
                  </div>
                  {currentDept.programCoordinator && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Program Coordinator: <strong className="text-slate-900 dark:text-white">{currentDept.programCoordinator}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>Capacity: <strong className="text-slate-900">{currentDept.capacity > 0 ? `${currentDept.capacity} students` : "Not configured"}</strong></span>
                  </div>
                </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                onClick={() => {
                  setCohortFormData({
                    program: currentDept.name,
                    semester: "Semester 1",
                    section: "Section A",
                    name: `${currentDept.code} - Semester 1 (Sec A)`,
                    classAdvisor: deptFaculty[0] ? `${deptFaculty[0].first_name} ${deptFaculty[0].last_name}` : "",
                    classAdvisorEmail: deptFaculty[0]?.email || "",
                    room: "",
                    academicYear: currentAcademicYear,
                    studentCapacity: 0,
                  });
                  setIsAddCohortOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Class</span>
              </Button>

              <Button
                onClick={handleOpenAddCourse}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Add Subject</span>
              </Button>

              <Button
                onClick={() => openOnboardStudentModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span>Onboard Student</span>
              </Button>
            </div>
          </div>

          {/* Department KPI Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Academic Classes</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Layers className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                <span>{deptCohorts.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Enrolled Students</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                <span>{deptStudents.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Faculty Members</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                <span>{deptFaculty.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Offered Subjects</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                <span>{deptCourses.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab("cohorts")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "cohorts"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Academic Classes ({deptCohorts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("courses")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "courses"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Subjects &amp; Curriculum ({deptCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "students"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Enrolled Students ({deptStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("faculty")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "faculty"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Faculty &amp; Advisors ({deptFaculty.length})</span>
          </button>
        </div>

        {/* ─── TAB 1: ACADEMIC CLASSES & COHORTS (WITH CLASS ADVISORS) ─── */}
        {activeTab === "cohorts" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>College Classes, Batches &amp; Class Advisors</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create classes/sections (e.g. B.Tech CSE - Sem 5 Sec A) and assign designated Class Advisors.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {deptCohorts.length > 0 && (
                  <Button
                    onClick={() => {
                      const firstCohort = deptCohorts[0];
                      handleOpenPromoteCohort(firstCohort, true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
                    title="Promote all classes and sections across this department simultaneously"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Promote All Classes ({deptCohorts.length})</span>
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setCohortFormData({
                      program: currentDept.name,
                      semester: "Semester 1",
                      section: "Section A",
                      name: `${currentDept.code} - Semester 1 (Section A)`,
                      classAdvisor: deptFaculty[0] ? `${deptFaculty[0].first_name} ${deptFaculty[0].last_name}` : "",
                      classAdvisorEmail: deptFaculty[0]?.email || "",
                      room: "",
                      academicYear: currentAcademicYear,
                      studentCapacity: 0,
                    });
                    setIsAddCohortOpen(true);
                  }}
                  className="btn-saas-primary text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Academic Class</span>
                </Button>
              </div>
            </div>

            {deptCohorts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3.5">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 rounded-2xl w-fit mx-auto text-blue-600 dark:text-blue-400">
                  <Layers className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No classes or sections created yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Start from a clean baseline by adding your first college class (e.g. B.Tech CSE - Semester 5 Section A) and assigning a faculty Class Advisor.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setCohortFormData({
                      program: currentDept.name,
                      semester: "Semester 1",
                      section: "Section A",
                      name: `${currentDept.code} - Semester 1 (Sec A)`,
                      classAdvisor: deptFaculty[0] ? `${deptFaculty[0].first_name} ${deptFaculty[0].last_name}` : "",
                      classAdvisorEmail: deptFaculty[0]?.email || "",
                      room: "",
                      academicYear: currentAcademicYear,
                      studentCapacity: 0,
                    });
                    setIsAddCohortOpen(true);
                  }}
                  className="btn-saas-primary text-xs font-bold px-4 py-2 mt-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>Create First Academic Class</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptCohorts.map((cohort) => {
                  const enrolledInThisCohort = deptStudents.filter((s) => {
                    if (!s.className) return false;
                    if (s.className === cohort.name) return true;
                    const sNorm = s.className.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const cNorm = cohort.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return sNorm === cNorm || sNorm.includes(cNorm) || cNorm.includes(sNorm);
                  });
                  return (
                    <div
                      key={cohort.id || cohort.name}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          {(() => {
                            const derivedSec =
                              cohort.section ||
                              (cohort.name?.toLowerCase().includes("sec b") || cohort.name?.toLowerCase().includes("sec-b") || cohort.name?.toLowerCase().includes("section b")
                                ? "Section B"
                                : cohort.name?.toLowerCase().includes("sec c") || cohort.name?.toLowerCase().includes("sec-c") || cohort.name?.toLowerCase().includes("section c")
                                ? "Section C"
                                : "Section A");
                            return (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {cohort.semester || "Semester 1"} &bull; {derivedSec}
                              </span>
                            );
                          })()}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cohort.academicYear || "Year not configured"}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {cohort.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cohort.program || currentDept.name}
                          </p>
                        </div>

                        {/* Class Advisor Highlight Box */}
                        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              <span>Assigned Class Advisor</span>
                            </span>
                            <button
                              onClick={() => {
                                setAdvisorModalCohort(cohort);
                                setSelectedAdvisorName(cohort.classAdvisor || "");
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                            >
                              Change
                            </button>
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{cohort.classAdvisor || "Not assigned"}</span>
                          </div>
                          {cohort.classAdvisorEmail && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {cohort.classAdvisorEmail}
                            </div>
                          )}
                        </div>

                        {/* Details Matrix */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[10px] text-slate-400 block">Enrolled Students</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {enrolledInThisCohort.length} / {cohort.studentCapacity || 60}
                            </span>
                            {enrolledInThisCohort.length === 0 && deptStudents.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleBatchAssignUnassigned(cohort.name)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline block mt-0.5 cursor-pointer"
                              >
                                Enroll Dept Students ({deptStudents.length})
                              </button>
                            )}
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[10px] text-slate-400 block">Assigned Room</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {cohort.room || "LH-101"}
                            </span>
                          </div>
                        </div>

                        {/* Assigned Subjects / Multi-Course Curriculum Box */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-blue-600" />
                              <span>Class Subjects ({(cohort.assignedCourses || []).length})</span>
                            </span>
                            <button
                              onClick={() => {
                                setAssignSubjectModalCohort(cohort);
                                setSelectedSubjectCodes(cohort.assignedCourses || []);
                                setCourseInstructorMap(cohort.courseInstructors || {});
                              }}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                            >
                              + Assign / Edit
                            </button>
                          </div>

                          {(cohort.assignedCourses || []).length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic flex items-center justify-between py-0.5">
                              <span>No subjects assigned yet</span>
                              <button
                                onClick={() => {
                                  setAssignSubjectModalCohort(cohort);
                                  setSelectedSubjectCodes(cohort.assignedCourses || []);
                                  setCourseInstructorMap(cohort.courseInstructors || {});
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-md cursor-pointer transition-colors"
                              >
                                + Add Subjects
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5 pt-1">
                              {cohort.assignedCourses!.map((code) => {
                                const crs = courses.find((c) => c.code.toLowerCase() === code.toLowerCase());
                                const teacher = cohort.courseInstructors?.[code] || crs?.instructor || "Unassigned";
                                return (
                                  <div
                                    key={code}
                                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <strong className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1 py-0.5 rounded text-[9px]">
                                        {code}
                                      </strong>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                        {crs?.name || code}
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 shrink-0">
                                      Teacher: <strong className={teacher === "Unassigned" ? "text-amber-600 dark:text-amber-400 italic" : "text-slate-700 dark:text-slate-300"}>{teacher}</strong>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setInspectingCohort(cohort);
                              setInspectTab("overview");
                              setInspectStudentSearch("");
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 transition-colors cursor-pointer shadow-2xs"
                            title="Inspect complete class records, students, subjects, timetable and advisor"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect Class</span>
                          </button>

                          <button
                            onClick={() => handleOpenPromoteCohort(cohort)}
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            title="Advance batch to next semester and update students"
                          >
                            <TrendingUp className="h-3 w-3" />
                            <span>Promote Next Sem</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCohort(cohort);
                              setEditCohortFormData({
                                name: cohort.name,
                                program: cohort.program || "",
                                semester: cohort.semester || "Semester 1",
                                section: cohort.section || "Section A",
                                classAdvisor: cohort.classAdvisor || "",
                                classAdvisorEmail: cohort.classAdvisorEmail || "",
                                room: cohort.room || "",
                                academicYear: cohort.academicYear || "",
                                studentCapacity: cohort.studentCapacity || 0,
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Class"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingCohort(cohort)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: SUBJECTS & CURRICULUM ─── */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span>Subjects &amp; Course Offerings ({currentDept.code})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic curriculum chartered for {currentDept.name} (e.g. Python, Java, DBMS, Mathematics).
                </p>
              </div>

              <Button
                onClick={handleOpenAddCourse}
                className="btn-saas-primary text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject to {currentDept.code}</span>
              </Button>
            </div>

            {deptCourses.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No subjects chartered yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add department courses such as Python Programming, Java, DBMS, or Computer Networks.
                </p>
                <Button
                  onClick={handleOpenAddCourse}
                  className="btn-saas-primary text-xs font-bold px-4 py-2 mt-2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>Charter First Subject</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptCourses.map((course) => (
                  <div
                    key={course.id || course.code}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900">
                          {course.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {course.credits} Credits &bull; {course.type}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {course.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {course.description || `Core academic subject for ${currentDept.name}.`}
                      </p>

                      <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <span>Instructor:</span>
                        <div className="flex items-center gap-1.5">
                          <strong className={course.instructor === "Unassigned" ? "text-amber-600 dark:text-amber-400 italic font-medium" : "text-slate-900 dark:text-white"}>
                            {course.instructor}
                          </strong>
                          <button
                            onClick={() => handleOpenMapSubject(course)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                          >
                            {course.instructor === "Unassigned" ? "+ Assign" : "Change"}
                          </button>
                        </div>
                      </div>

                      {/* Assigned Classes / Sections for this Subject */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                            <Layers className="h-3 w-3 text-purple-600" />
                            <span>Taught in Classes ({(course.assignedClasses || []).length})</span>
                          </span>
                          <button
                            onClick={() => handleOpenMapSubject(course)}
                            className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                          >
                            + Map Classes
                          </button>
                        </div>
                        {(course.assignedClasses || []).length === 0 ? (
                          <div className="flex items-center justify-between pt-0.5">
                            <p className="text-[10px] text-slate-400 italic">No classes mapped yet</p>
                            <button
                              onClick={() => handleOpenMapSubject(course)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded cursor-pointer transition-colors"
                            >
                              + Map Now
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            {course.assignedClasses!.map((cName) => {
                              const coh = deptCohorts.find((c) => c.name === cName);
                              const teacher = coh?.courseInstructors?.[course.code] || course.instructor || "Unassigned";
                              return (
                                <div
                                  key={cName}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px]"
                                >
                                  <span className="font-bold text-purple-900 dark:text-purple-200 truncate max-w-[150px]">
                                    {cName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 shrink-0">
                                    Teacher: <strong className={teacher === "Unassigned" ? "text-amber-600 dark:text-amber-400 italic" : "text-slate-800 dark:text-slate-200"}>{teacher}</strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMapSubject(course)}
                        className="h-7 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span>Map Classes &amp; Faculty</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCourse(course);
                            setEditCourseFormData({
                              code: course.code,
                              name: course.name,
                              department: course.department || currentDept.name,
                              departmentCode: course.departmentCode || currentDept.code,
                              instructor: course.instructor || "",
                              credits: course.credits || 4,
                              semester: course.semester || "Master Course Bucket",
                              maxCapacity: course.maxCapacity || 60,
                              type: (course.type as any) || "Core",
                              description: course.description || "",
                              assignedClasses: course.assignedClasses || [],
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Edit Subject"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCourse(course)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Subject"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: ENROLLED STUDENTS ROSTER ─── */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-56 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Cohort Filter Dropdown */}
                <select
                  value={studentCohortFilter}
                  onChange={(e) => setStudentCohortFilter(e.target.value)}
                  className="h-8 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                >
                  <option value="ALL">All Academic Classes ({deptStudents.length})</option>
                  {deptCohorts.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => openOnboardStudentModal(studentCohortFilter)}
                className="btn-saas-primary text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Onboard Student</span>
              </Button>
            </div>

            {deptStudents.some((s) => !s.className) && deptCohorts.length > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                  <span className="font-bold">⚠️ Unassigned Students Found:</span>
                  <span>{deptStudents.filter((s) => !s.className).length} student(s) do not have a class assigned yet.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBatchAssignUnassigned(deptCohorts[0].name)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ⚡ Assign All to {deptCohorts[0].name}
                </button>
              </div>
            )}

            {filteredStudents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
                <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No students found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {studentCohortFilter !== "ALL"
                    ? `No students are currently enrolled in "${studentCohortFilter}".`
                    : `No students are registered under ${currentDept.name} yet.`}
                </p>
                <Button
                  onClick={() => openOnboardStudentModal(studentCohortFilter)}
                  className="btn-saas-primary text-xs font-bold px-4 py-2 mt-2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>Onboard First Student</span>
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="p-3.5 pl-5">Student Name</th>
                        <th className="p-3.5">Roll Number / ID</th>
                        <th className="p-3.5">Assigned Academic Class</th>
                        <th className="p-3.5">Class Advisor</th>
                        <th className="p-3.5">Email Address</th>
                        <th className="p-3.5 pr-5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((stu) => {
                        const studentCohort = deptCohorts.find((c) => c.name === stu.className);
                        const availableCohorts = Array.from(
                          new Set([...(deptCohorts.map((c) => c.name)), ...(currentDept?.classes || [])])
                        ).filter(Boolean);

                        return (
                          <tr key={stu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 pl-5 font-bold text-slate-900 dark:text-white">
                              {stu.first_name} {stu.last_name}
                            </td>
                            <td className="p-3.5 font-mono text-blue-600 font-bold">
                              {stu.student_identifier || "Not added"}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={stu.className || ""}
                                  onChange={(e) => handleAssignStudentCohort(stu, e.target.value)}
                                  className={`text-[11px] font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer ${
                                    stu.className
                                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                                      : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 font-extrabold"
                                  }`}
                                >
                                  <option value="" disabled={Boolean(stu.className)}>
                                    ⚠ Unassigned (Click to Assign)
                                  </option>
                                  {availableCohorts.map((cName) => (
                                    <option key={cName} value={cName}>
                                      {cName}
                                    </option>
                                  ))}
                                  {stu.className && !availableCohorts.includes(stu.className) && (
                                    <option value={stu.className}>{stu.className}</option>
                                  )}
                                </select>
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-300">
                              {studentCohort?.classAdvisor || "Not assigned"}
                            </td>
                            <td className="p-3.5 text-slate-500 font-mono">
                              {stu.email}
                            </td>
                            <td className="p-3.5 pr-5 text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                ● Active
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: FACULTY & ADVISORS ROSTER ─── */}
        {activeTab === "faculty" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Faculty Members &amp; Mentors ({currentDept.code})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Professors, Assistant Professors, and assigned Class Advisors in {currentDept.name}.
                </p>
              </div>
            </div>

            {deptFaculty.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
                <Users className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No faculty members found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Onboard faculty in Users &amp; Roles assigned to {currentDept.name}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptFaculty.map((fac) => {
                  const advisingCohorts = deptCohorts.filter(
                    (c) => c.classAdvisor.toLowerCase() === `${fac.first_name} ${fac.last_name}`.toLowerCase()
                  );

                  return (
                    <div
                      key={fac.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 border border-purple-200">
                            {fac.role}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {fac.faculty_identifier || "FAC-001"}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {fac.first_name} {fac.last_name}
                        </h3>

                        <p className="text-xs text-slate-500 font-mono truncate">
                          {fac.email}
                        </p>

                        {/* Advising Roles */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">
                            Class Advisor For:
                          </span>
                          {advisingCohorts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {advisingCohorts.map((ac) => (
                                <span
                                  key={ac.name}
                                  className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900"
                                >
                                  {ac.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Available for Class Advisor assignment</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL: CREATE CLASS COHORT ─── */}
        {isAddCohortOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-2xl animate-scale-up my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create College Academic Class</h3>
                    <p className="text-[11px] text-slate-500">Add a new degree program batch &amp; assign a Class Advisor.</p>
                  </div>
                </div>
                <button onClick={() => setIsAddCohortOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCohort} className="space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Degree Program</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B.Tech Computer Science"
                      value={cohortFormData.program}
                      onChange={(e) => {
                        const newProg = e.target.value;
                        setCohortFormData({
                          ...cohortFormData,
                          program: newProg,
                          name: `${currentDept.code} - ${cohortFormData.semester} (${cohortFormData.section})`,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Semester</label>
                    <select
                      value={cohortFormData.semester}
                      onChange={(e) => {
                        const newSem = e.target.value;
                        setCohortFormData({
                          ...cohortFormData,
                          semester: newSem,
                          name: `${currentDept.code} - ${newSem} (${cohortFormData.section})`,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={`Semester ${s}`}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Section</label>
                    </div>
                    <select
                      value={cohortFormData.section}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCohortFormData({ ...cohortFormData, section: val, name: `${currentDept.code} - ${cohortFormData.semester} (${val})` });
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    >
                      <optgroup label="Standard Letter Sections">
                        {["A", "B", "C", "D", "E", "F", "G", "H"].map((letter) => (
                          <option key={letter} value={`Section ${letter}`}>
                            Section {letter}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Specialization Sections">
                        <option value="Section AI & DS">Section AI &amp; DS (AI &amp; Data Science)</option>
                        <option value="Section AI & ML">Section AI &amp; ML (AI &amp; Machine Learning)</option>
                        <option value="Section Cyber Security">Section Cyber Security</option>
                        <option value="Section Cloud Computing">Section Cloud Computing</option>
                        <option value="Section Data Analytics">Section Data Analytics</option>
                        <option value="Section IoT & Robotics">Section IoT &amp; Robotics</option>
                        <option value="Section Core">Section Core</option>
                        <option value="Section Honors">Section Honors</option>
                      </optgroup>
                    </select>
                    <input
                      type="text"
                      placeholder="Or type custom section (e.g. Section AI DS, Group 1)"
                      value={cohortFormData.section}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCohortFormData({
                          ...cohortFormData,
                          section: val,
                          name: `${currentDept.code} - ${cohortFormData.semester} (${val})`,
                        });
                      }}
                      className="w-full mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold placeholder:text-slate-400"
                    />

                    {![
                      "Section A",
                      "Section B",
                      "Section C",
                      "Section D",
                      "Section E",
                      "Section F",
                      "Section G",
                      "Section H",
                      "Section I",
                      "Section J",
                      "Section K",
                      "Section L",
                      "Section M",
                      "Section N",
                      "Section O",
                      "Section P",
                    ].includes(cohortFormData.section) && (
                      <input
                        type="text"
                        placeholder="Enter section (e.g. Section Q, Group 1, AIDs)"
                        value={cohortFormData.section}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCohortFormData({
                            ...cohortFormData,
                            section: val,
                            name: `${currentDept.code} - ${cohortFormData.semester} (${val})`,
                          });
                        }}
                        className="w-full mt-2 p-2 rounded-xl border border-blue-400 bg-white dark:bg-slate-800 text-xs font-semibold"
                      />
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Batch / Year</label>
                    <select
                      value={cohortFormData.academicYear}
                      onChange={(e) => setCohortFormData({ ...cohortFormData, academicYear: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    >
                      <option value="">Select academic batch</option>
                      {Array.from({ length: 8 }, (_, index) => {
                        const start = new Date().getFullYear() - 4 + index;
                        return <option key={start} value={`${start}-${start + 4}`}>{start}-{start + 4}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Class / Cohort Name */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Class / Cohort Display Name
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={cohortFormData.name}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold"
                  />
                </div>

                {/* CLASS ADVISOR SELECTION */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span>Assign Class Advisor / Faculty Mentor</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    The appointed faculty advisor monitors student attendance, mentoring, and class timetable.
                  </p>
                  <div className="space-y-1.5">
                    <select
                      value={cohortFormData.classAdvisor}
                      onChange={(e) => {
                        const advName = e.target.value;
                        const matched = allFaculty.find((f) => `${f.first_name} ${f.last_name}`.trim() === advName);
                        setCohortFormData({ ...cohortFormData, classAdvisor: advName, classAdvisorEmail: matched?.email || "" });
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold text-xs"
                    >
                      <option value="">-- Select Faculty Class Advisor (Optional) --</option>
                      {allFaculty.map((fac) => {
                        const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                        return (
                          <option key={fac.id} value={fullName}>
                            {fullName} — {fac.role} ({fac.department})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Classroom / Room No.</label>
                    {classrooms.length > 0 ? (
                      <select
                        value={cohortFormData.room}
                        onChange={(e) => {
                          const pickedRoom = e.target.value;
                          const matched = classrooms.find((r) => r.roomNumber === pickedRoom || r.name === pickedRoom);
                          setCohortFormData({
                            ...cohortFormData,
                            room: pickedRoom,
                            studentCapacity: matched ? matched.capacity : cohortFormData.studentCapacity,
                          });
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="">-- Assign Classroom / Hall --</option>
                        {classrooms.map((r) => (
                          <option key={r.id} value={r.roomNumber}>
                            {r.roomNumber} - {r.building} ({r.capacity} Seats - {r.type.replace("_", " ")})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                        Create a building, floor, and room before assigning a classroom.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Max Student Capacity</label>
                    <input
                      type="number"
                      min={10}
                      value={cohortFormData.studentCapacity}
                      onChange={(e) => setCohortFormData({ ...cohortFormData, studentCapacity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setIsAddCohortOpen(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingCohort} className="btn-saas-primary text-xs font-bold px-4 py-2">
                    {isSavingCohort ? "Saving..." : "Create Academic Class"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: EDIT CLASS COHORT ─── */}
        {editingCohort && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <Edit2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Academic Class</h3>
                    <p className="text-[11px] text-slate-500">Update class info, advisor, room, and capacity.</p>
                  </div>
                </div>
                <button onClick={() => setEditingCohort(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditCohort} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Class Name / Title</label>
                  <input
                    type="text"
                    required
                    value={editCohortFormData.name}
                    onChange={(e) => setEditCohortFormData({ ...editCohortFormData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Program</label>
                    <input
                      type="text"
                      value={editCohortFormData.program}
                      onChange={(e) => setEditCohortFormData({ ...editCohortFormData, program: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Semester</label>
                    <input
                      type="text"
                      value={editCohortFormData.semester}
                      onChange={(e) => setEditCohortFormData({ ...editCohortFormData, semester: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Section</label>
                    <select
                      value={editCohortFormData.section}
                      onChange={(e) => setEditCohortFormData({ ...editCohortFormData, section: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <optgroup label="Standard Letter Sections">
                        {["A", "B", "C", "D", "E", "F", "G", "H"].map((letter) => (
                          <option key={letter} value={`Section ${letter}`}>Section {letter}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Specialization Sections">
                        <option value="Section AI & DS">Section AI &amp; DS (AI &amp; Data Science)</option>
                        <option value="Section AI & ML">Section AI &amp; ML (AI &amp; Machine Learning)</option>
                        <option value="Section Cyber Security">Section Cyber Security</option>
                        <option value="Section Cloud Computing">Section Cloud Computing</option>
                        <option value="Section Data Analytics">Section Data Analytics</option>
                        <option value="Section IoT & Robotics">Section IoT &amp; Robotics</option>
                        <option value="Section Core">Section Core</option>
                        <option value="Section Honors">Section Honors</option>
                      </optgroup>
                    </select>
                    <input
                      type="text"
                      placeholder="Or enter custom section..."
                      value={editCohortFormData.section}
                      onChange={(e) => setEditCohortFormData({ ...editCohortFormData, section: e.target.value })}
                      className="w-full mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Year</label>
                    <select
                      value={editCohortFormData.academicYear}
                      onChange={(e) => setEditCohortFormData({ ...editCohortFormData, academicYear: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >{Array.from({ length: 8 }, (_, index) => { const start = new Date().getFullYear() - 4 + index; return <option key={start} value={`${start}-${start + 4}`}>{start}-{start + 4}</option>; })}</select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Class Advisor</label>
                  <select
                    value={editCohortFormData.classAdvisor}
                    onChange={(e) => {
                      const advName = e.target.value;
                      const matched = allFaculty.find((f) => `${f.first_name} ${f.last_name}`.trim() === advName);
                      setEditCohortFormData({ ...editCohortFormData, classAdvisor: advName, classAdvisorEmail: matched?.email || "" });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold text-xs"
                  >
                    <option value="">-- Select Faculty Advisor --</option>
                    {allFaculty.map((fac) => {
                      const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                      return (
                        <option key={fac.id} value={fullName}>
                          {fullName} — {fac.role} ({fac.department})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Classroom / Room No.</label>
                    {classrooms.length > 0 ? (
                      <select
                        value={editCohortFormData.room}
                        onChange={(e) => setEditCohortFormData({ ...editCohortFormData, room: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="">-- Assign Room --</option>
                        {classrooms.map((r) => (
                          <option key={r.id} value={r.roomNumber}>
                            {r.roomNumber} - {r.building} ({r.capacity} Seats)
                          </option>
                        ))}
                      </select>
                    ) : <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">Create a room before assigning it.</p>}
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Capacity</label>
                    <input
                      type="number"
                      min={10}
                      value={editCohortFormData.studentCapacity}
                      onChange={(e) => setEditCohortFormData({ ...editCohortFormData, studentCapacity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setEditingCohort(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingCohort} className="btn-saas-primary text-xs font-bold px-4 py-2">
                    {isSavingCohort ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: PROMOTE CLASS TO NEXT SEMESTER ─── */}
        {promotingCohort && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Promote Class to Next Semester</h3>
                    <p className="text-[11px] text-slate-500">Advance academic batch and roll over enrolled students.</p>
                  </div>
                </div>
                <button onClick={() => setPromotingCohort(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleExecutePromoteCohort} className="space-y-3.5 text-xs">
                {/* Current vs Next Banner */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current Semester:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700">
                      {promotingCohort.semester || "Semester 1"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Academic Batch:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {promotingCohort.academicYear || "Year not configured"}
                    </span>
                  </div>
                </div>

                {/* Target Semester Selector */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Promote To Target Semester
                  </label>
                  <select
                    value={promoteNextSem}
                    onChange={(e) => {
                      const newSem = e.target.value;
                      setPromoteNextSem(newSem);
                      setPromoteNextName(computeNextClassName(promotingCohort.name, newSem));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={`Semester ${s}`}>
                        Semester {s}
                      </option>
                    ))}
                    <option value="Graduated / Alumni">Graduated / Alumni</option>
                  </select>
                </div>

                {/* Next Class Display Name */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    New Class / Cohort Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={promoteNextName}
                    onChange={(e) => setPromoteNextName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Automatically auto-incremented from &quot;{promotingCohort.name}&quot;. You can customize it if needed.
                  </p>
                </div>

                {/* Enrolled Students Auto-Promotion Checkbox */}
                <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 space-y-1.5">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoteUpdateStudents}
                      onChange={(e) => setPromoteUpdateStudents(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Auto-promote enrolled students ({deptStudents.filter((s) => (s.className || "").toLowerCase().includes(promotingCohort.name.toLowerCase())).length} found)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Increments each student&apos;s active semester and updates their assigned class to &quot;{promoteNextName}&quot;.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Universal Department Promotion Checkbox */}
                <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoteAllCohorts}
                      onChange={(e) => setPromoteAllCohorts(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Promote ALL classes &amp; sections in this department ({deptCohorts.length} cohorts)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        When checked, all cohorts across all semesters and their enrolled students are simultaneously advanced.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setPromotingCohort(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPromoting}
                    className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{isPromoting ? "Promoting..." : "Advance to " + promoteNextSem}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: IN-APP CONFIRM DELETE CLASS ─── */}
        {deletingCohort && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scale-up">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <ShieldAlert className="h-5 w-5" />
                <span>Delete Class</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to delete <strong>{deletingCohort.name}</strong> from {currentDept.name}?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setDeletingCohort(null)} className="text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeleteCohort}
                  disabled={isDeletingCohort}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  {isDeletingCohort ? "Deleting..." : "Delete Class"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: CHANGE CLASS ADVISOR ─── */}
        {advisorModalCohort && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Assign Class Advisor for {advisorModalCohort.name}
                </h3>
                <button onClick={() => setAdvisorModalCohort(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAssignAdvisor} className="space-y-3.5 text-xs">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Select a faculty mentor who will act as the designated Class Advisor for all students in this class.
                </p>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Faculty Member / Advisor
                  </label>
                  <select
                    value={
                      allFaculty.some((f) => `${f.first_name} ${f.last_name}`.trim() === selectedAdvisorName)
                        ? selectedAdvisorName
                        : selectedAdvisorName
                        ? "__custom__"
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        // User can type below
                      } else {
                        setSelectedAdvisorName(val);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="">-- Choose Faculty Mentor --</option>
                    {allFaculty.map((f) => {
                      const fullName = `${f.first_name} ${f.last_name}`.trim();
                      return (
                        <option key={f.id} value={fullName}>
                          {fullName} — {f.role} ({f.department})
                        </option>
                      );
                    })}
                    <option value="__custom__">✎ Enter Custom Name...</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Selected Advisor, or enter name directly"
                    value={selectedAdvisorName}
                    onChange={(e) => setSelectedAdvisorName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setAdvisorModalCohort(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-saas-primary text-xs font-bold">
                    Save Class Advisor
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: INSPECT CLASS DOSSIER (STUDENTS, SUBJECTS, ADVISOR, TIMETABLE) ─── */}
        {inspectingCohort && (() => {
          const cohortName = inspectingCohort.name;
          const cohortNameLower = cohortName.toLowerCase().trim();

          // 1. Enrolled students matching this cohort name or class_name
          const cohortStudents = users.filter((u) => {
            if (u.role !== "STUDENT") return false;
            const uClass = (u.className || "").toLowerCase().trim();
            return uClass === cohortNameLower || uClass.includes(cohortNameLower);
          });

          const filteredStudents = cohortStudents.filter((s) => {
            if (!inspectStudentSearch.trim()) return true;
            const q = inspectStudentSearch.toLowerCase().trim();
            const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
            const regNo = (s.student_identifier || "").toLowerCase();
            const email = (s.email || "").toLowerCase();
            return fullName.includes(q) || regNo.includes(q) || email.includes(q);
          });

          // 2. Assigned courses
          const assignedCodes = new Set(inspectingCohort.assignedCourses || []);
          const cohortCourses = courses.filter((c) => {
            if (assignedCodes.has(c.code)) return true;
            if (c.assignedClasses && c.assignedClasses.includes(cohortName)) return true;
            return false;
          });

          // 3. Class Advisor details
          const advisorUser = users.find((u) => {
            if (inspectingCohort.classAdvisorEmail && u.email?.toLowerCase() === inspectingCohort.classAdvisorEmail.toLowerCase()) return true;
            if (inspectingCohort.classAdvisor && `${u.first_name} ${u.last_name}`.toLowerCase() === inspectingCohort.classAdvisor.toLowerCase()) return true;
            return false;
          });

          // 4. Timetable schedules matching this class
          const matchingSchedules = calendarSchedules.filter((s) => {
            const sClass = (s.className || "").toLowerCase();
            return sClass === cohortNameLower || sClass.includes(cohortNameLower);
          });

          const totalCredits = cohortCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
          const enrolledCount = cohortStudents.length || inspectingCohort.studentCount || 0;
          const capacity = inspectingCohort.studentCapacity || 60;
          const capacityPct = Math.min(100, Math.round((enrolledCount / Math.max(1, capacity)) * 100));

          // Mock standard weekly schedule if no dedicated DB slots logged yet
          const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const timeSlots = [
            { time: "09:00 - 10:00", label: "Period 1" },
            { time: "10:00 - 11:00", label: "Period 2" },
            { time: "11:15 - 12:15", label: "Period 3" },
            { time: "12:15 - 13:15", label: "Period 4" },
            { time: "14:00 - 15:00", label: "Period 5" },
            { time: "15:00 - 16:00", label: "Period 6" },
          ];

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up my-auto">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 flex items-start justify-between gap-4 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                        {inspectingCohort.semester || "Semester"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80">
                        {inspectingCohort.section || "Section"}
                      </span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Batch {inspectingCohort.academicYear || "2024-2028"}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Class Record
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {inspectingCohort.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {currentDept?.school || "Academic School"} &bull; {currentDept?.name || "Department"} &bull; Room: <span className="font-semibold text-slate-700 dark:text-slate-200">{inspectingCohort.room || "Assigned Classroom"}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => setInspectingCohort(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* KPI Ribbon Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span>Enrolled Students</span>
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {enrolledCount} <span className="text-xs text-slate-400 font-normal">/ {capacity}</span>
                    </p>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-purple-500" />
                      <span>Class Advisor</span>
                    </p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5 truncate" title={inspectingCohort.classAdvisor || "Not Assigned"}>
                      {inspectingCohort.classAdvisor || "Not Assigned"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {inspectingCohort.classAdvisorEmail || "No email listed"}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-emerald-500" />
                      <span>Curriculum Load</span>
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {cohortCourses.length} <span className="text-xs text-slate-400 font-normal">Subjects</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                      {totalCredits} Total Credits
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-amber-500" />
                      <span>Classroom Location</span>
                    </p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5 truncate">
                      {inspectingCohort.room || "Room Assigned"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Sec ID: {inspectingCohort.id?.slice(0, 8) || "COH-REC"}
                    </p>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setInspectTab("overview")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      inspectTab === "overview"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Overview &amp; Advisor</span>
                  </button>

                  <button
                    onClick={() => setInspectTab("students")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      inspectTab === "students"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Student Roster ({cohortStudents.length})</span>
                  </button>

                  <button
                    onClick={() => setInspectTab("subjects")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      inspectTab === "subjects"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Assigned Subjects ({cohortCourses.length})</span>
                  </button>

                  <button
                    onClick={() => setInspectTab("timetable")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      inspectTab === "timetable"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Class Timetable</span>
                  </button>
                </div>

                {/* Tab Body Content */}
                <div className="p-5 overflow-y-auto flex-1 min-h-[320px]">
                  {/* TAB 1: OVERVIEW & ADVISOR */}
                  {inspectTab === "overview" && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Advisor Dossier Card */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-800/60 dark:to-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                            {inspectingCohort.classAdvisor ? inspectingCohort.classAdvisor.replace(/^Dr\.\s*|^Prof\.\s*|^Mr\.\s*|^Mrs\.\s*|^Ms\.\s*/i, "").slice(0, 2).toUpperCase() : "AD"}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                              Appointed Class Advisor
                            </span>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                              {inspectingCohort.classAdvisor || "No Advisor Assigned"}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{inspectingCohort.classAdvisorEmail || "Email not on record"}</span>
                            </p>
                          </div>
                        </div>

                        {inspectingCohort.classAdvisorEmail && (
                          <a
                            href={`mailto:${inspectingCohort.classAdvisorEmail}?subject=Class%20Advisory:%20${encodeURIComponent(inspectingCohort.name)}`}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Contact Advisor</span>
                          </a>
                        )}
                      </div>

                      {/* Cohort Specifications Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Class Specifications
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500">Program / Degree</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inspectingCohort.program || "B.Tech"}</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500">Semester &amp; Term</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inspectingCohort.semester} ({inspectingCohort.section})</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500">Academic Batch</span>
                              <span className="font-semibold font-mono text-slate-900 dark:text-white">{inspectingCohort.academicYear || "2024-2028"}</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-slate-500">Classroom Venue</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inspectingCohort.room || "Room 105"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Academic Enrollment &amp; Load
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500">Confirmed Enrolled Students</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{enrolledCount} Students</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500">Max Section Capacity</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{capacity} Seats</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500">Active Curriculum Subjects</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{cohortCourses.length} Assigned</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-slate-500">Total Statutory Credits</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalCredits} Credits</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Subjects Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Curriculum Subjects Preview ({cohortCourses.length})
                          </h4>
                          <button
                            onClick={() => setInspectTab("subjects")}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <span>View All Details</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cohortCourses.slice(0, 4).map((c) => (
                            <div
                              key={c.id || c.code}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                                  {c.code}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] mt-1">
                                  {c.name}
                                </h5>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {c.instructor || "Assigned Faculty"}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                {c.credits} Cr
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: STUDENT ROSTER */}
                  {inspectTab === "students" && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Search and Count */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[220px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={inspectStudentSearch}
                            onChange={(e) => setInspectStudentSearch(e.target.value)}
                            placeholder="Filter by name, registration number, or email..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredStudents.length}</span> of {cohortStudents.length} students
                        </div>
                      </div>

                      {/* Students Table */}
                      {filteredStudents.length > 0 ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                          <div className="max-h-[380px] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                  <th className="p-3 w-12">#</th>
                                  <th className="p-3">Registration Number</th>
                                  <th className="p-3">Student Name</th>
                                  <th className="p-3">Institutional Email</th>
                                  <th className="p-3">Batch</th>
                                  <th className="p-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {filteredStudents.map((st, idx) => (
                                  <tr key={st.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                    <td className="p-3">
                                      <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/40">
                                        {st.student_identifier || "PENDING"}
                                      </span>
                                    </td>
                                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                                      {st.first_name} {st.last_name}
                                    </td>
                                    <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                      {st.email}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                                      {st.academicYear || inspectingCohort.academicYear || "2024-2028"}
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Active
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-40 text-blue-500" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {cohortStudents.length === 0 ? "No students currently enrolled in this class." : "No students match your search filter."}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {cohortStudents.length === 0 ? "Students can be assigned to this section during onboarding or class transfer." : "Try clearing the search term above."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ASSIGNED SUBJECTS */}
                  {inspectTab === "subjects" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Active Course Curriculum ({cohortCourses.length} Courses &bull; {totalCredits} Credits)
                        </h4>
                      </div>

                      {cohortCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {cohortCourses.map((c) => (
                            <div
                              key={c.id || c.code}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                                    {c.code}
                                  </span>
                                  <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                                    {c.name}
                                  </h5>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  c.type === "Lab" || c.name.toLowerCase().includes("certification") || c.name.toLowerCase().includes("skills")
                                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                }`}>
                                  {c.type === "Lab" || c.name.toLowerCase().includes("certification") || c.name.toLowerCase().includes("skills") ? "Practical" : "Theory"} &bull; {c.credits} Cr
                                </span>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Subject Teacher</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {inspectingCohort.courseInstructors?.[c.code] || c.instructor || "Assigned Faculty Member"}
                                  </span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                  {c.enrolledStudents || enrolledCount} Enrolled
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40 text-blue-500" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            No subjects currently assigned to this class cohort.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Click &ldquo;+ Assign / Edit&rdquo; on the class card to bind courses and faculty instructors.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: CLASS TIMETABLE */}
                  {inspectTab === "timetable" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Weekly Lecture Matrix &bull; {inspectingCohort.name}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Room: <span className="font-semibold text-slate-700 dark:text-slate-200">{inspectingCohort.room || "Assigned Classroom"}</span> &bull; 6 Working Days
                          </p>
                        </div>
                      </div>

                      {/* Timetable Matrix Grid */}
                      {matchingSchedules.length > 0 ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
                          <table className="w-full text-xs min-w-[650px]">
                            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="p-2.5 text-center w-24">Day</th>
                                {timeSlots.map((ts, idx) => (
                                  <th key={idx} className="p-2.5 text-center font-medium">
                                    <span className="block font-bold text-slate-900 dark:text-white">{ts.label}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{ts.time}</span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {weekDays.map((day, dIdx) => {
                                const dayIdxNum = dIdx + 1; // 1=Mon, 2=Tue, ...
                                return (
                                  <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                                      {day}
                                    </td>
                                    {timeSlots.map((ts, sIdx) => {
                                      const slotTimeStart = ts.time.split(" - ")[0].trim();
                                      const scheduleEntry = matchingSchedules.find(
                                        (s) =>
                                          s.dayIndex === dayIdxNum &&
                                          (s.startTime?.startsWith(slotTimeStart) ||
                                            s.lectureNumber === sIdx + 1)
                                      );

                                      if (!scheduleEntry) {
                                        return (
                                          <td
                                            key={sIdx}
                                            className="p-2 text-center text-slate-300 dark:text-slate-600 text-[10px]"
                                          >
                                            &mdash;
                                          </td>
                                        );
                                      }

                                      const isLab =
                                        scheduleEntry.courseName?.toLowerCase().includes("lab") ||
                                        scheduleEntry.courseName?.toLowerCase().includes("practical") ||
                                        scheduleEntry.courseName?.toLowerCase().includes("skills");

                                      return (
                                        <td key={sIdx} className="p-1.5 text-center">
                                          <div
                                            className={`p-1.5 rounded-xl border text-left transition-transform hover:scale-[1.02] ${
                                              isLab
                                                ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-800/50 text-purple-900 dark:text-purple-200"
                                                : "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-800/50 text-blue-900 dark:text-blue-200"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono font-bold text-[9px] uppercase tracking-wider">
                                                {scheduleEntry.courseCode}
                                              </span>
                                              <span className="text-[8px] font-semibold opacity-75">
                                                {isLab ? "LAB" : "LEC"}
                                              </span>
                                            </div>
                                            <p
                                              className="font-bold text-[10px] truncate max-w-[110px] mt-0.5"
                                              title={scheduleEntry.courseName || scheduleEntry.lectureTitle}
                                            >
                                              {scheduleEntry.courseName || scheduleEntry.lectureTitle}
                                            </p>
                                            <p className="text-[9px] opacity-75 truncate max-w-[110px]">
                                              {scheduleEntry.faculty || "Faculty"}
                                            </p>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-slate-400 space-y-3">
                          <Calendar className="h-9 w-9 mx-auto text-slate-400 opacity-60" />
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Timetable Pending Official Scheduling
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                              Lecture periods for {inspectingCohort.name} have not yet been assigned to weekly room slots.
                            </p>
                          </div>
                          {cohortCourses.length > 0 && (
                            <div className="pt-3 max-w-xl mx-auto text-left border-t border-slate-200/60 dark:border-slate-800/60">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                Assigned Curriculum Awaiting Slot Allocation ({cohortCourses.length} Courses)
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cohortCourses.map((c) => (
                                  <div
                                    key={c.id || c.code}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[10px]">
                                        {c.code}
                                      </span>
                                      <p className="truncate font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                                        {c.name}
                                      </p>
                                    </div>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                      {c.credits} Cr
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    Academic Section UID: {inspectingCohort.id || "COH-REC"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      onClick={() => setInspectingCohort(null)}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md"
                    >
                      Close Inspection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── MODAL: ASSIGN SUBJECTS / CURRICULUM TO COHORT ─── */}
        {assignSubjectModalCohort && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scale-up max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Assign Subjects: {assignSubjectModalCohort.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Map curriculum subjects (e.g. Python, Java, DBMS) to this academic class.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAssignSubjectModalCohort(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAssignedSubjects} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900 text-slate-700 dark:text-slate-300 space-y-1 text-xs">
                  <span className="font-bold block text-blue-900 dark:text-blue-200">
                    Curriculum Mapping ({selectedSubjectCodes.length} Subjects Selected)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Check all subjects taught in this class. You can also assign subject-specific faculty instructors.
                  </p>
                </div>

                {/* Subject Selection List */}
                <div className="space-y-2.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Available Academic Subjects ({courses.length})
                  </label>

                  {courses.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400">
                      No subjects chartered in the catalog yet. Click "+ Add Subject" to charter courses.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {courses.map((crs) => {
                        const isSelected = selectedSubjectCodes.includes(crs.code);
                        const assignedInstructor = courseInstructorMap[crs.code] || crs.instructor;

                        return (
                          <div
                            key={crs.id || crs.code}
                            className={`p-3 rounded-2xl border transition-all ${
                              isSelected
                                ? "bg-blue-50/70 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 shadow-2xs"
                                : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSubjectCodes([...selectedSubjectCodes, crs.code]);
                                      if (!courseInstructorMap[crs.code]) {
                                        setCourseInstructorMap({
                                          ...courseInstructorMap,
                                          [crs.code]: crs.instructor,
                                        });
                                      }
                                    } else {
                                      setSelectedSubjectCodes(selectedSubjectCodes.filter((c) => c !== crs.code));
                                    }
                                  }}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-blue-600 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      {crs.code}
                                    </span>
                                    <strong className="text-slate-900 dark:text-white text-xs">{crs.name}</strong>
                                    <span className="text-[10px] text-slate-400 font-mono">({crs.credits} Cr)</span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 block mt-0.5">
                                    {crs.department} &bull; {crs.type}
                                  </span>
                                </div>
                              </label>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between gap-2 text-xs">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                  Subject Instructor:
                                </span>
                                <select
                                  value={assignedInstructor}
                                  onChange={(e) => {
                                    setCourseInstructorMap({
                                      ...courseInstructorMap,
                                      [crs.code]: e.target.value,
                                    });
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium max-w-[200px]"
                                >
                                  <option value={crs.instructor}>{crs.instructor} (Default)</option>
                                  {allFaculty.map((f) => {
                                    const fn = `${f.first_name} ${f.last_name}`;
                                    if (fn === crs.instructor) return null;
                                    return (
                                      <option key={f.id} value={fn}>
                                        {fn} ({f.department})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAssignSubjectModalCohort(null)}
                    className="text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-saas-primary text-xs font-bold px-4 py-2 cursor-pointer">
                    Save Assigned Subjects
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: ADD COURSE / SUBJECT TO THIS DEPT (SYNCHRONIZED WITH COURSE CATALOG) ─── */}
        {isAddCourseOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                  <div>
                    <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Charter Subject / Course ({currentDept.code})</h3>
                    <p className="text-[10px] text-[#737A90]">Master curriculum bucket under {currentDept.name}. Can be assigned to classes each semester.</p>
                  </div>
                </div>
                <button onClick={() => setIsAddCourseOpen(false)} className="text-[#737A90] hover:text-[#171A2B]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS-402"
                      value={courseFormData.code}
                      onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold uppercase font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Compiler Design & Optimization"
                      value={courseFormData.name}
                      onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Faculty / Department</label>
                    <select
                      value={courseFormData.departmentCode}
                      onChange={(e) => {
                        const selected = departments.find((d) => d.code === e.target.value);
                        setCourseFormData({
                          ...courseFormData,
                          departmentCode: e.target.value,
                          department: selected?.name || currentDept.name,
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
                      value={courseFormData.instructor}
                      onChange={(e) => setCourseFormData({ ...courseFormData, instructor: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                    >
                      <option value="Unassigned">-- Select Faculty Instructor (Unassigned) --</option>
                      <optgroup label={`${currentDept.code} Department Faculty (${deptFaculty.length})`}>
                        {deptFaculty.map((f) => {
                          const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                          return (
                            <option key={f.id} value={fullName}>
                              {fullName} &bull; {f.role} {f.email ? `(${f.email})` : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label="Other University Faculty">
                        {allFaculty
                          .filter((f) => !deptFaculty.some((df) => df.id === f.id))
                          .map((f) => {
                            const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                            return (
                              <option key={f.id} value={fullName}>
                                {fullName} &bull; {f.department || "Faculty"} ({f.email})
                              </option>
                            );
                          })}
                      </optgroup>
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
                      value={courseFormData.credits}
                      onChange={(e) => setCourseFormData({ ...courseFormData, credits: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Seat Capacity</label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={courseFormData.maxCapacity}
                      onChange={(e) => setCourseFormData({ ...courseFormData, maxCapacity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Type</label>
                    <select
                      value={courseFormData.type}
                      onChange={(e) => setCourseFormData({ ...courseFormData, type: e.target.value as SyncCourse["type"] })}
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
                  <input
                    type="text"
                    placeholder="e.g. Master Course Bucket, Semester 1, or leave as default"
                    value={courseFormData.semester}
                    onChange={(e) => setCourseFormData({ ...courseFormData, semester: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>

                {/* Multi-Class Assignment */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block">
                    Assign to Academic Classes / Sections ({courseFormData.assignedClasses.length} Selected)
                  </label>
                  <p className="text-[11px] text-[#737A90]">
                    Select the classes or sections that will take this subject in their timetable.
                  </p>
                  {(deptCohorts.length === 0 && (departments.flatMap((d) => d.cohorts || []).length === 0)) ? (
                    <p className="text-[11px] text-slate-400 italic p-2 bg-[#F7F8FC] dark:bg-slate-800/60 rounded-xl">
                      No classes created yet. You can assign classes later from Academic Classes.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#F7F8FC] dark:bg-slate-900 rounded-xl border border-[#E8EAF1] dark:border-slate-800">
                      {(deptCohorts.length > 0 ? deptCohorts : departments.flatMap((d) => d.cohorts || [])).map((coh) => {
                        const isChecked = courseFormData.assignedClasses.includes(coh.name);
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
                                  setCourseFormData({
                                    ...courseFormData,
                                    assignedClasses: [...courseFormData.assignedClasses, coh.name],
                                  });
                                } else {
                                  setCourseFormData({
                                    ...courseFormData,
                                    assignedClasses: courseFormData.assignedClasses.filter((cn) => cn !== coh.name),
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
                    value={courseFormData.description}
                    onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                    placeholder="Outline topics covered, prerequisites, learning outcomes, and assessment methods..."
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setIsAddCourseOpen(false)} className="text-xs">
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

        {/* ─── MODAL: EDIT SUBJECT / COURSE (SYNCHRONIZED WITH COURSE CATALOG) ─── */}
        {editingCourse && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Edit Subject Details ({editingCourse.code})</h3>
                </div>
                <button onClick={() => setEditingCourse(null)} className="text-[#737A90] hover:text-[#171A2B]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditCourse} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      value={editCourseFormData.code}
                      onChange={(e) => setEditCourseFormData({ ...editCourseFormData, code: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold uppercase font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Title</label>
                    <input
                      type="text"
                      required
                      value={editCourseFormData.name}
                      onChange={(e) => setEditCourseFormData({ ...editCourseFormData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Faculty / Department</label>
                    <select
                      value={editCourseFormData.departmentCode}
                      onChange={(e) => {
                        const selected = departments.find((d) => d.code === e.target.value);
                        setEditCourseFormData({
                          ...editCourseFormData,
                          departmentCode: e.target.value,
                          department: selected?.name || currentDept.name,
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
                      value={editCourseFormData.instructor}
                      onChange={(e) => setEditCourseFormData({ ...editCourseFormData, instructor: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                    >
                      <option value="Unassigned">-- Unassigned --</option>
                      <optgroup label={`${currentDept.code} Department Faculty (${deptFaculty.length})`}>
                        {deptFaculty.map((f) => {
                          const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                          return (
                            <option key={f.id} value={fullName}>
                              {fullName} &bull; {f.role} {f.email ? `(${f.email})` : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label="Other University Faculty">
                        {allFaculty
                          .filter((f) => !deptFaculty.some((df) => df.id === f.id))
                          .map((f) => {
                            const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                            return (
                              <option key={f.id} value={fullName}>
                                {fullName} &bull; {f.department || "Faculty"} ({f.email})
                              </option>
                            );
                          })}
                      </optgroup>
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
                      value={editCourseFormData.credits}
                      onChange={(e) => setEditCourseFormData({ ...editCourseFormData, credits: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Seat Capacity</label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={editCourseFormData.maxCapacity}
                      onChange={(e) => setEditCourseFormData({ ...editCourseFormData, maxCapacity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Course Type</label>
                    <select
                      value={editCourseFormData.type}
                      onChange={(e) => setEditCourseFormData({ ...editCourseFormData, type: e.target.value as SyncCourse["type"] })}
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
                  <input
                    type="text"
                    placeholder="e.g. Master Course Bucket, Semester 1, or leave as default"
                    value={editCourseFormData.semester}
                    onChange={(e) => setEditCourseFormData({ ...editCourseFormData, semester: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>

                {/* Multi-Class Assignment in Edit Modal */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block">
                    Assigned Academic Classes / Sections ({editCourseFormData.assignedClasses.length} Selected)
                  </label>
                  <p className="text-[11px] text-[#737A90]">
                    Select the classes or sections that will take this subject in their timetable.
                  </p>
                  {(deptCohorts.length === 0 && (departments.flatMap((d) => d.cohorts || []).length === 0)) ? (
                    <p className="text-[11px] text-slate-400 italic p-2 bg-[#F7F8FC] dark:bg-slate-800/60 rounded-xl">
                      No classes created yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#F7F8FC] dark:bg-slate-900 rounded-xl border border-[#E8EAF1] dark:border-slate-800">
                      {(deptCohorts.length > 0 ? deptCohorts : departments.flatMap((d) => d.cohorts || [])).map((coh) => {
                        const isChecked = editCourseFormData.assignedClasses.includes(coh.name);
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
                                  setEditCourseFormData({
                                    ...editCourseFormData,
                                    assignedClasses: [...editCourseFormData.assignedClasses, coh.name],
                                  });
                                } else {
                                  setEditCourseFormData({
                                    ...editCourseFormData,
                                    assignedClasses: editCourseFormData.assignedClasses.filter((cn) => cn !== coh.name),
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
                    value={editCourseFormData.description}
                    onChange={(e) => setEditCourseFormData({ ...editCourseFormData, description: e.target.value })}
                    placeholder="Outline topics covered, prerequisites, learning outcomes, and assessment methods..."
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

        {/* ─── MODAL: CONFIRM DELETE COURSE ─── */}
        {deletingCourse && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scale-up">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <ShieldAlert className="h-5 w-5" />
                <span>Delete Subject</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to delete <strong>{deletingCourse.name}</strong> ({deletingCourse.code})? This will remove the course curriculum.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setDeletingCourse(null)} className="text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeleteCourse}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Delete Subject
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: MAP SUBJECT TO CLASSES & INSTRUCTOR ─── */}
        {mappingSubject && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#181C2B] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Map Subject: {mappingSubject.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {mappingSubject.code} &bull; {mappingSubject.credits} Credits &bull; {mappingSubject.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMappingSubject(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMapSubject} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                {/* 1. Primary Faculty / Instructor Selection */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <label className="font-bold text-slate-900 dark:text-white block text-xs flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    <span>Assigned Primary Faculty / Instructor</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select the teacher responsible for this subject, course deliveries, continuous assessments, and grades.
                  </p>
                  <select
                    value={mapSelectedInstructor}
                    onChange={(e) => setMapSelectedInstructor(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Unassigned">-- Select Faculty Instructor (Unassigned) --</option>
                    <optgroup label={`${currentDept.code} Department Faculty (${deptFaculty.length})`}>
                      {deptFaculty.map((f) => {
                        const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                        return (
                          <option key={f.id} value={fullName}>
                            {fullName} &bull; {f.role} {f.email ? `(${f.email})` : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Other University Faculty">
                      {allFaculty
                        .filter((f) => !deptFaculty.some((df) => df.id === f.id))
                        .map((f) => {
                          const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                          return (
                            <option key={f.id} value={fullName}>
                              {fullName} &bull; {f.department || "Faculty"} ({f.email})
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                </div>

                {/* 2. Classes Checklist */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-slate-900 dark:text-white block text-xs flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-purple-600" />
                        <span>Taught in Academic Classes ({mapSelectedClasses.length} Selected)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Check the classes that have this subject scheduled in their academic timetable.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const allNames = Array.from(
                            new Set([...deptCohorts.map((c) => c.name), ...(currentDept?.classes || [])])
                          ).filter(Boolean);
                          setMapSelectedClasses(allNames);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline px-1.5 py-0.5 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setMapSelectedClasses([])}
                        className="text-[10px] font-bold text-slate-500 hover:underline px-1.5 py-0.5 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {deptCohorts.length === 0 && (departments.flatMap((d) => d.cohorts || []).length === 0) ? (
                    <p className="text-xs text-slate-400 italic p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                      No academic classes created yet in this department. Create a class first under the &quot;Academic Classes&quot; tab.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {(deptCohorts.length > 0 ? deptCohorts : departments.flatMap((d) => d.cohorts || [])).map((coh) => {
                        const isChecked = mapSelectedClasses.includes(coh.name);
                        const assignedTeacher = mapClassInstructors[coh.name] || mapSelectedInstructor || "Unassigned";

                        return (
                          <div
                            key={coh.id || coh.name}
                            className={`p-3 rounded-xl border text-xs transition-all ${
                              isChecked
                                ? "bg-purple-50/60 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setMapSelectedClasses([...mapSelectedClasses, coh.name]);
                                      if (!mapClassInstructors[coh.name]) {
                                        setMapClassInstructors({
                                          ...mapClassInstructors,
                                          [coh.name]: mapSelectedInstructor !== "Unassigned" ? mapSelectedInstructor : "",
                                        });
                                      }
                                    } else {
                                      setMapSelectedClasses(mapSelectedClasses.filter((cn) => cn !== coh.name));
                                    }
                                  }}
                                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <span className="block font-bold text-slate-900 dark:text-white truncate">
                                    {coh.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                    {coh.classAdvisor ? `Advisor: ${coh.classAdvisor}` : "No advisor"} &bull; Room: {coh.room || "LH-101"}
                                  </span>
                                </div>
                              </label>

                              {isChecked && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 shrink-0">
                                  Class Enrolled
                                </span>
                              )}
                            </div>

                            {/* Per-Class Teacher Selection */}
                            {isChecked && (
                              <div className="mt-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-200 shrink-0 flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-purple-600" />
                                  <span>Assigned Teacher for {coh.name}:</span>
                                </span>
                                <select
                                  value={assignedTeacher}
                                  onChange={(e) =>
                                    setMapClassInstructors({
                                      ...mapClassInstructors,
                                      [coh.name]: e.target.value,
                                    })
                                  }
                                  className="flex-1 text-[11px] font-medium p-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-purple-500 cursor-pointer"
                                >
                                  <option value="Unassigned">-- Select Teacher for this Class --</option>
                                  <optgroup label={`${currentDept.code} Department Faculty`}>
                                    {deptFaculty.map((f) => {
                                      const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                                      return (
                                        <option key={f.id} value={fullName}>
                                          {fullName} &bull; {f.role}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                  <optgroup label="Other University Faculty">
                                    {allFaculty
                                      .filter((f) => !deptFaculty.some((df) => df.id === f.id))
                                      .map((f) => {
                                        const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                                        return (
                                          <option key={f.id} value={fullName}>
                                            {fullName} &bull; {f.department || "Faculty"}
                                          </option>
                                        );
                                      })}
                                  </optgroup>
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMappingSubject(null)}
                    className="text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-saas-primary text-xs px-5 font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Save Subject Mapping</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: ONBOARD STUDENT TO THIS DEPT ─── */}
        {isAddStudentOpen && (() => {
          const matchedCohort = deptCohorts.find((c) => c.name === studentFormData.className) || deptCohorts[0];
          const availableCohorts = Array.from(new Set([...(deptCohorts.map((c) => c.name)), ...(currentDept?.classes || [])])).filter(Boolean);

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-2xl animate-scale-up my-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Onboard Student ({currentDept.name})</h3>
                      <p className="text-[11px] text-slate-500">Register and enroll a student account into this department.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAddStudentOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleOnboardStudent} className="space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Manav"
                        value={studentFormData.first_name}
                        onChange={(e) => setStudentFormData({ ...studentFormData, first_name: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sharma"
                        value={studentFormData.last_name}
                        onChange={(e) => setStudentFormData({ ...studentFormData, last_name: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="student@smartedu.edu"
                        value={studentFormData.email}
                        onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={studentFormData.phone}
                        onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Degree Program &amp; Class</label>
                      <select
                        value={studentFormData.className}
                        onChange={(e) => setStudentFormData({ ...studentFormData, className: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                      >
                        {availableCohorts.length > 0 ? (
                          availableCohorts.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))
                        ) : (
                          <option value={`${currentDept.code} - Class 1`}>{currentDept.code} - Class 1</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Student Roll ID (Unique)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. STU-1001"
                        value={studentFormData.identifier}
                        onChange={(e) => setStudentFormData({ ...studentFormData, identifier: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Class Advisor Indicator */}
                  {matchedCohort?.classAdvisor && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between">
                      <span>👨‍🏫 <strong>Designated Class Advisor:</strong> {matchedCohort.classAdvisor}</span>
                      {matchedCohort.room && <span className="text-slate-500 font-mono">Room: {matchedCohort.room}</span>}
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Login Password</label>
                    <input
                      type="text"
                      required
                      value={studentFormData.password}
                      onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button type="button" variant="outline" onClick={() => setIsAddStudentOpen(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" className="btn-saas-primary text-xs font-bold">
                      Complete Student Onboarding
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW 1: ALL DEPARTMENTS DIRECTORY (TOP-LEVEL LISTING)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs border transition-all ${
            notification.isError
              ? "bg-red-50 dark:bg-red-950/70 border-red-300 dark:border-red-800 text-red-700 dark:text-red-200"
              : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.isError ? (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Institutional Governance
            </span>
            <span className="text-xs text-slate-400 font-medium">University &rarr; Schools &rarr; Departments</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span>Academic Hierarchy &amp; Departments</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Manage academic schools, departments, degree cohorts, assign Class Advisors, and organize institutional curriculums.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => openSchoolForm()}
          className="text-xs font-bold px-4 py-2 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Add School</span>
        </Button>
        <Button
          onClick={() => {
            if (schools.length === 0) {
              showToast("Create a school before adding a department.");
              openSchoolForm();
              return;
            }
            setDeptFormData({
              code: "",
              name: "",
              dean: "",
              programCoordinator: "",
              school: selectedSchoolFilter !== "ALL" ? selectedSchoolFilter : schools[0].name,
              capacity: 240,
              accreditation: "",
              initialCohortName: "",
              initialAdvisor: "",
            });
            setIsAddDeptOpen(true);
          }}
          className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Department</span>
        </Button>
        </div>
      </div>

      {/* Filter and View Mode Switcher Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* School Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 text-[11px] shrink-0">School:</span>
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="ALL">All Schools ({departments.length} Depts)</option>
              {schools.map((s) => {
                const count = departments.filter((d) => d.school === s.name).length;
                return (
                  <option key={s.id} value={s.name}>
                    {s.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* View Switcher: Grid vs Hierarchy */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setHierarchyViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              hierarchyViewMode === "grid"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Departments Grid</span>
          </button>
          <button
            onClick={() => setHierarchyViewMode("hierarchy")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              hierarchyViewMode === "hierarchy"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <School className="h-3.5 w-3.5" />
            <span>University Hierarchy</span>
          </button>
        </div>
      </div>

      {/* ─── VIEW A: UNIVERSITY HIERARCHY TREE (Univ -> School -> Department) ─── */}
      {hierarchyViewMode === "hierarchy" && (
        <div className="space-y-6">
          {/* Institution summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-100 dark:border-blue-900">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase block">Academic structure</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Schools and departments</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {schools.length} schools and {departments.length} departments registered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block">Schools</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{schools.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block">Departments</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{departments.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block">Students</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {users.filter((u) => u.role === "STUDENT").length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {schools.length === 0 && (
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center bg-white dark:bg-slate-900">
              <School className="h-9 w-9 mx-auto text-slate-400 mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white">No schools registered</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">Create the first school, then add its departments.</p>
              <Button onClick={() => openSchoolForm()}><Plus className="h-4 w-4 mr-2" />Create school</Button>
            </div>
          )}

          {/* Schools and their Departments */}
          <div className="space-y-5">
            {schools
              .filter((s) => selectedSchoolFilter === "ALL" || s.name === selectedSchoolFilter)
              .map((sch) => {
                const deptsInSchool = departments.filter(
                  (d) =>
                    d.school === sch.name &&
                    (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.code.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                const schoolStudents = users.filter(
                  (u) =>
                    u.role === "STUDENT" &&
                    deptsInSchool.some(
                      (d) => u.department === d.name || u.department === d.code
                    )
                );

                const schoolFaculty = users.filter(
                  (u) =>
                    (u.role === "FACULTY" || u.role === "HOD") &&
                    deptsInSchool.some(
                      (d) => u.department === d.name || u.department === d.code
                    )
                );

                return (
                  <div
                    key={sch.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5"
                  >
                    {/* School Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                          <School className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                              {sch.code}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{sch.name}</h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Dean / Director: <strong className="text-slate-700 dark:text-slate-300">{sch.dean || "Not assigned"}</strong>
                          </p>
                        </div>
                      </div>

                      {/* School Level Metrics */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button onClick={() => openSchoolForm(sch)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" title="Edit school"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={async () => { try { await deleteSchool(sch.id); showToast("School deleted."); } catch (error) { showToast(error instanceof Error ? error.message : "School could not be deleted."); } }} className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" title="Delete school"><Trash2 className="h-4 w-4" /></button>
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          <strong>{deptsInSchool.length}</strong> Departments
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
                          <strong>{schoolStudents.length}</strong> Students
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                          <strong>{schoolFaculty.length}</strong> Faculty
                        </span>
                        <Button
                          onClick={() => {
                            setDeptFormData({
                              code: "",
                              name: "",
                              dean: "Dr. ",
                              programCoordinator: "",
                              school: sch.name,
                              capacity: 400,
                              accreditation: "NAAC A++ / ABET Accredited",
                              initialCohortName: "",
                              initialAdvisor: "",
                            });
                            setIsAddDeptOpen(true);
                          }}
                          className="btn-saas-primary text-xs font-bold px-3 py-1.5 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Dept to {sch.code}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Nested Departments List under School */}
                    {deptsInSchool.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                        No departments registered under {sch.name} yet. Click &quot;Add Dept to {sch.code}&quot; above to create one.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deptsInSchool.map((d) => {
                          const deptStudentsList = users.filter((u) => u.role === "STUDENT" && (u.department === d.name || u.department === d.code));
                          const deptFacultyList = users.filter((u) => (u.role === "FACULTY" || u.role === "HOD") && (u.department === d.name || u.department === d.code));
                          const classesCount = d.cohorts && d.cohorts.length > 0 ? d.cohorts.length : (d.classes ? d.classes.length : 0);

                          return (
                            <div
                              key={d.code}
                              onClick={() => setSelectedDeptCode(d.code)}
                              className="bg-slate-50/60 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-blue-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                  {d.code}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 border border-emerald-200">
                                  ● {d.status}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors flex items-center justify-between">
                                  <span>{d.name}</span>
                                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">Head: {d.dean || "Department Head"}</p>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                                  <span className="text-[9px] text-slate-400 block">Classes</span>
                                  <strong className="font-mono text-slate-800 dark:text-slate-200">{classesCount}</strong>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                                  <span className="text-[9px] text-slate-400 block">Students</span>
                                  <strong className="font-mono text-slate-900 dark:text-white">{deptStudentsList.length}</strong>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg">
                                  <span className="text-[9px] text-slate-400 block">Faculty</span>
                                  <strong className="font-mono text-slate-900 dark:text-white">{deptFacultyList.length}</strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── VIEW B: FLAT DEPARTMENTS GRID (FILTERABLE BY SCHOOL) ─── */}
      {hierarchyViewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments
            .filter(
              (d) =>
                (selectedSchoolFilter === "ALL" || d.school === selectedSchoolFilter) &&
                (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  d.code.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map((d) => {
              const deptCoursesList = courses.filter((c) => c.departmentCode === d.code || c.department.includes(d.name));
              const deptStudentsList = users.filter((u) => u.role === "STUDENT" && (u.department === d.name || u.department === d.code));
              const classesCount = d.cohorts && d.cohorts.length > 0 ? d.cohorts.length : (d.classes ? d.classes.length : 0);

              return (
                <div
                  key={d.code}
                  onClick={() => setSelectedDeptCode(d.code)}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group relative"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-200/80 dark:border-blue-800/80">
                        {d.code}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{d.status}</span>
                      </span>
                    </div>

                    {/* School Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 w-fit">
                      <School className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[240px] font-medium">{d.school || "School not assigned"}</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors flex items-center justify-between">
                        <span>{d.name}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        HOD: <strong className="text-slate-700 dark:text-slate-300">{d.dean && d.dean !== "Unassigned" ? d.dean : "Unassigned"}</strong>
                      </p>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs border-t border-slate-100 dark:border-slate-800 text-slate-500">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[10px] block text-slate-400">Classes</span>
                        <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-mono text-sm">
                          <Layers className="h-3.5 w-3.5 text-slate-500" />
                          <span>{classesCount}</span>
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[10px] block text-slate-400">Students</span>
                        <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-mono text-sm">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                          <span>{deptStudentsList.length}</span>
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[10px] block text-slate-400">Subjects</span>
                        <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-mono text-sm">
                          <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                          <span>{deptCoursesList.length}</span>
                        </strong>
                      </div>
                    </div>

                    {/* Cohort Chips Preview */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                        Active Classes ({classesCount}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {classesCount === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">No classes yet. Click to add.</span>
                        ) : (
                          (d.cohorts && d.cohorts.length > 0 ? d.cohorts : (d.classes || [])).slice(0, 2).map((item: any) => (
                            <span
                              key={typeof item === "string" ? item : item.name}
                              className="px-2 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200 dark:border-blue-900 truncate max-w-[180px]"
                            >
                              {typeof item === "string" ? item : `${item.name}`}
                            </span>
                          ))
                        )}
                        {classesCount > 2 && (
                          <span className="text-[10px] text-slate-400 font-semibold self-center">
                            +{classesCount - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:underline">
                      <span>Open Department Hub</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingDept(d);
                          setDeptFormData({
                            code: d.code,
                            name: d.name,
                            dean: d.dean && d.dean !== "Unassigned" ? d.dean : "",
                            programCoordinator: (d as any).programCoordinator || "",
                            school: d.school || "",
                            capacity: d.capacity && d.capacity > 0 ? d.capacity : (d.cohorts?.reduce((sum, c) => sum + (Number(c.studentCapacity) || 60), 0) || 240),
                            accreditation: d.accreditation || "NAAC A++",
                            initialCohortName: "",
                            initialAdvisor: "",
                          });
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Edit Department"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingDept(d)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 transition-colors cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* CREATE OR EDIT SCHOOL */}
      {isSchoolFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{editingSchool ? "Edit school" : "Create school"}</h3>
                <p className="text-xs text-slate-500 mt-1">Departments can be added after the school is saved.</p>
              </div>
              <button onClick={() => setIsSchoolFormOpen(false)} aria-label="Close" className="cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveSchool} className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                <label className="text-xs font-semibold">School name<input required minLength={2} value={schoolFormData.name} onChange={(e) => setSchoolFormData({ ...schoolFormData, name: e.target.value })} placeholder="School of Engineering" className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" /></label>
                <label className="text-xs font-semibold">Code<input required minLength={2} maxLength={20} value={schoolFormData.code} onChange={(e) => setSchoolFormData({ ...schoolFormData, code: e.target.value.toUpperCase() })} placeholder="SOE" className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase" /></label>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">
                  Dean / Director of School
                </label>
                <div className="space-y-1.5">
                  <select
                    value={schoolFormData.dean}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSchoolFormData({ ...schoolFormData, dean: val });
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="">-- Select Appointed Dean / Director --</option>
                    {candidateDeans.map((f) => {
                      const fullName = `${f.first_name} ${f.last_name}`.trim();
                      return (
                        <option key={f.id} value={fullName}>
                          {fullName} — {f.role} ({f.department || "Administration"})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <label className="text-xs font-semibold block">Description <span className="font-normal text-slate-400">(optional)</span><textarea value={schoolFormData.description} onChange={(e) => setSchoolFormData({ ...schoolFormData, description: e.target.value })} rows={3} className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none" /></label>
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 flex justify-end gap-2 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 z-10">
                <Button type="button" variant="outline" onClick={() => setIsSchoolFormOpen(false)}>Cancel</Button>
                <Button type="submit" className="btn-saas-primary">{editingSchool ? "Save changes" : "Create school"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full max-h-[88vh] flex flex-col space-y-4 shadow-2xl animate-scale-up my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Register Academic Department</h3>
              <button onClick={() => setIsAddDeptOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              {/* School Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Affiliated School / Faculty</label>
                <select
                  required
                  value={deptFormData.school}
                  onChange={(e) => setDeptFormData({ ...deptFormData, school: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="" disabled>Select a school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE"
                    value={deptFormData.code}
                    onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 uppercase font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science & Engineering"
                    value={deptFormData.name}
                    onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Head of Department (HOD)
                </label>
                <div className="space-y-1.5">
                  <select
                    value={deptFormData.dean}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeptFormData({ ...deptFormData, dean: val });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="">-- Select Appointed Head of Department (HOD) --</option>
                    {candidateHods.map((fac) => {
                      const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                      return (
                        <option key={fac.id} value={fullName}>
                          {fullName} — {fac.role} ({fac.department})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Program Coordinator / Program In-Charge <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={
                      allFaculty.some((f) => `${f.first_name} ${f.last_name}`.trim() === deptFormData.programCoordinator)
                        ? deptFormData.programCoordinator
                        : deptFormData.programCoordinator
                        ? "__custom__"
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "__custom__") {
                        setDeptFormData({ ...deptFormData, programCoordinator: val });
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="">-- Select Appointed Program Coordinator --</option>
                    {allFaculty.map((fac) => {
                      const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                      return (
                        <option key={fac.id} value={fullName}>
                          {fullName} — {fac.role} ({fac.department})
                        </option>
                      );
                    })}
                    <option value="__custom__">✎ Enter Custom Name...</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Selected coordinator name or type custom name"
                    value={deptFormData.programCoordinator}
                    onChange={(e) => setDeptFormData({ ...deptFormData, programCoordinator: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Initial Class <span className="text-slate-400 font-normal">(Optional - leave blank for clean start)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech CSE - Sem 1 (Sec A) or leave blank"
                  value={deptFormData.initialCohortName}
                  onChange={(e) => setDeptFormData({ ...deptFormData, initialCohortName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              {deptFormData.initialCohortName.trim() && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Class Advisor / Faculty Mentor <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={
                        allFaculty.some((f) => `${f.first_name} ${f.last_name}` === deptFormData.initialAdvisor)
                          ? deptFormData.initialAdvisor
                          : deptFormData.initialAdvisor
                          ? "__custom__"
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          // Manual entry below
                        } else {
                          setDeptFormData({ ...deptFormData, initialAdvisor: val });
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                    >
                      <option value="">-- Select Faculty Advisor for this Class --</option>
                      {allFaculty.map((fac) => {
                        const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                        return (
                          <option key={fac.id} value={fullName}>
                            {fullName} — {fac.role} ({fac.department})
                          </option>
                        );
                      })}
                      <option value="__custom__">✎ Enter Custom Name...</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Or enter advisor name directly"
                      value={deptFormData.initialAdvisor}
                      onChange={(e) => setDeptFormData({ ...deptFormData, initialAdvisor: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Student Capacity</label>
                  <input
                    type="number"
                    min={10}
                    value={deptFormData.capacity}
                    onChange={(e) => setDeptFormData({ ...deptFormData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Accreditation</label>
                  <input
                    type="text"
                    value={deptFormData.accreditation}
                    onChange={(e) => setDeptFormData({ ...deptFormData, accreditation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
                <Button type="button" variant="outline" onClick={() => setIsAddDeptOpen(false)} className="text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs font-bold cursor-pointer">
                  Register Department
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full max-h-[88vh] flex flex-col space-y-4 shadow-2xl animate-scale-up my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Department ({editingDept.code})</h3>
              <button onClick={() => setEditingDept(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              {/* School Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Affiliated School / Faculty</label>
                <select
                  required
                  value={deptFormData.school}
                  onChange={(e) => setDeptFormData({ ...deptFormData, school: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="" disabled>Select a school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Head of Department (HOD)
                </label>
                <div className="space-y-1.5">
                  <select
                    value={
                      candidateHods.some((f) => `${f.first_name} ${f.last_name}`.trim() === deptFormData.dean)
                        ? deptFormData.dean
                        : deptFormData.dean
                        ? "__custom__"
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        // Keep or manual entry
                      } else {
                        setDeptFormData({ ...deptFormData, dean: val });
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="">-- Select Appointed Head of Department (HOD) --</option>
                    {candidateHods.map((fac) => {
                      const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                      return (
                        <option key={fac.id} value={fullName}>
                          {fullName} — {fac.role} ({fac.department})
                        </option>
                      );
                    })}
                    <option value="__custom__">✎ Enter Custom / External Name...</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Selected Dean/HOD name, or type custom name directly"
                    value={deptFormData.dean}
                    onChange={(e) => setDeptFormData({ ...deptFormData, dean: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Program Coordinator / Program In-Charge <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={
                      allFaculty.some((f) => `${f.first_name} ${f.last_name}`.trim() === deptFormData.programCoordinator)
                        ? deptFormData.programCoordinator
                        : deptFormData.programCoordinator
                        ? "__custom__"
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "__custom__") {
                        setDeptFormData({ ...deptFormData, programCoordinator: val });
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="">-- Select Appointed Program Coordinator --</option>
                    {allFaculty.map((fac) => {
                      const fullName = `${fac.first_name} ${fac.last_name}`.trim();
                      return (
                        <option key={fac.id} value={fullName}>
                          {fullName} — {fac.role} ({fac.department})
                        </option>
                      );
                    })}
                    <option value="__custom__">✎ Enter Custom Name...</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Selected coordinator name or type custom name"
                    value={deptFormData.programCoordinator}
                    onChange={(e) => setDeptFormData({ ...deptFormData, programCoordinator: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Student Capacity</label>
                  <input
                    type="number"
                    min={10}
                    value={deptFormData.capacity}
                    onChange={(e) => setDeptFormData({ ...deptFormData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Accreditation</label>
                  <input
                    type="text"
                    value={deptFormData.accreditation}
                    onChange={(e) => setDeptFormData({ ...deptFormData, accreditation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setEditingDept(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* DELETE DEPARTMENT IN-APP MODAL */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="h-5 w-5" />
              <span>Delete Department</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete <strong>{deletingDept.name} ({deletingDept.code})</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setDeletingDept(null)} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteDept}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Delete Department
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
