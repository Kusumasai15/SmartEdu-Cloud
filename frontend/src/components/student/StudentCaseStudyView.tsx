"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  Award,
  Bot,
  User,
  AlertTriangle,
  ArrowLeft,
  Target,
  Check,
  BookOpen,
  Shield,
  Maximize2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  useAcademicData,
  CaseStudyAssessment,
  CaseStudyTeamMember,
} from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { DeadlineCountdownBadge } from "@/components/common/DeadlineCountdownBadge";
import {
  AssessmentFilterBar,
  AssessmentFilterStatus,
  AssessmentSortOption,
  AssessmentViewMode,
} from "@/components/common/AssessmentFilterBar";

interface StudentCaseStudyViewProps {
  studentName?: string;
  studentRollNo?: string;
  studentId?: string;
  studentClassName?: string;
  enrolledCourseCodes?: string[];
}

interface ChatTurn {
  id: string;
  sender: "BOT" | "STUDENT";
  questionIndex?: number; // 1..5
  text: string;
  timestamp: string;
}

function FormattedAssessmentText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 font-sans">
      {text.split("\n").map((line, lineIndex) => {
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
        return (
          <p key={lineIndex} className={line ? "min-h-[1em]" : "h-1"}>
            {parts.map((part, partIndex) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("*") && part.endsWith("*")) {
                return <em key={partIndex}>{part.slice(1, -1)}</em>;
              }
              return <React.Fragment key={partIndex}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Generates 5 sequential, role-specific case study questions for the student.
 * Questions are delivered strictly ONE BY ONE in the interactive chatbot window.
 */
function buildFiveRoleQuestions(
  cs: CaseStudyAssessment,
  roleTitle: string,
  roleResponsibilities: string,
  priorityGoal?: string
): string[] {
  const topic = cs.topic || cs.title || "the engineering system";
  const course = cs.courseCode
    ? `${cs.courseCode} (${cs.courseName || "Course"})`
    : "this subject";
  const obj1 =
    cs.learningObjectives?.[0] ||
    `core architectural principles of ${topic}`;
  const obj2 =
    cs.learningObjectives?.[1] ||
    `scalability, reliability, and edge-case mitigation`;

  return [
    `Question 1 of 5 [Role Alignment & Problem Scoping — ${roleTitle}]:\nBased on the full case study problem statement on the right for "${cs.title}", what are the primary technical bottlenecks or risks that fall directly under your assigned role as "${roleTitle}" (${roleResponsibilities})?`,
    `Question 2 of 5 [Architectural Strategy & Core Design]:\nHow will you design and structure your specific module/component for ${topic} in ${course} to achieve your role's priority goal (${priorityGoal || obj1})? Explain your concrete approach.`,
    `Question 3 of 5 [Implementation & Trade-off Analysis]:\nWhile executing your responsibilities as ${roleTitle}, what key engineering trade-offs (e.g., performance vs. consistency, complexity vs. latency, or resource constraints) arise in this scenario, and why is your chosen approach optimal?`,
    `Question 4 of 5 [Edge Cases, Failure Modes & Validation]:\nFocusing on "${obj2}", describe a critical failure mode or edge case that could impact the team's solution in this case study. How will your role detect, prevent, or recover from it?`,
    `Question 5 of 5 [Cross-Role Integration & Final Deliverable]:\nHow does your deliverable as "${roleTitle}" integrate with the other roles in your team roster to form a complete, production-ready resolution for "${cs.title}"? Summarize your final verifiable outcome.`,
  ];
}

export function StudentCaseStudyView({
  studentName = "",
  studentRollNo = "",
  studentId = "",
  studentClassName = "",
  enrolledCourseCodes = [],
}: StudentCaseStudyViewProps) {
  const { user } = useAuth();
  const { caseStudies, submitCaseStudy } = useAcademicData();

  const effectiveStudentId = studentId || user?.id || "";
  const effectiveStudentEmail = (user?.email || "").toLowerCase().trim();
  const effectiveStudentName = (
    studentName ||
    (user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "")
  )
    .toLowerCase()
    .trim();
  const effectiveRollNo = (
    studentRollNo ||
    (user as any)?.student_identifier ||
    (user as any)?.roll_number ||
    ""
  )
    .toLowerCase()
    .trim();
  const effectiveClassName =
    studentClassName || user?.className || (user as any)?.class_name || "";

  // Helper to check if a team member record matches the logged-in student
  const isMemberMe = (m: CaseStudyTeamMember): boolean => {
    if (!m) return false;
    if (effectiveStudentId && m.studentId && m.studentId === effectiveStudentId) {
      return true;
    }
    const mEmail = (m.studentEmail || "").toLowerCase().trim();
    if (effectiveStudentEmail && mEmail && mEmail === effectiveStudentEmail) {
      return true;
    }
    const mRoll = (m.studentRollNo || m.rollNo || "").toLowerCase().trim();
    if (effectiveRollNo && mRoll && mRoll === effectiveRollNo) {
      return true;
    }
    const mName = (m.studentName || "").toLowerCase().trim();
    if (effectiveStudentName && mName) {
      if (mName === effectiveStudentName) return true;
      const sTokens = effectiveStudentName.split(/\s+/).filter(Boolean);
      const mTokens = mName.split(/\s+/).filter(Boolean);
      if (
        sTokens.length >= 1 &&
        mTokens.length >= 1 &&
        sTokens[0].length >= 4 &&
        sTokens[0] === mTokens[0] &&
        (sTokens.length === 1 || mTokens.length === 1 || sTokens[1] === mTokens[1])
      ) {
        return true;
      }
    }
    return false;
  };

  // STRICT VISIBILITY FILTER:
  // A Case Study is ONLY visible to a student when a faculty member has assigned it to them or their enrolled cohort.
  const relevantCaseStudies = useMemo(() => {
    return (caseStudies || []).filter((cs) => {
      if (!cs || cs.status === "ARCHIVED") return false;

      // 0. If enrolledCourseCodes is provided, the case study MUST match one of the student's enrolled courses
      if (enrolledCourseCodes && enrolledCourseCodes.length > 0 && cs.courseCode) {
        const isEnrolled = enrolledCourseCodes.some(
          (c) => c.toLowerCase().trim() === cs.courseCode.toLowerCase().trim()
        );
        if (!isEnrolled) return false;
      }

      // 1. If the case study has assigned teams, the student MUST be a member of one of those teams
      if (Array.isArray(cs.teams) && cs.teams.length > 0) {
        return cs.teams.some((t) =>
          Array.isArray(t.members) && t.members.some((m) => isMemberMe(m))
        );
      }

      // 2. Match by targetClass
      if (effectiveClassName && cs.targetClass) {
        const extractSec = (s: string) => {
          const match = s.match(/(?:sec(?:tion)?\s*)([a-z0-9]+)/i);
          return match ? match[1].toLowerCase() : "";
        };
        const stuSec = extractSec(effectiveClassName);
        const targetSec = extractSec(cs.targetClass);
        if (stuSec && targetSec && stuSec !== targetSec) {
          return false;
        }
        const norm = (str: string) =>
          (str || "")
            .toLowerCase()
            .replace(/section/g, "sec")
            .replace(/[^a-z0-9]/g, "");
        const sNorm = norm(effectiveClassName);
        const tNorm = norm(cs.targetClass);
        if (sNorm && tNorm && (sNorm.includes(tNorm) || tNorm.includes(sNorm))) {
          return true;
        }
      }

      return false;
    });
  }, [
    caseStudies,
    effectiveStudentId,
    effectiveStudentEmail,
    effectiveStudentName,
    effectiveRollNo,
    effectiveClassName,
    enrolledCourseCodes,
  ]);

  // Active Assessment Session State (Light Theme / Half-Partition)
  const [activeCaseStudyId, setActiveCaseStudyId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(() => new Date());
  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  // 1-by-1 Chatbot Question State
  const [chatHistoryByCs, setChatHistoryByCs] = useState<Record<string, ChatTurn[]>>({});
  const [currentQuestionIdxByCs, setCurrentQuestionIdxByCs] = useState<Record<string, number>>({});
  const [answersByCs, setAnswersByCs] = useState<Record<string, string[]>>({});
  const [scoresByCs, setScoresByCs] = useState<Record<string, number[]>>({});
  const [finalScoreByCs, setFinalScoreByCs] = useState<Record<string, number>>({});
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [currentAnswerInput, setCurrentAnswerInput] = useState<string>("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [integrityStrikes, setIntegrityStrikes] = useState<Record<string, number>>({});
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState<boolean>(false);
  const terminatingRef = useRef(false);
  const [viewingTranscriptData, setViewingTranscriptData] = useState<{
    title: string;
    courseCode: string;
    submittedAt?: string;
    transcript: string;
    score?: number;
    totalPoints?: number;
  } | null>(null);

  // Robust student-side local resilience cache so submitted state never disappears on refresh
  const getLocalSubmission = useCallback(
    (csId: string) => {
      if (typeof window === "undefined") return null;
      try {
        const key = `smartedu_cs_sub_${csId}_${user?.id || user?.email || effectiveStudentEmail || "student"}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    [user?.id, user?.email, effectiveStudentEmail]
  );

  const saveLocalSubmission = useCallback(
    (csId: string, data: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      try {
        const key = `smartedu_cs_sub_${csId}_${user?.id || user?.email || effectiveStudentEmail || "student"}`;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {}
    },
    [user?.id, user?.email, effectiveStudentEmail]
  );

  // ─── DIRECTORY FILTER, SORT & VIEW MODE ───
  const [filterStatus, setFilterStatus] = useState<AssessmentFilterStatus>("ALL");
  const [sortOption, setSortOption] = useState<AssessmentSortOption>("DUE_NEWEST");
  const [viewMode, setViewMode] = useState<AssessmentViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const caseStudyCounts = useMemo(() => {
    let upcoming = 0;
    let inProgress = 0;
    let submitted = 0;
    let locked = 0;
    const now = new Date().getTime();

    relevantCaseStudies.forEach((cs) => {
      const myTeam = cs.teams?.find(
        (t) => Array.isArray(t.members) && t.members.some((m) => isMemberMe(m))
      );
      const localSub = getLocalSubmission(cs.id);
      const isDone = Boolean(myTeam?.isSubmitted) || Boolean(myTeam?.submission?.submittedAt) || Boolean(localSub?.isSubmitted);
      const dueTime = cs.dueDate ? new Date(cs.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;

      if (isDone) {
        submitted++;
      } else if (isPast) {
        locked++;
      } else if (chatHistoryByCs[cs.id]?.length > 0) {
        inProgress++;
      } else {
        upcoming++;
      }
    });

    return {
      all: relevantCaseStudies.length,
      upcoming,
      inProgress,
      submitted,
      locked,
    };
  }, [relevantCaseStudies, chatHistoryByCs, isMemberMe, getLocalSubmission]);

  const filteredAndSortedCaseStudies = useMemo(() => {
    const now = new Date().getTime();
    let list = relevantCaseStudies.filter((cs) => {
      const myTeam = cs.teams?.find(
        (t) => Array.isArray(t.members) && t.members.some((m) => isMemberMe(m))
      );
      const localSub = getLocalSubmission(cs.id);
      const isDone = Boolean(myTeam?.isSubmitted) || Boolean(myTeam?.submission?.submittedAt) || Boolean(localSub?.isSubmitted);
      const dueTime = cs.dueDate ? new Date(cs.dueDate).getTime() : 0;
      const isPast = dueTime > 0 && dueTime < now;

      if (filterStatus === "UPCOMING") return !isDone && !isPast && !(chatHistoryByCs[cs.id]?.length > 0);
      if (filterStatus === "IN_PROGRESS") return !isDone && !isPast && Boolean(chatHistoryByCs[cs.id]?.length > 0);
      if (filterStatus === "SUBMITTED") return isDone;
      if (filterStatus === "LOCKED") return !isDone && isPast;
      return true;
    });

    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase().trim();
      list = list.filter(
        (cs) =>
          cs.title.toLowerCase().includes(sq) ||
          cs.courseCode.toLowerCase().includes(sq) ||
          (cs.scenarioBrief || "").toLowerCase().includes(sq)
      );
    }

    list.sort((a, b) => {
      if (sortOption === "TITLE") return a.title.localeCompare(b.title);
      if (sortOption === "COURSE") return a.courseCode.localeCompare(b.courseCode);
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (sortOption === "DUE_OLDEST") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [relevantCaseStudies, filterStatus, sortOption, searchQuery, chatHistoryByCs, isMemberMe, getLocalSubmission]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeCaseStudy = useMemo(
    () => relevantCaseStudies.find((c) => c.id === activeCaseStudyId) || null,
    [relevantCaseStudies, activeCaseStudyId]
  );

  const formattedStartTime = useMemo(() => {
    return sessionStartTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [sessionStartTime]);

  const formattedEndTime = useMemo(() => {
    const end = new Date(sessionStartTime.getTime() + 60 * 60 * 1000);
    return end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [sessionStartTime]);

  // Scroll chat to bottom whenever new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistoryByCs, activeCaseStudyId]);

  // Active Session Timer
  useEffect(() => {
    if (!activeCaseStudyId) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeCaseStudyId]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Screen Restriction State
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const recordIntegrityViolation = async (reason: string) => {
    const cs = activeCaseStudy;
    if (!cs || terminatingRef.current) return;
    const nextCount = (integrityStrikes[cs.id] || 0) + 1;
    setIntegrityStrikes((prev) => ({ ...prev, [cs.id]: nextCount }));
    if (nextCount < 3) {
      triggerToast(`${reason} Strike ${nextCount} of 3. The assessment remains locked.`);
      return;
    }

    terminatingRef.current = true;
    const team = cs.teams?.find((item) => item.members?.some((member) => isMemberMe(member)));
    const member = team?.members?.find((item) => isMemberMe(item));
    const answers = answersByCs[cs.id] || [];
    const transcript = [
      "=== ASSESSMENT AUTOMATICALLY FINALIZED ===",
      `Reason: Three academic-integrity violations. Last event: ${reason}`,
      `Answered questions: ${answers.length} of 5`,
      ...answers.map((answer, index) => `\n[Answer ${index + 1}]\n${answer}`),
    ].join("\n");
    const displayName = studentName || (user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Student");
    if (team) {
      await submitCaseStudy(cs.id, team.id, transcript, displayName, 0);
    }
    setSuccessBanner(`Assessment automatically submitted after three integrity violations. Score recorded: 0 / ${cs.totalPoints || 50}.`);
    setActiveCaseStudyId(null);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    terminatingRef.current = false;
  };

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && activeCaseStudyId) {
        void recordIntegrityViolation("Full-screen mode was exited.");
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [activeCaseStudyId]);

  useEffect(() => {
    if (!activeCaseStudyId) return;
    const handleVisibility = () => {
      if (document.hidden) void recordIntegrityViolation("The assessment tab lost visibility.");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeCaseStudyId, integrityStrikes]);

  // Start Assessment Session
  const startAssessment = (
    cs: CaseStudyAssessment,
    roleTitle: string,
    roleResponsibilities: string,
    priorityGoal?: string
  ) => {
    if (isMobileScreen) {
      alert("Case study examinations require a split-screen workspace and full keyboard access. They cannot be attempted on mobile devices. Please open from a desktop or laptop computer.");
      return;
    }

    setActiveCaseStudyId(cs.id);
    setElapsedSeconds(0);
    setSessionStartTime(new Date());
    setCurrentAnswerInput("");
    setAlertNotice(null);

    // Request Fullscreen for proctoring
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }

    // Initialize Chatbot with Question 1 ONLY if not already initialized
    if (!chatHistoryByCs[cs.id] || chatHistoryByCs[cs.id].length === 0) {
      const questions = buildFiveRoleQuestions(
        cs,
        roleTitle,
        roleResponsibilities,
        priorityGoal
      );
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const initialTurns: ChatTurn[] = [
        {
          id: `bot-intro-${Date.now()}`,
          sender: "BOT",
          text: `Welcome to the Case Study Assessment for "${cs.title}".\nYour assigned role is **${roleTitle}**. You will answer **5 sequential evaluation questions one by one**.\n\nReview the full case scenario on the right, then formulate your answer to Question 1 below.`,
          timestamp: nowTime,
        },
        {
          id: `bot-q1-${Date.now() + 1}`,
          sender: "BOT",
          questionIndex: 1,
          text: questions[0],
          timestamp: nowTime,
        },
      ];

      setChatHistoryByCs((prev) => ({ ...prev, [cs.id]: initialTurns }));
      setCurrentQuestionIdxByCs((prev) => ({ ...prev, [cs.id]: 0 }));
      setAnswersByCs((prev) => ({ ...prev, [cs.id]: [] }));
    }
  };

  const exitAssessmentMode = () => {
    void recordIntegrityViolation("An early exit was attempted.");
  };

  // Handle Student sending an answer to the current question (1 by 1 progression via Real AI)
  const handleSendAnswer = async (
    cs: CaseStudyAssessment,
    roleTitle: string,
    roleResponsibilities: string,
    priorityGoal?: string
  ) => {
    const trimmed = currentAnswerInput.trim();
    if (!trimmed || isEvaluating) return;

    const currentIdx = currentQuestionIdxByCs[cs.id] ?? 0;
    if (currentIdx >= 5) return;

    const questions = buildFiveRoleQuestions(
      cs,
      roleTitle,
      roleResponsibilities,
      priorityGoal
    );
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const studentTurn: ChatTurn = {
      id: `stu-a${currentIdx + 1}-${Date.now()}`,
      sender: "STUDENT",
      questionIndex: currentIdx + 1,
      text: trimmed,
      timestamp: nowTime,
    };

    // Immediately reflect the student's submission in the chat UI
    setChatHistoryByCs((prev) => ({
      ...prev,
      [cs.id]: [...(prev[cs.id] || []), studentTurn],
    }));
    setCurrentAnswerInput("");
    setIsEvaluating(true);

    const updatedAnswers = [...(answersByCs[cs.id] || []), trimmed];
    setAnswersByCs((prev) => ({ ...prev, [cs.id]: updatedAnswers }));

    try {
      // Call Real AI Evaluation Route (Gemini Model)
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "CASE_STUDY_EVALUATE",
          courseCode: cs.courseCode || "CS-02",
          topic: cs.topic || cs.title,
          caseStudyTitle: cs.title,
          scenarioBrief: cs.scenarioBrief,
          roleTitle,
          roleResponsibilities,
          questionNumber: currentIdx + 1,
          questionText: questions[currentIdx],
          studentAnswer: trimmed,
        }),
      });

      let aiResult: {
        critique: string;
        score: number;
        maxScore: number;
        isSubstantive: boolean;
        suggestions?: string;
      } | null = null;

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          aiResult = json.data;
        }
      }

      if (!aiResult) {
        throw new Error("The evaluation service did not return a valid result. Your response was not scored; please retry.");
      }

      const qScore = typeof aiResult.score === "number" ? Math.min(10, Math.max(0, aiResult.score)) : 6;
      const prevScores = scoresByCs[cs.id] || [];
      const updatedScores = [...prevScores, qScore];
      setScoresByCs((prev) => ({ ...prev, [cs.id]: updatedScores }));

      const nextIdx = currentIdx + 1;
      const botTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (nextIdx < 5) {
        // DO NOT reveal score or critique during the live exam. Acknowledge and advance immediately to next question.
        const nextBotTurn: ChatTurn = {
          id: `bot-q${nextIdx + 1}-${Date.now() + 1}`,
          sender: "BOT",
          questionIndex: nextIdx + 1,
          text: `✓ Response recorded for Question ${currentIdx + 1}.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${questions[nextIdx]}`,
          timestamp: botTime,
        };

        setChatHistoryByCs((prev) => ({
          ...prev,
          [cs.id]: [...(prev[cs.id] || []), nextBotTurn],
        }));
        setCurrentQuestionIdxByCs((prev) => ({ ...prev, [cs.id]: nextIdx }));
      } else {
        // All 5 questions answered -> Compute real objective score and present comprehensive final scorecard
        const totalAwardedRaw = updatedScores.reduce((sum, s) => sum + s, 0); // out of 50
        const maxCsPoints = cs.totalPoints || 50;
        const finalScaledScore = Math.round((totalAwardedRaw / 50) * maxCsPoints * 10) / 10;
        const percentage = Math.round((finalScaledScore / maxCsPoints) * 100);

        setFinalScoreByCs((prev) => ({ ...prev, [cs.id]: finalScaledScore }));

        const completionTurn: ChatTurn = {
          id: `bot-done-${Date.now() + 1}`,
          sender: "BOT",
          text: `🏁 **Case Study Examination Concluded**\n\nAll 5 technical questions have been recorded and evaluated by the examination engine. Here is your final scorecard and rubric breakdown:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 **AI Evaluation Scorecard & Rubric Breakdown**\n• Assigned Role Evaluated: **${roleTitle}**\n• Q1 [Scoping & Diagnosis]: **${updatedScores[0] ?? 0} / 10**\n• Q2 [Architectural Strategy]: **${updatedScores[1] ?? 0} / 10**\n• Q3 [Trade-off Analysis]: **${updatedScores[2] ?? 0} / 10**\n• Q4 [Edge Cases & Resilience]: **${updatedScores[3] ?? 0} / 10**\n• Q5 [Cross-Role Integration]: **${updatedScores[4] ?? 0} / 10**\n\n🏆 **Final Assessment Score: ${finalScaledScore} / ${maxCsPoints} Marks (${percentage}%)**\nStatus: **${percentage >= 50 ? "Passed Assessment ✓" : "Needs Review (Below Threshold)"}**\n\nClick **"Submit Final Assessment"** below to finalize and record your marks in the Gradebook.`,
          timestamp: botTime,
        };

        setChatHistoryByCs((prev) => ({
          ...prev,
          [cs.id]: [...(prev[cs.id] || []), completionTurn],
        }));
        setCurrentQuestionIdxByCs((prev) => ({ ...prev, [cs.id]: 5 }));
      }
    } catch (err) {
      console.error("AI evaluation call failed", err);
      setAnswersByCs((prev) => ({ ...prev, [cs.id]: (prev[cs.id] || []).slice(0, -1) }));
      setChatHistoryByCs((prev) => ({
        ...prev,
        [cs.id]: (prev[cs.id] || []).filter((turn) => turn.id !== studentTurn.id),
      }));
      setCurrentAnswerInput(trimmed);
      setAlertNotice(err instanceof Error ? err.message : "Evaluation failed. Please retry without leaving this question.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Final Submission of the 5-Question Transcript
  // Final or Early Submission of the Case Study Transcript
  const handleFinalizeSubmission = async (
    cs: CaseStudyAssessment,
    teamId: string,
    roleTitle: string,
    roleResponsibilities: string,
    priorityGoal?: string
  ) => {
    const answers = answersByCs[cs.id] || [];
    const questions = buildFiveRoleQuestions(
      cs,
      roleTitle,
      roleResponsibilities,
      priorityGoal
    );

    const displayStudentName =
      studentName ||
      (user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Student");

    const compiledTranscript = [
      `=== CASE STUDY ASSESSMENT SUBMISSION ===`,
      `Student: ${displayStudentName} (${effectiveRollNo.toUpperCase() || "Enrolled Student"})`,
      `Assigned Role: ${roleTitle}`,
      `Completed Questions: ${answers.length} of 5`,
      `Duration: ${formatTimer(elapsedSeconds)}`,
      `Submitted At: ${new Date().toLocaleString()}`,
      `-------------------------------------------------------------------`,
      ...questions.map(
        (q, i) => `\n[Q${i + 1}] ${q}\n[Student Answer ${i + 1}]:\n${answers[i] || "(Unanswered / Submitted Early)"}`
      ),
    ].join("\n");

    const awardedScores = scoresByCs[cs.id] || [];
    const totalAwardedRaw = awardedScores.reduce((sum, s) => sum + s, 0);
    const maxCsPoints = cs.totalPoints || 50;
    const computedScore = Math.min(maxCsPoints, Math.round((totalAwardedRaw / 50) * maxCsPoints * 10) / 10);
    const finalScore = finalScoreByCs[cs.id] ?? computedScore;

    setSubmittingId(`${cs.id}_${teamId}`);
    try {
      // 1. Immediately persist to localStorage
      saveLocalSubmission(cs.id, {
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
        submissionContent: compiledTranscript,
        score: finalScore,
        roleTitle,
        studentName: displayStudentName,
      });

      // 2. Transmit to AcademicDataContext and Backend
      await submitCaseStudy(cs.id, teamId, compiledTranscript, displayStudentName, finalScore);

      // 3. Close proctoring and exit fullscreen
      setActiveCaseStudyId(null);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }

      setSuccessBanner(
        `✓ Case Study Assessment submitted successfully for "${cs.title}". Recorded Score: ${finalScore} / ${cs.totalPoints || 50} Marks.`
      );
      setTimeout(() => setSuccessBanner(null), 6000);
    } finally {
      setSubmittingId(null);
    }
  };

  // Empty State when no faculty has assigned a case study to this student
  if (!relevantCaseStudies || relevantCaseStudies.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          No Case Study Assessments Assigned Yet
        </h2>
        <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
          Case studies will appear here once your course faculty assigns a case study assessment to your class.
        </p>
      </div>
    );
  }

  // ============================================================================
  // ACTIVE LIGHT THEME SPLIT-SCREEN WORKSPACE (50% LEFT / 50% RIGHT PARTITION)
  // Left Side (50%): Student Assigned Role + Full Case Study Problem Statement
  // Right Side (50%): Interactive Assessment Chatbot (5 Questions One-by-One)
  // Clean UniFlow SaaS Light Theme (No "No Camera" or "Proctored" Wording)
  // ============================================================================
  if (activeCaseStudy) {
    if (isMobileScreen) {
      return (
        <div className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-extrabold">Desktop or Laptop Required</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Case study examinations require a split-screen workspace, architectural analysis editor, and full keyboard access. They cannot be attempted on mobile devices.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-slate-500 font-mono">
              Minimum required screen width: 768px. Please open on a desktop or laptop computer.
            </div>
            <button
              onClick={() => setActiveCaseStudyId(null)}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide transition-colors cursor-pointer"
            >
              Back to Case Studies Overview
            </button>
          </div>
        </div>
      );
    }

    const myTeam = activeCaseStudy.teams?.find(
      (t) => Array.isArray(t.members) && t.members.some((m) => isMemberMe(m))
    );
    const myMember = myTeam?.members?.find((m) => isMemberMe(m));
    const roleTitle =
      myMember?.roleTitle || myMember?.assignedRole || "Not assigned";
    const roleResponsibilities =
      myMember?.responsibilities ||
      "No role responsibilities have been assigned.";
    const matchedRoleSpec = activeCaseStudy.roles?.find(
      (r) => r.title.toLowerCase() === roleTitle.toLowerCase()
    );
    const priorityGoal = matchedRoleSpec?.priorityGoal;

    const currentQIdx = currentQuestionIdxByCs[activeCaseStudy.id] ?? 0;
    const chatTurns = chatHistoryByCs[activeCaseStudy.id] || [];
    const answers = answersByCs[activeCaseStudy.id] || [];
    const isAllFiveAnswered = currentQIdx >= 5 && answers.length >= 5;
    const subKey = `${activeCaseStudy.id}_${myTeam?.id || "team-1"}`;

    return (
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          void recordIntegrityViolation("Right-click was blocked.");
        }}
        onCopy={(e) => {
          e.preventDefault();
          void recordIntegrityViolation("Copying assessment content was blocked.");
        }}
        onCut={(e) => {
          e.preventDefault();
          triggerToast("Cutting text is disabled during proctored assessment.");
        }}
        onPaste={(e) => {
          e.preventDefault();
          void recordIntegrityViolation("Pasting an answer was blocked.");
        }}
        className="fixed inset-0 z-[9999] bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden select-none"
      >
        {/* ─── Sleek Top Header Bar (Clean, Uncluttered Professional Layout) ─── */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
              {activeCaseStudy.courseCode}
            </span>
            <span className="text-sm font-bold text-slate-800 truncate max-w-[280px] sm:max-w-md">
              {activeCaseStudy.title}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline truncate">
              {roleTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            {/* Assigned Role Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>{roleTitle}</span>
            </div>

            {/* Assessment Timer */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Sequential Questions 1 to 5 Pill Tracker */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 mr-1 hidden md:inline">
                Progress:
              </span>
              {[1, 2, 3, 4, 5].map((qNum) => {
                const isDone = answers.length >= qNum;
                const isCurrent = !isDone && currentQIdx + 1 === qNum;
                return (
                  <span
                    key={qNum}
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-black flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white ring-2 ring-blue-300"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isDone ? "✓" : qNum}
                  </span>
                );
              })}
            </div>

            {/* Direct Submit Assessment Button (Available Anytime in Between) */}
            <button
              type="button"
              onClick={() => setIsConfirmSubmitOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              title="Finalize and submit your case study assessment"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submit Assessment ({answers.length}/5)</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isFullscreen ? "Full-screen mode is required" : "Restore full-screen mode"}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isFullscreen ? "Full Screen Locked" : "Restore Full Screen"}</span>
            </button>

            {/* Exit Workspace */}
            <button
              type="button"
              onClick={exitAssessmentMode}
              className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
            <span className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 font-semibold">
              Integrity strikes: {integrityStrikes[activeCaseStudy.id] || 0}/3
            </span>
          </div>
        </div>

        {/* Confirmation Modal to Submit Viva / Case Study Early or Anytime */}
        {isConfirmSubmitOpen && (
          <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-text">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Finalize &amp; Submit Case Study?</h3>
                  <p className="text-xs text-slate-500">Submit your responses to faculty gradebook</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
                <p className="font-semibold text-slate-800">
                  You have recorded {answers.length} of 5 evaluation questions.
                </p>
                <p className="text-slate-500 leading-relaxed">
                  Once submitted, this assessment will be evaluated, permanently locked, and recorded in your official gradebook. Retakes are strictly prohibited.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSubmitOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Continue Assessment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmSubmitOpen(false);
                    handleFinalizeSubmission(
                      activeCaseStudy,
                      myTeam?.id || "team-1",
                      roleTitle,
                      roleResponsibilities,
                      priorityGoal
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm &amp; Submit Final</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900/95 text-white backdrop-blur-md rounded-xl shadow-xl text-xs font-medium border border-slate-700 pointer-events-none transition-all">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─── 50% LEFT / 50% RIGHT SPLIT SCREEN PARTITION ─── */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* ================================================================= */}
          {/* LEFT PARTITION (50% WIDTH): 1-by-1 Assessment Chatbot Window    */}
          {/* ================================================================= */}
          <div className="w-full md:w-1/2 h-full flex flex-col min-h-0 bg-white border-r border-slate-200">
            {/* Chatbot Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Case Assessment Assistant</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      AI Socratic Evaluator
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Question {Math.min(answers.length + 1, 5)} of 5 • Objective AI evaluation
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {answers.length} / 5 Answered
                </span>
              </div>
            </div>

            {/* Conversation Messages Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {chatTurns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex items-start gap-3 ${
                    turn.sender === "STUDENT" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      turn.sender === "BOT"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {turn.sender === "BOT" ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-1.5 shadow-xs ${
                      turn.sender === "BOT"
                        ? "bg-white border border-slate-200 text-slate-800"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-4 text-[10px] font-mono ${
                        turn.sender === "BOT" ? "text-slate-400" : "text-blue-100"
                      }`}
                    >
                      <span>
                        {turn.sender === "BOT"
                          ? turn.questionIndex
                            ? `AI Evaluator • Question ${turn.questionIndex} of 5`
                            : "Case Evaluator"
                          : `Your Response (Q${turn.questionIndex})`}
                      </span>
                      <span>{turn.timestamp}</span>
                    </div>
                    <FormattedAssessmentText text={turn.text} />
                  </div>
                </div>
              ))}

              {/* Real AI Evaluating Loading Indicator */}
              {isEvaluating && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs shadow-xs flex items-center gap-2.5 text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                    <span className="font-medium">AI Evaluator is analyzing your response against {roleTitle} criteria...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom Input Area or Final Submit Button */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              {alertNotice && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {alertNotice}
                </div>
              )}
              {!isAllFiveAnswered ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span className="font-semibold text-slate-700">
                      Question {currentQIdx + 1} of 5 • {roleTitle}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Type your response directly • Shift+Enter for new line
                    </span>
                  </div>
                  <div className="flex items-end gap-2.5">
                    <textarea
                      rows={3}
                      disabled={isEvaluating}
                      value={currentAnswerInput}
                      onChange={(e) => setCurrentAnswerInput(e.target.value)}
                      onCopy={(e) => {
                        e.preventDefault();
                        triggerToast("Copying is disabled during assessment.");
                      }}
                      onCut={(e) => {
                        e.preventDefault();
                        triggerToast("Cutting is disabled during assessment.");
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        triggerToast("Pasting is disabled. Please type your answer directly.");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isEvaluating) {
                          e.preventDefault();
                          handleSendAnswer(
                            activeCaseStudy,
                            roleTitle,
                            roleResponsibilities,
                            priorityGoal
                          );
                        }
                      }}
                      placeholder={
                        isEvaluating
                          ? "AI Evaluator is reviewing your response..."
                          : `Write your response for Question ${currentQIdx + 1} of 5 here...`
                      }
                      className="flex-1 rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleSendAnswer(
                          activeCaseStudy,
                          roleTitle,
                          roleResponsibilities,
                          priorityGoal
                        )
                      }
                      disabled={!currentAnswerInput.trim() || isEvaluating}
                      className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all shadow-sm"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Evaluating...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send ({currentQIdx + 1}/5)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>All 5 Questions Evaluated by AI!</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Click below to submit your evaluation transcript and recorded score to faculty.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleFinalizeSubmission(
                        activeCaseStudy,
                        myTeam?.id || "team-1",
                        roleTitle,
                        roleResponsibilities,
                        priorityGoal
                      )
                    }
                    disabled={submittingId === subKey}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shrink-0 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {submittingId === subKey
                        ? "Submitting..."
                        : "Submit Final Assessment"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* RIGHT PARTITION (50% WIDTH): Role Spec + Full Problem Statement  */}
          {/* ================================================================= */}
          <div className="w-full md:w-1/2 h-full overflow-y-auto p-5 sm:p-7 space-y-5 bg-slate-50/60">
            {/* 1. Student's Assigned Role Card */}
            <div className="rounded-2xl bg-white border border-blue-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  Your Assigned Role
                </span>
                <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                  {myTeam?.teamName || "Team not assigned"} • {activeCaseStudy.totalPoints} Marks
                </span>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {roleTitle}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {matchedRoleSpec?.description || roleResponsibilities}
                </p>
              </div>

              {priorityGoal && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                  <span className="font-bold text-blue-700 uppercase text-[10px] tracking-wider block">
                    Role Priority Objective
                  </span>
                  <p className="text-slate-800 font-medium mt-0.5">{priorityGoal}</p>
                </div>
              )}

              {matchedRoleSpec?.responsibilities &&
                matchedRoleSpec.responsibilities.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Key Role Deliverables &amp; Responsibilities
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {matchedRoleSpec.responsibilities.map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* 2. Full Case Study Problem Statement */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Full Case Study Problem Statement
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {activeCaseStudy.courseCode}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {activeCaseStudy.title}
                </h4>
                {activeCaseStudy.topic && (
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">
                    Domain Focus: {activeCaseStudy.topic}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                {activeCaseStudy.scenarioBrief}
              </div>

              {activeCaseStudy.learningObjectives &&
                activeCaseStudy.learningObjectives.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Learning Objectives
                    </h5>
                    <ul className="space-y-1.5">
                      {activeCaseStudy.learningObjectives.map((obj, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* 3. Team Squad Distribution */}
            {myTeam && (
              <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>{myTeam.teamName} — Squad Role Distribution</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {myTeam.members?.map((mem, idx) => {
                    const isMe = isMemberMe(mem);
                    return (
                      <div
                        key={mem.studentId || mem.rollNo || idx}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          isMe
                            ? "bg-blue-50/70 border-blue-300 text-slate-900 font-medium"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold truncate text-slate-900">
                            {mem.studentName}
                          </span>
                          {isMe && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                          {mem.roleTitle || mem.assignedRole}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // DEFAULT ASSIGNED CASE STUDIES OVERVIEW LIST (LIGHT THEME)
  // ============================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Unified Assessment Filter Bar */}
      <AssessmentFilterBar
        filter={filterStatus}
        onFilterChange={setFilterStatus}
        counts={caseStudyCounts}
        sortBy={sortOption}
        onSortChange={setSortOption}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {filteredAndSortedCaseStudies.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Matching Case Studies</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? `No case studies matched "${searchQuery}".` : `No case studies found for status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredAndSortedCaseStudies.map((cs) => {
          const myTeam = cs.teams?.find(
            (t) => Array.isArray(t.members) && t.members.some((m) => isMemberMe(m))
          );
          const myMember = myTeam?.members?.find((m) => isMemberMe(m));

          const roleTitle =
            myMember?.roleTitle || myMember?.assignedRole || "Not assigned";
          const roleResponsibilities =
            myMember?.responsibilities ||
            "No role responsibilities have been assigned.";
          const matchedRoleSpec = cs.roles?.find(
            (r) => r.title.toLowerCase() === roleTitle.toLowerCase()
          );

          const localSub = getLocalSubmission(cs.id);
          const isSubmitted =
            Boolean(myTeam?.isSubmitted) ||
            Boolean(myTeam?.submission?.submittedAt) ||
            Boolean(localSub?.isSubmitted);

          const displayedTranscript =
            myTeam?.submissionContent ||
            myTeam?.submission?.content ||
            localSub?.submissionContent ||
            "Evaluation submitted and archived.";

          const displayedScore =
            myTeam?.score ??
            myTeam?.submission?.grade ??
            localSub?.score;

          const displayedSubmittedAt =
            myTeam?.submittedAt ||
            myTeam?.submission?.submittedAt ||
            localSub?.submittedAt;

          return (
            <div
              key={cs.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs overflow-hidden transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                        {cs.courseCode}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {cs.targetClass}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                        <Briefcase className="w-3 h-3" />
                        <span>Case Assessment</span>
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-0.5">
                      {cs.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 flex-wrap">
                    <DeadlineCountdownBadge dueDate={cs.dueDate} />
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{cs.totalPoints || 50} Marks</span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3.5">
                  {/* Assigned Role Highlight Banner */}
                  <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          Your Assigned Role
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {myTeam?.teamName || localSub?.roleTitle || "Assigned Analyst"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {roleTitle}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {roleResponsibilities}
                      </p>
                    </div>

                    {!isSubmitted ? (
                      <button
                        type="button"
                        onClick={() =>
                          startAssessment(
                            cs,
                            roleTitle,
                            roleResponsibilities,
                            matchedRoleSpec?.priorityGoal
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-all self-start sm:self-center"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Start Assessment</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Submitted &amp; Locked</span>
                      </div>
                    )}
                  </div>

                  {/* Team Members Grid */}
                  {myTeam && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>{myTeam.teamName} — Roster</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {myTeam.members?.map((mem, idx) => {
                          const isMe = isMemberMe(mem);
                          return (
                            <div
                              key={mem.studentId || mem.studentRollNo || mem.rollNo || idx}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                                isMe
                                  ? "bg-blue-50/60 border-blue-300 shadow-2xs"
                                  : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white truncate text-xs">
                                  {mem.studentName}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-blue-600 text-white">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-[10px] text-slate-400">
                                {mem.studentRollNo || mem.rollNo}
                              </p>
                              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                <span className="font-bold text-blue-600 dark:text-blue-400 block text-[10px]">
                                  {mem.roleTitle || mem.assignedRole || "Team Member"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

              {/* Submitted Status & Dedicated Transcript Modal Trigger */}
              {isSubmitted && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Assessment Submitted • {displayedSubmittedAt ? new Date(displayedSubmittedAt).toLocaleDateString() : "Record Logged"}
                    </span>
                    {displayedScore !== undefined && (
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Score: {displayedScore} / {cs.totalPoints || 50} Marks
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setViewingTranscriptData({
                        title: cs.title,
                        courseCode: cs.courseCode,
                        submittedAt: displayedSubmittedAt,
                        transcript: displayedTranscript,
                        score: displayedScore,
                        totalPoints: cs.totalPoints || 50,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Transcript &amp; AI Evaluation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}

  {/* ─── DEDICATED STUDENT TRANSCRIPT & AI EVALUATION MODAL ─── */}
  {viewingTranscriptData && (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-4 animate-scale-up">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {viewingTranscriptData.courseCode}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {viewingTranscriptData.submittedAt ? new Date(viewingTranscriptData.submittedAt).toLocaleString() : "Official Assessment"}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {viewingTranscriptData.title} &bull; Socratic Viva Transcript
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {viewingTranscriptData.score !== undefined && (
              <div className="font-mono font-black text-sm px-3.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {viewingTranscriptData.score} / {viewingTranscriptData.totalPoints || 50} Marks
              </div>
            )}
            <button
              type="button"
              onClick={() => setViewingTranscriptData(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
            {viewingTranscriptData.transcript}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setViewingTranscriptData(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all hover:bg-slate-800 cursor-pointer"
          >
            Close Transcript
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
}
