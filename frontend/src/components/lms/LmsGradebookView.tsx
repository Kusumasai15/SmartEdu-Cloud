"use client";

import React, { useState, useMemo } from "react";
import {
  Rss,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Minus,
  X,
  GraduationCap,
  Sparkles,
  Award,
  BookOpen,
  Calendar,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel, exportToPdf } from "@/lib/export-reports";
import { SemesterResultView } from "@/components/results/SemesterResultView";

interface AssessmentRow {
  slNo?: number;
  courseCode: string;
  courseName: string;
  component: string;
  type: string;
  maxMark: number;
  marksObtained: number | null;
  isTotal?: boolean;
  status?: string;
}

interface LmsGradebookViewProps {
  hideHeader?: boolean;
  enrolledCourses?: any[];
}

export function LmsGradebookView({ hideHeader = true, enrolledCourses }: LmsGradebookViewProps = {}) {
  const { user } = useAuth();
  const {
    courses,
    departments,
    currentSemester,
    activeSemesterFilter,
    semesterHistory,
    assignments,
    submissions,
    isSemesterSeeUnlocked,
  } = useAcademicData();

  const [resultMode, setResultMode] = useState<"INTERNAL_DSA" | "SEMESTER_FINAL">("INTERNAL_DSA");
  const [selectedSemester, setSelectedSemester] = useState<number>(() => activeSemesterFilter || currentSemester || 1);
  const [filterCourse, setFilterCourse] = useState<string>("ALL");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [storageRefreshKey, setStorageRefreshKey] = useState<number>(0);
  const [operationalVault, setOperationalVault] = useState<{
    dsaPublishedMap?: Record<string, boolean>;
    dsaScoresMap?: Record<string, number>;
    dsaBreakdownMap?: Record<string, Record<string, number>>;
    dsaRawMarksMap?: Record<string, any>;
  }>({});

  // Listen for storage events (e.g. when faculty publishes marks from Mapping Modal)
  React.useEffect(() => {
    const handleStorageChange = () => setStorageRefreshKey((prev) => prev + 1);
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch backend operational state to retrieve institutional published marks
  React.useEffect(() => {
    import("@/lib/api-client")
      .then(({ apiClient }) => apiClient.get<Record<string, any>>("/admin/operational-state"))
      .then((res: any) => {
        const vault = res?.data || res || {};
        setOperationalVault(vault);
      })
      .catch(() => {});
  }, [storageRefreshKey]);

  // Filter courses for student and selected semester
  const studentCourses = useMemo(() => {
    // 1. If enrolledCourses was explicitly passed from the student hub, use it
    if (Array.isArray(enrolledCourses) && enrolledCourses.length > 0) {
      return enrolledCourses;
    }

    const studentClassName = (user?.className || (user as any)?.class_name || "").toLowerCase().trim();

    // 2. Look up cohort assigned courses from departments
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

    if (cohortCourseCodes.length > 0) {
      const matched = courses.filter((c) => cohortCourseCodes.includes(c.code.trim().toUpperCase()));
      if (matched.length > 0) return matched;
    }

    // 3. Match assignedClasses strictly
    const enrolled = courses.filter((c) => {
      if (studentClassName && Array.isArray(c.assignedClasses)) {
        return c.assignedClasses.some(
          (cls) => cls.toLowerCase().includes(studentClassName) || studentClassName.includes(cls.toLowerCase())
        );
      }
      return false;
    });

    return enrolled;
  }, [enrolledCourses, courses, departments, user]);

  // Compute live internal assessment records for the student
  const assessmentData = useMemo<AssessmentRow[]>(() => {
    const list: AssessmentRow[] = [];

    const filtered = filterCourse === "ALL" ? studentCourses : studentCourses.filter((c) => c.code === filterCourse);

    const publishedMap = operationalVault.dsaPublishedMap || {};
    const scoresMap = operationalVault.dsaScoresMap || {};
    const breakdownMap = operationalVault.dsaBreakdownMap || {};

    const stuIdent = user?.student_identifier;
    const stuEmail = (user?.email || "").toLowerCase();
    const stuId = user?.id;

    filtered.forEach((course, courseIdx) => {
      const courseNumber = courseIdx + 1;
      const cleanCode = (course.code || "").replace("-", "");
      let dsaRecord: { assignments?: number; classTest?: number; midTerm?: number; labPractical?: number; isPublished?: boolean; total?: number } = {};

      const isPublishedInVault = Boolean(
        publishedMap[course.code] ||
        publishedMap[course.id] ||
        (cleanCode && publishedMap[cleanCode])
      );

      // 1. Look up published breakdown in database operational state
      let vaultBreakdown: Record<string, number> | null = null;
      [stuId, stuIdent, stuEmail].filter(Boolean).forEach((idKey) => {
        [course.code, course.id, cleanCode].filter(Boolean).forEach((cKey) => {
          if (!vaultBreakdown && idKey && cKey && breakdownMap[`${idKey}_${cKey}`]) {
            vaultBreakdown = breakdownMap[`${idKey}_${cKey}`];
          }
        });
      });

      // 2. Look up published total score in database operational state
      let vaultTotal: number | null = null;
      [stuId, stuIdent, stuEmail].filter(Boolean).forEach((idKey) => {
        [course.code, course.id, cleanCode].filter(Boolean).forEach((cKey) => {
          if (vaultTotal === null && idKey && cKey && scoresMap[`${idKey}_${cKey}`] !== undefined) {
            vaultTotal = scoresMap[`${idKey}_${cKey}`];
          }
        });
      });

      if (vaultBreakdown) {
        const b = vaultBreakdown as Record<string, number>;
        const scaled = (name: string, legacyKey: string, rawMax: number, weight: number) => {
          const value = b[name] ?? b[legacyKey];
          if (typeof value !== "number") return undefined;
          if (typeof b[`${name}::max`] === "number") return value;
          return Math.round(((value / rawMax) * weight) * 10) / 10;
        };
        dsaRecord = {
          assignments: scaled("Assignments", "comp-asg", 50, 5),
          classTest: scaled("Class Test / Quiz", "comp-ct", 30, 10),
          midTerm: scaled("Mid-Term Exam", "comp-mid", 100, 20),
          labPractical: scaled("Lab Practical", "comp-lab", 50, 15),
          total: b["total"] ?? (vaultTotal !== null ? vaultTotal : undefined),
          isPublished: true,
        };
      }

      // Check if custom evaluation components are configured for this course
      let customComponents: Array<{ id: string; name: string; maxMarks: number; weightage: number; type?: string }> = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`smartedu_dsa_components_${course.id}`) ||
                      localStorage.getItem(`smartedu_dsa_components_${course.code}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) customComponents = parsed;
          }
        } catch {}
      }
      if (customComponents.length === 0 && (operationalVault as any)?.dsaComponents) {
        const fromVault = (operationalVault as any)?.dsaComponents[course.code] || (operationalVault as any)?.dsaComponents[course.id];
        if (Array.isArray(fromVault) && fromVault.length > 0) customComponents = fromVault;
      }

      // Check graded assignments for this course
      const gradedCourseSubs = submissions.filter(
        (s) => {
          const assignment = assignments.find((item) => item.id === s.assignmentId);
          return assignment?.courseCode === course.code &&
          s.studentId === user?.id &&
          s.status === "GRADED" &&
          typeof s.score === "number";
        }
      );

      // Normalization: raw assignment score out of 100 scaled to 5.0 max marks
      const rawAsgScore = gradedCourseSubs.length > 0 ? (gradedCourseSubs[0].score ?? null) : null;
      const asgMaxPoints = gradedCourseSubs.length > 0 ? (assignments.find((a) => a.id === gradedCourseSubs[0].assignmentId)?.totalPoints || 100) : 100;
      const normalizedAsg = rawAsgScore !== null ? Math.round(((rawAsgScore / asgMaxPoints) * 5) * 10) / 10 : null;

      const assignmentScore = dsaRecord.assignments !== undefined ? dsaRecord.assignments : normalizedAsg;
      const midTermScore = dsaRecord.midTerm ?? null;
      const classTestScore = dsaRecord.classTest ?? null;
      const labScore = dsaRecord.labPractical ?? null;
      const isCoursePublished = Boolean(dsaRecord.isPublished || isPublishedInVault);

      if (customComponents.length > 0) {
        let compTotal = 0;
        let hasAnyScore = false;
        const totalCourseWeight = customComponents.reduce((acc, c) => acc + (c.weightage || c.maxMarks || 0), 0) || 50;

        customComponents.forEach((comp, compIdx) => {
          let compScore: number | null = null;
          if (vaultBreakdown) {
            const val = (vaultBreakdown as any)[comp.name] ?? (vaultBreakdown as any)[comp.id];
            if (typeof val === "number") {
              compScore = Math.round(((val / (comp.maxMarks || 100)) * (comp.weightage || comp.maxMarks)) * 10) / 10;
            }
          }
          if (compScore === null) {
            if (comp.id === "comp-asg" || comp.name.toLowerCase().includes("assign")) compScore = assignmentScore;
            else if (comp.id === "comp-ct" || comp.name.toLowerCase().includes("quiz") || comp.name.toLowerCase().includes("test")) compScore = classTestScore;
            else if (comp.id === "comp-mid" || comp.name.toLowerCase().includes("mid")) compScore = midTermScore;
            else if (comp.id === "comp-lab" || comp.name.toLowerCase().includes("lab")) compScore = labScore;
          }

          if (typeof compScore === "number") {
            compTotal += compScore;
            hasAnyScore = true;
          }

          list.push({
            slNo: compIdx === 0 ? courseNumber : undefined,
            courseCode: course.code,
            courseName: course.name,
            component: comp.name,
            type: comp.type || "Continuous Assessment",
            maxMark: comp.weightage || comp.maxMarks,
            marksObtained: compScore,
            status: compScore !== null ? (isCoursePublished ? "Published • Evaluated" : "Evaluated") : "Pending Evaluation",
          });
        });

        const finalTotal = hasAnyScore ? Math.min(totalCourseWeight, Math.round(compTotal * 10) / 10) : null;
        list.push({
          courseCode: course.code,
          courseName: course.name,
          component: "Total",
          type: "DSA Aggregate",
          maxMark: totalCourseWeight,
          marksObtained: finalTotal,
          isTotal: true,
          status: isCoursePublished ? "Published" : "Pending",
        });
      } else {
        // Standard 4 Evaluation Components with strict 50-mark normalization
        list.push({
          slNo: courseNumber,
          courseCode: course.code,
          courseName: course.name,
          component: "MSE (Mid-Term Exam)",
          type: "Theory Exam",
          maxMark: 20,
          marksObtained: midTermScore,
          status: midTermScore !== null ? (isCoursePublished ? "Published • Evaluated" : "Evaluated") : "Pending Evaluation",
        });

        list.push({
          courseCode: course.code,
          courseName: course.name,
          component: "Class Test / Quiz",
          type: "Continuous Eval",
          maxMark: 10,
          marksObtained: classTestScore,
          status: classTestScore !== null ? (isCoursePublished ? "Published • Evaluated" : "Evaluated") : "Pending Evaluation",
        });

        list.push({
          courseCode: course.code,
          courseName: course.name,
          component: "Assignments",
          type: "Continuous Assessment",
          maxMark: 5,
          marksObtained: assignmentScore,
          status: assignmentScore !== null ? (isCoursePublished ? "Published • Evaluated" : "Evaluated") : "Pending Evaluation",
        });

        list.push({
          courseCode: course.code,
          courseName: course.name,
          component: "Lab Practical",
          type: "Practical Assessment",
          maxMark: 15,
          marksObtained: labScore,
          status: labScore !== null ? (isCoursePublished ? "Published • Evaluated" : "Evaluated") : "Pending Evaluation",
        });

        const obtainedValues = [midTermScore, classTestScore, assignmentScore, labScore].filter((v): v is number => typeof v === "number" && !isNaN(v));
        const calculatedTotal = obtainedValues.length > 0 ? Math.min(50, Math.round(obtainedValues.reduce((a, b) => a + b, 0) * 10) / 10) : null;
        const rawVault = dsaRecord.total ?? vaultTotal;
        const normalizedVault = typeof rawVault === "number" ? (rawVault > 50 ? Math.round((rawVault / 100) * 50 * 10) / 10 : rawVault) : null;
        const finalTotal = normalizedVault ?? calculatedTotal;

        list.push({
          courseCode: course.code,
          courseName: course.name,
          component: "Total",
          type: "DSA Aggregate",
          maxMark: 50,
          marksObtained: finalTotal,
          isTotal: true,
          status: isCoursePublished ? "Published" : "Pending",
        });
      }
    });

    return list;
  }, [studentCourses, filterCourse, submissions, assignments, user, storageRefreshKey, operationalVault]);

  const handleExportExcel = () => {
    const rows = assessmentData.map((r) => ({
      "Sl No": r.slNo ?? "",
      "Course Code": r.courseCode,
      "Course Name": r.courseName,
      Component: r.component,
      Type: r.type,
      "Max Marks": r.maxMark,
      "Marks Obtained": r.marksObtained !== null ? r.marksObtained : "Pending",
    }));
    exportToExcel(`Internal_Assessment_Semester_${selectedSemester}`, rows, Object.keys(rows[0] || {}).map((key) => ({ header: key, key })));
  };

  const handleExportPdf = () => {
    const rows = assessmentData.map((r) => ({
      slNo: String(r.slNo ?? ""), courseCode: r.courseCode, courseName: r.courseName,
      component: r.component, type: r.type, maxMark: String(r.maxMark),
      obtained: r.marksObtained !== null ? String(r.marksObtained) : "Pending",
    }));
    const columns = [
      { header: "Sl.No", key: "slNo" }, { header: "Course Code", key: "courseCode" },
      { header: "Course Name", key: "courseName" }, { header: "Component", key: "component" },
      { header: "Type", key: "type" }, { header: "Max Mark", key: "maxMark" },
      { header: "Obtained", key: "obtained" },
    ];

    exportToPdf(
      `Official Internal Assessment Marks Statement — Semester ${selectedSemester}`,
      rows,
      columns,
      { subtitle: `Semester ${selectedSemester}` }
    );
  };

  const isSeeUnlocked = isSemesterSeeUnlocked(selectedSemester);
  const currentSemesterHistory = semesterHistory?.find((sh) => sh.semesterNumber === selectedSemester);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Editorial Header (Hidden when integrated in unified Academic Performance Hub) */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Academic Assessment &amp; Evaluation Statement
              </p>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Grades &amp; Academic Results
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              During-Semester Assessment (DSA) marks and official university semester grade sheets
            </p>
          </div>

          {/* 2-Part Segmented Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setResultMode("INTERNAL_DSA")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                resultMode === "INTERNAL_DSA"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Internal Assessment (DSA)
            </button>
            <button
              onClick={() => setResultMode("SEMESTER_FINAL")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                resultMode === "SEMESTER_FINAL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semester End Results
            </button>
          </div>
        </div>
      )}

      {resultMode === "INTERNAL_DSA" ? (
        /* PART 1: Internal Assessment (Continuous Evaluation / DSA) */
        <div className="space-y-4">
          {/* Controls Bar: Semester dropdown & Course filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">TERM:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem} {sem === (currentSemester || 1) ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">COURSE:</span>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  <option value="ALL">All Subjects</option>
                  {studentCourses.map((c) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.code} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Internal Assessment Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Continuous Evaluation &amp; Internal Assessment Records
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 text-center w-14">Sl.No</th>
                      <th className="py-2.5 px-4 w-32">Course Code</th>
                      <th className="py-2.5 px-4 min-w-[180px]">Course Name</th>
                      <th className="py-2.5 px-4 min-w-[160px]">Component/Exam</th>
                      <th className="py-2.5 px-4 w-32">Type</th>
                      <th className="py-2.5 px-4 text-center w-24">Max Mark</th>
                      <th className="py-2.5 px-4 text-center w-28">Marks Obtained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentData.length > 0 ? (
                      assessmentData.map((row, idx) => {
                        const isFirstInCourse = row.slNo !== undefined;

                        if (row.isTotal) {
                          return (
                            <tr
                              key={`total-${idx}`}
                              className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70 font-bold text-slate-900 dark:text-white"
                            >
                              <td className="py-2.5 px-3 text-center" />
                              <td className="py-2.5 px-4" />
                              <td className="py-2.5 px-4" />
                              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">Course Total</td>
                              <td className="py-2.5 px-4 text-xs font-semibold text-slate-500">{row.type}</td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold">{row.maxMark}</td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {row.marksObtained !== null ? row.marksObtained : "—"}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={`row-${idx}`}
                            className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isFirstInCourse ? "bg-slate-50/30 dark:bg-slate-900/40" : ""}`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              {isFirstInCourse && (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-2xs font-mono">
                                  {row.slNo}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {isFirstInCourse ? row.courseCode : ""}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                              {isFirstInCourse ? row.courseName : ""}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 mr-2 align-middle" />
                              {row.component}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">{row.type}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                              {row.maxMark}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold">
                              {row.marksObtained !== null ? (
                                <span className="text-slate-900 dark:text-white">{row.marksObtained}</span>
                              ) : (
                                <span className="text-slate-400 text-[11px] font-normal italic">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                          No internal assessment records found for Semester {selectedSemester}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PART 2: Semester End Examination & Final SGPA Results */
        <div className="space-y-6">
          <SemesterResultView enrolledCourses={enrolledCourses || studentCourses} />
        </div>
      )}
    </div>
  );
}
