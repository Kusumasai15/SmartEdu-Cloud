"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  Building2,
  Lock,
  Phone,
  RefreshCw,
  Download,
  Key,
  Eye,
  Check,
  FileSpreadsheet,
  Upload,
  FileUp,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAcademicData, SyncUser } from "@/context/AcademicDataContext";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { StudentDetailModal, StudentAcademicDetail } from "@/components/faculty/StudentDetailModal";
import { exportToExcel, importFromExcel, downloadExcelTemplate } from "@/lib/excel-utils";
import { copyToClipboard } from "@/lib/clipboard";

const initialRbacPermissions = [
  { key: "grades:input", label: "Enter & Submit Student Grades", student: false, faculty: true, hod: true, vc: false, admin: true },
  { key: "grades:authorize", label: "Approve & Publish Official Grade Sheets", student: false, faculty: false, hod: true, vc: true, admin: true },
  { key: "exam:proctor:realtime", label: "Live Exam Monitoring", student: false, faculty: true, hod: true, vc: false, admin: true },
  { key: "attendance:rectify", label: "Approve Attendance Corrections (+1 Class)", student: false, faculty: false, hod: true, vc: true, admin: true },
  { key: "curriculum:publish", label: "Publish Course Syllabus & Units", student: false, faculty: true, hod: true, vc: true, admin: true },
  { key: "senate:decree", label: "Academic Senate Sanctions & Decrees", student: false, faculty: false, hod: false, vc: true, admin: true },
  { key: "users:provision", label: "Create & Manage User Accounts", student: false, faculty: false, hod: false, vc: false, admin: true },
  { key: "system:backup", label: "University Records Backup", student: false, faculty: false, hod: false, vc: false, admin: true },
];

export function UserManagementView() {
  const { users, provisionUser, updateUser, deleteUser, toggleUserStatus, departments, courses, attendanceSessions, assignments, submissions } = useAcademicData();
  const [rbacMatrix, setRbacMatrix] = useState(initialRbacPermissions);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRbacMatrixOpen, setIsRbacMatrixOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<SyncUser | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentAcademicDetail | null>(null);
  const [editingUser, setEditingUser] = useState<SyncUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SyncUser | null>(null);
  const [createdCredentialReceipt, setCreatedCredentialReceipt] = useState<{
    name: string;
    email: string;
    id: string;
    password: string;
    role: string;
    department: string;
    className?: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Excel Bulk Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedUsers, setImportedUsers] = useState<Array<{
    first_name: string;
    last_name: string;
    email: string;
    role: SyncUser["role"];
    department: string;
    className?: string;
    identifier?: string;
    password?: string;
    phone?: string;
  }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  // Dedicated Password Reset State
  const [resetPasswordUser, setResetPasswordUser] = useState<SyncUser | null>(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "STUDENT" as SyncUser["role"],
    department: departments[0]?.name || "",
    className: departments[0]?.classes?.[0] || "",
    identifier: "",
    phone: "",
    office_number: "",
    office_hours: "",
    designation: "",
    qualifications: "",
    password: "",
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredUsers = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    return users.filter((u) => {
      const firstName = (u.first_name || "").toLowerCase();
      const lastName = (u.last_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const department = (u.department || "").toLowerCase();
      const studentId = (u.student_identifier || "").toLowerCase();
      const facultyId = (u.faculty_identifier || "").toLowerCase();

      const matchesSearch =
        !q ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        `${firstName} ${lastName}`.includes(q) ||
        email.includes(q) ||
        department.includes(q) ||
        studentId.includes(q) ||
        facultyId.includes(q);

      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.is_active) ||
        (statusFilter === "SUSPENDED" && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // User Directory Pagination
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  // Generate strictly sequential, incrementing ID across all users
  const generateUniqueId = (targetRole: string, allUsers: SyncUser[]) => {
    const prefix = targetRole === "STUDENT" ? "STU" : targetRole === "FACULTY" ? "FAC" : targetRole === "HOD" ? "HOD" : targetRole === "ADMINISTRATOR" ? "ADM" : targetRole === "EXAMINATION" ? "COE" : "VC";
    
    // Extract existing IDs for this prefix and determine highest numeric suffix
    const existingNumbers: number[] = [];
    allUsers.forEach((u) => {
      const idStr = (targetRole === "STUDENT" ? u.student_identifier : u.faculty_identifier) || "";
      if (idStr && idStr.toUpperCase().includes(prefix)) {
        const numMatch = idStr.match(/\d+/g);
        if (numMatch) {
          const parsed = parseInt(numMatch.join(""), 10);
          if (!isNaN(parsed) && parsed >= 1000 && parsed < 999999) {
            existingNumbers.push(parsed);
          }
        }
      }
    });

    const baseStart = 1000;
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : baseStart;
    const nextSeqNum = maxNum + 1;
    return `${prefix}-${nextSeqNum}`;
  };

  // Open Create Modal
  const handleOpenAdd = () => {
    const defaultDept = departments[0]?.name || "";
    const matchedDeptObj = departments.find((d) => d.name === defaultDept || d.code === defaultDept);
    const deptCohorts = matchedDeptObj?.cohorts?.map((c) => c.name) || [];
    const deptClasses = matchedDeptObj?.classes || [];
    const combined = Array.from(new Set([...deptClasses, ...deptCohorts])).filter(Boolean);
    const defaultClass = combined[0] || "";
    const uniqueId = generateUniqueId("STUDENT", users);

    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      role: "STUDENT",
      department: defaultDept,
      className: defaultClass,
      identifier: uniqueId,
      phone: "",
      office_number: "",
      office_hours: "",
      designation: "",
      qualifications: "",
      password: "",
    });
    setIsAddOpen(true);
  };

  // Submit Create
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.email.trim()) return;

    const userRole = formData.role;
    const finalId = formData.identifier.trim() || generateUniqueId(userRole, users);
    const initialPwd = formData.password.trim();
    const finalEmail = formData.email.trim().toLowerCase();

    if (initialPwd.length < 12) {
      showToast("Please set an initial password with at least 12 characters.");
      return;
    }

    // 1. Email Uniqueness Check
    const emailDup = users.find((u) => u.email.trim().toLowerCase() === finalEmail);
    if (emailDup) {
      showToast(`⚠️ Error: Email '${finalEmail}' is already registered to ${emailDup.first_name} ${emailDup.last_name}. Each account must have a unique email.`);
      return;
    }

    // 2. Student ID / Roll Number Uniqueness Check
    if (userRole === "STUDENT" && finalId) {
      const cleanFinalId = finalId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const numFinalId = finalId.replace(/[^0-9]/g, "");
      const stuDup = users.find((u) => {
        const uStuId = (u.student_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uNum = (u.student_identifier || "").replace(/[^0-9]/g, "");
        return (
          (uStuId && cleanFinalId && uStuId === cleanFinalId) ||
          (numFinalId.length >= 3 && uNum && uNum === numFinalId) ||
          ((u.student_identifier || "").trim().toLowerCase() === finalId.trim().toLowerCase())
        );
      });
      if (stuDup) {
        showToast(`⚠️ Duplicate Roll Number / Student ID: '${finalId}' is already assigned to student ${stuDup.first_name} ${stuDup.last_name} (${stuDup.email}). Two students cannot share the same Roll Number / ID.`);
        return;
      }
    }

    // 3. Faculty ID Uniqueness Check
    if ((userRole === "FACULTY" || userRole === "HOD") && finalId) {
      const cleanFinalId = finalId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const numFinalId = finalId.replace(/[^0-9]/g, "");
      const facDup = users.find((u) => {
        const uFacId = (u.faculty_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uNum = (u.faculty_identifier || "").replace(/[^0-9]/g, "");
        return (
          (uFacId && cleanFinalId && uFacId === cleanFinalId) ||
          (numFinalId.length >= 3 && uNum && uNum === numFinalId) ||
          ((u.faculty_identifier || "").trim().toLowerCase() === finalId.trim().toLowerCase())
        );
      });
      if (facDup) {
        showToast(`⚠️ Duplicate Faculty ID: '${finalId}' is already assigned to ${facDup.first_name} ${facDup.last_name} (${facDup.email}). Two faculty members cannot share the same Faculty ID.`);
        return;
      }
    }

    const userPayload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: finalEmail,
      password: initialPwd,
      role: formData.role,
      department: formData.department,
      className: formData.className,
      student_identifier: formData.role === "STUDENT" ? finalId : undefined,
      faculty_identifier: formData.role === "FACULTY" || formData.role === "HOD" ? finalId : undefined,
      phone: formData.phone.trim(),
      office_number: formData.role === "FACULTY" || formData.role === "HOD" ? formData.office_number.trim() : undefined,
      office_hours: formData.role === "FACULTY" || formData.role === "HOD" ? formData.office_hours.trim() : undefined,
      designation: formData.role === "FACULTY" || formData.role === "HOD" ? formData.designation.trim() : undefined,
      qualifications: formData.role === "FACULTY" || formData.role === "HOD" ? formData.qualifications.trim() : undefined,
      is_active: true,
      twoFactorEnabled: false,
    };

    try {
      await provisionUser(userPayload);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Account creation failed.");
      return;
    }

    setIsAddOpen(false);
    setCreatedCredentialReceipt({
      name: `${formData.first_name} ${formData.last_name}`.trim(),
      email: finalEmail,
      id: finalId,
      password: initialPwd,
      role: formData.role,
      department: formData.department,
      className: formData.className,
    });
    showToast(`✓ Account for ${formData.first_name} (${formData.role}) created successfully with unique ID ${finalId}.`);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: SyncUser) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      department: user.department,
      className: user.className || "",
      identifier: user.student_identifier || user.faculty_identifier || "",
      phone: user.phone || "",
      office_number: user.office_number || "",
      office_hours: user.office_hours || "",
      designation: user.designation || "",
      qualifications: user.qualifications || "",
      password: "",
    });
  };

  // Submit Edit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const userRole = formData.role;
    const finalId = formData.identifier.trim();
    const finalEmail = formData.email.trim().toLowerCase();

    // 1. Email Uniqueness Check
    const emailDup = users.find((u) => u.id !== editingUser.id && u.email.trim().toLowerCase() === finalEmail);
    if (emailDup) {
      showToast(`⚠️ Error: Email '${finalEmail}' is already assigned to ${emailDup.first_name} ${emailDup.last_name}.`);
      return;
    }

    // 2. Student ID / Roll Number Uniqueness Check
    if (userRole === "STUDENT" && finalId) {
      const cleanFinalId = finalId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const numFinalId = finalId.replace(/[^0-9]/g, "");
      const stuDup = users.find((u) => {
        if (u.id === editingUser.id) return false;
        const uStuId = (u.student_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uNum = (u.student_identifier || "").replace(/[^0-9]/g, "");
        return (
          (uStuId && cleanFinalId && uStuId === cleanFinalId) ||
          (numFinalId.length >= 3 && uNum && uNum === numFinalId) ||
          ((u.student_identifier || "").trim().toLowerCase() === finalId.trim().toLowerCase())
        );
      });
      if (stuDup) {
        showToast(`⚠️ Duplicate Roll Number / Student ID: '${finalId}' is already assigned to student ${stuDup.first_name} ${stuDup.last_name} (${stuDup.email}).`);
        return;
      }
    }

    // 3. Faculty ID Uniqueness Check
    if ((userRole === "FACULTY" || userRole === "HOD") && finalId) {
      const cleanFinalId = finalId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const numFinalId = finalId.replace(/[^0-9]/g, "");
      const facDup = users.find((u) => {
        if (u.id === editingUser.id) return false;
        const uFacId = (u.faculty_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uNum = (u.faculty_identifier || "").replace(/[^0-9]/g, "");
        return (
          (uFacId && cleanFinalId && uFacId === cleanFinalId) ||
          (numFinalId.length >= 3 && uNum && uNum === numFinalId) ||
          ((u.faculty_identifier || "").trim().toLowerCase() === finalId.trim().toLowerCase())
        );
      });
      if (facDup) {
        showToast(`⚠️ Duplicate Faculty ID: '${finalId}' is already assigned to ${facDup.first_name} ${facDup.last_name} (${facDup.email}).`);
        return;
      }
    }

    if (formData.password && formData.password.trim().length > 0) {
      if (formData.password.trim().length < 12) {
        showToast("⚠️ If updating password, it must be at least 12 characters.");
        return;
      }
    }

    try {
      await updateUser({
        ...editingUser,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: finalEmail,
        password: formData.password.trim() || undefined,
        role: formData.role,
        department: formData.department,
        className: formData.role === 'STUDENT' ? (formData.className || undefined) : undefined,
        student_identifier: formData.role === 'STUDENT' ? (finalId || undefined) : undefined,
        faculty_identifier: formData.role === 'FACULTY' || formData.role === 'HOD' ? (finalId || undefined) : undefined,
        phone: formData.phone.trim(),
        office_number: formData.role === "FACULTY" || formData.role === "HOD" ? formData.office_number.trim() : editingUser.office_number,
        office_hours: formData.role === "FACULTY" || formData.role === "HOD" ? formData.office_hours.trim() : editingUser.office_hours,
        designation: formData.role === "FACULTY" || formData.role === "HOD" ? formData.designation.trim() : editingUser.designation,
        qualifications: formData.role === "FACULTY" || formData.role === "HOD" ? formData.qualifications.trim() : editingUser.qualifications,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Account update failed.");
      return;
    }

    const updatedName = `${formData.first_name} ${formData.last_name}`;
    setEditingUser(null);
    showToast(`✓ Profile for ${updatedName} updated across all university portals.`);
  };

  const handleOpenStudentProfile = (u: SyncUser) => {
    const studentClass = u.className || "";
    const studentCourses = courses.filter((c) => {
      if (!studentClass || !c.assignedClasses || c.assignedClasses.length === 0) return false;
      return c.assignedClasses.some((cls) => cls.toLowerCase().includes(studentClass.toLowerCase()) || studentClass.toLowerCase().includes(cls.toLowerCase()));
    });
    
    // Calculate actual attendance from context
    const studentCourseCodes = studentCourses.map((c) => c.code.toUpperCase());
    const relevantSessions = attendanceSessions.filter((s) =>
      studentCourseCodes.includes(s.courseCode.toUpperCase())
    );
    const avgAttendanceRatio = relevantSessions.length > 0
      ? relevantSessions.reduce((acc, s) => acc + (s.totalCount > 0 ? s.presentCount / s.totalCount : 0), 0) / relevantSessions.length
      : 0;
    const overallAttPct = Number((avgAttendanceRatio * 100).toFixed(1));

    const courseEnrollments = studentCourses.map((c) => {
      const crsSessions = attendanceSessions.filter((s) => s.courseCode.toUpperCase() === c.code.toUpperCase());
      const crsAvg = crsSessions.length > 0
        ? crsSessions.reduce((acc, s) => acc + (s.totalCount > 0 ? s.presentCount / s.totalCount : 0), 0) / crsSessions.length
        : 0;
      const attPct = Number((crsAvg * 100).toFixed(1));
      const totalClasses = crsSessions.length;
      const classesAttended = Math.round(crsAvg * totalClasses);

      return {
        courseCode: c.code,
        courseName: c.name,
        attendancePct: attPct,
        classesAttended,
        totalClasses,
        continuousAssessmentScore: 0,
        midtermScore: 0,
        labScore: 0,
        currentGrade: "Not graded",
        status: (totalClasses === 0 ? "ON_TRACK" : attPct >= 85 ? "TOP_PERFORMER" : attPct >= 75 ? "ON_TRACK" : "SHORTAGE") as "TOP_PERFORMER" | "ON_TRACK" | "SHORTAGE",
      };
    });

    setSelectedStudentProfile({
      id: u.id,
      rollNo: u.student_identifier || "Not added",
      name: `${u.first_name} ${u.last_name}`.trim(),
      email: u.email,
      phone: u.phone || "Not added",
      department: u.department,
      batch: u.className || "Not added",
      semester: u.className || "Not added",
      cgpa: 0,
      overallAttendance: overallAttPct,
      academicStanding: overallAttPct >= 85 ? "HONORS" : overallAttPct >= 75 ? "NORMAL" : "AT_RISK",
      advisor: "Not added",
      courseEnrollments,
      proctoringHistory: [],
    });
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Account deactivation failed.");
      return;
    }
    showToast(`Account ${deletingUser.email} deactivated.`);
    setDeletingUser(null);
  };

  // Toggle Active / Suspended
  const handleToggleStatus = async (userId: string) => {
    try {
      await toggleUserStatus(userId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Account status update failed.");
      return;
    }
    const target = users.find((u) => u.id === userId);
    showToast(`✓ ${target?.first_name} ${target?.last_name} account status updated.`);
  };

  // Export User Directory to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const exportData = paginatedUsers.map((u) => ({
        "First Name": u.first_name,
        "Last Name": u.last_name,
        "Email": u.email,
        "Role": u.role,
        "Department": u.department,
        "Academic Class": u.className || "",
        "Student ID / Roll": u.student_identifier || "",
        "Faculty ID": u.faculty_identifier || "",
        "Phone": u.phone || "",
        "Designation": u.designation || "",
        "Cabin Number": u.office_number || "",
        "Account Status": u.is_active ? "Active" : "Suspended",
        "2FA Enabled": u.twoFactorEnabled ? "Yes" : "No",
        "Registered On": u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
      }));
      exportToExcel(exportData, `UniFlow_User_Roster_${Date.now()}`, "User Directory");
      showToast("✓ Exported institutional user roster to Excel (.xlsx) successfully.");
    } catch (err: any) {
      showToast(err.message || "Failed to export Excel file.");
    }
  };

  // Download an empty import template. Real institutional records are never prefilled.
  const handleDownloadTemplate = () => {
    downloadExcelTemplate(
      ["First Name", "Last Name", "Email", "Role", "Department", "Academic Class", "Identifier", "Password", "Phone"],
      [],
      "UniFlow_User_Import_Template"
    );
    showToast("Downloaded a blank user import template.");
  };

  // Handle Excel File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await importFromExcel(file);
      if (!rows || rows.length === 0) {
        showToast("⚠️ The uploaded spreadsheet has no data rows.");
        return;
      }

      const parsed = rows.map((r: any) => {
        const findVal = (keys: string[]) => {
          for (const k of keys) {
            for (const rowKey of Object.keys(r)) {
              if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, "") === k.toLowerCase().replace(/[^a-z0-9]/g, "")) {
                return String(r[rowKey] || "").trim();
              }
            }
          }
          return "";
        };

        const firstName = findVal(["First Name", "FirstName", "First", "Name"]);
        const lastName = findVal(["Last Name", "LastName", "Last"]);
        const email = findVal(["Email", "Email Address", "EmailAddress"]).toLowerCase();
        const rawRole = findVal(["Role", "Account Role", "Role Name"]).toUpperCase();
        const role = ["STUDENT", "FACULTY", "HOD", "VC", "ADMINISTRATOR", "EXAMINATION"].includes(rawRole)
          ? (rawRole as SyncUser["role"])
          : "STUDENT";
        const dept = findVal(["Department", "Dept", "Department Name"]) || departments[0]?.name || "";
        const className = findVal(["Academic Class", "Cohort / Class", "Class", "Cohort", "Batch"]);
        const identifier = findVal(["Identifier", "Roll", "Student ID", "Faculty ID", "ID"]);
        const password = findVal(["Password", "Initial Password", "Pwd"]);
        const phone = findVal(["Phone", "Mobile", "Contact"]);

        return {
          first_name: firstName,
          last_name: lastName,
          email,
          role,
          department: dept,
          className: className || undefined,
          identifier: identifier || undefined,
          password,
          phone: phone || undefined,
        };
      }).filter((u) => u.email && u.first_name && u.password.length >= 12);

      if (parsed.length === 0) {
        showToast("⚠️ Could not find valid user rows. Please check headers: First Name, Email, Role.");
        return;
      }

      setImportedUsers(parsed);
      setImportSummary(null);
      setIsImportOpen(true);
      showToast(`✓ Loaded ${parsed.length} user records from spreadsheet. Review & click Import to commit.`);
    } catch (err: any) {
      showToast(err.message || "Failed to parse Excel file.");
    } finally {
      e.target.value = "";
    }
  };

  // Bulk Provision Imported Users
  const handleExecuteImport = async () => {
    if (importedUsers.length === 0) return;
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    for (const u of importedUsers) {
      try {
        if (!u.password || u.password.length < 12) {
          throw new Error("A password of at least 12 characters is required for every imported user.");
        }
        const finalId = u.identifier || generateUniqueId(u.role, users);
        await provisionUser({
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          password: u.password,
          role: u.role,
          department: u.department,
          className: u.role === "STUDENT" ? u.className : undefined,
          student_identifier: u.role === "STUDENT" ? finalId : undefined,
          faculty_identifier: u.role !== "STUDENT" ? finalId : undefined,
          phone: u.phone,
          is_active: true,
          twoFactorEnabled: false,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setIsImporting(false);
    setImportSummary({ success, failed });
    showToast(`✓ Batch import finished: ${success} created successfully${failed > 0 ? `, ${failed} skipped (already exists)` : ""}.`);
  };

  // Dedicated Reset Password Execution
  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (newPasswordForReset.trim().length < 12) {
      showToast("⚠️ Password must be at least 12 characters.");
      return;
    }

    const targetUser = resetPasswordUser;
    const cleanNewPassword = newPasswordForReset.trim();
    setIsResettingPassword(true);
    try {
      await updateUser({
        ...targetUser,
        password: cleanNewPassword,
      });
      showToast(`✓ Password for ${targetUser.first_name} ${targetUser.last_name} (${targetUser.role}) updated in the database.`);
      setResetPasswordUser(null);
      setNewPasswordForReset("");

      // Open credential receipt modal so admin can view and copy the newly reset password
      const id = targetUser.student_identifier || targetUser.faculty_identifier || targetUser.id || "N/A";
      setCreatedCredentialReceipt({
        name: `${targetUser.first_name} ${targetUser.last_name || ""}`.trim(),
        email: targetUser.email,
        id: String(id),
        password: cleanNewPassword,
        role: targetUser.role,
        department: targetUser.department || "Academic Department",
        className: (targetUser as any).className || undefined,
      });
    } catch (err: any) {
      showToast(err.message || "Failed to update user password.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Toggle Permission in Matrix
  const handleTogglePermission = (key: string, role: "student" | "faculty" | "hod" | "vc" | "admin") => {
    setRbacMatrix((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          return { ...item, [role]: !item[role] };
        }
        return item;
      })
    );
    showToast(`✓ Updated role permissions for ${key}.`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#22B573]" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header & Global Actions */}
      <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
        <CardHeader className="p-5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <Users className="h-5 w-5 text-slate-900 dark:text-slate-100" />
              <span>University User Accounts &amp; Role Management</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Provision VC, HOD, Examination Controller, Faculty &amp; Student accounts, import/export Excel rosters, and update credentials.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setIsRbacMatrixOpen(true)}
              variant="outline"
              className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
              <span>Permissions</span>
            </Button>

            {/* Hidden Excel File Input */}
            <input
              id="excel-user-import-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => document.getElementById("excel-user-import-input")?.click()}
              variant="outline"
              className="text-xs font-bold flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40 cursor-pointer"
              title="Import users in bulk from Excel (.xlsx) or CSV"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>Import Excel</span>
            </Button>

            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="text-xs font-bold flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 cursor-pointer"
              title="Export roster to Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </Button>
          </div>
        </CardHeader>

        {/* Search and Filters Bar */}
        <div className="px-5 pb-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737A90]" />
            <Input
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-bold border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
            >
              <option value="ALL">All Roles ({users.length})</option>
              <option value="STUDENT">Students ({users.filter(u => u.role === "STUDENT").length})</option>
              <option value="FACULTY">Faculty ({users.filter(u => u.role === "FACULTY").length})</option>
              <option value="HOD">Department Chairs ({users.filter(u => u.role === "HOD").length})</option>
              <option value="VC">Vice Chancellor ({users.filter(u => u.role === "VC").length})</option>
              <option value="ADMINISTRATOR">Administrators ({users.filter(u => u.role === "ADMINISTRATOR").length})</option>
              <option value="EXAMINATION">Examination Dept ({users.filter(u => u.role === "EXAMINATION").length})</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-bold border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
            >
              <option value="ALL">All Accounts</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="SUSPENDED">Suspended Accounts</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border-t border-[#E8EAF1] dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F8FC] dark:bg-slate-800/60 text-[#737A90] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">User &amp; Email</th>
                <th className="p-3.5">Campus Role</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Two-Step Verification</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAF1] dark:border-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#737A90]">
                    No user accounts match current search criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F7F8FC]/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <strong className="text-[#171A2B] dark:text-white block font-bold">
                        {u.first_name} {u.last_name}
                      </strong>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px] text-[#737A90] font-mono">{u.email}</span>
                        {(u.student_identifier || u.faculty_identifier) && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            ID: {u.student_identifier || u.faculty_identifier}
                          </span>
                        )}
                        {u.className && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                            {u.className}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          u.role === "ADMINISTRATOR"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950"
                            : u.role === "VC"
                            ? "bg-purple-50 text-purple-600 dark:bg-purple-950"
                            : u.role === "EXAMINATION"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/40"
                            : u.role === "HOD"
                            ? "bg-blue-50 text-slate-900 dark:text-slate-100 dark:bg-slate-800"
                            : u.role === "FACULTY"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950"
                            : "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-[#737A90]">{u.department}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.twoFactorEnabled
                            ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        }`}
                      >
                        {u.twoFactorEnabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active
                            ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950"
                        }`}
                      >
                        ● {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => {
                          if (u.role === "STUDENT") {
                            handleOpenStudentProfile(u);
                          } else {
                            setViewingUser(u);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-[#E8EAF1] dark:border-slate-800 text-[#737A90] hover:text-[#171A2B] dark:hover:text-white cursor-pointer"
                        title={u.role === "STUDENT" ? "Open Student Academic Profile" : "View User Details"}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                          u.is_active
                            ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                            : "border-emerald-200 text-[#22B573] hover:bg-emerald-50"
                        }`}
                        title={u.is_active ? "Suspend Account" : "Reactivate Account"}
                      >
                        {u.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setResetPasswordUser(u);
                          setNewPasswordForReset("");
                        }}
                        className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/80 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                        title="Reset User Password (Real DB Update)"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg border border-[#E8EAF1] dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingUser(u)}
                        className="p-1.5 rounded-lg border border-[#E8EAF1] dark:border-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Deactivate Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={userPage}
          totalPages={totalUserPages}
          totalItems={filteredUsers.length}
          pageSize={userPageSize}
          onPageChange={setUserPage}
          onPageSizeChange={setUserPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemLabel="users"
        />
      </Card>

      {/* ─── ROLE PERMISSION MATRIX MODAL ─── */}
      {isRbacMatrixOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-2xl w-full max-h-[88vh] flex flex-col space-y-4 shadow-xl animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">University Role Permissions Overview</h3>
              </div>
              <button onClick={() => setIsRbacMatrixOpen(false)} className="text-[#737A90] hover:text-[#171A2B] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F8FC] dark:bg-slate-800/60 text-[#737A90] uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Academic Action / Feature</th>
                    <th className="p-3 text-center">Student</th>
                    <th className="p-3 text-center">Faculty</th>
                    <th className="p-3 text-center">HOD Chair</th>
                    <th className="p-3 text-center">Vice Chancellor</th>
                    <th className="p-3 text-center">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF1] dark:border-slate-800">
                  {rbacMatrix.map((item) => (
                    <tr key={item.key} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <strong className="text-[#171A2B] dark:text-white block">{item.label}</strong>
                      </td>
                      {(["student", "faculty", "hod", "vc", "admin"] as const).map((r) => (
                        <td key={r} className="p-3 text-center">
                          <button
                            onClick={() => handleTogglePermission(item.key, r)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              item[r]
                                ? "bg-emerald-50 text-[#22B573] dark:bg-emerald-950"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                            }`}
                          >
                            {item[r] ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E8EAF1] dark:border-slate-800 shrink-0">
              <Button onClick={() => setIsRbacMatrixOpen(false)} className="btn-saas-primary text-xs px-5 font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── USER DETAILS MODAL ─── */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-xl animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">User Account Information</h3>
              </div>
              <button onClick={() => setViewingUser(null)} className="text-[#737A90] hover:text-[#171A2B] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="p-3.5 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#737A90]">Full Name &amp; Role</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {viewingUser.role}
                  </span>
                </div>
                <p className="font-bold text-[#171A2B] dark:text-white text-base">
                  {viewingUser.first_name} {viewingUser.last_name}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-900 dark:text-slate-100 font-mono">
                  <span>{viewingUser.email}</span>
                  {viewingUser.faculty_identifier && <span>• ID: {viewingUser.faculty_identifier}</span>}
                  {viewingUser.student_identifier && <span>• Roll: {viewingUser.student_identifier}</span>}
                </div>
              </div>

              {(viewingUser.role === "FACULTY" || viewingUser.role === "HOD") && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block uppercase tracking-wider text-[10px]">
                    Faculty Office &amp; Academic Profile
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Designation:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {viewingUser.designation || "Not added"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cabin / Office:</span>
                      <strong className="text-blue-700 dark:text-blue-300">
                        {viewingUser.office_number || "Cabin 304, Academic Block A"}
                      </strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Consultation Hours:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {viewingUser.office_hours || "Mon & Wed 03:00 PM – 05:00 PM"}
                      </strong>
                    </div>
                    {viewingUser.qualifications && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Qualifications:</span>
                        <strong className="text-slate-900 dark:text-white">{viewingUser.qualifications}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-0.5">
                  <span className="text-[#737A90]">Department</span>
                  <p className="font-bold text-[#171A2B] dark:text-white">{viewingUser.department}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-0.5">
                  <span className="text-[#737A90]">Contact Phone</span>
                  <p className="font-bold text-[#171A2B] dark:text-white">{viewingUser.phone || "+91 98765 43210"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-0.5">
                  <span className="text-[#737A90]">Two-Step Login</span>
                  <p className="font-bold text-[#22B573]">{viewingUser.twoFactorEnabled ? "Active" : "Disabled"}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-0.5">
                  <span className="text-[#737A90]">Last Activity</span>
                  <p className="font-bold text-[#171A2B] dark:text-white">{viewingUser.lastLoginDate}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E8EAF1] dark:border-slate-800 shrink-0">
              <Button onClick={() => setViewingUser(null)} className="btn-saas-primary text-xs px-4 font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE USER MODAL ─── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-xl animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Create New University Account</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-[#737A90] hover:text-[#171A2B] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                    placeholder="e.g. Maya"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Last Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                    placeholder="e.g. Patel"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Official University Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium font-mono"
                  placeholder="name@smartedu.edu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Campus Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as SyncUser["role"];
                      const newUniqueId = generateUniqueId(newRole, users);
                      setFormData({
                        ...formData,
                        role: newRole,
                        identifier: newUniqueId,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty / Teacher</option>
                    <option value="HOD">Department Head (HOD)</option>
                    <option value="VC">Vice Chancellor</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                    <option value="EXAMINATION">Examination Department (COE)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const matched = departments.find((d) => d.name === newDept || d.code === newDept);
                      const deptCohorts = matched?.cohorts?.map((c) => c.name) || [];
                      const deptClasses = matched?.classes || [];
                      const combined = Array.from(new Set([...deptClasses, ...deptCohorts])).filter(Boolean);
                      const nextClass = combined[0] || "";
                      setFormData({
                        ...formData,
                        department: newDept,
                        className: nextClass,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    ) : <option value="">Create a department first</option>}
                  </select>
                </div>
              </div>

              {formData.role === "STUDENT" && (() => {
                const selectedDeptObj = departments.find(
                  (d) => d.name === formData.department || d.code === formData.department
                );
                const deptCohorts = selectedDeptObj?.cohorts?.map((c) => c.name) || [];
                const deptClasses = selectedDeptObj?.classes || [];
                const combined = Array.from(new Set([...deptClasses, ...deptCohorts])).filter(Boolean);

                const availableClasses = combined;

                const currentClassValue =
                  formData.className && availableClasses.includes(formData.className)
                    ? formData.className
                    : availableClasses[0];

                const matchedCohort = selectedDeptObj?.cohorts?.find((c) => c.name === currentClassValue);

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                          Degree Program &amp; Class
                        </label>
                        <select
                          required
                          value={currentClassValue}
                          onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs text-[#171A2B] dark:text-white"
                        >
                          {availableClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                          Roll / Student ID
                        </label>
                        <input
                          type="text"
                          value={formData.identifier}
                          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                          placeholder="e.g. CSE-2026-001"
                          className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Class Advisor Indicator */}
                    {matchedCohort?.classAdvisor && (
                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between">
                        <span>👨‍🏫 <strong>Assigned Class Advisor:</strong> {matchedCohort.classAdvisor}</span>
                        {matchedCohort.room && <span className="text-slate-500 font-mono">Room: {matchedCohort.room}</span>}
                      </div>
                    )}
                  </div>
                );
              })()}

              {(formData.role === "FACULTY" || formData.role === "HOD") && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Faculty / Staff ID</label>
                      <input
                        type="text"
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        placeholder="e.g. FAC-CSE-01"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Academic Designation</label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        placeholder="e.g. Associate Professor"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Office / Cabin Number</label>
                      <input
                        type="text"
                        value={formData.office_number}
                        onChange={(e) => setFormData({ ...formData, office_number: e.target.value })}
                        placeholder="e.g. Cabin 304, Academic Block A"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Consultation Hours</label>
                      <input
                        type="text"
                        value={formData.office_hours}
                        onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
                        placeholder="e.g. Mon & Wed 03:00 PM – 05:00 PM"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Highest Qualifications</label>
                    <input
                      type="text"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      placeholder="e.g. Ph.D. in Computer Science (IIT Bombay)"
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                    placeholder="+91 98765 00000"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Login Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                    placeholder="Set a secure password"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-[#181C2B] flex justify-end gap-2 pt-3 pb-1 border-t border-[#E8EAF1] dark:border-slate-800 z-10">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold cursor-pointer">
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT USER MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-xl animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                  Edit Account: {editingUser.first_name} {editingUser.last_name}
                </h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-[#737A90] hover:text-[#171A2B] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Last Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Official University Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Campus Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as SyncUser["role"] })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="STUDENT">Student Candidate</option>
                    <option value="FACULTY">Faculty Professor</option>
                    <option value="HOD">Department Chair (HOD)</option>
                    <option value="VC">Vice Chancellor</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                    <option value="EXAMINATION">Examination Department (COE)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Academic Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    ) : <option value="">Create a department first</option>}
                  </select>
                </div>
              </div>

              {formData.role === "STUDENT" && (() => {
                const selectedDeptObj = departments.find(
                  (d) => d.name === formData.department || d.code === formData.department
                );
                const deptCohorts = selectedDeptObj?.cohorts?.map((c) => c.name) || [];
                const deptClasses = selectedDeptObj?.classes || [];
                const availableClasses = Array.from(new Set([...deptClasses, ...deptCohorts])).filter(Boolean);
                const currentClassValue =
                  formData.className && availableClasses.includes(formData.className)
                    ? formData.className
                    : availableClasses[0] || formData.className || "";

                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                        Degree Program &amp; Class
                      </label>
                      {availableClasses.length > 0 ? (
                        <select
                          value={currentClassValue}
                          onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs text-[#171A2B] dark:text-white"
                        >
                          {availableClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.className}
                          onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                          placeholder="e.g. CSE - Semester 1 (Section A)"
                          className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs"
                        />
                      )}
                    </div>
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                        Roll / Student ID
                      </label>
                      <input
                        type="text"
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        placeholder="e.g. STU-1001"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs font-mono"
                      />
                    </div>
                  </div>
                );
              })()}

              {(formData.role === "FACULTY" || formData.role === "HOD") && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Faculty / Staff ID</label>
                      <input
                        type="text"
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        placeholder="e.g. FAC-CSE-01"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Academic Designation</label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        placeholder="e.g. Associate Professor"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Office / Cabin Number</label>
                      <input
                        type="text"
                        value={formData.office_number}
                        onChange={(e) => setFormData({ ...formData, office_number: e.target.value })}
                        placeholder="e.g. Cabin 304, Academic Block A"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Consultation Hours</label>
                      <input
                        type="text"
                        value={formData.office_hours}
                        onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
                        placeholder="e.g. Mon & Wed 03:00 PM – 05:00 PM"
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Highest Qualifications</label>
                    <input
                      type="text"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      placeholder="e.g. Ph.D. in Computer Science (IIT Bombay)"
                      className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#171A2B] dark:text-slate-200 block text-xs flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Update / Reset Account Password (Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Min 12 characters</span>
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                />
                <p className="text-[10px] text-slate-500">
                  Entering a new password here will immediately hash and persist it to the database for this user.
                </p>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-[#181C2B] flex justify-end gap-2 pt-3 pb-1 border-t border-[#E8EAF1] dark:border-slate-800 z-10">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold cursor-pointer">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold">Confirm Account Removal</h3>
            </div>
            <p className="text-xs text-[#737A90] leading-relaxed">
              Are you sure you want to remove account for <strong className="text-[#171A2B] dark:text-white">{deletingUser.first_name} {deletingUser.last_name}</strong> ({deletingUser.email})? This user will no longer be able to access the university system.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button variant="outline" onClick={() => setDeletingUser(null)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4">
                Deactivate Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATED USER CREDENTIAL RECEIPT MODAL ─── */}
      {createdCredentialReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[28px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
                <div>
                  <h3 className="text-base font-bold text-[#171A2B] dark:text-white">Account Created Successfully!</h3>
                  <p className="text-[11px] text-[#737A90]">Generated login credentials for {createdCredentialReceipt.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedCredentialReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-[#F7F8FC] dark:bg-slate-900 rounded-2xl p-4 border border-[#E8EAF1] dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EAF1] dark:border-slate-800">
                <span className="text-[#737A90]">Campus Role</span>
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                  {createdCredentialReceipt.role}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E8EAF1] dark:border-slate-800">
                <span className="text-[#737A90]">Login Email</span>
                <span className="font-bold font-mono text-[#171A2B] dark:text-white">
                  {createdCredentialReceipt.email}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E8EAF1] dark:border-slate-800">
                <span className="text-[#737A90]">Student / Faculty ID</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {createdCredentialReceipt.id}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#737A90]">Initial Password</span>
                <span className="font-bold font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded">
                  {createdCredentialReceipt.password}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#737A90] leading-relaxed">
              💡 The user can now log in to the portal using either their <strong>Email</strong> or <strong>ID</strong> along with the password above.
            </p>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button
                type="button"
                onClick={async () => {
                  const text = `UniFlow Login Credentials:\nName: ${createdCredentialReceipt.name}\nRole: ${createdCredentialReceipt.role}\nEmail: ${createdCredentialReceipt.email}\nIdentifier / Roll: ${createdCredentialReceipt.id}\nInitial Password: ${createdCredentialReceipt.password}`;
                  await copyToClipboard(text);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2500);
                }}
                className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 cursor-pointer flex-1"
              >
                {copiedText ? <Check className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                <span>{copiedText ? "Copied to Clipboard!" : "Copy All Credentials"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatedCredentialReceipt(null)}
                className="text-xs cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EXCEL BULK IMPORT MODAL ─── */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Bulk Import Users from Excel / CSV</h3>
                  <p className="text-[11px] text-slate-500">Review parsed rows before committing to the live database</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportOpen(false);
                  setImportedUsers([]);
                  setImportSummary(null);
                }}
                className="text-[#737A90] hover:text-[#171A2B] dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Template Download Prompt */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 flex items-center justify-between text-xs">
              <span className="text-blue-900 dark:text-blue-300">
                Need the official format? Download the ready-to-fill spreadsheet template.
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                className="text-[11px] font-bold h-7 px-2.5 flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Download className="h-3 w-3" />
                <span>Download Template</span>
              </Button>
            </div>

            {/* Imported Rows Preview Table */}
            <div className="flex-1 overflow-y-auto border border-[#E8EAF1] dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F8FC] dark:bg-slate-800/80 text-[10px] uppercase font-bold text-[#737A90] border-b border-[#E8EAF1] dark:border-slate-800 sticky top-0">
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5">Identifier / Roll</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAF1] dark:divide-slate-800">
                  {importedUsers.map((u, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{u.email}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-[120px]">{u.department}</td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300 text-[11px]">{u.identifier || "Auto-assign"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importSummary && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Import complete: {importSummary.success} created successfully ({importSummary.failed} skipped/existing).</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#E8EAF1] dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Total parsed rows: <strong>{importedUsers.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImportOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting || importedUsers.length === 0}
                  className="btn-saas-primary text-xs px-5 font-bold flex items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isImporting ? "Creating Accounts..." : `Confirm & Import ${importedUsers.length} Users`}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEDICATED PASSWORD RESET MODAL ─── */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                    Reset User Password
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct real-time update in backend database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="text-[#737A90] hover:text-[#171A2B] dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {resetPasswordUser.first_name} {resetPasswordUser.last_name}
              </p>
              <p className="text-slate-500 font-mono text-[11px]">{resetPasswordUser.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Role: {resetPasswordUser.role}
                </span>
                <span className="text-[11px] text-slate-500">{resetPasswordUser.department}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Secure Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = `UniFlow#${Math.floor(100000 + Math.random() * 900000)}!`;
                      setNewPasswordForReset(generated);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newPasswordForReset}
                  onChange={(e) => setNewPasswordForReset(e.target.value)}
                  placeholder="Minimum 12 characters"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F7F8FC] dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white font-medium"
                />
                <p className="text-[10px] text-slate-500">
                  Must be at least 12 characters. It will be hashed using Argon2/bcrypt on the server.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8EAF1] dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordUser(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isResettingPassword || newPasswordForReset.length < 12}
                  className="btn-saas-primary text-xs px-5 font-bold"
                >
                  {isResettingPassword ? "Updating DB..." : "Save New Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── STUDENT ACADEMIC DETAIL MODAL ─── */}
      <StudentDetailModal
        student={selectedStudentProfile}
        isOpen={Boolean(selectedStudentProfile)}
        onClose={() => setSelectedStudentProfile(null)}
      />
    </div>
  );
}
