"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Users,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Award,
  Zap,
  BarChart3,
  HelpCircle,
  Copy,
  Check,
  Radio,
  Eye,
  Send,
  Trophy,
  AlertCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Lock,
  BookOpen,
  GraduationCap,
  Layers,
  X,
  Square,
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Printer,
  Download,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";
import { exportToExcel } from "@/lib/excel-utils";

export interface LiveQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number; // 0=A, 1=B, 2=C, 3=D
  explanation: string;
  points: number;
}

export interface LiveSessionState {
  id: string;
  pin: string; // 6-digit secret PIN, e.g. "839201"
  title: string;
  courseCode: string;
  courseName: string;
  className: string;
  facultyName: string;
  facultyEmail: string;
  status: "SETUP" | "LOBBY" | "QUESTION_ACTIVE" | "QUESTION_ENDED" | "COMPLETED";
  isProctored?: boolean; // Proctored vs Unproctored
  proctoringViolations?: Record<
    string,
    {
      count: number;
      lastViolationAt: number;
      studentName: string;
    }
  >;
  currentQuestionIndex: number;
  timerDurationSeconds: number;
  questionStartedAt: number; // Epoch ms
  questions: LiveQuestion[];
  joinedStudents: {
    id: string;
    name: string;
    email: string;
    joinedAt: number;
  }[];
  responses: Record<
    string, // questionId
    Record<
      string, // studentId
      {
        selectedOption: number;
        timeTakenSeconds: number;
        submittedAt: number;
        isCorrect: boolean;
      }
    >
  >;
}

const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

const BROADCAST_CHANNEL = "SMARTEDU_LIVE_QUIZ_CHANNEL_V4";

export function LiveInteractiveQuizView({
  initialRole,
  onBack,
}: {
  initialRole?: "FACULTY" | "STUDENT";
  onBack?: () => void;
}) {
  const { user } = useAuth();
  const { courses, users, departments } = useAcademicData();

  // Mode: Faculty Host vs Student Join
  const isFacultyUser = user?.role?.name === "FACULTY" || user?.role?.name === "HOD" || user?.role?.name === "ADMINISTRATOR";
  const [activeRole, setActiveRole] = useState<"FACULTY" | "STUDENT">(
    isFacultyUser ? (initialRole || "FACULTY") : "STUDENT"
  );

  // Available cohorts gathered from users, departments, and course assignments
  const availableCohorts = useMemo(() => {
    const list: string[] = [];

    // 1. Gather all actual student cohorts from users
    (users || []).forEach((u) => {
      if (u.role === "STUDENT" && u.className && !list.includes(u.className)) {
        list.push(u.className);
      }
    });

    // 2. Gather cohorts from departments
    (departments || []).forEach((d) => {
      (d.cohorts || []).forEach((c: any) => {
        const cName = c?.name || c;
        if (typeof cName === "string" && !list.includes(cName)) {
          list.push(cName);
        }
      });
      (d.classes || []).forEach((c: any) => {
        const cName = c?.name || c;
        if (typeof cName === "string" && !list.includes(cName)) {
          list.push(cName);
        }
      });
    });

    if (!list.includes("All Enrolled Sections")) {
      list.unshift("All Enrolled Sections");
    }
    return list;
  }, [users, departments]);

  // Class & Course Selection States for Faculty Host
  const [selectedClass, setSelectedClass] = useState(() => {
    return (user as any)?.className || "All Enrolled Sections";
  });

  useEffect(() => {
    if ((!selectedClass || selectedClass === "") && availableCohorts.length > 0) {
      setSelectedClass(availableCohorts[0]);
    }
  }, [availableCohorts, selectedClass]);

  const [selectedCourseCode, setSelectedCourseCode] = useState(courses[0]?.code || "");
  const [selectedCourseName, setSelectedCourseName] = useState(courses[0]?.name || "");

  // Student Join State
  const [enteredPin, setEnteredPin] = useState("");
  const [studentJoined, setStudentJoined] = useState(false);
  const [selectedStudentAnswer, setSelectedStudentAnswer] = useState<number | null>(null);
  const [hasSubmittedCurrentQuestion, setHasSubmittedCurrentQuestion] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Add Custom MCQ Modal State
  const [isAddMcqModalOpen, setIsAddMcqModalOpen] = useState(false);
  const [newMcqPrompt, setNewMcqPrompt] = useState("");
  const [newMcqOptions, setNewMcqOptions] = useState(["", "", "", ""]);
  const [newMcqCorrect, setNewMcqCorrect] = useState(0);
  const [newMcqExplanation, setNewMcqExplanation] = useState("");
  const [newMcqPoints, setNewMcqPoints] = useState(100);

  // Live Session State — defaults to SETUP (NOT started yet!)
  const [session, setSession] = useState<LiveSessionState>(() => ({
      id: `session-${Date.now()}`,
      pin: "",
      title: "Live Assessment",
      courseCode: "",
      courseName: "",
      className: "",
      facultyName: "",
      facultyEmail: "",
      status: "SETUP",
      isProctored: false,
      proctoringViolations: {},
      currentQuestionIndex: 0,
      timerDurationSeconds: 30,
      questionStartedAt: 0,
      questions: [],
      joinedStudents: [],
      responses: {},
    }));

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

  // Timer countdown state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [copiedPin, setCopiedPin] = useState(false);
  const [customTimerInput, setCustomTimerInput] = useState<number>(30);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [mcqBatchCount, setMcqBatchCount] = useState<number>(5);

  // Proctoring Violation Modal State
  const [proctorWarningModal, setProctorWarningModal] = useState(false);
  const [currentStudentViolations, setCurrentStudentViolations] = useState(0);

  // Proctoring Stream & Security States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // BroadcastChannel for instant cross-tab sync
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current = bc;

    bc.onmessage = (event) => {
      if (event.data?.type === "SESSION_UPDATE" && event.data.session) {
        setSession(event.data.session);
      }
    };

    return () => {
      bc.close();
    };
  }, []);

  // Sync active UI state across tabs; the database remains the authoritative store.
  const updateSessionState = (next: LiveSessionState) => {
    setSession(next);
    channelRef.current?.postMessage({ type: "SESSION_UPDATE", session: next });
    // Only the faculty host should post full session updates to the server.
    if (activeRole === "FACULTY") {
      void apiClient.post("/assessments/live-session", next).catch(() => {});
    }
  };

  // Poll backend for active live session every 1.2 seconds so students and faculty stay synchronized across incognito, tabs, and devices
  useEffect(() => {
    let cancelled = false;
    const pollBackendSession = () => {
      if (!session?.pin) return;
      const pinQuery = `?pin=${encodeURIComponent(session.pin)}`;
      apiClient
        .get<any>(`/assessments/live-session${pinQuery}`)
        .then((res) => {
          if (cancelled) return;
          const remote = res?.session || res?.data?.session || (res?.id ? res : null);
          if (!remote || !remote.pin) return;

          // Never override an empty or SETUP session with a completed or stale quiz
          if (remote.status === "COMPLETED" && (session.status === "SETUP" || !session.pin)) {
            return;
          }

          setSession((prev) => {
            if (prev.status === "SETUP" && remote.status === "COMPLETED") {
              return prev;
            }
            if (
              prev.status !== remote.status ||
              prev.currentQuestionIndex !== remote.currentQuestionIndex ||
              prev.pin !== remote.pin ||
              prev.questionStartedAt !== remote.questionStartedAt ||
              (remote.joinedStudents?.length || 0) !== (prev.joinedStudents?.length || 0) ||
              JSON.stringify(prev.questions) !== JSON.stringify(remote.questions) ||
              JSON.stringify(prev.responses) !== JSON.stringify(remote.responses) ||
              JSON.stringify(prev.proctoringViolations) !== JSON.stringify(remote.proctoringViolations)
            ) {
              return remote as LiveSessionState;
            }
            return prev;
          });
        })
        .catch(() => {});
    };

    pollBackendSession();
    const interval = setInterval(pollBackendSession, 1200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.pin]);

  // Auto-reconnect student if already in session or if session is active
  useEffect(() => {
    if (activeRole === "STUDENT" && !studentJoined && session.status !== "SETUP" && session.pin) {
      const isMember = (session.joinedStudents || []).some(
        (s) => s.id === user?.id || (user?.email && s.email?.toLowerCase() === user.email.toLowerCase())
      );
      if (isMember) {
        setStudentJoined(true);
      }
    }
  }, [activeRole, studentJoined, session.status, session.pin, session.joinedStudents, user]);

  // Web camera feed lifecycle in proctored mode
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeRole === "STUDENT" && studentJoined && session.isProctored) {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              setIsCameraActive(true);
            }
          })
          .catch(() => {
            setIsCameraActive(false);
          });
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeRole, studentJoined, session.isProctored]);

  // Clipboard restrictions apply to every active assessment, independent of camera settings.
  useEffect(() => {
    if (activeRole !== "STUDENT" || !studentJoined || session.status !== "QUESTION_ACTIVE") return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setNotification("⚠️ Right-click context menu is restricted in proctored mode.");
      setTimeout(() => setNotification(null), 3000);
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setNotification("⚠️ Clipboard copying is prohibited during proctored assessments.");
      setTimeout(() => setNotification(null), 3000);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setNotification("⚠️ Clipboard pasting is prohibited during proctored assessments.");
      setTimeout(() => setNotification(null), 3000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "u"))
      ) {
        e.preventDefault();
        setNotification("⚠️ Developer inspection shortcuts are blocked.");
        setTimeout(() => setNotification(null), 3000);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeRole, studentJoined, session.status]);

  const handleToggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Timer countdown loop
  useEffect(() => {
    if (session.status !== "QUESTION_ACTIVE") return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - session.questionStartedAt;
      const totalMs = session.timerDurationSeconds * 1000;
      const leftMs = Math.max(0, totalMs - elapsedMs);
      const remainingSec = Math.ceil(leftMs / 1000);

      setSecondsRemaining(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        if (activeRole === "FACULTY") {
          updateSessionState({
            ...session,
            status: "QUESTION_ENDED",
          });
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [session.status, session.questionStartedAt, session.timerDurationSeconds, activeRole]);

  // Reset student submission on question change
  useEffect(() => {
    setSelectedStudentAnswer(null);
    setHasSubmittedCurrentQuestion(false);
  }, [session.currentQuestionIndex]);

  // Tab switch detection (Proctoring Violation Monitor)
  useEffect(() => {
    if (activeRole !== "STUDENT" || !studentJoined || !session.isProctored || session.status !== "QUESTION_ACTIVE") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!user?.id) return;
        const studentId = user.id;
        const studentName = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student";
        const violations = session.proctoringViolations || {};
        const currentCount = (violations[studentId]?.count || 0) + 1;

        const updatedViolations = {
          ...violations,
          [studentId]: {
            count: currentCount,
            lastViolationAt: Date.now(),
            studentName,
          },
        };

        setCurrentStudentViolations(currentCount);
        setProctorWarningModal(true);
        void apiClient.post<any>("/assessments/live-session/violation", {
          sessionId: session.id,
          timestamp: Date.now(),
          reason: "TAB_HIDDEN",
        }).then((res) => {
          const savedSession = res?.session || res?.data?.session;
          if (savedSession) setSession(savedSession);
          if (currentCount >= 3) setStudentJoined(false);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeRole, studentJoined, session, user]);

  const handleCopyPin = () => {
    if (navigator?.clipboard && session.pin) {
      navigator.clipboard.writeText(session.pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // Faculty: Start a fresh live session with new random PIN
  const handleStartNewLiveSession = () => {
    const newPin = generateRandomPin();
    const facultyDisplayName = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "";
    const initialQuestions = session.questions || [];
    if (initialQuestions.length === 0) {
      setNotification("Add or generate at least one approved question before starting the session.");
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    const nextSession: LiveSessionState = {
      ...session,
      id: `session-${Date.now()}`,
      pin: newPin,
      courseCode: selectedCourseCode,
      courseName: selectedCourseName,
      className: selectedClass,
      title: `${selectedCourseName} (${selectedCourseCode}) Live Assessment`,
      facultyName: facultyDisplayName,
      facultyEmail: user?.email || "",
      status: "LOBBY",
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      questions: initialQuestions,
      joinedStudents: [],
      responses: {},
      proctoringViolations: {},
    };
    updateSessionState(nextSession);
    setSecondsRemaining(customTimerInput);
    setCopiedPin(false);
  };

  // Faculty: End active session and return to SETUP
  const handleEndLiveSession = () => {
    updateSessionState({
      ...session,
      status: "SETUP",
      pin: "",
      joinedStudents: [],
      responses: {},
    });
    setStudentJoined(false);
  };

  // Student Join Handler
  const handleStudentJoin = async (e?: React.FormEvent, customPin?: string) => {
    if (e) e.preventDefault();
    const pinToUse = (customPin || enteredPin).replace(/\s+/g, "").trim();
    if (!pinToUse) {
      setJoinError("Please enter the 6-digit session PIN.");
      return;
    }

    if (!user?.id || !user.email) {
      setJoinError("Your authenticated student profile could not be verified. Please sign in again.");
      return;
    }
    const studentName = `${user.first_name} ${user.last_name || ""}`.trim();
    const studentEmail = user.email;
    const studentId = user.id;

    // Join only through the backend so a cached browser session cannot impersonate enrollment.
    try {
      const res = await apiClient.post<any>("/assessments/live-session/join", {
        pin: pinToUse,
        studentId,
        studentName,
        studentEmail,
        joinedAt: Date.now(),
      });

      const joinedSession = res?.session || res?.data?.session || (res?.id ? res : null);
      if (joinedSession && joinedSession.pin === pinToUse) {
        setSession(joinedSession);
        setStudentJoined(true);
        setJoinError(null);
        if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        return;
      }
      setJoinError("Unable to locate active session for entered PIN. Please verify the 6-digit PIN with your instructor.");
    } catch (err: any) {
      setJoinError(err?.message || "Invalid or expired session PIN. Please check the 6-digit PIN on the classroom display.");
    }
  };

  // Student Submit Answer Handler
  const handleStudentSubmitAnswer = (optionIdx: number) => {
    if (session.status !== "QUESTION_ACTIVE" || hasSubmittedCurrentQuestion) return;

    setSelectedStudentAnswer(optionIdx);
    setHasSubmittedCurrentQuestion(true);

    const currentQ = session.questions[session.currentQuestionIndex];
    if (!currentQ) return;

    if (!user?.id) return;
    const studentId = user.id;
    const elapsedSec = Math.max(1, Math.floor((Date.now() - session.questionStartedAt) / 1000));
    const isCorrect = optionIdx === currentQ.correctOption;

    const currentResponses = session.responses[currentQ.id] || {};
    const updatedResponsesForQ = {
      ...currentResponses,
      [studentId]: {
        selectedOption: optionIdx,
        timeTakenSeconds: elapsedSec,
        submittedAt: Date.now(),
        isCorrect,
      },
    };

    const nextSession: LiveSessionState = {
      ...session,
      responses: {
        ...session.responses,
        [currentQ.id]: updatedResponsesForQ,
      },
    };

    updateSessionState(nextSession);
    void apiClient.post<any>("/assessments/live-session/answer", {
      sessionId: session.id,
      questionId: currentQ.id,
      studentId,
      selectedOption: optionIdx,
      timeTakenSeconds: elapsedSec,
      submittedAt: Date.now(),
    }).then((res) => {
      const savedSession = res?.session || res?.data?.session;
      if (savedSession) setSession(savedSession);
    }).catch(() => {
      setHasSubmittedCurrentQuestion(false);
      setSelectedStudentAnswer(null);
    });
  };

  // Faculty Actions
  const handleLaunchQuestion = (qIndex: number, durationSec?: number) => {
    const dur = durationSec || customTimerInput || 30;
    const availableQuestions = session.questions || [];
    if (availableQuestions.length === 0) {
      setNotification("No approved questions are available for this assessment.");
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    const validIndex = Math.max(0, Math.min(qIndex, availableQuestions.length - 1));
    updateSessionState({
      ...session,
      questions: availableQuestions,
      status: "QUESTION_ACTIVE",
      currentQuestionIndex: validIndex,
      timerDurationSeconds: dur,
      questionStartedAt: Date.now(),
    });
    setSecondsRemaining(dur);
  };

  const handleEndQuestionManually = () => {
    updateSessionState({
      ...session,
      status: "QUESTION_ENDED",
    });
  };

  const handleNextQuestion = () => {
    if (session.currentQuestionIndex < session.questions.length - 1) {
      handleLaunchQuestion(session.currentQuestionIndex + 1, customTimerInput);
    } else {
      updateSessionState({
        ...session,
        status: "COMPLETED",
      });
    }
  };

  const handleRestartSession = () => {
    updateSessionState({
      ...session,
      status: "LOBBY",
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      responses: {},
    });
  };

  const handleResetAndStartNewQuiz = async () => {
    try {
      await apiClient.post("/assessments/live-session/reset", {});
    } catch {}
    const freshPin = generateRandomPin();
    const freshState: LiveSessionState = {
      id: `live-sess-${Date.now()}`,
      pin: freshPin,
      title: `${selectedCourseCode || "CS301"} Live Assessment`,
      courseCode: selectedCourseCode || "CS301",
      courseName: selectedCourseName || "Course Assessment",
      className: selectedClass || "All Enrolled Sections",
      facultyName: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Faculty Member",
      facultyEmail: user?.email || "",
      status: "SETUP",
      isProctored: false,
      currentQuestionIndex: 0,
      timerDurationSeconds: 30,
      questionStartedAt: 0,
      questions: [],
      joinedStudents: [],
      responses: {},
    };
    setSession(freshState);
    channelRef.current?.postMessage({ type: "SESSION_UPDATE", session: freshState });
    void apiClient.post("/assessments/live-session", freshState).catch(() => {});
  };

  // Faculty: Add Custom MCQ
  const handleAddCustomMcq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcqPrompt.trim() || newMcqOptions.some((o) => !o.trim())) return;

    const newQ: LiveQuestion = {
      id: `q-${Date.now()}`,
      questionText: newMcqPrompt.trim(),
      options: newMcqOptions.map((o) => o.trim()),
      correctOption: newMcqCorrect,
      explanation: newMcqExplanation.trim() || "Correct answer according to syllabus standards.",
      points: Number(newMcqPoints) || 100,
    };

    const nextQuestions = [...session.questions, newQ];
    updateSessionState({
      ...session,
      questions: nextQuestions,
    });

    setIsAddMcqModalOpen(false);
    setNewMcqPrompt("");
    setNewMcqOptions(["", "", "", ""]);
    setNewMcqCorrect(0);
    setNewMcqExplanation("");
  };

  // Faculty: generate curriculum-grounded questions through the Gemini AI service.
  const handleAiGenerateQuestions = async () => {
    const courseCode = selectedCourseCode || "CS-001";
    const courseTitle = selectedCourseName || "Computer Science";
    const countToGenerate = mcqBatchCount || 5;
    setIsGeneratingAi(true);

    try {
      // 1. Call Next.js Gemini AI generator route
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QUIZ",
          courseCode,
          topic: `${courseTitle} - Key Concepts & Problem Solving`,
          count: countToGenerate,
          difficulty: "MEDIUM",
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const questionsList = payload?.data?.questions || [];
        if (
          Array.isArray(questionsList) &&
          questionsList.length > 0 &&
          questionsList.every((q: any) =>
            typeof q?.prompt === "string" && q.prompt.trim() &&
            Array.isArray(q.options) && q.options.length >= 4 &&
            q.options.slice(0, 4).every((option: unknown) => typeof option === "string" && option.trim()) &&
            Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4
          )
        ) {
          const generated: LiveQuestion[] = questionsList.map((q: any, index: number) => ({
            id: `gemini-live-${Date.now()}-${index}`,
            questionText: q.prompt.trim(),
            options: q.options.slice(0, 4),
            correctOption: q.correctIndex,
            explanation: typeof q.explanation === "string" ? q.explanation : "",
            points: 100,
          }));

          updateSessionState({ ...session, questions: [...session.questions, ...generated] });
          setNotification(`✓ Successfully added ${generated.length} MCQs for ${courseCode} via AI Engine.`);
          setTimeout(() => setNotification(null), 4000);
          return;
        }
      }

      // 2. Direct backend fallback route if available
      const backendRes = await apiClient.post<{ questions?: any[] }>("/intelligence/practice/generate", {
        course_code: courseCode,
        course_title: courseTitle,
        topic_title: courseTitle,
        count: countToGenerate,
      }).catch(() => null);

      if (backendRes && Array.isArray(backendRes.questions) && backendRes.questions.length > 0) {
        const generated: LiveQuestion[] = backendRes.questions.map((q: any, index: number) => ({
          id: q.id || `backend-live-${Date.now()}-${index}`,
          questionText: q.prompt,
          options: q.options,
          correctOption: typeof q.correct_index === "number" ? q.correct_index : 0,
          explanation: q.explanation || "",
          points: 100,
        }));
        updateSessionState({ ...session, questions: [...session.questions, ...generated] });
        setNotification(`✓ Added ${generated.length} curriculum MCQs for ${courseCode}.`);
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      throw new Error("Question generation service returned no approved questions.");
    } catch {
      setNotification("Failed to generate AI questions. Please check network connectivity.");
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Compute Live Response Statistics for Current Question
  const currentQuestion = session.questions[session.currentQuestionIndex];
  const currentQuestionResponses = useMemo(() => {
    if (!currentQuestion) return {};
    return session.responses[currentQuestion.id] || {};
  }, [session.responses, currentQuestion]);

  const responseStats = useMemo(() => {
    if (!currentQuestion) return { counts: [0, 0, 0, 0], percentages: [0, 0, 0, 0], totalVotes: 0 };
    const counts = [0, 0, 0, 0];
    const votes = Object.values(currentQuestionResponses);
    votes.forEach((r) => {
      if (r.selectedOption >= 0 && r.selectedOption < 4) {
        counts[r.selectedOption]++;
      }
    });
    const totalVotes = votes.length;
    const percentages = counts.map((c) => (totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0));
    return { counts, percentages, totalVotes };
  }, [currentQuestion, currentQuestionResponses]);

  const optionLetters = ["A", "B", "C", "D"];

  // Compute overall performance leaderboard and summary across all questions
  const leaderboard = useMemo(() => {
    if (!session || !session.joinedStudents) return [];
    const totalPossiblePoints = session.questions.reduce((acc, q) => acc + (q.points || 100), 0);
    return session.joinedStudents.map((stu) => {
      let earnedPoints = 0;
      let correctCount = 0;
      let totalAnswered = 0;
      let totalTimeSec = 0;

      session.questions.forEach((q) => {
        const resp = session.responses[q.id]?.[stu.id];
        if (resp) {
          totalAnswered++;
          totalTimeSec += resp.timeTakenSeconds || 0;
          if (resp.isCorrect) {
            earnedPoints += q.points || 100;
            correctCount++;
          }
        }
      });

      const accuracy = session.questions.length > 0 ? Math.round((correctCount / session.questions.length) * 100) : 0;
      const avgTime = totalAnswered > 0 ? Math.round(totalTimeSec / totalAnswered) : 0;
      const violations = session.proctoringViolations?.[stu.id]?.count || 0;

      return {
        id: stu.id,
        name: stu.name,
        email: stu.email,
        score: earnedPoints,
        maxPoints: totalPossiblePoints,
        correctCount,
        totalAnswered,
        accuracy,
        avgTime,
        violations,
        isClean: violations <= 2,
      };
    }).sort((a, b) => b.score - a.score || a.avgTime - b.avgTime);
  }, [session]);

  const sessionSummary = useMemo(() => {
    const totalParticipants = session.joinedStudents.length;
    const totalPossiblePoints = session.questions.reduce((acc, q) => acc + (q.points || 100), 0);
    if (leaderboard.length === 0) {
      return {
        totalParticipants,
        avgScore: 0,
        topScore: 0,
        accuracyRate: 0,
        integrityRate: 100,
        totalPossiblePoints,
      };
    }
    const sumScore = leaderboard.reduce((acc, l) => acc + l.score, 0);
    const avgScore = Math.round(sumScore / leaderboard.length);
    const topScore = leaderboard[0]?.score || 0;
    const sumAccuracy = leaderboard.reduce((acc, l) => acc + l.accuracy, 0);
    const accuracyRate = Math.round(sumAccuracy / leaderboard.length);
    const cleanStudents = leaderboard.filter((l) => l.isClean).length;
    const integrityRate = Math.round((cleanStudents / leaderboard.length) * 100);

    return {
      totalParticipants,
      avgScore,
      topScore,
      accuracyRate,
      integrityRate,
      totalPossiblePoints,
    };
  }, [session, leaderboard]);

  const handleExportExcelReport = () => {
    const data = leaderboard.map((row, idx) => ({
      "Rank": idx + 1,
      "Student Name": row.name,
      "Email": row.email,
      "Score (pts)": row.score,
      "Max Points": sessionSummary.totalPossiblePoints,
      "Accuracy (%)": `${row.accuracy}%`,
      "Correct Answers": `${row.correctCount} / ${session.questions.length}`,
      "Avg Response Time (s)": `${row.avgTime}s`,
      "Proctoring Warnings": row.violations,
      "Integrity Status": row.isClean ? "Clean Verified" : "Flagged Review",
    }));

    exportToExcel(data, `Live_Quiz_Report_${session.courseCode || "CS"}_${new Date().toISOString().slice(0, 10)}`);
    setNotification("✓ Live assessment report exported as Excel (.xlsx)");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExportCsvReport = () => {
    let csv = "Rank,Student Name,Email,Score,Max Points,Accuracy %,Correct Answers,Avg Time (s),Warnings,Integrity Status\n";
    leaderboard.forEach((r, idx) => {
      csv += `${idx + 1},"${r.name}","${r.email}",${r.score},${sessionSummary.totalPossiblePoints},${r.accuracy}%,${r.correctCount}/${session.questions.length},${r.avgTime}s,${r.violations},"${r.isClean ? 'Clean' : 'Flagged'}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Live_Quiz_Report_${session.courseCode || "CS"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotification("✓ Live assessment report exported as CSV");
    setTimeout(() => setNotification(null), 3000);
  };

  const renderEndSessionReport = (isStudent: boolean) => {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Report Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                Official Assessment Report
              </span>
              <span className="text-xs text-slate-400 font-mono">
                PIN: {session.pin || "N/A"}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
              {session.courseName} ({session.courseCode}) - Performance Report
            </h2>
            <p className="text-xs text-slate-500">
              Instructor: {session.facultyName} &bull; Class: {session.className} &bull; Concluded Assessment
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcelReport}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportCsvReport}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / PDF</span>
            </button>
            {isFacultyUser && !isStudent && (
              <button
                onClick={handleRestartSession}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Start New Session
              </button>
            )}
            {isStudent && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStudentJoined(false);
                    setEnteredPin("");
                    setJoinError(null);
                    setSession((prev) => ({
                      ...prev,
                      status: "SETUP",
                      pin: "",
                      joinedStudents: [],
                      responses: {},
                    }));
                  }}
                  className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Join Another Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentJoined(false);
                    if (onBack) {
                      onBack();
                    } else if (typeof window !== "undefined") {
                      window.location.href = "/student";
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Exit to Dashboard</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendees</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {sessionSummary.totalParticipants}
            </div>
            <span className="text-[10px] text-slate-500">Students joined</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Score</span>
            <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {sessionSummary.avgScore} <span className="text-xs text-slate-400 font-normal">pts</span>
            </div>
            <span className="text-[10px] text-slate-500">Class benchmark</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Score</span>
            <div className="text-xl font-extrabold text-amber-500 mt-1">
              {sessionSummary.topScore} <span className="text-xs text-slate-400 font-normal">pts</span>
            </div>
            <span className="text-[10px] text-slate-500">Highest achieved</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accuracy</span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {sessionSummary.accuracyRate}%
            </div>
            <span className="text-[10px] text-slate-500">Correct answers</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Integrity Rate</span>
            <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {sessionSummary.integrityRate}%
            </div>
            <span className="text-[10px] text-slate-500">Zero strikes</span>
          </div>
        </div>

        {/* Podium Leaderboard (Top 3) */}
        {leaderboard.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Leaderboard Podium
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Ranked by points &amp; speed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* 2nd Place */}
              {leaderboard[1] ? (
                <div className="order-2 sm:order-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-base flex items-center justify-center mx-auto shadow-xs">
                    🥈 2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {leaderboard[1].name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block">{leaderboard[1].email}</span>
                  </div>
                  <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                    {leaderboard[1].score} pts
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Accuracy: {leaderboard[1].accuracy}% &bull; {leaderboard[1].correctCount}/{session.questions.length} Correct
                  </div>
                </div>
              ) : <div className="hidden sm:block" />}

              {/* 1st Place */}
              {leaderboard[0] && (
                <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-500/10 to-amber-500/5 rounded-2xl p-5 border-2 border-amber-400/50 text-center space-y-2 shadow-sm scale-105">
                  <div className="h-14 w-14 rounded-full bg-amber-400 text-slate-900 font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                    🥇 1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {leaderboard[0].name}
                    </h4>
                    <span className="text-[11px] text-slate-500 block">{leaderboard[0].email}</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    {leaderboard[0].score} pts
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                    Accuracy: {leaderboard[0].accuracy}% &bull; {leaderboard[0].correctCount}/{session.questions.length} Correct
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {leaderboard[2] ? (
                <div className="order-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 font-extrabold text-base flex items-center justify-center mx-auto shadow-xs">
                    🥉 3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {leaderboard[2].name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block">{leaderboard[2].email}</span>
                  </div>
                  <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                    {leaderboard[2].score} pts
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Accuracy: {leaderboard[2].accuracy}% &bull; {leaderboard[2].correctCount}/{session.questions.length} Correct
                  </div>
                </div>
              ) : <div className="hidden sm:block" />}
            </div>
          </div>
        )}

        {/* Full Participant Ranking & Integrity Record Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Full Participant Ranking &amp; Integrity Record ({leaderboard.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Correct</th>
                  <th className="py-2.5 px-3">Avg Time</th>
                  <th className="py-2.5 px-3 text-right">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.email}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.score}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.accuracy}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {item.correctCount} / {session.questions.length}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {item.avgTime}s
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.violations === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Clean ✓
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          {item.violations} Warning{item.violations > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Question-by-Question Deep Dive */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Question Breakdown &amp; Analysis</span>
          </h3>

          <div className="space-y-4">
            {session.questions.map((q, qIdx) => {
              const qResponses = session.responses[q.id] || {};
              const totalVotes = Object.keys(qResponses).length;
              let correctVotes = 0;
              Object.values(qResponses).forEach((r) => {
                if (r.isCorrect) correctVotes++;
              });
              const accuracy = totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0;
              const difficulty = accuracy >= 75 ? "Easy" : accuracy >= 40 ? "Medium" : "Challenging";

              return (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Q{qIdx + 1}. {q.questionText}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      difficulty === "Easy" ? "bg-emerald-100 text-emerald-800" : difficulty === "Medium" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {difficulty} ({accuracy}% Accuracy)
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <strong className="text-emerald-600 dark:text-emerald-400">Correct Answer:</strong> {optionLetters[q.correctOption]}. {q.options[q.correctOption]}
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (isMobileScreen) {
    return (
      <div className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-white">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-extrabold">Desktop or Laptop Required</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Live interactive quizzes, class assessments, and proctored examinations cannot be attempted on mobile screens. A minimum screen resolution of 768px with full keyboard access is required to ensure academic integrity.
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-slate-500 font-mono">
            Please log in from a laptop or desktop computer to participate.
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="btn-saas-outline w-full text-xs py-2.5 font-bold cursor-pointer"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const isImmersiveFullscreen = studentJoined || session.status === "QUESTION_ACTIVE" || session.status === "QUESTION_ENDED";

  return (
    <div className={isImmersiveFullscreen ? "fixed inset-0 z-[9999] bg-white dark:bg-slate-900 flex flex-col p-4 sm:p-6 overflow-y-auto font-sans" : "w-full flex flex-col font-sans space-y-5"}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Return"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Live Interactive Assessment
              </h1>
              {/* Only show Host PIN badge if user is in Faculty Mode AND session is active */}
              {activeRole === "FACULTY" && session.status !== "SETUP" && session.pin && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Host PIN: {session.pin}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Real-time student participation with synchronized timer, lobby synchronization, and live telemetry.
            </p>
          </div>
        </div>

        {/* Role Mode Toggle & Reset (Only visible to faculty members) */}
        {isFacultyUser && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetAndStartNewQuiz}
              className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="End active session and start a fresh quiz"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset &amp; New Quiz</span>
            </button>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveRole("STUDENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeRole === "STUDENT"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Student View
              </button>
              <button
                onClick={() => setActiveRole("FACULTY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeRole === "FACULTY"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Faculty Host Studio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ─── 1. STUDENT VIEW ─── */}
      {/* ========================================================================= */}
      {activeRole === "STUDENT" && (
        <div className="w-full max-w-4xl mx-auto py-2">
          {!studentJoined ? (
            /* Student: PIN Entry & Session Discovery Screen */
            <div className="space-y-5 max-w-xl mx-auto">
              {/* Active Session Auto-Detected Banner */}
              {session.status !== "SETUP" && session.pin && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Classroom Session Active
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      PIN: <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm tracking-wider">{session.pin}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {session.courseName} ({session.courseCode})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Instructor: {session.facultyName} &bull; Class: {session.className}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{session.joinedStudents.length} Students Joined</span>
                      {session.isProctored && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          🛡️ Proctored
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStudentJoin(undefined, session.pin)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Quick Join Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Standard PIN Entry Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Join Live Interactive Assessment
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit session PIN displayed on your classroom screen.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {user ? `${user.first_name} ${user.last_name || ""}` : "Student"}
                    </span>
                  </div>
                </div>

                <div className="max-w-md mx-auto py-2 space-y-5">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
                    <Radio className="h-6 w-6" />
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Enter Classroom PIN
                    </h3>
                    <p className="text-xs text-slate-500">
                      Synchronized real-time telemetry, questions, and responses.
                    </p>
                  </div>

                  <form onSubmit={handleStudentJoin} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        value={enteredPin}
                        onChange={(e) => {
                          setEnteredPin(e.target.value);
                          setJoinError(null);
                        }}
                        placeholder="ENTER 6-DIGIT PIN"
                        className="w-full h-14 px-4 text-center text-2xl font-mono font-bold tracking-[0.35em] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase transition-all"
                      />
                    </div>

                    {joinError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{joinError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/25 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
                    >
                      <span className="text-white font-bold">Connect &amp; Join Session</span>
                      <ArrowRight className="h-4 w-4 text-white" />
                    </button>
                  </form>
                </div>

                <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {session.status === "SETUP" ? (
                    <span>Host Status: Standing by. You may type your PIN above as soon as it appears on the screen.</span>
                  ) : (
                    <span>Institutional Academic Integrity Protocol Active &bull; Instant Synchronization</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Student: Inside Live Session */
            <div className="space-y-5">
              {/* Connected Header */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {session.courseName} ({session.courseCode})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instructor: {session.facultyName} &bull; Class: {session.className}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected ({session.joinedStudents.length} Students)
                  </span>

                  {session.isProctored && (
                    <button
                      type="button"
                      onClick={handleToggleFullscreen}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                      title="Toggle Fullscreen"
                    >
                      {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setStudentJoined(false);
                      setEnteredPin("");
                      setJoinError(null);
                      setSession((prev) => ({
                        ...prev,
                        status: "SETUP",
                        pin: "",
                        joinedStudents: [],
                        responses: {},
                      }));
                      if (onBack) onBack();
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-semibold cursor-pointer ml-1"
                  >
                    Leave Room
                  </button>
                </div>
              </div>

              {/* State A: LOBBY (Waiting for Faculty to Launch Question) */}
              {session.status === "LOBBY" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                    <Radio className="h-8 w-8 animate-pulse" />
                  </div>

                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      You are in the waiting room
                    </h3>
                    <p className="text-xs text-slate-500">
                      Waiting for Professor {session.facultyName} to start the first question on the classroom screen...
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>The question and countdown timer will automatically appear right here in real time.</span>
                  </div>

                  {/* Classmates in lobby */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 w-full max-w-md">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2">
                      Connected Classmates ({session.joinedStudents.length}):
                    </span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {session.joinedStudents.map((stu) => (
                        <span
                          key={stu.id}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {stu.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* State B: QUESTION ACTIVE (Student is answering) */}
              {session.status === "QUESTION_ACTIVE" && !currentQuestion && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 animate-spin">
                    <RotateCcw className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Receiving Active Question...</h3>
                    <p className="text-xs text-slate-500">Connecting to host broadcast stream. Question is loading.</p>
                  </div>
                </div>
              )}

              {session.status === "QUESTION_ACTIVE" && currentQuestion && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                  {/* Proctoring Mode Banner */}
                  {session.isProctored ? (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">
                          Proctored Mode &bull; Tab switching and window minimization are strictly recorded.
                        </span>
                      </div>
                      {currentStudentViolations > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 shrink-0">
                          {currentStudentViolations} Warning{currentStudentViolations > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs font-semibold">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Open Classroom Mode &bull; Active learning enabled.</span>
                    </div>
                  )}

                  {/* Violation Alert Dialog */}
                  {proctorWarningModal && (
                    <div className="p-4 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                          <AlertCircle className="h-4 w-4 text-rose-600" />
                          <span>Academic Integrity Warning! Tab Switch Detected</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProctorWarningModal(false)}
                          className="text-[11px] font-bold underline cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        You navigated away from the exam tab. This incident has been logged. Total warnings: <strong>{currentStudentViolations}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Countdown Timer Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                        Question {session.currentQuestionIndex + 1} of {session.questions.length}
                      </span>
                      <span className="text-xs text-slate-400">
                        {currentQuestion.points} Points &bull; Single Choice
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1.5 rounded-xl border font-mono font-bold text-sm flex items-center gap-1.5 ${
                          secondsRemaining <= 5
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                        <span>{secondsRemaining}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {currentQuestion.questionText}
                    </h3>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt, idx) => {
                      const isSelected = selectedStudentAnswer === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={hasSubmittedCurrentQuestion}
                          onClick={() => handleStudentSubmitAnswer(idx)}
                          className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          } ${hasSubmittedCurrentQuestion ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center border ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {optionLetters[idx]}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {opt}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              Selected ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {hasSubmittedCurrentQuestion && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Answer submitted ✓ Response locked in.
                    </div>
                  )}

                  {/* Student Active Question Status: Hide Live Option Breakdown to Prevent Cheating */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-medium text-[11px]">
                        {hasSubmittedCurrentQuestion
                          ? "Response registered. Voting distribution and official explanation will be revealed when timer expires."
                          : "Class voting distribution is hidden during question to ensure independent answers."}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      {responseStats.totalVotes} / {session.joinedStudents.length} Submitted
                    </span>
                  </div>
                </div>
              )}

              {/* State C: QUESTION ENDED (Review & Distribution Chart) */}
              {session.status === "QUESTION_ENDED" && currentQuestion && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Question {session.currentQuestionIndex + 1} Ended
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentQuestion.questionText}
                      </h3>
                    </div>
                  </div>

                  {/* Explanation card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Instructor Explanation:
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>

                  {/* Class Voting Distribution */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Final Class Voting Distribution ({responseStats.totalVotes} Submissions):
                    </span>

                    <div className="space-y-2">
                      {currentQuestion.options.map((opt, idx) => {
                        const isCorrect = idx === currentQuestion.correctOption;
                        const pct = responseStats.percentages[idx];
                        const count = responseStats.counts[idx];

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {optionLetters[idx]}.
                                </span>
                                <span className={isCorrect ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}>
                                  {opt}
                                </span>
                                {isCorrect && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                    Correct ✓
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-xs text-slate-500">
                                {pct}% ({count} votes)
                              </span>
                            </div>

                            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-700 ${isCorrect ? "bg-emerald-500" : "bg-blue-600"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-center text-xs text-slate-400 italic">
                    Waiting for instructor to transition to the next question...
                  </p>
                </div>
              )}

              {/* State D: COMPLETED — Render Full End-of-Session Performance & Analytics Report */}
              {session.status === "COMPLETED" && renderEndSessionReport(true)}
            </div>
          )}

          {/* Student Floating PIP Camera for Proctored Mode */}
          {studentJoined && session.isProctored && (
            <div className="fixed bottom-6 right-6 z-40 bg-slate-900 border-2 border-blue-500 rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-1.5">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-36 h-28 rounded-xl object-cover bg-black"
                />
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  AI Verified
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-300">
                Proctored Assessment Active
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── 2. FACULTY HOST STUDIO ─── */}
      {/* ========================================================================= */}
      {activeRole === "FACULTY" && (
        <div className="w-full space-y-5">
          {session.status === "COMPLETED" ? (
            /* FACULTY COMPLETED: End-of-Session Performance & Analytics Report */
            renderEndSessionReport(false)
          ) : session.status === "SETUP" ? (
            /* FACULTY STATE 1: PREPARATION & SETUP SCREEN (NOT STARTED YET) */
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Live Assessment Configuration
                  </h2>
                  <p className="text-xs text-slate-500">
                    Prepare your class cohort, curriculum subject, and questions before starting the live session.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Status: Ready to Launch
                </span>
              </div>

              {/* Class & Subject Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Target Cohort / Class Group:
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {availableCohorts.map((cohort) => (
                      <option key={cohort} value={cohort}>
                        {cohort}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Subject / Curriculum Course:
                  </label>
                  <select
                    value={selectedCourseCode}
                    onChange={(e) => {
                      setSelectedCourseCode(e.target.value);
                      const found = courses.find((c) => c.code === e.target.value);
                      if (found) {
                        setSelectedCourseName(found.name);
                      } else setSelectedCourseName("");
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a published course</option>
                    {courses.map((c) => (
                        <option key={c.id || c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Exam Mode & Timer Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Proctoring Integrity Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSessionState({ ...session, isProctored: true })}
                      className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                        session.isProctored
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>Proctored Mode</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSessionState({ ...session, isProctored: false })}
                      className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                        !session.isProctored
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Unproctored Mode</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Default Timer Duration:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCustomTimerInput(t)}
                        className={`h-10 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          customTimerInput === t
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Questions Management Toolbar */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Prepared Question Pool ({session.questions.length} MCQs):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddMcqModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Custom MCQ</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label="Number of MCQs to generate"
                        value={mcqBatchCount}
                        onChange={(e) => setMcqBatchCount(Number(e.target.value))}
                        className="h-8 px-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                      >
                        <option value={3}>3 MCQs</option>
                        <option value={5}>5 MCQs</option>
                        <option value={10}>10 MCQs</option>
                        <option value={15}>15 MCQs</option>
                        <option value={20}>20 MCQs</option>
                      </select>
                      <button
                        type="button"
                        disabled={isGeneratingAi}
                        onClick={handleAiGenerateQuestions}
                        className="px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs"
                      >
                        <Sparkles className={`h-3.5 w-3.5 text-blue-600 ${isGeneratingAi ? "animate-spin" : ""}`} />
                        <span>{isGeneratingAi ? "Generating..." : `AI Generate ${mcqBatchCount} MCQs`}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {session.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Question {idx + 1} &bull; {q.points} pts
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Correct: Option {optionLetters[q.correctOption]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        {q.questionText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Live Session Action Card */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Start Session &amp; Generate PIN
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Creates an active classroom room, generates a unique 6-digit PIN, and opens the lobby on your screen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartNewLiveSession}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                  style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
                >
                  <Play className="h-4 w-4 fill-white text-white" />
                  <span className="text-white font-bold text-xs">Start Live Session &amp; Open Lobby</span>
                </button>
              </div>
            </div>
          ) : (
            /* FACULTY STATE 2: ACTIVE LIVE SESSION HOST STUDIO (STARTED!) */
            <div className="w-full space-y-5">
              {/* Active Session Top Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {session.courseName} ({session.courseCode}) &bull; {session.className}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live session active &bull; Questions: {session.questions.length} &bull; Status: {session.status}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEndLiveSession}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    End Session &amp; Back to Setup
                  </button>
                </div>
              </div>

              {/* Projector PIN Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                    Classroom Projector Display
                  </span>
                  <h2 className="text-xl font-bold tracking-tight">
                    {session.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Direct students in <strong>{session.className}</strong> to enter the 6-digit PIN:
                  </p>
                </div>

                {/* Giant 6-Digit PIN Box */}
                <div className="flex items-center gap-3">
                  <div
                    onClick={handleCopyPin}
                    className="px-6 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-3xl font-mono font-bold tracking-[0.25em] text-white hover:bg-slate-800 transition-all cursor-pointer shadow-lg select-all"
                    title="Click to copy PIN"
                  >
                    {session.pin}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer"
                    title="Copy PIN"
                  >
                    {copiedPin ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Lobby Telemetry Bar: Connected Students Roster */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Connected Students in Lobby:
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {session.joinedStudents.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {session.joinedStudents.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Waiting for students to enter PIN...</span>
                  ) : (
                    session.joinedStudents.map((stu) => (
                      <span
                        key={stu.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {stu.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Question Launcher & Live Bar Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Questions Selector & Controls */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      MCQ Questions ({session.questions.length})
                    </h3>
                    <span className="text-[11px] text-slate-900 dark:text-white font-bold font-mono">
                      Active: #{session.currentQuestionIndex + 1}
                    </span>
                  </div>

                  {/* Proctoring Mode Toggle */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {session.isProctored ? (
                          <ShieldAlert className="h-4 w-4 text-rose-600" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Exam Proctoring Mode
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {session.isProctored ? "Proctored" : "Unproctored"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => updateSessionState({ ...session, isProctored: true })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          session.isProctored
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Proctored</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSessionState({ ...session, isProctored: false })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          !session.isProctored
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Unproctored</span>
                      </button>
                    </div>
                  </div>

                  {/* Timer Duration Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Question Timer:</span>
                      <span className="text-slate-900 dark:text-white font-mono font-bold">{customTimerInput}s</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[15, 30, 45, 60].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCustomTimerInput(t)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            customTimerInput === t
                              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {t}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {session.questions.map((q, idx) => {
                      const isCurrent = session.currentQuestionIndex === idx;
                      const responseCount = Object.keys(session.responses[q.id] || {}).length;

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleLaunchQuestion(idx, customTimerInput)}
                          className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                            isCurrent
                              ? "bg-slate-100 dark:bg-slate-800 border-slate-900 dark:border-white shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Q{idx + 1}. {q.points} pts
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {responseCount} votes
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {q.questionText}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {session.status === "QUESTION_ACTIVE" ? (
                      <button
                        onClick={handleEndQuestionManually}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        End Question Now &amp; Show Chart
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLaunchQuestion(session.currentQuestionIndex, customTimerInput)}
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Launch Q{session.currentQuestionIndex + 1} ({customTimerInput}s)</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleNextQuestion}
                        className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Next Question →
                      </button>
                      <button
                        onClick={handleRestartSession}
                        className="py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        Reset Session
                      </button>
                    </div>

                    <button
                      onClick={() => updateSessionState({ ...session, status: "COMPLETED" })}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Finish Quiz &amp; Generate Analytics Report</span>
                    </button>
                  </div>
                </div>

                {/* Right: Live Interactive Results & Distribution Bar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Live Question {session.currentQuestionIndex + 1} of {session.questions.length}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Status: <strong className="text-slate-700 dark:text-slate-200">{session.status}</strong>
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {currentQuestion?.questionText}
                      </h3>
                    </div>

                    {/* Big Live Countdown Timer */}
                    <div
                      className={`px-4 py-2 rounded-xl border font-mono font-bold text-xl flex items-center gap-2 shrink-0 ${
                        session.status === "QUESTION_ACTIVE"
                          ? secondsRemaining <= 5
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                      <span>{session.status === "QUESTION_ACTIVE" ? `${secondsRemaining}s` : "00s"}</span>
                    </div>
                  </div>

                  {/* Submission Telemetry Bar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Student Responses: {responseStats.totalVotes} / {session.joinedStudents.length} ({session.joinedStudents.length > 0 ? Math.round((responseStats.totalVotes / session.joinedStudents.length) * 100) : 0}%)
                    </span>
                    <span className="text-slate-500 font-medium">
                      {session.status === "QUESTION_ACTIVE" ? "Responses updating in real-time" : "Voting closed"}
                    </span>
                  </div>

                  {/* Distribution Bar Chart */}
                  <div className="space-y-4 pt-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span>Options Distribution</span>
                    </h4>

                    <div className="space-y-3.5">
                      {currentQuestion?.options.map((opt, idx) => {
                        const isCorrect = idx === currentQuestion.correctOption;
                        const pct = responseStats.percentages[idx];
                        const votes = responseStats.counts[idx];

                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center">
                                  {optionLetters[idx]}
                                </span>
                                <span className={isCorrect ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-medium text-slate-800 dark:text-slate-200"}>
                                  {opt}
                                </span>
                                {isCorrect && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Correct Answer ✓
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-xs text-slate-500">
                                {pct}% ({votes} votes)
                              </span>
                            </div>

                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-700 ${isCorrect ? "bg-emerald-500" : "bg-blue-600"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── ADD CUSTOM MCQ MODAL ─── */}
      {/* ========================================================================= */}
      {isAddMcqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create Custom Live MCQ
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMcqModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomMcq} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Question Prompt:
                </label>
                <textarea
                  rows={2}
                  required
                  value={newMcqPrompt}
                  onChange={(e) => setNewMcqPrompt(e.target.value)}
                  placeholder="e.g. What is the time complexity of binary search?"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Options (A, B, C, D):
                </label>
                {newMcqOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-slate-500">
                      {optionLetters[i]}
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newMcqOptions];
                        copy[i] = e.target.value;
                        setNewMcqOptions(copy);
                      }}
                      placeholder={`Option ${optionLetters[i]}`}
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      checked={newMcqCorrect === i}
                      onChange={() => setNewMcqCorrect(i)}
                      className="accent-blue-600 cursor-pointer"
                      title="Select as correct answer"
                    />
                  </div>
                ))}
                <span className="text-[10px] text-slate-400 block pl-8">
                  Click radio button to mark the correct choice.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Explanation:
                </label>
                <input
                  type="text"
                  value={newMcqExplanation}
                  onChange={(e) => setNewMcqExplanation(e.target.value)}
                  placeholder="Why is this answer correct?"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMcqModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
