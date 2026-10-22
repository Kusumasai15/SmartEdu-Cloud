"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Code,
  FileText,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Trash2,
  Eye,
  EyeOff,
  Cpu,
  Clock,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCourse } from "@/types";
import { useAcademicData, CodingTestCase } from "@/context/AcademicDataContext";

export interface CreatedAssignmentData {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  type: "CODING" | "QUIZ" | "WRITTEN" | "LAB_PROJECT" | "TERM_PAPER";
  dueDate: string;
  totalPoints: number;
  weightPercentage: number;
  starterCode?: string;
  allowedLanguages?: string[];
  testCases?: CodingTestCase[];
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
}

interface FacultyCreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: FacultyCourse[];
  initialCourseId?: string;
  onCreateAssignment: (assignment: CreatedAssignmentData) => void;
}

const AVAILABLE_LANGUAGES = [
  { id: "python", name: "Python 3" },
  { id: "javascript", name: "JavaScript (Node.js)" },
  { id: "typescript", name: "TypeScript" },
  { id: "java", name: "Java (OpenJDK)" },
  { id: "cpp", name: "C++ (G++ 13)" },
  { id: "c", name: "C (GCC 13)" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
  { id: "sql", name: "SQL (PostgreSQL)" },
  { id: "csharp", name: "C# (.NET)" },
  { id: "php", name: "PHP" },
];

export function FacultyCreateAssignmentModal({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  onCreateAssignment,
}: FacultyCreateAssignmentModalProps) {
  const { departments } = useAcademicData();

  const availableClasses = React.useMemo(() => {
    const list: string[] = [];
    departments.forEach((d) => {
      if (d.cohorts && d.cohorts.length > 0) {
        d.cohorts.forEach((c) => {
          if (!list.includes(c.name)) list.push(c.name);
        });
      } else if (d.classes && d.classes.length > 0) {
        d.classes.forEach((c) => {
          if (!list.includes(c)) list.push(c);
        });
      }
    });
    if (list.length === 0) {
      list.push("B.Tech CSE - Sem 5 (Sec A)", "B.Tech CSE - Sem 5 (Sec B)", "B.Tech AI&DS - Sem 3 (Sec A)");
    }
    return list;
  }, [departments]);

  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number>(0);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [assignmentType, setAssignmentType] = useState<"CODING" | "QUIZ" | "WRITTEN" | "LAB_PROJECT" | "TERM_PAPER">("CODING");
  const [dueDate, setDueDate] = useState<string>("Oct 25, 2026 • 11:59 PM");
  const [totalPoints, setTotalPoints] = useState<number>(50);
  const [weightPercentage, setWeightPercentage] = useState<number>(15);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState<number>(2);
  const [memoryLimit, setMemoryLimit] = useState<number>(256);

  // Languages enabled for this coding task
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    "python",
    "javascript",
    "cpp",
    "java",
  ]);

  // Coding Test Cases
  const [testCases, setTestCases] = useState<CodingTestCase[]>([
    {
      id: "tc-1",
      input: "[10, 5, 15, 2, 7]\nTarget: 7",
      expectedOutput: "Index: 4, Node Level: 2",
      isHidden: false,
      points: 10,
      explanation: "Standard balanced search query",
    },
    {
      id: "tc-2",
      input: "[-5, 0, 100, -20]\nTarget: -20",
      expectedOutput: "Index: 3, Node Level: 2",
      isHidden: false,
      points: 10,
      explanation: "Negative values and zero handling",
    },
    {
      id: "tc-3",
      input: "[]\nTarget: 99",
      expectedOutput: "Index: -1, Status: NOT_FOUND",
      isHidden: true,
      points: 15,
      explanation: "Empty tree edge case boundary check",
    },
    {
      id: "tc-4",
      input: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nTarget: 10",
      expectedOutput: "Index: 9, Node Level: 4",
      isHidden: true,
      points: 15,
      explanation: "Worst-case height balance verification",
    },
  ]);

  React.useEffect(() => {
    if (availableClasses.length > 0 && selectedSections.length === 0) {
      setSelectedSections([availableClasses[0]]);
    }
  }, [availableClasses, selectedSections.length]);

  const [starterCode, setStarterCode] = useState<string>(
`# Python 3 Template
def solution(data_input, target):
    # Implement your algorithm here
    pass

if __name__ == "__main__":
    # Test your implementation
    pass`
  );

  if (!isOpen) return null;

  const handleAddTestCase = () => {
    const newId = `tc-${Date.now()}`;
    setTestCases([
      ...testCases,
      {
        id: newId,
        input: "Input parameter string or array",
        expectedOutput: "Expected output result",
        isHidden: false,
        points: 10,
        explanation: "Custom evaluation criteria",
      },
    ]);
  };

  const handleRemoveTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id));
  };

  const handleUpdateTestCase = (id: string, field: keyof CodingTestCase, value: any) => {
    setTestCases(
      testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const toggleLanguage = (langId: string) => {
    if (selectedLanguages.includes(langId)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== langId));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, langId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please provide an assignment title.");
      return;
    }

    const course = courses[selectedCourseIndex] || courses[0];
    if (!course) {
      alert("Select a course before creating an assignment.");
      return;
    }
    const sectionTags = selectedSections.length > 0 ? selectedSections.join(", ") : "All Enrolled Sections";

    onCreateAssignment({
      id: `asg-${Date.now()}`,
      courseCode: course.course_code,
      title: `${title} [${sectionTags}]`,
      description: `${description || "Complete the problem statement according to specifications."} (Assigned to: ${sectionTags})`,
      type: assignmentType,
      dueDate,
      totalPoints,
      weightPercentage,
      starterCode: assignmentType === "CODING" ? starterCode : undefined,
      allowedLanguages: assignmentType === "CODING" ? selectedLanguages : undefined,
      testCases: assignmentType === "CODING" ? testCases : undefined,
      timeLimitSeconds: assignmentType === "CODING" ? timeLimit : undefined,
      memoryLimitMb: assignmentType === "CODING" ? memoryLimit : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 border border-slate-100 dark:border-slate-800 shadow-2xl animate-fade-in my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Create Coding Assessment &amp; Course Task
              </h3>
              <p className="text-xs text-slate-400">
                Configure languages, test cases, and execution parameters for students
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
          {/* Target Course & Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Course</label>
              <select
                value={selectedCourseIndex}
                onChange={(e) => setSelectedCourseIndex(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
              >
                {courses.map((c, i) => (
                  <option key={c.id} value={i}>{c.course_code}: {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assessment Format</label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
              >
                <option value="CODING">💻 Coding Assessment (Auto-Graded Test Cases)</option>
                <option value="QUIZ">🎯 Online Timed Quiz</option>
                <option value="WRITTEN">📝 Written Problem Set (Theory/Proofs)</option>
                <option value="LAB_PROJECT">🧪 Laboratory Practical Project</option>
                <option value="TERM_PAPER">📑 Term Research Paper</option>
              </select>
            </div>
          </div>

          {/* Section / Class Selector */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Assign to Academic Classes / Sections:
              </label>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedSections([...availableClasses])}
                  className="font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedSections([])}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableClasses.map((clsName) => {
                const isChecked = selectedSections.includes(clsName);
                return (
                  <button
                    key={clsName}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setSelectedSections(selectedSections.filter((s) => s !== clsName));
                      } else {
                        setSelectedSections([...selectedSections, clsName]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isChecked
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span>{clsName}</span>
                    {isChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assessment Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lab Assessment 4: AVL Self-Balancing Trees & Graph Shortest Path"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Points, Weight, Due Date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Points</label>
              <input
                type="number"
                min={10}
                max={100}
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Course Weight (%)</label>
              <input
                type="number"
                min={1}
                max={40}
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Due Date &amp; Time</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Problem Specifications */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Problem Specifications &amp; Instructions</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide problem specifications, time complexity constraints, memory limits, and sample input/output examples..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* ─── CODING ASSESSMENT SPECIFIC SETTINGS ─── */}
          {assignmentType === "CODING" && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Allowed Languages */}
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-blue-500" />
                  <span>Allowed Programming Languages (Select all applicable)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {AVAILABLE_LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang.id);
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => toggleLanguage(lang.id)}
                        className={`p-2 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-700 dark:text-blue-300 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60"
                        }`}
                      >
                        <span className="text-[11px] truncate">{lang.name}</span>
                        {isSelected ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Execution Limits */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Time Limit (Seconds)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-purple-500" />
                    <span>Memory Limit (MB)</span>
                  </label>
                  <input
                    type="number"
                    min={64}
                    max={1024}
                    step={64}
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Starter Code */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Starter Code Template</label>
                <textarea
                  rows={4}
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 font-mono text-xs text-emerald-400"
                />
              </div>

              {/* Test Cases Builder */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Evaluation Test Cases ({testCases.length})
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Visible cases are shown to students; hidden cases evaluate code integrity during final submission.
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddTestCase}
                    variant="outline"
                    className="h-7 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Test Case</span>
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-mono font-bold text-[10px]">
                            Case #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateTestCase(tc.id, "isHidden", !tc.isHidden)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                              tc.isHidden
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {tc.isHidden ? (
                              <>
                                <EyeOff className="h-3 w-3" />
                                <span>Hidden Evaluation</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                <span>Visible Sample</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-400 font-bold">Marks:</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={tc.points || 10}
                              onChange={(e) => handleUpdateTestCase(tc.id, "points", Number(e.target.value))}
                              className="w-12 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono font-bold text-xs"
                            />
                          </div>
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(tc.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Input Parameters</label>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={(e) => handleUpdateTestCase(tc.id, "input", e.target.value)}
                            placeholder="Input arguments or data stream..."
                            className="w-full p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Expected Output</label>
                          <textarea
                            rows={2}
                            value={tc.expectedOutput}
                            onChange={(e) => handleUpdateTestCase(tc.id, "expectedOutput", e.target.value)}
                            placeholder="Exact expected return value or console output..."
                            className="w-full p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 font-bold cursor-pointer shadow-md">
              Publish Coding Assessment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
