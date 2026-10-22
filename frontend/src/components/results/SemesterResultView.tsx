"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Printer,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  X,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Lock,
  FileUp,
  Save,
  Check,
  Clock,
  User,
  GraduationCap,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel, importFromExcel } from "@/lib/excel-utils";
import { apiClient } from "@/lib/api-client";

export interface CourseResultRow {
  slNo: number;
  courseCode: string;
  courseName: string;
  credits: number;
  maxDsa: number;
  minDsa: number;
  maxSee: number;
  minSee: number;
  maxTotal: number;
  minTotal: number;
  dsaScore: number;
  seeScore: number;
  totalScore: number;
  letterGrade: string;
  honorPoints: number;
  remarks: "P" | "F" | "-";
  isEligibleForSee: boolean;
  isLabOrPractical?: boolean;
}

interface SemesterResultViewProps {
  enrolledCourses?: any[];
}

export function SemesterResultView({ enrolledCourses }: SemesterResultViewProps = {}) {
  const { user } = useAuth();
  const {
    courses,
    users,
    departments,
    universityLogo,
    updateUniversityLogo,
    currentSemester,
    activeSemesterFilter,
    setActiveSemesterFilter,
    batchCriteria,
    getCriteriaForBatch,
    isSemesterSeeUnlocked,
    isSeeMarksEntryOpen,
    examClearances,
    submissions,
    quizAttempts,
  } = useAcademicData();

  const printRef = useRef<HTMLDivElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin =
    user?.role?.name === "ADMINISTRATOR" ||
    (user as any)?.role === "ADMINISTRATOR";

  const isHod = user?.role?.name === "HOD" || (user as any)?.role === "HOD";
  const isExamDept =
    user?.role?.name === "EXAMINATION" ||
    (user as any)?.role === "EXAMINATION";
  const isFaculty =
    user?.role?.name === "FACULTY" || (user as any)?.role === "FACULTY";

  // Examination Department, Faculty, HOD, and Administrator all have Class Grid + Candidate Switcher access
  const isFacultyOrAdmin = isFaculty || isAdmin || isHod || isExamDept;

  const realStudents = useMemo(() => {
    return (users || []).filter(
      (u) =>
        u.role === "STUDENT" ||
        (u as any)?.role?.name === "STUDENT" ||
        (u as any)?.role === "STUDENT"
    );
  }, [users]);

  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    const sem = activeSemesterFilter || currentSemester || 1;
    return Math.max(1, Math.min(8, sem));
  });

  useEffect(() => {
    if (currentSemester && selectedSemester > currentSemester) {
      setSelectedSemester(currentSemester);
      setActiveSemesterFilter(currentSemester);
    }
  }, [currentSemester, selectedSemester, setActiveSemesterFilter]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (!isFacultyOrAdmin && user?.id) return user.id;
    return realStudents[0]?.id || "";
  });

  useEffect(() => {
    if (isFacultyOrAdmin && !selectedStudentId && realStudents.length > 0) {
      setSelectedStudentId(realStudents[0].id);
    } else if (!isFacultyOrAdmin && user?.id && selectedStudentId !== user.id) {
      setSelectedStudentId(user.id);
    }
  }, [isFacultyOrAdmin, realStudents, selectedStudentId, user?.id]);

  // Dynamic Batch Criteria Selection
  const [selectedBatchId] = useState<string>(
    batchCriteria?.[0]?.id || "batch-2024-2028"
  );
  const activeCriteria = useMemo(() => {
    const c = getCriteriaForBatch ? getCriteriaForBatch(selectedBatchId) : null;
    return (
      c || {
        dsaWeightagePct: 50,
        seeWeightagePct: 50,
        minDsaPassPct: 50,
        minAttendancePct: 75,
      }
    );
  }, [getCriteriaForBatch, selectedBatchId]);

  // Persistent SEE scores map: [studentId_courseCode]: seeScore
  const [seeScoresMap, setSeeScoresMap] = useState<Record<string, number>>({});

  // Persistent DSA scores map: [studentId_courseCode]: dsaScore
  const [dsaScoresMap, setDsaScoresMap] = useState<Record<string, number>>({});

  // Hydrate shared DSA and SEE scores from the authenticated database API.
  useEffect(() => {
    apiClient.get<Record<string, any>>("/admin/operational-state")
      .then((vault) => {
        if (!vault) return;
        if (vault.dsaScoresMap && typeof vault.dsaScoresMap === "object") {
          setDsaScoresMap(vault.dsaScoresMap);
        }
        if (vault.seeScoresMap && typeof vault.seeScoresMap === "object") {
          setSeeScoresMap(vault.seeScoresMap);
        }
      })
      .catch((error) => console.error("Failed to load result scores:", error));
  }, []);

  const activeStudentUser = useMemo(() => {
    return (
      (!isFacultyOrAdmin && user
        ? user
        : realStudents.find((u) => u.id === selectedStudentId) ||
          realStudents[0] ||
          user) || null
    );
  }, [isFacultyOrAdmin, user, realStudents, selectedStudentId]);

  // Build dynamic curriculum list directly from live courses in AcademicDataContext
  const dynamicCurriculumCourses = useMemo(() => {
    // 1. If enrolledCourses was explicitly passed from student hub, use it
    if (!isFacultyOrAdmin && Array.isArray(enrolledCourses) && enrolledCourses.length > 0) {
      return enrolledCourses.map((c, idx) => {
        const code = String(c.code || (c as any).course_code || `CS-10${idx + 1}`).trim();
        const name = String(c.name || (c as any).title || code).trim();
        const credits = Number(c.credits) || 4;
        const isLab =
          name.toLowerCase().includes("lab") ||
          name.toLowerCase().includes("practical") ||
          credits <= 2;

        let customMaxSee = isLab ? 75 : 50;
        let customMinSee = isLab ? 30 : 25;
        let customMaxDsa = isLab ? 25 : 50;
        let customMinDsa = isLab ? 10 : 25;

        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem("smartedu_exam_marks_schemes_v2");
            if (raw) {
              const schemes = JSON.parse(raw);
              if (schemes[code]) {
                customMaxSee = Number(schemes[code].maxMarks) || customMaxSee;
                customMinSee = Number(schemes[code].minPassing) || customMinSee;
                customMaxDsa = Math.max(0, 100 - customMaxSee);
                customMinDsa = Math.round(customMaxDsa * 0.4);
              }
            }
          }
        } catch {}

        return {
          slNo: idx + 1,
          courseCode: code,
          courseName: name,
          credits,
          maxDsa: customMaxDsa,
          minDsa: customMinDsa,
          maxSee: customMaxSee,
          minSee: customMinSee,
          maxTotal: 100,
          minTotal: isLab ? 40 : 50,
          instructor: String(c.instructor || "Assigned Faculty"),
          instructors: (c as any).instructors || [],
          department: String(c.department || "Information Technology"),
          semester: Number((c as any).semester) || selectedSemester || 5,
          isLabOrPractical: isLab,
        };
      });
    }

    const activeCourses = Array.isArray(courses) && courses.length > 0 ? courses : [];

    // Helper to extract clean semester number (e.g. "Semester 5" -> 5)
    const getCourseSem = (c: any): number => {
      const raw = String(c.semester || "");
      const semMatch = raw.match(/(?:sem(?:ester)?[\s-]*(\d+))|(?:(\d+)(?:st|nd|rd|th)\s*sem)/i);
      if (semMatch) return parseInt(semMatch[1] || semMatch[2], 10);
      if (typeof c.semester === "number") return c.semester;
      return 5;
    };

    // Identify student's section / cohort assigned courses
    const studentClassName = (activeStudentUser?.className || (activeStudentUser as any)?.class_name || "").toLowerCase().trim();
    let cohortCourseCodes: string[] = [];
    if (studentClassName && departments) {
      for (const d of departments) {
        const foundCohort = d.cohorts?.find(
          (c) =>
            c.name.toLowerCase() === studentClassName ||
            c.name.toLowerCase().includes(studentClassName) ||
            studentClassName.includes(c.name.toLowerCase())
        );
        if (foundCohort && Array.isArray(foundCohort.assignedCourses) && foundCohort.assignedCourses.length > 0) {
          cohortCourseCodes = foundCohort.assignedCourses.map((c) => String(c).trim().toUpperCase());
          break;
        }
      }
    }

    const filtered = activeCourses.filter((c) => {
      const code = String(c.code || (c as any).course_code || "").trim().toUpperCase();
      if (cohortCourseCodes.length > 0) {
        return cohortCourseCodes.includes(code);
      }
      if (studentClassName && Array.isArray(c.assignedClasses) && c.assignedClasses.length > 0) {
        if (c.assignedClasses.some((cls) => cls.toLowerCase().includes(studentClassName) || studentClassName.includes(cls.toLowerCase()))) {
          return true;
        }
      }
      return getCourseSem(c) === selectedSemester;
    });

    const displayList = filtered.length > 0 ? filtered : activeCourses.filter((c) => {
      return getCourseSem(c) === selectedSemester;
    });

    const finalList = displayList.length > 0 ? displayList : activeCourses;

    return finalList.map((c, idx) => {
      const code = String(c.code || (c as any).course_code || `CS-10${idx + 1}`).trim();
      const name = String(c.name || (c as any).title || code).trim();
      const credits = Number(c.credits) || 4;
      const isLab =
        name.toLowerCase().includes("lab") ||
        name.toLowerCase().includes("practical") ||
        credits <= 2;

      // Check if Examination Department configured custom SEE scheme (e.g. 50, 70, or 100 marks)
      let customMaxSee = isLab ? 75 : 50;
      let customMinSee = isLab ? 30 : 25;
      let customMaxDsa = isLab ? 25 : 50;
      let customMinDsa = isLab ? 10 : 25;

      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("smartedu_exam_marks_schemes_v2");
          if (raw) {
            const schemes = JSON.parse(raw);
            if (schemes[code]) {
              customMaxSee = Number(schemes[code].maxMarks) || customMaxSee;
              customMinSee = Number(schemes[code].minPassing) || customMinSee;
              customMaxDsa = Math.max(0, 100 - customMaxSee);
              customMinDsa = Math.round(customMaxDsa * 0.4);
            }
          }
        }
      } catch {}

      return {
        slNo: idx + 1,
        courseCode: code,
        courseName: name,
        credits,
        maxDsa: customMaxDsa,
        minDsa: customMinDsa,
        maxSee: customMaxSee,
        minSee: customMinSee,
        maxTotal: 100,
        minTotal: isLab ? 40 : 50,
        instructor: String(c.instructor || "Assigned Faculty"),
        instructors: (c as any).instructors || [],
        department: String(c.department || "Computer Science & Engineering"),
        semester: Number((c as any).semester) || 1,
        isLabOrPractical: isLab,
      };
    });
  }, [courses, enrolledCourses, isFacultyOrAdmin, activeStudentUser, departments, selectedSemester]);

  // Stable callback for checking whether the current user can edit a course
  const isInstructorOfCourse = useCallback(
    (course: any): boolean => {
      if (isAdmin || isHod || isExamDept) return true;
      if (!user || !course) return false;
      const userFullName = `${user.first_name || ""} ${user.last_name || ""}`
        .trim()
        .toLowerCase();
      const userEmail = String(user.email || "").toLowerCase();
      const instName = String(course?.instructor || "").toLowerCase();
      if (
        instName &&
        userFullName &&
        (instName.includes(userFullName) || userFullName.includes(instName))
      ) {
        return true;
      }
      if (Array.isArray(course?.instructors)) {
        return course.instructors.some((inst: any) => {
          const n = String(inst.faculty_name || inst.name || "").toLowerCase();
          const e = String(inst.email || "").toLowerCase();
          return (
            (n && userFullName && (n.includes(userFullName) || userFullName.includes(n))) ||
            (e && userEmail && e === userEmail)
          );
        });
      }
      return false;
    },
    [isAdmin, isHod, isExamDept, user]
  );

  const isSeeApproved = Boolean(
    (isSemesterSeeUnlocked ? isSemesterSeeUnlocked(selectedSemester) : false) ||
    examClearances?.[selectedSemester]?.isExamDeptApproved ||
    selectedSemester < (currentSemester || 5)
  );

  const [viewMode, setViewMode] = useState<"CLASS_GRID" | "STUDENT_TRANSCRIPT">(
    isFacultyOrAdmin ? "CLASS_GRID" : "STUDENT_TRANSCRIPT"
  );

  useEffect(() => {
    if (!isFacultyOrAdmin && viewMode === "CLASS_GRID") {
      setViewMode("STUDENT_TRANSCRIPT");
    }
  }, [isFacultyOrAdmin, viewMode]);

  const accessibleCourses = useMemo(() => {
    if (isAdmin || isHod || isExamDept) return dynamicCurriculumCourses;
    const filtered = dynamicCurriculumCourses.filter((c) => isInstructorOfCourse(c));
    return filtered;
  }, [isAdmin, isHod, isExamDept, dynamicCurriculumCourses, isInstructorOfCourse]);

  const [selectedCourseCode, setSelectedCourseCode] = useState<string>("");

  useEffect(() => {
    if (
      accessibleCourses.length > 0 &&
      (!selectedCourseCode || !accessibleCourses.some((c) => c.courseCode === selectedCourseCode))
    ) {
      setSelectedCourseCode(accessibleCourses[0].courseCode);
    }
  }, [accessibleCourses, selectedCourseCode]);

  const selectedCourseObj = useMemo(() => {
    return (
      accessibleCourses.find((c) => c.courseCode === selectedCourseCode) ||
      accessibleCourses[0] || {
        slNo: 0,
        courseCode: "",
        courseName: "",
        credits: 0,
        maxDsa: 0,
        minDsa: 0,
        maxSee: 0,
        minSee: 0,
        maxTotal: 0,
        minTotal: 0,
        instructor: "",
        department: "",
        isLabOrPractical: false,
      }
    );
  }, [accessibleCourses, selectedCourseCode]);

  const canEditCurrentCourse = useMemo(
    () => isInstructorOfCourse(selectedCourseObj),
    [isInstructorOfCourse, selectedCourseObj]
  );

  const canEditSeeMarks = useMemo(() => {
    if (isAdmin || isExamDept) return true;
    return isInstructorOfCourse(selectedCourseObj) && isSeeMarksEntryOpen;
  }, [isAdmin, isExamDept, isInstructorOfCourse, selectedCourseObj, isSeeMarksEntryOpen]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to compute real DSA score from graded submissions/quizzes if not yet manually overridden
  const computeStudentLiveDsa = useCallback(
    (student: any, courseCode: string, maxDsa: number): number => {
      const key = `${student.id}_${courseCode}`;
      if (dsaScoresMap[key] !== undefined) {
        return Number(dsaScoresMap[key]) || 0;
      }
      const studentNameLower = `${student.first_name || ""} ${student.last_name || ""}`
        .trim()
        .toLowerCase();
      const gradedSubs = (submissions || []).filter(
        (s) =>
          s.status === "GRADED" &&
          typeof s.marksObtained === "number" &&
          (s.studentId === student.id ||
            String(s.studentName || "").toLowerCase() === studentNameLower)
      );
      const completedQuizzes = (quizAttempts || []).filter(
        (a) =>
          a.studentId === student.id ||
          String(a.studentName || "").toLowerCase() === studentNameLower
      );

      if (gradedSubs.length > 0 || completedQuizzes.length > 0) {
        const earned = gradedSubs.reduce((acc, s) => acc + (Number(s.marksObtained) || 0), 0) +
          completedQuizzes.reduce((acc, a: any) => acc + (Number(a.score) || 0), 0);
        const possible = gradedSubs.reduce((acc, s: any) => acc + (Number(s.totalPoints) || Number(s.maxMarks) || 0), 0) +
          completedQuizzes.reduce((acc, a: any) => acc + (Number(a.totalPoints) || 0), 0);
        return possible > 0 ? Math.min(maxDsa, Math.max(0, Math.round((earned / possible) * maxDsa))) : 0;
      }
      return 0;
    },
    [dsaScoresMap, submissions, quizAttempts]
  );

  // Draft marks for class grid editing
  const [classMarksDraft, setClassMarksDraft] = useState<
    Record<string, { dsa: number; see: number }>
  >({});
  const classMarksFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeCourseCode = selectedCourseObj?.courseCode || "";
  const activeMaxDsa = selectedCourseObj?.maxDsa || activeCriteria.dsaWeightagePct || 0;

  // Sync draft marks when course or student list changes (without infinite loop)
  useEffect(() => {
    const draft: Record<string, { dsa: number; see: number }> = {};
    realStudents.forEach((st) => {
      const key = `${st.id}_${activeCourseCode}`;
      const savedSee = seeScoresMap[key];
      const dsaVal = computeStudentLiveDsa(st, activeCourseCode, activeMaxDsa);
      draft[st.id] = {
        dsa: dsaVal,
        see: savedSee !== undefined ? Number(savedSee) || 0 : 0,
      };
    });
    setClassMarksDraft(draft);
  }, [activeCourseCode, activeMaxDsa, realStudents, seeScoresMap, computeStudentLiveDsa]);

  const handleUpdateStudentMark = (
    studentId: string,
    field: "dsa" | "see",
    val: number
  ) => {
    setClassMarksDraft((prev) => ({
      ...prev,
      [studentId]: {
        dsa: field === "dsa" ? val : prev[studentId]?.dsa || 0,
        see: field === "see" ? val : prev[studentId]?.see || 0,
      },
    }));
  };

  const handleSaveAllClassMarks = () => {
    const code = activeCourseCode;
    const nextSee = { ...seeScoresMap };
    const nextDsa = { ...dsaScoresMap };

    realStudents.forEach((st) => {
      const draft = classMarksDraft[st.id] || { dsa: 0, see: 0 };
      const key = `${st.id}_${code}`;
      nextDsa[key] = draft.dsa;
      if (isExamDept || isAdmin) {
        nextSee[key] = draft.see;
      }
    });

    setDsaScoresMap(nextDsa);
    setSeeScoresMap(nextSee);

    const scorePayload = isExamDept || isAdmin
      ? { dsaScoresMap: nextDsa, seeScoresMap: nextSee }
      : { dsaScoresMap: nextDsa };
    void apiClient.patch("/admin/operational-state", scorePayload).catch((error) => {
        console.error("Failed to save result scores:", error);
        showToast("The marks could not be saved. Please try again.");
      });

    showToast(
      `✓ Saved official marks for ${selectedCourseObj.courseName} (${realStudents.length} registered candidates).`
    );
  };

  const handleExportClassMarksExcel = () => {
    const code = activeCourseCode;
    const maxDsaVal = selectedCourseObj.maxDsa || 50;
    const minDsaVal = selectedCourseObj.minDsa || 25;
    const maxSeeVal = selectedCourseObj.maxSee || 50;
    const minSeeVal = selectedCourseObj.minSee || 25;

    const rows = realStudents.map((st, idx) => {
      const rollNo =
        (st as any).student_identifier ||
        `24BCSE${String(idx + 1).padStart(3, "0")}`;
      const name = `${st.first_name || ""} ${st.last_name || ""}`.trim();
      const draft = classMarksDraft[st.id] || { dsa: 0, see: 0 };
      const isEligible = draft.dsa >= minDsaVal;

      if (!isSeeApproved && !isExamDept) {
        return {
          "Sl. No.": idx + 1,
          "Registration No.": rollNo,
          "Candidate Name": name,
          Department:
            (st as any).department ||
            selectedCourseObj.department ||
            "Computer Science & Engineering",
          "Course Code": code,
          "Course Title": selectedCourseObj.courseName,
          [`During Semester Assessment (Max: ${maxDsaVal}, Min: ${minDsaVal})`]:
            draft.dsa,
          "SEE Eligibility Status": isEligible
            ? "Eligible for SEE"
            : `Ineligible (DSA < ${minDsaVal})`,
        };
      }

      const total = isEligible ? Math.min(100, draft.dsa + draft.see) : draft.dsa;
      let grade = "F";
      let gp = 0;
      if (total >= 90) {
        grade = "O";
        gp = 10;
      } else if (total >= 80) {
        grade = "A+";
        gp = 9;
      } else if (total >= 70) {
        grade = "A";
        gp = 8;
      } else if (total >= 60) {
        grade = "B+";
        gp = 7;
      } else if (total >= 50) {
        grade = "B";
        gp = 6;
      } else if (total >= 40) {
        grade = "C";
        gp = 5;
      }

      return {
        "Sl. No.": idx + 1,
        "Registration No.": rollNo,
        "Candidate Name": name,
        Department:
          (st as any).department ||
          selectedCourseObj.department ||
          "Computer Science & Engineering",
        "Course Code": code,
        "Course Title": selectedCourseObj.courseName,
        [`During Semester Assessment (Max: ${maxDsaVal}, Min: ${minDsaVal})`]:
          draft.dsa,
        [`Semester End Examination (Max: ${maxSeeVal}, Min: ${minSeeVal})`]:
          isEligible ? draft.see : "Detained",
        "Total (Max: 100, Min: 50)": isEligible ? total : draft.dsa,
        "Letter Grade": isEligible ? grade : "F",
        "Honor Points": isEligible ? gp : 0,
        Remarks:
          isEligible && total >= 50 && draft.see >= minSeeVal ? "P" : "F",
      };
    });

    exportToExcel(rows, `${code}_Class_Marksheet_${Date.now()}`);
    showToast(
      `✓ Exported class marksheet for ${selectedCourseObj.courseName} as Excel (.xlsx).`
    );
  };

  const handleImportClassMarksExcel = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await importFromExcel(file);
      if (!rows || rows.length === 0) {
        showToast("⚠️ Uploaded sheet contains no records.");
        return;
      }

      let count = 0;
      const nextDraft = { ...classMarksDraft };
      const maxDsaVal = selectedCourseObj.maxDsa || 50;
      const maxSeeVal = selectedCourseObj.maxSee || 50;

      rows.forEach((r: any) => {
        const roll = String(
          r["Registration No."] ||
            r["Roll No"] ||
            r["Roll"] ||
            r["Identifier"] ||
            ""
        )
          .trim()
          .toLowerCase();
        const rawDsa = parseFloat(
          r[`During Semester Assessment (Max: ${maxDsaVal}, Min: ${selectedCourseObj.minDsa || 25})`] ||
            r["During Semester Assessment (Max: 50, Min: 25)"] ||
            r["During Semester Assessment"] ||
            r["DSA"] ||
            "0"
        );
        const rawSee = parseFloat(
          r[`Semester End Examination (Max: ${maxSeeVal}, Min: ${selectedCourseObj.minSee || 25})`] ||
            r["Semester End Examination (Max: 50, Min: 25)"] ||
            r["Semester End Examination"] ||
            r["SEE"] ||
            "0"
        );

        if (roll) {
          const matchedStudent = realStudents.find(
            (s) =>
              String((s as any).student_identifier || "")
                .trim()
                .toLowerCase() === roll ||
              `${s.first_name || ""} ${s.last_name || ""}`
                .trim()
                .toLowerCase() === roll
          );
          if (matchedStudent) {
            nextDraft[matchedStudent.id] = {
              dsa: isNaN(rawDsa) ? 0 : Math.min(maxDsaVal, Math.max(0, rawDsa)),
              see: isNaN(rawSee) ? 0 : Math.min(maxSeeVal, Math.max(0, rawSee)),
            };
            count++;
          }
        }
      });

      setClassMarksDraft(nextDraft);
      showToast(`✓ Imported marks for ${count} registered students from Excel.`);
    } catch (err: any) {
      showToast(err.message || "Failed to parse marksheet spreadsheet.");
    } finally {
      e.target.value = "";
    }
  };

  // Target student for Official Transcript View — strictly derived from real registered users
  const targetStudent = useMemo(() => {
    const activeUser =
      (!isFacultyOrAdmin && user
        ? user
        : realStudents.find((u) => u.id === selectedStudentId) ||
          realStudents[0] ||
          user) || null;

    const fullName = activeUser
      ? `${activeUser.first_name || ""} ${activeUser.last_name || ""}`
          .trim()
          .toUpperCase() || String(activeUser.email || "REGISTERED CANDIDATE").toUpperCase()
      : "NO CANDIDATE SELECTED";

    const rollNo = String(
      (activeUser as any)?.student_identifier ||
        (activeUser as any)?.rollNo ||
        activeUser?.id?.slice(0, 10)?.toUpperCase() ||
        "24BCSE001"
    );

    const rawDept = (activeUser as any)?.department;
    const department = typeof rawDept === "object" && rawDept !== null
      ? (rawDept.name || rawDept.title || "Information Technology")
      : (typeof rawDept === "string" && rawDept.trim() && !rawDept.includes("object Object")
          ? rawDept
          : selectedCourseObj?.department || "Information Technology");

    const schoolName = String(
      (activeUser as any)?.className ||
        "Alliance School of Advanced Computing"
    );

    const batchLabel = (activeUser as any)?.academicYear
      ? `Batch : ${(activeUser as any).academicYear}`
      : `Batch : ${selectedBatchId.replace("batch-", "")}`;

    const romanSemesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    return {
      id: String(activeUser?.id || "stu-1"),
      name: fullName,
      rollNo,
      email: String(activeUser?.email || ""),
      program: `B.Tech. in ${department}`,
      department: schoolName,
      batch: batchLabel,
      examSession: new Date()
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
        .toUpperCase(),
      semesterLabel: romanSemesters[(selectedSemester || 1) - 1] || String(selectedSemester),
    };
  }, [
    isFacultyOrAdmin,
    user,
    realStudents,
    selectedStudentId,
    selectedCourseObj,
    selectedBatchId,
    selectedSemester,
  ]);

  // Compute dynamic course results for the target student using live courses and real saved scores
  const semesterCourses: CourseResultRow[] = useMemo(() => {
    if (!targetStudent) return [];

    return dynamicCurriculumCourses.map((cur, idx) => {
      const key = `${targetStudent.id}_${cur.courseCode}`;
      const savedSee = seeScoresMap[key];
      const dsaVal = computeStudentLiveDsa(targetStudent, cur.courseCode, cur.maxDsa);
      const isEligible = dsaVal >= cur.minDsa;

      const hasUploadedSee = savedSee !== undefined && savedSee !== null;
      const hasFinalResults = hasUploadedSee || (isSeeApproved && hasUploadedSee);

      const seeVal = hasUploadedSee ? Number(savedSee) || 0 : 0;

      const totalVal = hasFinalResults
        ? Math.min(cur.maxTotal, dsaVal + seeVal)
        : dsaVal;

      let grade = "F";
      let gp = 0;
      if (totalVal >= 90) {
        grade = "O";
        gp = 10;
      } else if (totalVal >= 80) {
        grade = "A+";
        gp = 9;
      } else if (totalVal >= 70) {
        grade = "A";
        gp = 8;
      } else if (totalVal >= 60) {
        grade = "B+";
        gp = 7;
      } else if (totalVal >= 50) {
        grade = "B";
        gp = 6;
      } else if (totalVal >= 40) {
        grade = "C";
        gp = 5;
      }

      const passed = hasFinalResults
        ? isEligible && totalVal >= cur.minTotal && (hasUploadedSee ? seeVal >= cur.minSee : true)
        : isEligible;

      return {
        slNo: idx + 1,
        courseCode: cur.courseCode,
        courseName: cur.courseName,
        credits: cur.credits,
        maxDsa: cur.maxDsa,
        minDsa: cur.minDsa,
        maxSee: cur.maxSee,
        minSee: cur.minSee,
        maxTotal: cur.maxTotal,
        minTotal: cur.minTotal,
        dsaScore: dsaVal,
        seeScore: seeVal,
        totalScore: totalVal,
        letterGrade: hasFinalResults
          ? passed
            ? grade
            : "F"
          : isEligible
          ? "ELIGIBLE FOR SEE"
          : "SHORTFALL",
        honorPoints: hasFinalResults && passed ? gp : 0,
        remarks: hasFinalResults ? (passed ? "P" : "F") : "-",
        isEligibleForSee: isEligible,
        isLabOrPractical: cur.isLabOrPractical,
      };
    });
  }, [
    targetStudent,
    dynamicCurriculumCourses,
    seeScoresMap,
    computeStudentLiveDsa,
    isSeeApproved,
    selectedSemester,
    currentSemester,
  ]);

  const totalCredits = useMemo(
    () => semesterCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0),
    [semesterCourses]
  );

  const earnedCreditPoints = useMemo(
    () =>
      semesterCourses.reduce(
        (sum, c) => sum + (Number(c.credits) || 0) * (Number(c.honorPoints) || 0),
        0
      ),
    [semesterCourses]
  );

  const sgpa =
    totalCredits > 0 ? (earnedCreditPoints / totalCredits).toFixed(2) : "0.00";

  const weightedPercentage = useMemo(() => {
    if (!totalCredits || totalCredits === 0) return "0.0 %";
    const sum = semesterCourses.reduce(
      (acc, c) => acc + (Number(c.credits) || 0) * (Number(c.totalScore) || 0),
      0
    );
    return (sum / totalCredits).toFixed(1) + " %";
  }, [semesterCourses, totalCredits]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportTranscriptExcel = () => {
    if (!targetStudent) return;
    const rows = semesterCourses.map((c) => ({
      "Sl. No.": c.slNo,
      "Course Code": c.courseCode,
      "Course Title": c.courseName,
      Credits: c.credits,
      "During Semester Assessment (DSA)": c.dsaScore,
      "Semester End Examination (SEE)": isSeeApproved ? c.seeScore : "Pending SEE",
      "Total (100)": isSeeApproved ? c.totalScore : c.dsaScore,
      "Letter Grade": c.letterGrade,
      "Honor Points": c.honorPoints,
      Remarks: c.remarks,
    }));
    exportToExcel(
      rows,
      `${targetStudent.rollNo}_Official_Transcript_Sem_${targetStudent.semesterLabel}`
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) updateUniversityLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const theoryCourses = semesterCourses.filter((c) => !c.isLabOrPractical);
  const practicalCourses = semesterCourses.filter((c) => c.isLabOrPractical);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs print:hidden animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Mode Switcher Tabs for Faculty / Admin / Examination Department */}
      {isFacultyOrAdmin && (
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-fit print:hidden">
          <button
            onClick={() => setViewMode("CLASS_GRID")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "CLASS_GRID"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Class Marksheet (
              {isSeeApproved || isExamDept
                ? "DSA + SEE Marks Entry"
                : "During Semester Assessment"}
              )
            </span>
          </button>
          <button
            onClick={() => setViewMode("STUDENT_TRANSCRIPT")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "STUDENT_TRANSCRIPT"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">Official Grade Card (Transcript View)</span>
          </button>
        </div>
      )}

      {/* Top Banner & University Logo Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              AUTONOMOUS EVALUATION SYSTEM
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {viewMode === "CLASS_GRID"
                ? isSeeApproved || isExamDept
                  ? "Consolidated Class Evaluation (DSA + SEE Examination)"
                  : "During Semester Assessment (DSA) Class Marksheet"
                : "Official Consolidated Grade Report"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Program:{" "}
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {targetStudent.program}
            </span>{" "}
            •{" "}
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {targetStudent.batch}
            </span>{" "}
            • Scheme:{" "}
            <span className="font-bold text-blue-700 dark:text-blue-300">
              During Semester Assessment (50) + Semester End Exam (50)
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Term / Semester Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold shadow-2xs">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider">Term:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  Semester {s} {s === (currentSemester || 5) ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <input
            type="file"
            ref={logoInputRef}
            onChange={handleLogoUpload}
            accept="image/*"
            className="hidden"
          />
          {(isAdmin || isExamDept) && (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="Upload Official University Crest"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>{universityLogo ? "Update Emblem" : "Upload Emblem"}</span>
            </button>
          )}

          <button
            onClick={
              viewMode === "CLASS_GRID"
                ? handleExportClassMarksExcel
                : handleExportTranscriptExcel
            }
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print Official Result Card (PDF)</span>
          </button>
        </div>
      </div>

      {viewMode === "CLASS_GRID" ? (
        /* ─── CLASS-WISE SPREADSHEET / EXCEL GRID MARKSHEET ─── */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {isSeeApproved || isExamDept
                    ? "CONSOLIDATED MARKSHEET"
                    : "CONTINUOUS ASSESSMENT"}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isSeeApproved || isExamDept
                    ? "Continuous Assessment (DSA) & Semester End Exam (SEE) Scores"
                    : "During Semester Assessment (DSA) — Class Record"}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                {isSeeApproved || isExamDept
                  ? "Enter or import DSA and final written SEE examination marks for registered candidates."
                  : "Faculty record continuous assessment marks. Students meeting minimum DSA threshold qualify for SEE."}
              </p>
            </div>

            {/* Subject Selector & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Subject:
                </span>
                <select
                  value={selectedCourseCode}
                  onChange={(e) => setSelectedCourseCode(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer max-w-[280px] truncate"
                >
                  {accessibleCourses.map((c) => (
                    <option key={c.courseCode} value={c.courseCode}>
                      {c.courseCode} — {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="file"
                ref={classMarksFileInputRef}
                onChange={handleImportClassMarksExcel}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />

              <button
                onClick={() => classMarksFileInputRef.current?.click()}
                disabled={!canEditCurrentCourse}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileUp className="h-3.5 w-3.5 text-blue-600" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={handleExportClassMarksExcel}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={handleSaveAllClassMarks}
                disabled={!canEditCurrentCourse}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save All Marks</span>
              </button>
            </div>
          </div>

          {/* Workflow Status Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {canEditCurrentCourse ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Authorized:</strong> Marking enabled for{" "}
                  <strong>
                    {selectedCourseObj.courseCode} — {selectedCourseObj.courseName}
                  </strong>{" "}
                  (Instructor: {selectedCourseObj.instructor}).
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                <span>
                  <strong>Read-Only Access:</strong> Marks for{" "}
                  <strong>{selectedCourseObj.courseName}</strong> can only be
                  edited by the assigned instructor or Examination Department.
                </span>
              </div>
            )}

            {isSeeMarksEntryOpen || isExamDept || isAdmin ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>SEE Marks Entry Unlocked:</strong> Examination Department has activated SEE marks entry. Faculty can now record semester-end scores.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>SEE Marks Entry Locked:</strong> Examination Department must toggle on SEE Marks Entry before faculty can input semester-end scores.
                </span>
              </div>
            )}
            {false && (
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
                <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>During Semester Assessment Active:</strong> Record
                  continuous assessments. SEE written paper marks open upon
                  Examination Department clearance.
                </span>
              </div>
            )}
          </div>

          {/* Spreadsheet Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Registration No</th>
                    <th className="p-3">Candidate Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">
                      During Semester Assessment (Max: {selectedCourseObj.maxDsa}, Min:{" "}
                      {selectedCourseObj.minDsa})
                    </th>
                    <th className="p-3 text-center">
                      {isSeeApproved || isExamDept
                        ? `Semester End Exam (Max: ${selectedCourseObj.maxSee}, Min: ${selectedCourseObj.minSee})`
                        : "SEE Eligibility Status"}
                    </th>
                    {(isSeeApproved || isExamDept) && (
                      <>
                        <th className="p-3 text-center">Total (100)</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Honor Points</th>
                        <th className="p-3 text-center">Remarks</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {realStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-8 text-center text-slate-400 font-medium"
                      >
                        No registered student candidates found in the database.
                      </td>
                    </tr>
                  ) : (
                    realStudents.map((st, idx) => {
                      const rollNo =
                        (st as any).student_identifier ||
                        `24BCSE${String(idx + 1).padStart(3, "0")}`;
                      const name = `${st.first_name || ""} ${
                        st.last_name || ""
                      }`.trim();
                      const draft = classMarksDraft[st.id] || { dsa: 0, see: 0 };
                      const minDsaReq = selectedCourseObj.minDsa || 25;
                      const minSeeReq = selectedCourseObj.minSee || 25;
                      const maxDsaCap = selectedCourseObj.maxDsa || 50;
                      const maxSeeCap = selectedCourseObj.maxSee || 50;
                      const isEligible = draft.dsa >= minDsaReq;

                      const total = isEligible
                        ? Math.min(100, draft.dsa + draft.see)
                        : draft.dsa;
                      let grade = "F";
                      let gp = 0;
                      if (total >= 90) {
                        grade = "O";
                        gp = 10;
                      } else if (total >= 80) {
                        grade = "A+";
                        gp = 9;
                      } else if (total >= 70) {
                        grade = "A";
                        gp = 8;
                      } else if (total >= 60) {
                        grade = "B+";
                        gp = 7;
                      } else if (total >= 50) {
                        grade = "B";
                        gp = 6;
                      } else if (total >= 40) {
                        grade = "C";
                        gp = 5;
                      }

                      const passed =
                        isEligible &&
                        total >= (selectedCourseObj.minTotal || 50) &&
                        draft.see >= minSeeReq;

                      return (
                        <tr
                          key={st.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-mono font-bold text-blue-900 dark:text-blue-400">
                            {rollNo}
                          </td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {name}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {(st as any).department ||
                              selectedCourseObj.department ||
                              "Computer Science & Engineering"}
                          </td>

                          {/* DSA Score Input */}
                          <td className="p-3 text-center">
                            {canEditCurrentCourse ? (
                              <input
                                type="number"
                                min={0}
                                max={maxDsaCap}
                                step={0.5}
                                value={draft.dsa}
                                onChange={(e) =>
                                  handleUpdateStudentMark(
                                    st.id,
                                    "dsa",
                                    Math.min(
                                      maxDsaCap,
                                      Math.max(0, parseFloat(e.target.value) || 0)
                                    )
                                  )
                                }
                                className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-center text-xs text-blue-800 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mx-auto"
                              />
                            ) : (
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {draft.dsa} / {maxDsaCap}
                              </span>
                            )}
                          </td>

                          {/* SEE Column */}
                          <td className="p-3 text-center">
                            {!isSeeApproved && !isExamDept ? (
                              isEligible ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <Check className="h-3 w-3" /> Eligible for SEE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <AlertCircle className="h-3 w-3" /> Ineligible
                                  (DSA &lt; {minDsaReq})
                                </span>
                              )
                            ) : isEligible ? (
                              canEditSeeMarks ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={maxSeeCap}
                                  step={0.5}
                                  value={draft.see}
                                  onChange={(e) =>
                                    handleUpdateStudentMark(
                                      st.id,
                                      "see",
                                      Math.min(
                                        maxSeeCap,
                                        Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        )
                                      )
                                    )
                                  }
                                  className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-center text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mx-auto"
                                />
                              ) : (
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {draft.see} / {maxSeeCap}
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                Detained (DSA &lt; {minDsaReq})
                              </span>
                            )}
                          </td>

                          {/* Additional Columns when SEE is Active */}
                          {(isSeeApproved || isExamDept) && (
                            <>
                              <td className="p-3 text-center font-mono font-black text-slate-900 dark:text-white">
                                {total}
                              </td>
                              <td className="p-3 text-center font-mono font-black text-blue-900 dark:text-blue-300">
                                {passed ? grade : "F"}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                                {passed ? gp : 0}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    passed
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  }`}
                                >
                                  {passed ? "P" : "F"}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ─── OFFICIAL UNIVERSITY GRADE REPORT CARD ─── */
        <div className="space-y-4">
          {!isFacultyOrAdmin && !isSeeApproved ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-800/60 p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <Clock className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Semester {selectedSemester} Examination Results Pending Declaration</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  The official semester grade card and SEE evaluation records for Semester {selectedSemester} have not yet been declared by the Office of the Controller of Examinations.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Marks and CBCS letter grades will unlock upon official Senate publication.</span>
              </div>
            </div>
          ) : (
            <>
              {isFacultyOrAdmin && realStudents.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between gap-3 text-xs print:hidden">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                Select Registered Candidate:
              </span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
              >
                {realStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s as any).student_identifier || s.id} • {s.first_name}{" "}
                    {s.last_name || ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Printable Official Grade Report Card */}
          <div
            ref={printRef}
            className="bg-white text-slate-900 rounded-2xl border-2 border-slate-300 p-4 sm:p-6 md:p-8 shadow-sm space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 font-sans"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-300 pb-4">
              {universityLogo ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={universityLogo}
                      alt="University Logo"
                      className="h-14 w-14 object-contain"
                    />
                    <div className="border-l border-slate-300 pl-4">
                      <h1 className="text-xl sm:text-2xl font-serif font-black tracking-wide text-slate-900 leading-tight">
                        ALLIANCE UNIVERSITY
                      </h1>
                      <p className="text-[10px] tracking-widest uppercase font-bold text-slate-600">
                        OFFICE OF THE CONTROLLER OF EXAMINATIONS &bull; BENGALURU
                      </p>
                    </div>
                  </div>
                  <div className="text-right border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <span className="text-xs font-black tracking-wider text-slate-900 block font-serif">
                      GRADE REPORT
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      OFFICIAL CBCS TRANSCRIPT
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-serif font-black tracking-wide text-slate-900 leading-tight">
                        ALLIANCE UNIVERSITY
                      </h1>
                      <p className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">
                        OFFICE OF THE CONTROLLER OF EXAMINATIONS &bull; BENGALURU
                      </p>
                    </div>
                  </div>
                  <div className="text-right border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <span className="text-xs font-bold tracking-wider text-slate-900 block font-serif">
                      GRADE REPORT
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      OFFICIAL CBCS TRANSCRIPT
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Degree Title & Batch */}
            <div className="text-center space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {targetStudent.program}
              </h2>
              <p className="text-xs font-bold text-slate-700">
                {targetStudent.batch}
              </p>
            </div>

            {/* Candidate Dossier & Photo Section */}
            <div className="flex flex-col-reverse sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6 text-xs text-slate-900 pt-2">
              <div className="space-y-1.5 flex-1 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-2">
                  <span className="font-semibold text-slate-700">
                    Student Name
                  </span>
                  <span className="font-bold">: {targetStudent.name}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-2">
                  <span className="font-semibold text-slate-700">
                    Registration No.
                  </span>
                  <span className="font-mono font-bold">
                    : {targetStudent.rollNo}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-2">
                  <span className="font-semibold text-slate-700">
                    College/School of Study
                  </span>
                  <span className="font-semibold">
                    : {targetStudent.department}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-2">
                  <span className="font-semibold text-slate-700">
                    Program Group
                  </span>
                  <span className="font-semibold">
                    : {targetStudent.program}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-2">
                  <span className="font-semibold text-slate-700">
                    Month &amp; Year of Examination
                  </span>
                  <span className="font-semibold">
                    : {targetStudent.examSession}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-2">
                  <span className="font-semibold text-slate-700">Semester</span>
                  <span className="font-bold">
                    : {targetStudent.semesterLabel}
                  </span>
                </div>
              </div>

              <div className="w-24 h-28 border-2 border-dashed border-slate-400 rounded-md bg-slate-50 flex flex-col items-center justify-center p-2 text-center shrink-0 shadow-xs relative overflow-hidden select-none">
                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center mb-1 text-slate-400">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-600 leading-tight">
                  Candidate Photo
                </span>
                <span className="text-[6.5px] text-slate-400 font-semibold mt-0.5">
                  Affix Passport Size
                </span>
              </div>
            </div>

            {/* Official Marksheet Table */}
            <div className="overflow-x-auto border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold text-[10px] uppercase text-center">
                    <th className="p-2 border-r border-slate-300 w-10">
                      Sl.
                      <br />
                      No.
                    </th>
                    <th className="p-2 border-r border-slate-300 w-20">
                      Course
                      <br />
                      Code
                    </th>
                    <th className="p-2 border-r border-slate-300 text-left min-w-[200px]">
                      Course
                    </th>
                    <th className="p-2 border-r border-slate-300 w-12">
                      Credits
                    </th>
                    <th className="p-1.5 border-r border-slate-300 min-w-[90px]">
                      During
                      <br />
                      Semester
                      <br />
                      Assessment
                      <br />
                      <span className="text-[9px] font-normal block mt-0.5">
                        Internal Assessment
                        <br />
                        (CIA Scheme)
                      </span>
                    </th>
                    <th className="p-1.5 border-r border-slate-300 min-w-[90px]">
                      Semester End
                      <br />
                      Examination
                      <br />
                      <span className="text-[9px] font-normal block mt-0.5">
                        University Exam
                        <br />
                        (SEE Scheme)
                      </span>
                    </th>
                    <th className="p-1.5 border-r border-slate-300 min-w-[80px]">
                      TOTAL
                      <br />
                      <span className="text-[9px] font-normal block mt-0.5">
                        Max. Marks: 100
                        <br />
                        Min. Marks: 50
                      </span>
                    </th>
                    <th className="p-2 border-r border-slate-300 w-14">
                      Letter
                      <br />
                      Grade
                    </th>
                    <th className="p-2 border-r border-slate-300 w-14">
                      Honor
                      <br />
                      Points
                    </th>
                    <th className="p-2 w-14">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {theoryCourses.map((row) => (
                    <tr key={row.courseCode} className="hover:bg-slate-50">
                      <td className="p-2 text-center border-r border-slate-300 font-medium">
                        {row.slNo}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono font-bold text-slate-800">
                        {row.courseCode}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-medium text-slate-900">
                        {row.courseName}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono">
                        {row.credits}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono font-bold text-slate-900">
                        {row.dsaScore}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono font-bold text-slate-900">
                        {isSeeApproved || row.seeScore > 0 ? row.seeScore : <span className="text-slate-400 font-normal italic text-[10px]">Pending SEE</span>}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono font-black text-slate-900">
                        {isSeeApproved || row.seeScore > 0 ? row.totalScore : row.dsaScore}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono font-black text-blue-900">
                        {row.letterGrade}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 font-mono font-bold">
                        {isSeeApproved || row.seeScore > 0 ? row.honorPoints : "-"}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-900">
                        {row.remarks}
                      </td>
                    </tr>
                  ))}

                  {practicalCourses.length > 0 && (
                    <>
                      <tr className="bg-slate-100 text-slate-900 border-t-2 border-b border-slate-300 font-bold text-[10px] uppercase text-center">
                        <th className="p-2 border-r border-slate-300 w-10">
                          Sl.
                          <br />
                          No.
                        </th>
                        <th className="p-2 border-r border-slate-300 w-20">
                          Course
                          <br />
                          Code
                        </th>
                        <th className="p-2 border-r border-slate-300 text-left min-w-[200px]">
                          Practical / Lab Course
                        </th>
                        <th className="p-2 border-r border-slate-300 w-12">
                          Credits
                        </th>
                        <th className="p-1.5 border-r border-slate-300 min-w-[90px]">
                          During
                          <br />
                          Semester
                          <br />
                          Assessment
                          <br />
                          <span className="text-[9px] font-normal block mt-0.5">
                            Max. Marks: 25
                            <br />
                            Min. Marks: 10
                          </span>
                        </th>
                        <th className="p-1.5 border-r border-slate-300 min-w-[90px]">
                          Semester End
                          <br />
                          Examination
                          <br />
                          <span className="text-[9px] font-normal block mt-0.5">
                            Max. Marks: 75
                            <br />
                            Min. Marks: 30
                          </span>
                        </th>
                        <th className="p-1.5 border-r border-slate-300 min-w-[80px]">
                          TOTAL
                          <br />
                          <span className="text-[9px] font-normal block mt-0.5">
                            Max. Marks: 100
                            <br />
                            Min. Marks: 40
                          </span>
                        </th>
                        <th className="p-2 border-r border-slate-300 w-14">
                          Letter
                          <br />
                          Grade
                        </th>
                        <th className="p-2 border-r border-slate-300 w-14">
                          Honor
                          <br />
                          Points
                        </th>
                        <th className="p-2 w-14">Remarks</th>
                      </tr>
                      {practicalCourses.map((row) => (
                        <tr key={row.courseCode} className="hover:bg-slate-50">
                          <td className="p-2 text-center border-r border-slate-300 font-medium">
                            {row.slNo}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono font-bold text-slate-800">
                            {row.courseCode}
                          </td>
                          <td className="p-2 border-r border-slate-300 font-medium text-slate-900">
                            {row.courseName}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono">
                            {row.credits}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono font-bold text-slate-900">
                            {row.dsaScore}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono font-bold text-slate-900">
                            {isSeeApproved || row.seeScore > 0 ? row.seeScore : <span className="text-slate-400 font-normal italic text-[10px]">Pending SEE</span>}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono font-black text-slate-900">
                            {isSeeApproved || row.seeScore > 0 ? row.totalScore : row.dsaScore}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono font-black text-blue-900">
                            {row.letterGrade}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono font-bold">
                            {isSeeApproved || row.seeScore > 0 ? row.honorPoints : "-"}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-900">
                            {row.remarks}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Summary KPI Box */}
            <div className="border border-slate-300 text-xs text-slate-900 font-sans shadow-xs rounded-xs overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr] border-b border-slate-300 p-2.5 bg-white">
                <span className="font-bold text-slate-800">Total Credits</span>
                <span className="font-bold text-center font-mono text-slate-900">
                  {totalCredits}.0
                </span>
              </div>
              <div className="grid grid-cols-[2fr_1fr] border-b border-slate-300 p-2.5 bg-slate-50/60">
                <span className="font-bold text-slate-800">
                  Semester Grade Point Average (SGPA)
                </span>
                <span className="font-black text-center font-mono text-sm text-slate-900">
                  {isSeeApproved || semesterCourses.some((c) => c.seeScore > 0) ? sgpa : "In Progress (SEE Pending)"}
                </span>
              </div>
              <div className="grid grid-cols-[2fr_1fr] border-b border-slate-300 p-2.5 bg-white">
                <span className="font-bold text-slate-800">
                  Semester Weighted Percentage of Marks
                </span>
                <span className="font-black text-center font-mono text-sm text-slate-900">
                  {isSeeApproved || semesterCourses.some((c) => c.seeScore > 0) ? weightedPercentage : "-"}
                </span>
              </div>
              <div className="grid grid-cols-[2fr_1fr] p-2.5 bg-slate-50/60">
                <span className="font-bold text-slate-800">
                  Result Classification
                </span>
                <span className="font-black text-center text-xs tracking-wider font-mono text-emerald-800">
                  {isSeeApproved || semesterCourses.some((c) => c.seeScore > 0)
                    ? parseFloat(sgpa) >= 8.5
                      ? "FIRST CLASS WITH DISTINCTION"
                      : parseFloat(sgpa) >= 6.5
                      ? "FIRST CLASS"
                      : parseFloat(sgpa) >= 5.0
                      ? "PASS"
                      : "RE-APPEAR / PENDING"
                    : "CONTINUOUS EVALUATION IN PROGRESS"}
                </span>
              </div>
            </div>

            {/* Grading Scale Key */}
            <div className="border border-slate-200 bg-slate-50/50 rounded p-2.5 text-[9px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[8px]">
                Grading Scale Reference:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1 font-mono text-center">
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-slate-900">O:</b> 90-100 (10)
                </span>
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-slate-900">A+:</b> 80-89 (9)
                </span>
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-slate-900">A:</b> 70-79 (8)
                </span>
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-slate-900">B+:</b> 60-69 (7)
                </span>
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-slate-900">B:</b> 50-59 (6)
                </span>
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-slate-900">C:</b> 40-49 (5)
                </span>
                <span className="bg-white p-1 rounded border border-slate-200">
                  <b className="text-rose-700">F:</b> &lt;40 (0)
                </span>
              </div>
            </div>

            {/* Signatures & Security Seal Block */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
              <div className="space-y-1">
                <div className="h-10 flex items-end justify-center">
                  <div className="w-32 border-b border-dashed border-slate-400"></div>
                </div>
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  Prepared By
                </p>
                <p className="text-[8px] text-slate-500 font-medium">
                  Evaluation Wing
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    Officially Verified
                  </span>
                </div>
                <p className="text-[7.5px] font-mono text-slate-500">
                  DIGITAL HASH: AU-
                  {String(targetStudent.rollNo || "000000").slice(-6)}-2026
                </p>
                <p className="text-[7.5px] text-slate-400">
                  Date:{" "}
                  {new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="h-10 flex items-end justify-center">
                  <div className="w-32 border-b border-slate-800"></div>
                </div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                  Controller of Examinations
                </p>
                <p className="text-[8px] text-slate-500 font-medium">
                  Alliance University, Bengaluru
                </p>
              </div>
            </div>

            <div className="pt-2 text-[8px] text-slate-400 text-center border-t border-slate-200 font-medium">
              This is an official Semester Grade Report issued by Alliance
              University. Any discrepancy should be notified to the Office of
              the Controller of Examinations within 15 days of announcement.
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
