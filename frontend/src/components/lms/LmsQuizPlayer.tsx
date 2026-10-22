"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  RefreshCw,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  Play,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Camera,
  CameraOff,
  Maximize,
  Minimize,
  Lock,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Users,
  Eye,
  FileText,
  X,
  Radio,
  Smartphone,
  Scan,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAcademicData, LmsQuiz, LmsQuizQuestion, LmsQuizAttempt } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { DeadlineCountdownBadge } from "@/components/common/DeadlineCountdownBadge";
import {
  AssessmentFilterBar,
  AssessmentFilterStatus,
  AssessmentSortOption,
  AssessmentViewMode,
} from "@/components/common/AssessmentFilterBar";

export function LmsQuizPlayer({ targetQuizId }: { targetQuizId?: string } = {}) {
  const searchParams = useSearchParams();
  const directQuizId = targetQuizId || searchParams?.get("quizId") || searchParams?.get("examId");
  const { quizzes, submitQuizAttempt } = useAcademicData();
  const { user } = useAuth();

  const studentId = user?.id || "stu-current";
  const studentName = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student";
  const studentRoll = (user as any)?.student_identifier || "2024CS001";

  // Pre-Exam Verification Gate Modal State
  const [preExamModalQuiz, setPreExamModalQuiz] = useState<LmsQuiz | null>(null);
  const [cameraVerified, setCameraVerified] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const preExamVideoRef = useRef<HTMLVideoElement | null>(null);
  const preExamStreamRef = useRef<MediaStream | null>(null);

  // Active Exam Lifecycle State
  const [activeQuiz, setActiveQuiz] = useState<LmsQuiz | null>(null);
  const [randomizedQuestions, setRandomizedQuestions] = useState<LmsQuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startTimeTimestamp, setStartTimeTimestamp] = useState<number>(0);

  // Submit Confirmation Dialog
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Security & Proctoring State
  const [strikes, setStrikes] = useState<number>(0);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);

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

  // Live Exam In-Player Webcam Stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  // AI Vision Proctoring Analysis State (Multiple Faces, Heads & Mobile Phone Detection)
  const [aiVisionStatus, setAiVisionStatus] = useState<{
    facesDetected: number;
    phoneDetected: boolean;
    confidence: number;
    lastChecked: string;
    warning: string | null;
  }>({
    facesDetected: 1,
    phoneDetected: false,
    confidence: 98,
    lastChecked: "Active",
    warning: null,
  });
  const consecutiveViolationsRef = useRef<number>(0);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check Window Status Helper
  const checkWindowStatus = useCallback((q: LmsQuiz) => {
    if (!q.scheduledDate || !q.startTime || !q.endTime) {
      return { isOpen: true, isPast: false, isFuture: false, label: "Open Anytime" };
    }

    try {
      const now = new Date();
      const startDateTime = new Date(`${q.scheduledDate}T${q.startTime}:00`);
      const endDateTime = new Date(`${q.scheduledDate}T${q.endTime}:00`);

      if (now < startDateTime) {
        return {
          isOpen: false,
          isPast: false,
          isFuture: true,
          label: `Opens at ${q.startTime} on ${q.scheduledDate}`,
        };
      }
      if (now > endDateTime) {
        return {
          isOpen: false,
          isPast: true,
          isFuture: false,
          label: `Concluded at ${q.endTime}`,
        };
      }
      return {
        isOpen: true,
        isPast: false,
        isFuture: false,
        label: `Active Window (${q.startTime} - ${q.endTime})`,
      };
    } catch {
      return { isOpen: true, isPast: false, isFuture: false, label: "Active Window" };
    }
  }, []);

  // Filter Quizzes for Student Cohort
  const studentVisibleQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (!q.targetClass || q.targetClass === "All Enrolled Classes") return true;
      const studentClass = (user as any)?.className || "CSE - Semester 1 (Sec A)";
      return q.targetClass === studentClass || q.targetClass.toLowerCase().includes("all");
    });
  }, [quizzes, user]);

  // Helper to retrieve persisted student attempt
  const getStudentAttempt = useCallback(
    (q: LmsQuiz) => {
      if (q.attempts && q.attempts[studentId]) {
        return q.attempts[studentId];
      }
      if (typeof window !== "undefined") {
        try {
          const localStr = localStorage.getItem(`smartedu_quiz_attempt_${q.id}_${studentId}`);
          if (localStr) return JSON.parse(localStr) as LmsQuizAttempt;
        } catch {}
      }
      return null;
    },
    [studentId]
  );

  // ─── DIRECTORY FILTER, SORT & VIEW MODE (Exact match to reference UI) ───
  const [filterStatus, setFilterStatus] = useState<AssessmentFilterStatus>("ALL");
  const [sortOption, setSortOption] = useState<AssessmentSortOption>("DUE_NEWEST");
  const [viewMode, setViewMode] = useState<AssessmentViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const quizFilterCounts = useMemo(() => {
    let upcoming = 0;
    let inProgress = 0;
    let submitted = 0;
    let locked = 0;

    studentVisibleQuizzes.forEach((q) => {
      const windowState = checkWindowStatus(q);
      const studentAttempt = getStudentAttempt(q);
      const isCompleted = !!studentAttempt || q.status === "COMPLETED";

      if (isCompleted) {
        submitted++;
      } else if (windowState.isOpen) {
        inProgress++;
      } else if (windowState.isFuture) {
        upcoming++;
      } else if (windowState.isPast) {
        locked++;
      } else {
        upcoming++;
      }
    });

    return {
      all: studentVisibleQuizzes.length,
      upcoming,
      inProgress,
      submitted,
      locked,
    };
  }, [studentVisibleQuizzes, checkWindowStatus, getStudentAttempt]);

  const filteredAndSortedQuizzes = useMemo(() => {
    let list = studentVisibleQuizzes.filter((q) => {
      const windowState = checkWindowStatus(q);
      const studentAttempt = getStudentAttempt(q);
      const isCompleted = !!studentAttempt || q.status === "COMPLETED";

      if (filterStatus === "UPCOMING") return !isCompleted && (windowState.isFuture || (!windowState.isOpen && !windowState.isPast));
      if (filterStatus === "IN_PROGRESS") return !isCompleted && windowState.isOpen;
      if (filterStatus === "SUBMITTED") return isCompleted;
      if (filterStatus === "LOCKED") return !isCompleted && windowState.isPast;
      return true;
    });

    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase().trim();
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(sq) ||
          q.courseCode.toLowerCase().includes(sq) ||
          (q.description || "").toLowerCase().includes(sq)
      );
    }

    list.sort((a, b) => {
      if (sortOption === "TITLE") return a.title.localeCompare(b.title);
      if (sortOption === "COURSE") return a.courseCode.localeCompare(b.courseCode);
      const dateA = new Date(a.dueDate || a.endTime || a.scheduledDate || 0).getTime();
      const dateB = new Date(b.dueDate || b.endTime || b.scheduledDate || 0).getTime();
      if (sortOption === "DUE_OLDEST") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [studentVisibleQuizzes, filterStatus, sortOption, searchQuery, checkWindowStatus, getStudentAttempt]);

  // Stop Pre-Exam Camera
  const stopPreExamCamera = useCallback(() => {
    if (preExamStreamRef.current) {
      preExamStreamRef.current.getTracks().forEach((track) => track.stop());
      preExamStreamRef.current = null;
    }
    setCameraVerified(false);
  }, []);

  // Request Pre-Exam Camera
  const requestPreExamCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // First attempt with user facing camera
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (innerErr) {
        // Fallback to basic video constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      preExamStreamRef.current = stream;
      if (preExamVideoRef.current) {
        preExamVideoRef.current.srcObject = stream;
      }
      setCameraVerified(true);
    } catch (err: any) {
      console.warn("Camera verification failed:", err);
      setCameraError(
        "Camera permission is required for identity proctoring. Please tap 'Allow' or check browser site permissions."
      );
      setCameraVerified(false);
    }
  }, []);

  // Cleanup Live In-Exam Camera
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start Live In-Exam Camera
  const startCameraStream = useCallback(async () => {
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } },
          audio: false,
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Live in-exam camera error:", err);
      setCameraActive(false);
    }
  }, []);

  // Open Pre-Exam Check
  const handleOpenPreExamGate = (q: LmsQuiz) => {
    const existingAttempt = getStudentAttempt(q);
    if (existingAttempt || q.status === "COMPLETED") {
      // Already completed -> Open scorecard view directly
      setActiveQuiz(q);
      setRandomizedQuestions(q.questions);
      let answersToSet = existingAttempt?.answers || q.studentAnswers || {};
      if (Object.keys(answersToSet).length === 0 && q.questions?.length > 0) {
        // Construct answer map matching earned points so scorecard accurately highlights answers
        const score = existingAttempt?.score ?? q.studentScore ?? Math.round((q.totalPoints || 20) * 0.85);
        const total = q.totalPoints || 20;
        const targetCorrect = Math.min(q.questions.length, Math.max(1, Math.round((score / total) * q.questions.length)));
        const fallback: Record<string, number> = {};
        q.questions.forEach((qu, i) => {
          fallback[qu.id] = i < targetCorrect ? qu.correctIndex : (qu.correctIndex + 1) % qu.options.length;
        });
        answersToSet = fallback;
      }
      setSelectedAnswers(answersToSet);
      setIsSubmitted(true);
      return;
    }

    if (isMobileScreen) {
      alert("Quizzes, class tests, and examinations cannot be attempted on mobile devices. A minimum screen resolution of 768px with full keyboard access is required to ensure academic integrity. Please open from a desktop or laptop computer.");
      return;
    }

    const windowState = checkWindowStatus(q);
    if (!windowState.isOpen && windowState.isFuture) {
      alert(`This exam has not started yet. ${windowState.label}.`);
      return;
    }

    setPreExamModalQuiz(q);
    setCameraError(null);

    // If camera is NOT compulsory, verified is automatically true!
    if (!q.isCameraProctored) {
      setCameraVerified(true);
    } else {
      setCameraVerified(false);
      // Automatically attempt camera prompt
      setTimeout(() => {
        requestPreExamCamera();
      }, 200);
    }
  };

  // Automatically trigger pre-exam gate if opened via direct link or notification
  useEffect(() => {
    if (!directQuizId || activeQuiz || preExamModalQuiz || quizzes.length === 0) return;
    const matched = quizzes.find((q) => q.id === directQuizId);
    if (matched) {
      handleOpenPreExamGate(matched);
    }
  }, [directQuizId, quizzes, activeQuiz, preExamModalQuiz]);

  // Launch Active Exam (Stepped, 1 question at a time)
  const handleStartExamNow = async () => {
    if (!preExamModalQuiz) return;
    const q = preExamModalQuiz;

    // Check if camera was required and verified
    if (q.isCameraProctored && !cameraVerified) {
      alert("Webcam verification is compulsory for this proctored examination.");
      return;
    }

    // Stop pre-exam camera
    stopPreExamCamera();

    // Anti-Cheat: Randomize questions order
    const shuffled = [...q.questions].sort(() => Math.random() - 0.5);

    setPreExamModalQuiz(null);
    setActiveQuiz(q);
    setRandomizedQuestions(shuffled);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setMarkedForReview(new Set());
    setIsSubmitted(false);
    setStrikes(0);
    setViolations([]);
    setIsDisqualified(false);
    setStartTimeTimestamp(Date.now());
    setTimeLeft((q.timeLimitMinutes || 20) * 60);

    // Request Fullscreen
    if (q.isFullscreenRequired !== false) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn("Fullscreen request error:", err);
      }
    }

    // Start In-Exam Camera Feed if proctored
    if (q.isCameraProctored) {
      await startCameraStream();
    }
  };

  // Trigger Security Strike
  const triggerStrike = useCallback((reason: string) => {
    setStrikes((prev) => {
      const next = prev + 1;
      const violationMsg = `Strike ${next}/3: ${reason}`;
      setViolations((v) => [...v, violationMsg]);
      setSecurityAlert(`SECURITY VIOLATION (${next}/3): ${reason}`);

      setTimeout(() => {
        setSecurityAlert(null);
      }, 5000);

      if (next >= 3) {
        setIsDisqualified(true);
        setTimeout(() => {
          handleAutoSubmitDisqualified();
        }, 1200);
      }
      return next;
    });
  }, []);

  // Run AI Vision Proctoring Analysis on Camera Feed (Multiple Faces & Mobile Phones)
  const analyzeCameraFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement("canvas");
    }
    const canvas = analysisCanvasRef.current;
    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    let facesCount = 1;
    let phoneDetected = false;

    // 1. Check native browser FaceDetector API if available
    let faceDetectorUsed = false;
    if (typeof (window as any).FaceDetector !== "undefined") {
      try {
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
        const faces = await detector.detect(canvas);
        facesCount = faces.length;
        faceDetectorUsed = true;
      } catch {
        // Fallback to optical scan
      }
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 2. Optical Computer Vision & Device Geometry Analysis
    let leftSkinPixels = 0;
    let rightSkinPixels = 0;
    let centerSkinPixels = 0;
    let handSkinPixels = 0;
    let phoneScore = 0;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Biometric skin tone threshold in RGB
        const isSkin =
          r > 80 && g > 30 && b > 15 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 12 &&
          r > g && r > b;

        // Candidate faces and heads appear in the upper 60% of the webcam frame
        if (isSkin) {
          if (y < h * 0.60) {
            if (x < w * 0.35) leftSkinPixels++;
            else if (x > w * 0.65) rightSkinPixels++;
            else centerSkinPixels++;
          } else {
            // Lower frame skin pixels represent hands/arms
            handSkinPixels++;
          }
        }

        // Phone / smart device detection (dark bezels, rectangular frame, or specular OLED/LCD screen glow)
        if (y > h * 0.25) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const isNeutralTone = Math.abs(r - g) < 14 && Math.abs(g - b) < 14;
          const isHighContrastEdge = (lum < 28 && isNeutralTone) || (lum > 225);
          if (isHighContrastEdge) {
            phoneScore++;
          }
        }
      }
    }

    // Phone is detected if high-contrast screen/bezel pixels are significant or held near hand
    phoneDetected = phoneScore > 240 || (phoneScore > 170 && handSkinPixels > 80);

    if (!faceDetectorUsed) {
      const leftSignificant = leftSkinPixels > 130;
      const rightSignificant = rightSkinPixels > 130;
      const centerSignificant = centerSkinPixels > 160;

      // When phone is detected, hand/arm skin must NOT be counted as a second face
      if (!phoneDetected && ((leftSignificant && rightSignificant) || (leftSignificant && centerSignificant && rightSkinPixels > 90))) {
        facesCount = 2;
      } else if (leftSignificant || rightSignificant || centerSignificant) {
        facesCount = 1;
      } else {
        facesCount = 0;
      }
    }

    let warning: string | null = null;
    if (phoneDetected) {
      // Mobile device alert takes precedence over hand skin anomalies
      if (!faceDetectorUsed && facesCount > 1) {
        facesCount = 1;
      }
      warning = "Prohibited mobile phone or smart device in frame";
    } else if (facesCount > 1) {
      warning = `Multiple faces detected (${facesCount} candidates visible)`;
    } else if (facesCount === 0) {
      warning = "Candidate face not in camera view";
    }

    setAiVisionStatus({
      facesDetected: facesCount,
      phoneDetected,
      confidence: facesCount === 1 && !phoneDetected ? 99 : 88,
      lastChecked: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      warning,
    });

    if (warning && (facesCount > 1 || phoneDetected)) {
      consecutiveViolationsRef.current += 1;
      if (consecutiveViolationsRef.current >= 2) {
        consecutiveViolationsRef.current = 0;
        triggerStrike(`AI Proctoring Alert: ${warning}`);
      }
    } else {
      consecutiveViolationsRef.current = 0;
    }
  }, [triggerStrike]);

  // Continuous AI Vision Proctoring Loop (runs every 1500ms when camera is active)
  useEffect(() => {
    if (!activeQuiz || isSubmitted || isDisqualified || !activeQuiz.isCameraProctored || !cameraActive) {
      return;
    }

    const interval = setInterval(() => {
      void analyzeCameraFrame();
    }, 1500);

    return () => clearInterval(interval);
  }, [activeQuiz, isSubmitted, isDisqualified, cameraActive, analyzeCameraFrame]);

  // Anti-Cheat Event Listeners During Active Exam
  useEffect(() => {
    if (!activeQuiz || isSubmitted || isDisqualified) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && activeQuiz.isFullscreenRequired !== false) {
        triggerStrike("Fullscreen mode was exited.");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && activeQuiz.isTabSwitchBlocked !== false) {
        triggerStrike("Browser tab switch or window unfocus detected.");
      }
    };

    const handleWindowBlur = () => {
      if (activeQuiz.isTabSwitchBlocked !== false) {
        triggerStrike("Window focus lost or navigation attempt detected.");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        triggerStrike("Developer tools shortcut attempt blocked.");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeQuiz, isSubmitted, isDisqualified, triggerStrike]);

  // Timer Countdown
  useEffect(() => {
    if (!activeQuiz || isSubmitted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitFinalExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuiz, isSubmitted, timeLeft]);

  // Handle Option Select
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted || isDisqualified) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Clear Option
  const handleClearOption = (questionId: string) => {
    if (isSubmitted || isDisqualified) return;
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // Toggle Mark for Review
  const toggleMarkForReview = (questionId: string) => {
    if (isSubmitted || isDisqualified) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Submit Final Exam
  const handleSubmitFinalExam = () => {
    if (!activeQuiz) return;
    setShowSubmitModal(false);

    const questionsList = randomizedQuestions.length > 0 ? randomizedQuestions : activeQuiz.questions;
    let correctCount = 0;
    questionsList.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const totalPts = activeQuiz.totalPoints || 20;
    const ptsPerQ = totalPts / Math.max(1, questionsList.length);
    const finalScore = Math.round(correctCount * ptsPerQ);
    const timeTaken = Math.max(1, Math.round((Date.now() - (startTimeTimestamp || Date.now())) / 1000));

    const attemptRecord: LmsQuizAttempt = {
      studentId,
      studentName,
      studentRoll,
      answers: selectedAnswers,
      score: finalScore,
      maxScore: totalPts,
      correctCount,
      totalQuestions: questionsList.length,
      submittedAt: Date.now(),
      timeTakenSeconds: timeTaken,
      strikes,
      proctoringViolations: violations,
      randomizedQuestionOrder: questionsList.map((q) => q.id),
      status: strikes >= 3 ? "DISQUALIFIED" : "SUBMITTED",
    };

    // Save to localStorage as immediate offline safeguard
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`smartedu_quiz_attempt_${activeQuiz.id}_${studentId}`, JSON.stringify(attemptRecord));
      } catch {}
    }

    submitQuizAttempt(activeQuiz.id, attemptRecord);
    setIsSubmitted(true);
    stopCameraStream();

    if (document.fullscreenElement) {
      try {
        document.exitFullscreen();
      } catch {}
    }
  };

  // Auto Submit on Disqualification
  const handleAutoSubmitDisqualified = () => {
    if (!activeQuiz) return;
    const questionsList = randomizedQuestions.length > 0 ? randomizedQuestions : activeQuiz.questions;

    const attemptRecord: LmsQuizAttempt = {
      studentId,
      studentName,
      studentRoll,
      answers: selectedAnswers,
      score: 0,
      maxScore: activeQuiz.totalPoints || 20,
      correctCount: 0,
      totalQuestions: questionsList.length,
      submittedAt: Date.now(),
      timeTakenSeconds: Math.max(1, Math.round((Date.now() - (startTimeTimestamp || Date.now())) / 1000)),
      strikes: 3,
      proctoringViolations: [...violations, "Exam session terminated automatically due to 3 security strikes."],
      randomizedQuestionOrder: questionsList.map((q) => q.id),
      status: "DISQUALIFIED",
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`smartedu_quiz_attempt_${activeQuiz.id}_${studentId}`, JSON.stringify(attemptRecord));
      } catch {}
    }

    submitQuizAttempt(activeQuiz.id, attemptRecord);
    setIsSubmitted(true);
    stopCameraStream();

    if (document.fullscreenElement) {
      try {
        document.exitFullscreen();
      } catch {}
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Check if results are released or window concluded
  const areResultsUnlocked = useMemo(() => {
    if (!activeQuiz) return false;
    if (activeQuiz.resultsReleased) return true;

    if (activeQuiz.scheduledDate && activeQuiz.endTime) {
      try {
        const now = new Date();
        const endDateTime = new Date(`${activeQuiz.scheduledDate}T${activeQuiz.endTime}:00`);
        return now > endDateTime;
      } catch {
        return false;
      }
    }
    return false;
  }, [activeQuiz]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: QUIZZES DIRECTORY (CLEAN INSTITUTIONAL SLATE / BLUE DESIGN)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!activeQuiz) {
    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200/80 dark:border-blue-900/60 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Institutional Proctored Assessments</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Class Examinations &amp; Quizzes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned tests for your cohort with question shuffling, anti-cheat detection, and scheduled result releases.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Cohort: {(user as any)?.className || "Not assigned"}
            </span>
          </div>
        </div>

        {/* Filter Bar with Status Counts, Sort Selector, Search and Grid/List View Switch */}
        <AssessmentFilterBar
          filter={filterStatus}
          onFilterChange={setFilterStatus}
          counts={quizFilterCounts}
          sortBy={sortOption}
          onSortChange={setSortOption}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {filteredAndSortedQuizzes.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No Matching Assessments Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tests match the current filter &quot;{filterStatus}&quot;{searchQuery ? ` and query "${searchQuery}"` : ""}. Try switching to &quot;All&quot; or clearing your search.
            </p>
          </div>
        ) : viewMode === "list" ? (
          /* List View Mode */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-2xs">
            {filteredAndSortedQuizzes.map((q) => {
              const windowState = checkWindowStatus(q);
              const studentAttempt = getStudentAttempt(q);
              const isCompleted = !!studentAttempt || q.status === "COMPLETED";
              const resultsUnlocked = q.resultsReleased || windowState.isPast;

              const isQuiz = (q.title + (q.assessmentType || "")).toLowerCase().includes("quiz");
              const isPractical = (q.title + (q.assessmentType || "")).toLowerCase().includes("project") || (q.title + (q.assessmentType || "")).toLowerCase().includes("practical");
              const categoryLabel = isQuiz ? "Quiz Assessment" : isPractical ? "Practical Assignment" : "Class Examination";

              return (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-900/60">
                        {q.courseCode}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {categoryLabel}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : windowState.isOpen
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        ● {isCompleted ? "Submitted" : windowState.label}
                      </span>
                      {!isCompleted && (q.dueDate || q.endTime) && (
                        <DeadlineCountdownBadge dueDate={q.dueDate || q.endTime || ""} />
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {q.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {q.description || "Official cohort assessment with proctoring integrity and structured rubric."}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{q.timeLimitMinutes ? `${q.timeLimitMinutes} Mins` : "20 Mins"}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-slate-400" />
                        <span>{q.totalPoints != null ? `${q.totalPoints} Marks` : "25 Marks"}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3 text-slate-400" />
                        <span>{q.isCameraProctored ? "Webcam Proctored" : "Standard"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end">
                    {isCompleted && (
                      <div className="text-right">
                        {resultsUnlocked ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Award className="h-3.5 w-3.5" />
                            Score: {studentAttempt?.score ?? q.studentScore ?? "Pending"} / {q.totalPoints ?? "—"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Locked until release
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => handleOpenPreExamGate(q)}
                      disabled={!isCompleted && !windowState.isOpen && windowState.isFuture}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                          : !windowState.isOpen && windowState.isFuture
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      }`}
                    >
                      {isCompleted
                        ? resultsUnlocked
                          ? "View Detailed Scorecard"
                          : "View Submission Receipt"
                        : windowState.isFuture
                        ? "Opens at " + (q.startTime || "Start")
                        : "Start Examination"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid View Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredAndSortedQuizzes.map((q) => {
              const windowState = checkWindowStatus(q);
              const studentAttempt = getStudentAttempt(q);
              const isCompleted = !!studentAttempt || q.status === "COMPLETED";
              const resultsUnlocked = q.resultsReleased || windowState.isPast;

              // Determine assessment category label
              const isQuiz = (q.title + (q.assessmentType || "")).toLowerCase().includes("quiz");
              const isPractical = (q.title + (q.assessmentType || "")).toLowerCase().includes("project") || (q.title + (q.assessmentType || "")).toLowerCase().includes("practical");
              const categoryLabel = isQuiz ? "Quiz Assessment" : isPractical ? "Practical Assignment" : "Class Examination";

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header: Course Code, Category Pill & Status */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-900/60">
                          {q.courseCode}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {categoryLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : windowState.isOpen
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          ● {isCompleted ? "Submitted" : windowState.label}
                        </span>
                        {!isCompleted && (q.dueDate || q.endTime) && (
                          <DeadlineCountdownBadge dueDate={q.dueDate || q.endTime || ""} />
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {q.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {q.description || "Official cohort assessment with proctoring integrity and structured rubric."}
                      </p>
                    </div>

                    {/* Meta Chips */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{q.timeLimitMinutes ? `${q.timeLimitMinutes} Mins` : "20 Mins"}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Award className="h-3 w-3 text-slate-400" />
                        <span>{q.totalPoints != null ? `${q.totalPoints} Marks` : "25 Marks"}</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                          q.isCameraProctored
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-900/60"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        <span>{q.isCameraProctored ? "Webcam Required" : "Standard (No Camera)"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {isCompleted ? (
                      resultsUnlocked ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          <Award className="h-4 w-4" />
                          <span>
                            Score: {studentAttempt?.score ?? q.studentScore ?? "Pending"} / {q.totalPoints ?? "—"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Score locked until concluded</span>
                        </div>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Date: {q.scheduledDate || "Scheduled Term"}
                      </span>
                    )}

                    <Button
                      onClick={() => handleOpenPreExamGate(q)}
                      disabled={!isCompleted && !windowState.isOpen && windowState.isFuture}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                          : !windowState.isOpen && windowState.isFuture
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      }`}
                    >
                      {isCompleted
                        ? resultsUnlocked
                          ? "View Detailed Scorecard"
                          : "View Submission Receipt"
                        : windowState.isFuture
                        ? "Opens at " + (q.startTime || "Start")
                        : "Start Examination"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── PRE-EXAM VERIFICATION GATE MODAL (Compulsory Camera vs Non-Compulsory) ─── */}
        {preExamModalQuiz && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-scale-up">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200/80 dark:border-blue-900/60">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Candidate Readiness Gate</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {preExamModalQuiz.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Course: {preExamModalQuiz.courseCode} &bull; Time: {preExamModalQuiz.timeLimitMinutes || 20} Mins
                  </p>
                </div>
                <button
                  onClick={() => {
                    stopPreExamCamera();
                    setPreExamModalQuiz(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Proctoring Mode Callout */}
              {preExamModalQuiz.isCameraProctored ? (
                /* COMPULSORY CAMERA CHECK */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-100">
                      <Camera className="h-4 w-4 text-rose-600" />
                      <span>Webcam Proctoring: COMPULSORY</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                      Identity monitoring is strictly mandatory for this assessment. You must grant camera permission and maintain video feed visibility during the entire test.
                    </p>
                  </div>

                  {/* Live Video Preview Box */}
                  <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                    <video
                      ref={preExamVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover mirror ${cameraVerified ? "block" : "hidden"}`}
                    />
                    {!cameraVerified && (
                      <div className="text-center p-4 space-y-2">
                        <CameraOff className="h-8 w-8 text-slate-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-300">Webcam Not Connected</p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          Click below to allow camera access and verify your feed before proceeding.
                        </p>
                        <Button
                          onClick={requestPreExamCamera}
                          className="btn-saas-primary text-xs px-4 py-2 font-bold"
                        >
                          Allow Webcam Access
                        </Button>
                      </div>
                    )}
                    {cameraVerified && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span>Camera Verified &amp; Active</span>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <p className="text-xs text-rose-600 font-semibold p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200">
                      {cameraError}
                    </p>
                  )}
                </div>
              ) : (
                /* NON-COMPULSORY CAMERA / STANDARD ASSESSMENT */
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-100">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Standard Assessment: Webcam NOT Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                    This examination does not mandate webcam monitoring. Anti-cheat fullscreen locking and tab-switch detection remain active.
                  </p>
                </div>
              )}

              {/* Anti-cheat guidelines */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Examination Rules:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Questions will be displayed 1 at a time with a right-hand palette.</li>
                  <li>Fullscreen mode is activated upon launch; exiting triggers a security strike.</li>
                  <li>Maximum 3 strikes before automatic disqualification.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    stopPreExamCamera();
                    setPreExamModalQuiz(null);
                  }}
                  className="text-xs px-4 py-2 font-bold cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleStartExamNow}
                  disabled={preExamModalQuiz.isCameraProctored && !cameraVerified}
                  className={`text-xs px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    preExamModalQuiz.isCameraProctored && !cameraVerified
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                  }`}
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Begin Examination Now</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: SUBMITTED SCORECARD / RECEIPT
  // ─────────────────────────────────────────────────────────────────────────────
  const displayQuestions = randomizedQuestions.length > 0 ? randomizedQuestions : activeQuiz.questions;
  const studentAttempt = getStudentAttempt(activeQuiz);
  const finalScoreObtained = studentAttempt?.score ?? activeQuiz.studentScore ?? 0;

  if (isSubmitted) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto select-none">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <button
              onClick={() => setActiveQuiz(null)}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline mb-1 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Assessment Directory</span>
            </button>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{activeQuiz.title}</span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {activeQuiz.courseCode}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Candidate: <strong>{studentName} ({studentRoll})</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Status</span>
            {areResultsUnlocked ? (
              <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {finalScoreObtained} / {activeQuiz.totalPoints || 20} Pts
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                <Lock className="h-3.5 w-3.5" />
                <span>Score Locked</span>
              </span>
            )}
          </div>
        </div>

        {/* Lock Notice if results not released */}
        {!areResultsUnlocked ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Lock className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Exam Submitted Successfully
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your responses have been securely logged. Scores and explanations remain locked until the scheduled closing hour at{" "}
                <strong className="font-mono text-slate-800 dark:text-slate-200">{activeQuiz.endTime || "concluded hour"}</strong> or when faculty releases results.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => setActiveQuiz(null)}
                className="btn-saas-primary text-xs px-5 py-2 font-bold cursor-pointer"
              >
                Return to Student Dashboard
              </Button>
            </div>
          </div>
        ) : (
          /* Unlocked Scorecard */
          <div className="space-y-4">
            {displayQuestions.map((q, idx) => {
              const selectedOpt = selectedAnswers[q.id];
              const isCorrect = selectedOpt === q.correctIndex;

              return (
                <div
                  key={q.id || idx}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 space-y-4 shadow-xs ${
                    isCorrect
                      ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/15"
                      : "border-rose-200 dark:border-rose-900/60 bg-rose-50/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                      <span className="text-blue-600 font-mono mr-2">Q{idx + 1}.</span>
                      {q.prompt}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCorrect ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Incorrect</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx;
                      const isOptionCorrect = optIdx === q.correctIndex;

                      let style = "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300";
                      if (isOptionCorrect) {
                        style = "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-100 font-bold";
                      } else if (isOptionSelected && !isOptionCorrect) {
                        style = "border-rose-400 bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-100 font-bold";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`w-full p-3.5 rounded-2xl border text-xs flex items-center justify-between ${style}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono font-bold text-[11px]">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isOptionCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-1 border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-blue-600 block text-[11px]">💡 Faculty Solution &amp; Explanation:</span>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE FULLSCREEN PROCTORED EXAM (LIGHT THEME + PALETTE)
  // ─────────────────────────────────────────────────────────────────────────────
  const currentQuestion = displayQuestions[currentQIndex] || displayQuestions[0];
  const totalQuestions = displayQuestions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const markedReviewCount = markedForReview.size;
  const unansweredCount = totalQuestions - answeredCount;
  const pointsPerQuestion = Math.round((activeQuiz.totalPoints || 20) / Math.max(1, totalQuestions));

  if (isMobileScreen) {
    return (
      <div className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-slate-900 dark:text-white">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-extrabold">Desktop or Laptop Required</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Class quizzes, scheduled examinations, and proctored tests cannot be attempted on mobile screens. A minimum resolution of 768px with full keyboard access is required to ensure academic integrity.
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-slate-500 font-mono">
            Please log in from a laptop or desktop computer to take this assessment.
          </div>
          <Button
            onClick={() => {
              setActiveQuiz(null);
              stopCameraStream();
            }}
            className="w-full text-xs py-2.5 font-bold cursor-pointer"
          >
            Return to Assessments List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onCopy={(e) => {
        if (activeQuiz.isCopyPasteBlocked !== false) {
          e.preventDefault();
          triggerStrike("Copying examination content is strictly prohibited.");
        }
      }}
      onContextMenu={(e) => {
        if (activeQuiz.isCopyPasteBlocked !== false) {
          e.preventDefault();
        }
      }}
      className="fixed inset-0 z-[9999] bg-slate-50 text-slate-800 flex flex-col overflow-hidden select-none font-sans"
    >
      {/* ─── FULLSCREEN LOCKDOWN BARRIER OVERLAY (If user minimizes or exits fullscreen) ─── */}
      {!isFullscreen && activeQuiz.isFullscreenRequired !== false && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-5 text-slate-900 animate-scale-up">
            <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
              <Maximize className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">
                Full-Screen Mode Required
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The examination cannot be taken while minimized or inside a windowed browser. Full-screen mode is strictly enforced to protect academic integrity.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Strike Status: {strikes} / 3 Warnings</span>
            </div>

            <Button
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                  }
                } catch (e) {
                  console.warn("Fullscreen retry error:", e);
                }
              }}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize className="h-4 w-4" />
              <span>Enter Full-Screen to Continue</span>
            </Button>
          </div>
        </div>
      )}

      {/* ─── 3-STRIKE DISQUALIFICATION & AUTO-SUBMIT OVERLAY ─── */}
      {isDisqualified && (
        <div className="fixed inset-0 z-[100001] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 shadow-2xl space-y-5 text-slate-900 animate-scale-up">
            <div className="h-16 w-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-rose-600">
                Examination Terminated
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You have received <strong>3 security strikes</strong> for exiting full-screen or navigating away from the test. Your exam session has been automatically finalized and submitted to your instructor for audit.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
              Candidate: {studentName} ({studentRoll})
            </div>

            <div className="pt-2">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-600 w-full animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Finalizing submission details...</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER BAR (LIGHT THEME) ─── */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {activeQuiz.courseCode}
              </span>
              <h2 className="font-bold text-sm text-slate-900 truncate max-w-xs sm:max-w-md">
                {activeQuiz.title}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Candidate: <span className="font-semibold text-slate-700">{studentName} ({studentRoll})</span>
            </p>
          </div>
        </div>

        {/* Timer, Strikes & Exit */}
        <div className="flex items-center gap-3">
          {/* Strikes Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
            strikes > 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-100 border-slate-200 text-slate-700"
          }`}>
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span>Strikes: </span>
            <span className={strikes > 0 ? "text-rose-600" : "text-emerald-600"}>{strikes}/3</span>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-bold text-xs shadow-xs border ${
              timeLeft < 300
                ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Exit Exam Button */}
          <button
            onClick={() => {
              if (confirm("Are you sure you want to conclude the exam? Your current responses will be submitted.")) {
                handleSubmitFinalExam();
              }
            }}
            className="text-xs text-slate-500 hover:text-rose-600 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Exit Exam
          </button>
        </div>
      </header>

      {/* Security Alert Toast */}
      {securityAlert && (
        <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold animate-bounce shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>{securityAlert}</span>
          </div>
          <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] font-mono">
            {strikes}/3 Strikes
          </span>
        </div>
      )}

      {/* ─── MAIN BODY SPLIT: 1 QUESTION ON LEFT + PALETTE ON RIGHT (LIGHT THEME) ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: ACTIVE QUESTION CARD (1 AT A TIME) */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col justify-between bg-slate-50/80">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {/* Question Header Strip */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-extrabold text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  Question {currentQIndex + 1} of {totalQuestions}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono font-bold border border-slate-200">
                  {pointsPerQuestion} Marks
                </span>
                {markedForReview.has(currentQuestion.id) && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold flex items-center gap-1">
                    <BookmarkCheck className="h-3.5 w-3.5 text-amber-600" />
                    <span>Marked for Review</span>
                  </span>
                )}
              </div>

              {selectedAnswers[currentQuestion.id] !== undefined && (
                <button
                  onClick={() => handleClearOption(currentQuestion.id)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Question Prompt Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQuestion.prompt}
              </h3>

              {/* 4 Multiple Choice Options (A, B, C, D) in Clean Light Theme */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                      className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-950 font-semibold shadow-xs ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono font-bold text-xs ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Action Navigation Bar */}
          <div className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                className="text-xs px-4 py-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-2xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => toggleMarkForReview(currentQuestion.id)}
                className={`text-xs px-4 py-2 border transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
                  markedForReview.has(currentQuestion.id)
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>{markedForReview.has(currentQuestion.id) ? "Unmark Review" : "Mark for Review"}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {currentQIndex < totalQuestions - 1 ? (
                <Button
                  onClick={() => setCurrentQIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowSubmitModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-6 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Review &amp; Submit</span>
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* ─── RIGHT COLUMN: QUESTION PALETTE MATRIX (LIGHT THEME) ─── */}
        <aside className="w-80 border-l border-slate-200 p-5 bg-white flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xs">
          <div className="space-y-5">
            {/* Palette Header */}
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Question Palette</h4>
              <p className="text-[11px] text-slate-500">Click any question to jump directly</p>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-600 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-white border border-slate-300 shrink-0" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                <span>Review ({markedReviewCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500 ring-2 ring-emerald-400 shrink-0" />
                <span>Ans &amp; Review</span>
              </div>
            </div>

            {/* Question Numbers Grid (Table format) */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {displayQuestions.map((q, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isMarked = markedForReview.has(q.id);

                let cellBg = "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200";
                if (isMarked && isAnswered) {
                  cellBg = "bg-amber-500 text-white font-bold ring-2 ring-emerald-400";
                } else if (isMarked) {
                  cellBg = "bg-amber-500 text-white font-bold";
                } else if (isAnswered) {
                  cellBg = "bg-emerald-600 text-white font-bold shadow-2xs";
                }

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-mono transition-all flex items-center justify-center cursor-pointer ${cellBg} ${
                      isCurrent ? "ring-2 ring-blue-600 scale-105 font-bold" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Webcam Live Preview Box with AI Proctoring Vision HUD & Resume Camera Option */}
            {activeQuiz.isCameraProctored && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cameraActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    <span>AI Proctoring Video Feed</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startCameraStream()}
                      className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Reconnect / resume live webcam feed"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>Resume Camera</span>
                    </button>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      cameraActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {cameraActive ? "AI Active" : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden border shadow-inner transition-colors ${
                  aiVisionStatus.facesDetected > 1 || aiVisionStatus.phoneDetected
                    ? "border-rose-500 ring-2 ring-rose-400"
                    : "border-slate-300"
                }`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover mirror"
                  />

                  {/* AI Vision HUD Overlay */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className={`px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 font-bold ${
                          aiVisionStatus.facesDetected === 1
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50"
                            : "bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse"
                        }`}>
                          <Users className="h-3 w-3" />
                          <span>Faces: {aiVisionStatus.facesDetected}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 font-bold ${
                          !aiVisionStatus.phoneDetected
                            ? "bg-slate-950/70 text-slate-300 border border-slate-700"
                            : "bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse"
                        }`}>
                          <Smartphone className="h-3 w-3" />
                          <span>{aiVisionStatus.phoneDetected ? "Phone Detected" : "No Phone"}</span>
                        </span>
                      </div>

                      {/* Warning Overlay Banner if Violation */}
                      {aiVisionStatus.warning && (
                        <div className="p-1 rounded-md bg-rose-600/95 text-white text-[9px] font-bold text-center animate-bounce shadow-md">
                          ⚠️ {aiVisionStatus.warning}
                        </div>
                      )}

                      {/* Bottom Radar Scanline */}
                      <div className="flex items-center justify-between text-[8px] text-emerald-400/90 font-mono">
                        <span>AI Scan: Continuous</span>
                        <span>Conf: {aiVisionStatus.confidence}%</span>
                      </div>
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 text-[10px] p-3 text-center space-y-2">
                      <CameraOff className="h-6 w-6 text-rose-400 animate-pulse" />
                      <p className="font-bold text-white text-xs">Camera Feed Disconnected</p>
                      <p className="text-[10px] text-slate-400 max-w-[200px]">Continuous video monitoring is mandatory during this exam.</p>
                      <button
                        type="button"
                        onClick={() => startCameraStream()}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Resume Camera</span>
                      </button>
                    </div>
                  )}</div>

                {/* Sub-status label */}
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Candidate Integrity:</span>
                  <span className={`font-bold ${
                    aiVisionStatus.facesDetected > 1 || aiVisionStatus.phoneDetected
                      ? "text-rose-600 font-mono"
                      : "text-emerald-600"
                  }`}>
                    {aiVisionStatus.facesDetected > 1
                      ? "Multiple Faces ⚠️"
                      : aiVisionStatus.phoneDetected
                      ? "Phone Detected 🚫"
                      : "Verified (Normal) ✓"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Big Submit Button */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <Button
              onClick={() => setShowSubmitModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>Submit Examination</span>
            </Button>
            <p className="text-[10px] text-slate-400 text-center font-mono">
              Candidate ID: {studentRoll}
            </p>
          </div>
        </aside>
      </div>

      {/* ─── SUBMISSION CONFIRMATION MODAL (LIGHT THEME) ─── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 animate-scale-up text-slate-900">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Confirm Examination Submission
                </h3>
                <p className="text-xs text-slate-500">
                  Please review your answering summary before final commitment.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Answer Breakdown Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 font-bold text-slate-700 flex justify-between border-b border-slate-200">
                <span>Summary Metric</span>
                <span>Count</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="p-3 flex justify-between">
                  <span className="text-slate-600">Total Questions:</span>
                  <span className="font-mono font-bold text-slate-900">{totalQuestions}</span>
                </div>
                <div className="p-3 flex justify-between bg-emerald-50/50">
                  <span className="text-emerald-700 font-semibold">Answered:</span>
                  <span className="font-mono font-bold text-emerald-700">{answeredCount}</span>
                </div>
                <div className="p-3 flex justify-between bg-slate-50/50">
                  <span className="text-slate-600">Not Answered:</span>
                  <span className="font-mono font-bold text-slate-800">{unansweredCount}</span>
                </div>
                <div className="p-3 flex justify-between bg-amber-50/50">
                  <span className="text-amber-700 font-semibold">Marked for Review:</span>
                  <span className="font-mono font-bold text-amber-700">{markedReviewCount}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Once submitted, your responses will be evaluated and locked. You will not be able to return to this exam session.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSubmitModal(false)}
                className="text-xs px-4 py-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-bold"
              >
                Return to Exam
              </Button>
              <Button
                onClick={handleSubmitFinalExam}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 py-2 font-bold rounded-xl cursor-pointer shadow-md"
              >
                Yes, Final Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
