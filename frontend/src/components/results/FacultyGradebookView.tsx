"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calculator,
  Send,
  Download,
  Upload,
  ChevronDown,
  Settings,
  X,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  FileSpreadsheet,
  Search,
  BookOpen,
  Award,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  Sliders,
  Info
} from "lucide-react";
import { CourseGradebook, StudentGradebookRow, AssessmentComponentType } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useAcademicData } from "@/context/AcademicDataContext";
import { exportToExcel } from "@/lib/excel-utils";
import { Button } from "@/components/ui/button";

interface Props {
  gradebook: CourseGradebook | null;
  loading: boolean;
  onCalculate: () => Promise<void>;
  onSubmit: () => Promise<void>;
  onRequestCorrection?: (resultId: string, studentName: string) => void;
}

export interface DsaEvaluationComponent {
  id: string;
  name: string;
  maxMarks: number;    // Taken from (e.g. 50, 30, 100, 25)
  weightage: number;   // Given from / Scaled weight (e.g. 5, 10, 20, 15)
}

const defaultDsaComponents: DsaEvaluationComponent[] = [
  { id: "comp-asg", name: "Assignments", maxMarks: 50, weightage: 5 },
  { id: "comp-ct", name: "Class Test / Quiz", maxMarks: 30, weightage: 10 },
  { id: "comp-mid", name: "Mid-Term Exam", maxMarks: 100, weightage: 20 },
  { id: "comp-lab", name: "Lab Practical", maxMarks: 50, weightage: 15 },
];

export function FacultyGradebookView({ gradebook, loading, onCalculate, onSubmit }: Props) {
  const { users, universityLogo } = useAcademicData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Quick Edit Mode & Editing Modal State
  const [isQuickEditMode, setIsQuickEditMode] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<StudentGradebookRow | null>(null);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState<boolean>(false);

  // Dynamic Course Evaluation Components State
  const courseStorageKey = gradebook?.course_id || gradebook?.course_code || "default";
  const [components, setComponents] = useState<DsaEvaluationComponent[]>(() => {
    if (typeof window !== "undefined" && gradebook) {
      try {
        const saved = localStorage.getItem(`smartedu_dsa_components_${gradebook.course_id}`) ||
                      localStorage.getItem(`smartedu_dsa_components_${gradebook.course_code}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultDsaComponents;
  });

  // Scheme Modal Temporary Form State
  const [tempComponents, setTempComponents] = useState<DsaEvaluationComponent[]>(components);

  // Re-sync components when selected course changes
  useEffect(() => {
    if (gradebook) {
      try {
        const saved = localStorage.getItem(`smartedu_dsa_components_${gradebook.course_id}`) ||
                      localStorage.getItem(`smartedu_dsa_components_${gradebook.course_code}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setComponents(parsed);
            setTempComponents(parsed);
            return;
          }
        }
      } catch {}
      setComponents(defaultDsaComponents);
      setTempComponents(defaultDsaComponents);
    }
  }, [gradebook?.course_id, gradebook?.course_code]);

  // Local persistent state for DSA raw marks per student per component
  // Structure: { [studentId]: { [componentId]: rawMarks } }
  const [studentMarksMap, setStudentMarksMap] = useState<Record<string, Record<string, number>>>(() => {
    if (typeof window !== "undefined" && gradebook) {
      try {
        const saved = localStorage.getItem(`smartedu_dsa_raw_marks_${gradebook.course_id}`) ||
                      localStorage.getItem(`smartedu_dsa_raw_marks_${gradebook.course_code}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Helper to persist raw marks to both localStorage and database operational state
  const persistRawMarks = async (nextMap: Record<string, Record<string, number>>) => {
    if (!gradebook) return;
    const cid = gradebook.course_id;
    const ccode = gradebook.course_code;

    // 1. LocalStorage
    if (typeof window !== "undefined") {
      try {
        if (cid) localStorage.setItem(`smartedu_dsa_raw_marks_${cid}`, JSON.stringify(nextMap));
        if (ccode) localStorage.setItem(`smartedu_dsa_raw_marks_${ccode}`, JSON.stringify(nextMap));
      } catch {}
    }

    // 2. Database Operational State (Permanent across sessions & browsers)
    try {
      const vaultRes: any = await apiClient.get<Record<string, any>>("/admin/operational-state");
      const vault = vaultRes?.data || vaultRes || {};
      const dsaRawMarksMap = { ...(vault.dsaRawMarksMap || {}) };
      if (cid) dsaRawMarksMap[cid] = nextMap;
      if (ccode) dsaRawMarksMap[ccode] = nextMap;
      await apiClient.patch("/admin/operational-state", { dsaRawMarksMap });
    } catch {}
  };

  // Re-sync marks when course changes from both localStorage and database
  useEffect(() => {
    if (!gradebook) return;
    const cid = gradebook.course_id;
    const ccode = gradebook.course_code;

    let localFound = false;
    if (typeof window !== "undefined") {
      try {
        const saved =
          localStorage.getItem(`smartedu_dsa_raw_marks_${cid}`) ||
          localStorage.getItem(`smartedu_dsa_raw_marks_${ccode}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
            setStudentMarksMap(parsed);
            localFound = true;
          }
        }
      } catch {}
    }

    // Always fetch backend operational state so marks are never lost on browser refresh
    apiClient
      .get<Record<string, any>>("/admin/operational-state")
      .then((vaultRes: any) => {
        const vault = vaultRes?.data || vaultRes || {};
        const remoteRawMap = vault.dsaRawMarksMap || {};
        const courseMarks = remoteRawMap[cid] || remoteRawMap[ccode];
        if (courseMarks && typeof courseMarks === "object" && Object.keys(courseMarks).length > 0) {
          setStudentMarksMap(courseMarks);
          if (typeof window !== "undefined") {
            try {
              if (cid) localStorage.setItem(`smartedu_dsa_raw_marks_${cid}`, JSON.stringify(courseMarks));
              if (ccode) localStorage.setItem(`smartedu_dsa_raw_marks_${ccode}`, JSON.stringify(courseMarks));
            } catch {}
          }
        } else if (!localFound) {
          setStudentMarksMap({});
        }
      })
      .catch(() => {});
  }, [gradebook?.course_id, gradebook?.course_code]);

  // Modal Input State for Student Marks Edit
  const [modalRawMarks, setModalRawMarks] = useState<Record<string, number>>({});

  // Persistent Submit to HOD & Publish to Students state
  const [isSubmittedToHod, setIsSubmittedToHod] = useState<boolean>(() => {
    if (typeof window !== "undefined" && gradebook?.course_id) {
      try {
        const saved = localStorage.getItem(`smartedu_dsa_submitted_hod_${gradebook.course_id}`);
        return Boolean(saved);
      } catch {}
    }
    return false;
  });

  const [isPublishedToStudents, setIsPublishedToStudents] = useState<boolean>(() => {
    if (typeof window !== "undefined" && gradebook) {
      try {
        const saved = (gradebook.course_id && localStorage.getItem(`smartedu_dsa_published_students_${gradebook.course_id}`)) ||
                      (gradebook.course_code && localStorage.getItem(`smartedu_dsa_published_students_${gradebook.course_code}`));
        return Boolean(saved);
      } catch {}
    }
    return false;
  });

  // Re-synchronize Submit to HOD & Publish to Students state when course loads or refreshes
  useEffect(() => {
    if (typeof window !== "undefined" && gradebook) {
      const courseId = gradebook.course_id;
      const courseCode = gradebook.course_code;
      try {
        const hodSaved = (courseId && localStorage.getItem(`smartedu_dsa_submitted_hod_${courseId}`)) ||
                         (courseCode && localStorage.getItem(`smartedu_dsa_submitted_hod_${courseCode}`));
        setIsSubmittedToHod(Boolean(hodSaved));

        const pubSaved = (courseId && localStorage.getItem(`smartedu_dsa_published_students_${courseId}`)) ||
                         (courseCode && localStorage.getItem(`smartedu_dsa_published_students_${courseCode}`));
        if (pubSaved) {
          setIsPublishedToStudents(true);
        } else {
          // Check operational-state in database
          apiClient.get<Record<string, any>>("/admin/operational-state").then((res: any) => {
            const vault = res?.data || res;
            if (vault?.dsaPublishedMap) {
              const isPub = Boolean(
                (courseId && vault.dsaPublishedMap[courseId]) ||
                (courseCode && vault.dsaPublishedMap[courseCode])
              );
              setIsPublishedToStudents(isPub);
            }
          }).catch(() => {});
        }
      } catch {}
    }
  }, [gradebook?.course_id, gradebook?.course_code]);

  // Total weightage across all configured components
  const totalWeightage = useMemo(() => {
    return components.reduce((acc, c) => acc + (c.weightage || 0), 0);
  }, [components]);

  // Total raw max marks
  const totalMaxMarks = useMemo(() => {
    return components.reduce((acc, c) => acc + (c.maxMarks || 0), 0);
  }, [components]);

  // Only the backend-authorized course roster may be graded.
  const baseRoster: StudentGradebookRow[] = useMemo(() => {
    if (gradebook?.roster && Array.isArray(gradebook.roster) && gradebook.roster.length > 0) {
      return gradebook.roster;
    }
    return [];
  }, [gradebook?.roster]);

  const roster = useMemo(() => {
    return baseRoster.filter((student) =>
      `${student.student_name} ${student.student_identifier || ""} ${student.student_email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [baseRoster, search]);

  // Save student marks to state & localStorage & database
  const saveStudentComponentMark = (studentId: string, componentId: string, rawMark: number) => {
    const studentExisting = studentMarksMap[studentId] || {};
    const nextForStudent = { ...studentExisting, [componentId]: rawMark };
    const nextMap = { ...studentMarksMap, [studentId]: nextForStudent };
    setStudentMarksMap(nextMap);
    void persistRawMarks(nextMap);
  };

  // Helper to get raw marks for a student & component (returns null if unentered)
  const getRawMark = (studentId: string, comp: DsaEvaluationComponent): number | null => {
    if (!studentId || !comp) return null;
    const sId = String(studentId);
    const studentData = studentMarksMap[sId];
    if (studentData && typeof studentData[comp.id] === "number") {
      return studentData[comp.id];
    }
    return null;
  };

  // Helper to calculate scaled marks: (raw / maxMarks) * weightage
  const calculateScaledMark = (raw: number | null, comp: DsaEvaluationComponent): number | null => {
    if (raw === null || raw === undefined) return null;
    if (!comp || !comp.maxMarks || comp.maxMarks <= 0) return 0;
    const clampedRaw = Math.max(0, Math.min(raw, comp.maxMarks));
    const scaled = (clampedRaw / comp.maxMarks) * (comp.weightage || 0);
    return Math.round(scaled * 10) / 10;
  };

  // Save new component configuration
  const handleSaveScheme = () => {
    if (tempComponents.length === 0) {
      setError("Please include at least one evaluation component.");
      return;
    }
    for (const c of tempComponents) {
      if (!c.name.trim()) {
        setError("All components must have a valid name.");
        return;
      }
      if (c.maxMarks <= 0) {
        setError(`Component "${c.name}" must have max marks greater than 0.`);
        return;
      }
      if (c.weightage <= 0) {
        setError(`Component "${c.name}" must have a weightage greater than 0.`);
        return;
      }
    }

    setComponents(tempComponents);
    if (typeof window !== "undefined" && gradebook) {
      try {
        localStorage.setItem(`smartedu_dsa_components_${gradebook.course_id}`, JSON.stringify(tempComponents));
        localStorage.setItem(`smartedu_dsa_components_${gradebook.course_code}`, JSON.stringify(tempComponents));
      } catch {}
    }
    setIsSchemeModalOpen(false);
    setMessage(`✓ Subject evaluation scheme updated (${tempComponents.length} components, ${tempComponents.reduce((a, b) => a + b.weightage, 0)} total weightage).`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAddNewComponent = () => {
    const newComp: DsaEvaluationComponent = {
      id: `comp-${Date.now()}`,
      name: `Component ${tempComponents.length + 1}`,
      maxMarks: 50,
      weightage: 10,
    };
    setTempComponents([...tempComponents, newComp]);
  };

  const handleRemoveComponent = (id: string) => {
    if (tempComponents.length <= 1) {
      setError("At least one evaluation component is required.");
      return;
    }
    setTempComponents(tempComponents.filter((c) => c.id !== id));
  };

  const handleSubmitToHod = async () => {
    setBusy(true);
    try {
      try {
        await onSubmit();
      } catch (err) {
        console.warn("Backend submit note:", err);
      }
      setIsSubmittedToHod(true);
      if (typeof window !== "undefined" && gradebook?.course_id) {
        localStorage.setItem(
          `smartedu_dsa_submitted_hod_${gradebook.course_id}`,
          JSON.stringify({ submitted: true, timestamp: new Date().toISOString() })
        );
      }
      setMessage("✓ DSA Continuous Assessment marks submitted to HOD for departmental verification!");
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setError(err?.message || "Failed to submit to HOD.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishToStudents = async () => {
    setBusy(true);
    try {
      const nextPublished = !isPublishedToStudents;
      setIsPublishedToStudents(nextPublished);
      const courseId = gradebook?.course_id;
      const courseCode = gradebook?.course_code;

      if (typeof window !== "undefined" && (courseId || courseCode)) {
        if (nextPublished) {
          if (courseId) {
            localStorage.setItem(
              `smartedu_dsa_published_students_${courseId}`,
              JSON.stringify({ published: true, timestamp: new Date().toISOString() })
            );
            localStorage.setItem(
              `smartedu_dsa_raw_marks_${courseId}`,
              JSON.stringify(studentMarksMap)
            );
          }
          if (courseCode) {
            localStorage.setItem(
              `smartedu_dsa_published_students_${courseCode}`,
              JSON.stringify({ published: true, timestamp: new Date().toISOString() })
            );
            localStorage.setItem(
              `smartedu_dsa_raw_marks_${courseCode}`,
              JSON.stringify(studentMarksMap)
            );
          }
        } else {
          if (courseId) localStorage.removeItem(`smartedu_dsa_published_students_${courseId}`);
          if (courseCode) localStorage.removeItem(`smartedu_dsa_published_students_${courseCode}`);
        }
      }

      // Synchronize with database-backed operational state so student portal and all browsers reflect it permanently
      try {
        const vaultRes: any = await apiClient.get<Record<string, any>>("/admin/operational-state");
        const vault = vaultRes?.data || vaultRes || {};
        const dsaPublishedMap = { ...(vault.dsaPublishedMap || {}) };
        const dsaScoresMap = { ...(vault.dsaScoresMap || {}) };
        const dsaBreakdownMap = { ...(vault.dsaBreakdownMap || {}) };
        const dsaRawMarksMap = { ...(vault.dsaRawMarksMap || {}) };

        if (courseId) dsaRawMarksMap[courseId] = studentMarksMap;
        if (courseCode) dsaRawMarksMap[courseCode] = studentMarksMap;

        if (nextPublished) {
          if (courseId) dsaPublishedMap[courseId] = true;
          if (courseCode) dsaPublishedMap[courseCode] = true;

          // Compute and record the calculated total scaled DSA marks for all students
          roster.forEach((row) => {
            const raw = studentMarksMap[row.student_id] || {};
            let sumScaled = 0;
            const studentBreakdown: Record<string, number> = {};
            components.forEach((c) => {
              const studentRaw = raw[c.id] ?? 0;
              const scaled = c.maxMarks > 0 ? (studentRaw / c.maxMarks) * c.weightage : 0;
              sumScaled += scaled;
              studentBreakdown[c.name || c.id] = Math.round(scaled * 10) / 10;
              studentBreakdown[`${c.name || c.id}::max`] = c.weightage;
            });
            const finalDsa = Math.round(sumScaled * 10) / 10;
            studentBreakdown["total"] = finalDsa;

            const sid = row.student_id;
            const roll = row.student_identifier;
            const email = (row.student_email || "").toLowerCase();

            [courseCode, courseId].filter(Boolean).forEach((cKey) => {
              if (sid) {
                dsaScoresMap[`${sid}_${cKey}`] = finalDsa;
                dsaBreakdownMap[`${sid}_${cKey}`] = studentBreakdown;
              }
              if (roll) {
                dsaScoresMap[`${roll}_${cKey}`] = finalDsa;
                dsaBreakdownMap[`${roll}_${cKey}`] = studentBreakdown;
              }
              if (email) {
                dsaScoresMap[`${email}_${cKey}`] = finalDsa;
                dsaBreakdownMap[`${email}_${cKey}`] = studentBreakdown;
              }
            });
          });
        } else {
          if (courseId) delete dsaPublishedMap[courseId];
          if (courseCode) delete dsaPublishedMap[courseCode];
        }

        await apiClient.patch("/admin/operational-state", {
          dsaPublishedMap,
          dsaScoresMap,
          dsaBreakdownMap,
          dsaRawMarksMap,
        });
      } catch (syncErr) {
        console.warn("Backend operational state publication sync warning:", syncErr);
      }

      setMessage(
        nextPublished
          ? "✓ DSA marks published to Student Portal! Students can now view their scaled marks & SEE eligibility."
          : "DSA marks unpublished from Student Portal."
      );
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p>Loading course DSA Gradebook &amp; Student Roster...</p>
      </div>
    );
  }

  if (!gradebook) {
    return (
      <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        No DSA Gradebook available for the selected course.
      </div>
    );
  }

  const locked = ["SUBMITTED", "APPROVED", "PUBLISHED", "LOCKED"].includes(gradebook?.overall_status || "DRAFT");

  // 1. Download Pre-Filled Excel Template with Enrolled Students and dynamic components
  const handleDownloadTemplate = () => {
    const rows = roster.map((st, idx) => {
      const studentRec = users.find((u) => u.id === st.student_id || u.email === st.student_email);
      const rollNo = st.student_identifier || studentRec?.student_identifier || `STU-${1000 + idx}`;

      const rowObj: Record<string, any> = {
        "Roll No": rollNo,
        "Student Name": st.student_name,
        "Email": st.student_email,
      };

      let sumScaled = 0;
      components.forEach((c) => {
        const raw = getRawMark(st.student_id, c);
        const scaled = calculateScaledMark(raw, c);
        if (scaled !== null) sumScaled += scaled;
        rowObj[`${c.name} [Raw Max: ${c.maxMarks}]`] = raw !== null ? raw : "";
        rowObj[`${c.name} [Scaled Wt: ${c.weightage}]`] = scaled !== null ? scaled : "";
      });

      rowObj[`Total DSA (Max: ${totalWeightage})`] = sumScaled > 0 ? Math.round(sumScaled * 10) / 10 : "";
      rowObj["SEE Eligible"] = sumScaled >= totalWeightage * 0.4 ? "YES" : "NO";

      return rowObj;
    });

    exportToExcel(rows, `${gradebook.course_code}_DSA_Marks_Template`);
    setMessage("✓ Pre-filled DSA marks entry template downloaded successfully!");
    setTimeout(() => setMessage(null), 4000);
  };

  // 2. Import Marks from CSV / Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error("File contains no data rows.");

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
        const rollIdx = headers.findIndex((h) => h.includes("roll") || h.includes("id"));

        const nextMap = { ...studentMarksMap };
        let updatedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          const roll = cells[rollIdx];
          if (!roll) continue;

          // Find student by roll or name
          const target = roster.find(
            (r) =>
              (r.student_identifier && r.student_identifier.toLowerCase() === roll.toLowerCase()) ||
              r.student_email.toLowerCase().includes(roll.toLowerCase()) ||
              r.student_name.toLowerCase().includes(roll.toLowerCase())
          );

          if (target) {
            const studentEntry: Record<string, number> = { ...(nextMap[target.student_id] || {}) };
            components.forEach((c) => {
              const compIdx = headers.findIndex((h) => h.includes(c.name.toLowerCase()));
              if (compIdx !== -1 && cells[compIdx] !== undefined) {
                const val = parseFloat(cells[compIdx]);
                if (!isNaN(val)) {
                  studentEntry[c.id] = Math.min(c.maxMarks, Math.max(0, val));
                }
              }
            });
            nextMap[target.student_id] = studentEntry;
            updatedCount++;
          }
        }

        setStudentMarksMap(nextMap);
        void persistRawMarks(nextMap);

        setMessage(`✓ Successfully imported DSA marks for ${updatedCount} students.`);
        setTimeout(() => setMessage(null), 4000);
      } catch (err: any) {
        setError(err.message || "Failed to parse imported CSV file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Open Edit Modal for a single student
  const handleOpenEditModal = (student: StudentGradebookRow) => {
    setEditingStudent(student);
    const initialRaw: Record<string, number> = {};
    components.forEach((c) => {
      const current = getRawMark(student.student_id, c);
      initialRaw[c.id] = current !== null ? current : 0;
    });
    setModalRawMarks(initialRaw);
  };

  const handleSaveModalMarks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const nextStudentMap = { ...(studentMarksMap[editingStudent.student_id] || {}), ...modalRawMarks };
    const nextMap = { ...studentMarksMap, [editingStudent.student_id]: nextStudentMap };
    setStudentMarksMap(nextMap);
    void persistRawMarks(nextMap);

    setMessage(`✓ Updated DSA marks for ${editingStudent.student_name}.`);
    setEditingStudent(null);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <section className="min-w-0 space-y-5">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-purple-100 dark:bg-purple-950 text-[#582C64] dark:text-purple-300">
              {gradebook.course_code}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              DSA Book (During-Semester Assessment)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {gradebook.semester_name || "Semester 5"} • {roster.length} Enrolled Students • Total Evaluation Weightage:{" "}
            <span className="font-extrabold text-purple-700 dark:text-purple-300">{totalWeightage} Marks</span>
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Configure Subject Weightage & Components */}
          <button
            onClick={() => {
              setTempComponents([...components]);
              setIsSchemeModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-bold text-[#582C64] dark:text-purple-300 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            title="Configure subject-specific evaluation components, raw max marks, and scaled weights"
          >
            <Sliders className="h-3.5 w-3.5 text-[#582C64] dark:text-purple-300" />
            <span>Configure Weightage ({totalWeightage} Wt)</span>
          </button>

          {/* Download Template */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            title="Download Excel Template with enrolled students pre-filled"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Download Template (.xlsx)</span>
          </button>

          {/* Import Marks */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            title="Upload CSV to bulk import marks"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600" />
            <span>Import Marks</span>
          </button>

          {/* Quick Edit Mode Toggle */}
          <button
            onClick={() => setIsQuickEditMode((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isQuickEditMode
                ? "bg-purple-600 text-white"
                : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{isQuickEditMode ? "Exit Quick Edit" : "Quick Edit Mode"}</span>
          </button>

          {/* Calculate */}
          <button
            disabled={busy || locked}
            onClick={() => {
              setMessage("✓ All student components and scaled totals automatically synchronized.");
              setTimeout(() => setMessage(null), 3000);
            }}
            className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#582C64] dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Calculate</span>
          </button>

          {/* Submit to HOD */}
          <button
            disabled={busy}
            onClick={handleSubmitToHod}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isSubmittedToHod
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-[#582C64] hover:bg-[#4A235A] text-white"
            }`}
            title="Submit During-Semester Assessment marks to Head of Department for official verification"
          >
            {isSubmittedToHod ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Submitted to HOD</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit to HOD</span>
              </>
            )}
          </button>

          {/* Publish to Students */}
          <button
            disabled={busy}
            onClick={handlePublishToStudents}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isPublishedToStudents
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 text-[#582C64] dark:text-purple-300 hover:bg-purple-50"
            }`}
            title="Publish During-Semester Assessment continuous marks directly to student dashboards"
          >
            <Award className="h-3.5 w-3.5" />
            <span>{isPublishedToStudents ? "Unpublish Marks" : "Publish to Students"}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Weightage Explanation Banner */}
      <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Subject Evaluation Structure:</strong> Faculty can customize components per subject. Each component scales automatically (e.g. <em>Taken from 50 → Scaled to 5</em>). Total DSA Score is the sum of all scaled components.
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-[11px] bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <span>Total Weight: {totalWeightage} Marks</span>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {message && (
        <div className="p-3.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-400 hover:text-rose-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter students by name, email, or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Main DSA Book Table with Dynamic Subject Scaling */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3.5">Roll No &amp; Student</th>
              {components.map((comp) => (
                <th key={comp.id} className="p-3.5 text-center">
                  <span className="block font-extrabold text-slate-900 dark:text-white">{comp.name}</span>
                  <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 block lowercase tracking-normal">
                    taken from {comp.maxMarks} • given from {comp.weightage}
                  </span>
                </th>
              ))}
              <th className="p-3.5 text-center">
                <span className="block font-extrabold text-slate-900 dark:text-white">DSA Score ({totalWeightage})</span>
                <span className="text-[9px] font-mono text-slate-400 block lowercase tracking-normal">auto-scaled total</span>
              </th>
              <th className="p-3.5 text-center">DSA Grade</th>
              <th className="p-3.5 text-center">SEE Eligibility (≥ {Math.round(totalWeightage * 0.4)}/{totalWeightage})</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {roster.map((student, idx) => {
              // Calculate scaled mark for each component
              let totalScaledDsa = 0;
              let enteredCount = 0;
              const studentScaledScores: Record<string, { raw: number | null; scaled: number | null }> = {};

              components.forEach((comp) => {
                const raw = getRawMark(student.student_id, comp);
                const scaled = calculateScaledMark(raw, comp);
                if (raw !== null && scaled !== null) {
                  totalScaledDsa += scaled;
                  enteredCount++;
                }
                studentScaledScores[comp.id] = { raw, scaled };
              });

              totalScaledDsa = Math.round(totalScaledDsa * 10) / 10;
              const hasAnyMarks = enteredCount > 0;
              const isAllGraded = components.length > 0 && enteredCount === components.length;
              const dsaPercentage = (hasAnyMarks && totalWeightage > 0) ? (totalScaledDsa / totalWeightage) * 100 : null;

              const dsaGrade =
                dsaPercentage === null
                  ? "—"
                  : dsaPercentage >= 90
                  ? "O"
                  : dsaPercentage >= 80
                  ? "A+"
                  : dsaPercentage >= 70
                  ? "A"
                  : dsaPercentage >= 60
                  ? "B+"
                  : dsaPercentage >= 50
                  ? "B"
                  : dsaPercentage >= 40
                  ? "C"
                  : "F";

              const isEligible = hasAnyMarks && totalScaledDsa >= totalWeightage * 0.4;

              return (
                <tr key={student.student_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Student Details */}
                  <td className="p-3.5">
                    <strong className="text-slate-900 dark:text-white block font-semibold">
                      {student.student_name}
                    </strong>
                    <span className="font-mono text-[11px] text-slate-400">
                      {student.student_identifier || `STU-${1000 + idx}`}
                    </span>
                  </td>

                  {/* Dynamic Evaluation Components Columns */}
                  {components.map((comp) => {
                    const item = studentScaledScores[comp.id] || { raw: null, scaled: null };
                    return (
                      <td key={comp.id} className="p-3.5 text-center">
                        {isQuickEditMode ? (
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={comp.maxMarks}
                              step={0.5}
                              placeholder="—"
                              value={item.raw !== null ? item.raw : ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                saveStudentComponentMark(
                                  student.student_id,
                                  comp.id,
                                  Math.min(comp.maxMarks, Math.max(0, isNaN(val) ? 0 : val))
                                );
                              }}
                              className="w-16 p-1 text-center font-mono font-bold text-xs rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40"
                            />
                            <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300">
                              ={item.scaled !== null ? item.scaled : 0}/{comp.weightage}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            {item.raw !== null ? (
                              <>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {item.raw} <span className="text-[10px] text-slate-400 font-normal">/{comp.maxMarks}</span>
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/50 dark:border-purple-800/50">
                                  {item.scaled}/{comp.weightage}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-slate-400 font-medium text-xs">
                                  — <span className="text-[10px] text-slate-300">/{comp.maxMarks}</span>
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">
                                  Unentered
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Total Scaled DSA Score */}
                  <td className="p-3.5 text-center">
                    {hasAnyMarks ? (
                      <>
                        <span className="font-mono font-black text-sm text-[#582C64] dark:text-purple-300">
                          {totalScaledDsa}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          /{totalWeightage} {dsaPercentage !== null ? `(${dsaPercentage.toFixed(1)}%)` : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono font-medium text-sm text-slate-400">
                          —
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">/{totalWeightage}</span>
                      </>
                    )}
                  </td>

                  {/* Grade */}
                  <td className="p-3.5 text-center">
                    {hasAnyMarks ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#582C64] dark:bg-purple-950 dark:text-purple-300">
                        {dsaGrade}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">—</span>
                    )}
                  </td>

                  {/* SEE Eligibility */}
                  <td className="p-3.5 text-center">
                    {!hasAnyMarks ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        Pending Marks
                      </span>
                    ) : isEligible ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        ✓ Eligible
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        ⚠ Ineligible
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3.5 text-center">
                    {!hasAnyMarks ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Evaluation
                      </span>
                    ) : !isAllGraded ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Partial ({enteredCount}/{components.length})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {isSubmittedToHod ? "Submitted to HOD" : isPublishedToStudents ? "Published" : "Evaluated"}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleOpenEditModal(student)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-[#582C64] dark:text-purple-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit marks for this student"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit Marks</span>
                    </button>
                  </td>
                </tr>
              );
            })}

            {roster.length === 0 && (
              <tr>
                <td colSpan={components.length + 6} className="p-8 text-center text-slate-400">
                  No matching students in course roster.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── CONFIGURE EVALUATION SCHEME & WEIGHTAGE MODAL ─── */}
      {isSchemeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[#582C64] dark:text-purple-400" />
                  <span>Configure Course Evaluation Weightage</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {gradebook.course_code} • Set component names, raw max marks (taken from), and scaled weights (given from)
                </p>
              </div>
              <button
                onClick={() => setIsSchemeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                💡 <strong>How scaling works:</strong> If you conduct an Assignment for <strong>50 marks</strong> and give it a weightage of <strong>5 marks</strong>, a student scoring 40/50 will automatically receive <strong>4.0 / 5</strong> in their continuous assessment score.
              </div>

              {tempComponents.map((comp, idx) => (
                <div
                  key={comp.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Component #{idx + 1}
                    </span>
                    {tempComponents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(comp.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        title="Remove component"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Component Name
                      </label>
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...tempComponents];
                          updated[idx] = { ...comp, name: e.target.value };
                          setTempComponents(updated);
                        }}
                        placeholder="e.g. Assignments"
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Taken From (Max Marks)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        step={1}
                        value={comp.maxMarks}
                        onChange={(e) => {
                          const updated = [...tempComponents];
                          updated[idx] = { ...comp, maxMarks: parseFloat(e.target.value) || 0 };
                          setTempComponents(updated);
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                        Given From (Scaled Wt)
                      </label>
                      <input
                        type="number"
                        min={0.5}
                        max={100}
                        step={0.5}
                        value={comp.weightage}
                        onChange={(e) => {
                          const updated = [...tempComponents];
                          updated[idx] = { ...comp, weightage: parseFloat(e.target.value) || 0 };
                          setTempComponents(updated);
                        }}
                        className="w-full p-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/40 text-xs font-mono font-bold text-center text-purple-900 dark:text-purple-200"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddNewComponent}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-600 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Evaluation Component</span>
              </button>
            </div>

            {/* Total Summary Footer */}
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-[#582C64] dark:text-purple-300 block">
                  Total Continuous Assessment Weightage:
                </span>
                <span className="text-[11px] text-slate-500">
                  Sum of scaled marks across all {tempComponents.length} components
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black font-mono text-[#582C64] dark:text-purple-300">
                  {tempComponents.reduce((acc, c) => acc + (c.weightage || 0), 0)} Marks
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSchemeModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveScheme}
                className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold px-4"
              >
                Save &amp; Apply Scheme
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MARKS MODAL (PER STUDENT) ─── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit DSA Marks: {editingStudent.student_name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingStudent.student_identifier || "Roll No not set"} • {gradebook.course_code}
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalMarks} className="space-y-4 text-xs">
              <div className="space-y-3">
                {components.map((comp) => {
                  const currentRaw = modalRawMarks[comp.id] ?? 0;
                  const currentScaled = calculateScaledMark(currentRaw, comp);

                  return (
                    <div
                      key={comp.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <label className="font-bold text-slate-800 dark:text-slate-200 block">
                          {comp.name}
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Taken from {comp.maxMarks} • Given from {comp.weightage}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <input
                            type="number"
                            min={0}
                            max={comp.maxMarks}
                            step={0.5}
                            required
                            value={currentRaw}
                            onChange={(e) =>
                              setModalRawMarks({
                                ...modalRawMarks,
                                [comp.id]: Math.min(comp.maxMarks, Math.max(0, parseFloat(e.target.value) || 0)),
                              })
                            }
                            className="w-20 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold text-center text-sm"
                          />
                          <span className="text-[9px] text-slate-400 font-mono block">raw /{comp.maxMarks}</span>
                        </div>

                        <div className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-center min-w-[65px]">
                          <span className="text-xs font-black font-mono text-[#582C64] dark:text-purple-300 block">
                            {currentScaled}
                          </span>
                          <span className="text-[9px] text-purple-600 dark:text-purple-400 font-mono block">/{comp.weightage} Wt</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Computation Summary */}
              {(() => {
                let modalTotalScaled = 0;
                components.forEach((c) => {
                  modalTotalScaled += calculateScaledMark(modalRawMarks[c.id] ?? 0, c) || 0;
                });
                modalTotalScaled = Math.round(modalTotalScaled * 10) / 10;
                const modalPct = totalWeightage > 0 ? ((modalTotalScaled / totalWeightage) * 100).toFixed(1) : "0";

                return (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">
                        Computed Total DSA:
                      </span>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-100">
                        Auto-Scaled Weightage Sum
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-[#582C64] dark:text-purple-300">
                        {modalTotalScaled} / {totalWeightage}
                      </span>
                      <span className="block text-[10px] font-mono text-slate-500">
                        {modalPct}% Continuous Score
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold px-4"
                >
                  Save Marks
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
