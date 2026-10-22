"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useAcademicData, CaseStudyAssessment, CaseStudyRole, CaseStudyTeam } from "@/context/AcademicDataContext";
import { FacultyCourse } from "@/types";

interface FacultyCreateCaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: FacultyCourse[];
  defaultCourseCode?: string;
  facultyName?: string;
}

export function FacultyCreateCaseStudyModal({
  isOpen,
  onClose,
  courses,
  defaultCourseCode,
  facultyName = "Course Faculty",
}: FacultyCreateCaseStudyModalProps) {
  const { users, departments, createCaseStudy } = useAcademicData();

  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(() => {
    return defaultCourseCode || courses[0]?.course_code || "";
  });

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.course_code === selectedCourseCode) || courses[0];
  }, [courses, selectedCourseCode]);

  // Available classes for target selection: gather ALL real active student classes
  const availableClasses = useMemo(() => {
    const list: string[] = [];

    // 1. Gather all actual active student cohorts from users
    (users || []).forEach((u) => {
      if (u.role === "STUDENT" && u.className && !list.includes(u.className)) {
        list.push(u.className);
      }
    });

    // 2. Add course assigned classes if any
    const directAssigned = (selectedCourse as any)?.assigned_classes || (selectedCourse as any)?.assignedClasses || [];
    directAssigned.forEach((c: string) => {
      if (!list.includes(c)) list.push(c);
    });

    return list;
  }, [selectedCourse, users]);

  const [targetClass, setTargetClass] = useState<string>(() => availableClasses[0] || "");
  const [topic, setTopic] = useState<string>("");
  const [totalPoints, setTotalPoints] = useState<number>(50);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedBrief, setGeneratedBrief] = useState<string>("");
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [generatedObjectives, setGeneratedObjectives] = useState<string[]>([]);
  const [generatedRoles, setGeneratedRoles] = useState<CaseStudyRole[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false);

  // Quick Topic Suggestions
  const quickTopics = useMemo(() => {
    const code = selectedCourse?.course_code || "CS";
    if (code.includes("303") || code.toLowerCase().includes("cyber")) {
      return [
        "Critical Infrastructure Zero-Day Ransomware Attack",
        "Healthcare Cloud Database Breach & HIPAA Liability",
        "Supply Chain Compromise in Continuous Deployment Pipeline",
      ];
    }
    if (code.includes("001") || code.toLowerCase().includes("python") || code.includes("306")) {
      return [
        "High-Frequency Algorithmic Trading Microservice Deadlock",
        "E-Commerce Payment Gateway Scalability Failure under Black Friday Surge",
        "AI Diagnostic System Bias & False Negative Clinical Audit",
      ];
    }
    return [
      "Distributed Consensus Partition during Autonomous Fleet Update",
      "Statutory Data Privacy & Cross-Border AI Model Governance",
      "Enterprise Cloud Migration Architectural Outage & Rollback Strategy",
    ];
  }, [selectedCourse]);

  // Target class students for automatic team generation
  const targetStudents = useMemo(() => {
    const realStudents = (users || []).filter((u) => u.role === "STUDENT");
    if (realStudents.length === 0) return [];

    const norm = (str: string) => str.toLowerCase().replace(/section/g, "sec").replace(/[^a-z0-9]/g, "");
    const targetNorm = norm(targetClass);

    let matched = realStudents.filter((s) => {
      if (!s.className) return false;
      const sNorm = norm(s.className);
      return sNorm.includes(targetNorm) || targetNorm.includes(sNorm);
    });

    // If still no students matched by exact string, match by semester number
    if (matched.length === 0) {
      const semMatch = targetClass.match(/(?:sem|semester)\s*([0-9]+)/i);
      if (semMatch) {
        const semNum = semMatch[1];
        matched = realStudents.filter((s) => {
          if (!s.className) return false;
          return norm(s.className).includes(`sem${semNum}`);
        });
      }
    }

    // Partition ALL students in the class
    return matched.length > 0 ? matched : realStudents;
  }, [users, targetClass]);

  // Automatically form 4-member teams with assigned roles
  const generatedTeams: CaseStudyTeam[] = useMemo(() => {
    if (targetStudents.length === 0) return [];
    const rolesToUse = generatedRoles.length === 4 ? generatedRoles : [
      { title: "Lead Technical Architect", description: "System design & recovery", responsibilities: ["Technical mitigation", "Architecture defense"], priorityGoal: "System reliability" },
      { title: "Chief Operating Officer", description: "Operational continuity & incident response", responsibilities: ["Stakeholder coordination", "Risk response"], priorityGoal: "Business continuity" },
      { title: "Legal & Ethics Counsel", description: "Compliance and regulatory adherence", responsibilities: ["Statutory liability assessment", "Audit trail verification"], priorityGoal: "Zero regulatory breach" },
      { title: "Quality Assurance & Risk Lead", description: "Empirical validation & testing", responsibilities: ["Benchmark verification", "Post-mortem validation"], priorityGoal: "Reproducible reliability" },
    ];

    const teamSize = 4;
    const teams: CaseStudyTeam[] = [];
    const teamNames = ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Zeta", "Theta"];

    for (let i = 0; i < targetStudents.length; i += teamSize) {
      const slice = targetStudents.slice(i, i + teamSize);
      const teamIdx = Math.floor(i / teamSize);
      const teamName = `Team ${teamNames[teamIdx] || `Squad ${teamIdx + 1}`}`;

      teams.push({
        id: `team-${teamIdx + 1}-${Date.now().toString(36)}`,
        teamName,
        members: slice.map((st, sIdx) => {
          const roleObj = rolesToUse[sIdx % rolesToUse.length];
          const roll = st.student_identifier || "Not assigned";
          return {
            studentId: st.id,
            studentName: `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.email,
            studentEmail: st.email || "",
            rollNo: roll,
            studentRollNo: roll,
            assignedRole: roleObj.title,
            roleTitle: roleObj.title,
            responsibilities: Array.isArray(roleObj.responsibilities) ? roleObj.responsibilities.join("; ") : roleObj.description,
          };
        }),
      });
    }

    return teams;
  }, [targetStudents, generatedRoles]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMsg("Please enter a case study topic or click a suggestion below.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "CASE_STUDY",
          courseCode: selectedCourse?.course_code || selectedCourseCode,
          topic: topic.trim(),
          difficulty: "MEDIUM",
        }),
      });

      if (!res.ok) {
        throw new Error(`AI generation failed with HTTP ${res.status}`);
      }

      const resJson = await res.json();
      const data = resJson.data || resJson;
      if (data.title) setGeneratedTitle(data.title);
      if (data.scenarioBrief) setGeneratedBrief(data.scenarioBrief);
      if (Array.isArray(data.learningObjectives)) setGeneratedObjectives(data.learningObjectives);
      if (Array.isArray(data.roles) && data.roles.length > 0) {
        const normalized = data.roles
          .filter((r: any) => r?.title && r?.description && r?.priorityGoal && Array.isArray(r?.responsibilities) && r.responsibilities.length > 0)
          .map((r: any) => ({
            title: String(r.title),
            description: String(r.description),
            responsibilities: r.responsibilities.map(String),
            priorityGoal: String(r.priorityGoal),
          }));
        if (normalized.length === 0) {
          throw new Error("The generation service returned incomplete role information.");
        }
        setGeneratedRoles(normalized);
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "The generation service is unavailable.";
      setErrorMsg(`Case study generation failed: ${detail}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedBrief || generatedRoles.length === 0) {
      setErrorMsg("Please generate or enter the case study scenario before publishing.");
      return;
    }

    setIsPublishing(true);
    try {
      const newCaseStudy: CaseStudyAssessment = {
        id: `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        courseCode: selectedCourse?.course_code || selectedCourseCode,
        courseName: selectedCourse?.name || "Academic Course",
        targetClass,
        facultyName,
        title: generatedTitle || `${topic}: Multi-Role Case Assessment`,
        topic: topic.trim(),
        scenarioBrief: generatedBrief,
        learningObjectives: generatedObjectives,
        roles: generatedRoles,
        teams: generatedTeams,
        totalPoints,
        dueDate,
        createdAt: new Date().toISOString(),
        status: "ACTIVE",
      };

      await createCaseStudy(newCaseStudy);
      setPublishSuccess(true);
      setTimeout(() => {
        setPublishSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to publish case study assessment.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Create AI Case Study Assessment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prepare multi-role case studies and assign student teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {publishSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Case Study published successfully! Teams and roles assigned to {targetStudents.length} students.</span>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Target Course
              </label>
              <select
                value={selectedCourseCode}
                onChange={(e) => setSelectedCourseCode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.course_code}>
                    {c.course_code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Target Cohort / Section
              </label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableClasses.map((cls, idx) => (
                  <option key={idx} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Points
                </label>
                <input
                  type="number"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(parseInt(e.target.value, 10) || 50)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Topic Input with AI Generator Trigger */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center justify-between">
              <span>Case Study Scenario Topic</span>
              <span className="text-slate-400 font-normal">Enter core topic or pick a prompt below</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Critical Infrastructure Microservices Failure & Data Leak"
                className="flex-1 h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Topic Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Suggestions:</span>
              {quickTopics.map((qt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTopic(qt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-[11px] transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Scenario & Objectives Review */}
          {generatedBrief && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {generatedTitle}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-bold text-[10px]">
                    Content generation service
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {generatedBrief}
                </p>

                {generatedObjectives.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Learning Objectives:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                      {generatedObjectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 4 Distinct Stakeholder Roles */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Assigned Team Roles (4 Distinct Perspectives):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {generatedRoles.map((role, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <Award className="h-3.5 w-3.5 text-blue-600" />
                        <span>{role.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {role.description}
                      </p>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold pt-0.5">
                        Priority: {role.priorityGoal}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Formed Teams Preview */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Auto-Balanced Student Teams ({targetStudents.length} Students in {generatedTeams.length} Squads):
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Target Class: {targetClass}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto">
                  {generatedTeams.map((team, tIdx) => (
                    <div
                      key={team.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {team.teamName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {team.members.length} Members
                        </span>
                      </div>
                      <div className="space-y-1">
                        {team.members.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {m.studentName} ({m.rollNo})
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-1">
                              {m.assignedRole}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!generatedBrief || isPublishing || publishSuccess}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing & Notifying Students...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Publish Case Study Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
