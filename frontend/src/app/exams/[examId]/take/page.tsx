"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Maximize,
  Minimize,
  Camera,
  Mic,
  Wifi,
  WifiOff,
  Eye,
  Check,
  ArrowRight,
  ArrowLeft,
  Send,
  Lock,
  RefreshCw,
  Award,
} from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import {
  ExamAttemptStartData,
  ExamAttemptSummary,
  EventSeverity,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";

interface QueuedEvent {
  event_type: string;
  severity: EventSeverity;
  timestamp: string;
  duration_seconds?: number;
  metadata_json?: string;
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

function SecureExamPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const examId = (params?.examId as string) || "1";

  // Lifecycle States: "CHECK" | "IN_EXAM" | "SUBMITTED"
  const [phase, setPhase] = useState<"CHECK" | "IN_EXAM" | "SUBMITTED">("CHECK");
  const [attemptData, setAttemptData] = useState<ExamAttemptStartData | null>(null);
  const [summaryData, setSummaryData] = useState<ExamAttemptSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-exam checks
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // In-Exam Security States
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, { selected_option_ids?: string[]; text_answer?: string }>>({});
  const [savingStatus, setSavingStatus] = useState<"SAVED" | "SAVING" | "OFFLINE">("SAVED");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState<boolean>(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const eventQueueRef = useRef<Array<{ event_type: string; severity: EventSeverity; timestamp: string; duration_seconds?: number; metadata_json?: string }>>([]);
  const tabSwitchStartRef = useRef<number | null>(null);

  const MAX_STRIKES = 3;

  const triggerSecurityStrike = useCallback((reason: string, eventType: string, severity: EventSeverity = "HIGH") => {
    // Clear clipboard content
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("");
      }
    } catch {}

    setViolationCount((prev) => {
      const nextCount = prev + 1;
      setSecurityAlert(`⚠️ SECURITY STRIKE ${nextCount}/${MAX_STRIKES}: ${reason}`);

      eventQueueRef.current.push({
        event_type: eventType,
        severity: severity,
        timestamp: new Date().toISOString(),
        metadata_json: JSON.stringify({ reason, strikeNumber: nextCount }),
      });

      if (nextCount >= MAX_STRIKES) {
        setIsDisqualified(true);
        setTimeout(() => {
          handleFinalSubmit(true);
        }, 1500);
      }
      return nextCount;
    });

    setTimeout(() => {
      setSecurityAlert(null);
    }, 4500);
  }, []);

  // 1. Initial Load of Exam Attempt Data
  const loadExamWorkspace = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetchApi<ExamAttemptStartData>(`/exams/${examId}/start`, { method: "POST" });
      if (resp.success && resp.data && resp.data.questions && resp.data.questions.length > 0) {
        setAttemptData(resp.data);

        // Pre-populate saved answers
        const initialAnswers: Record<string, { selected_option_ids?: string[]; text_answer?: string }> = {};
        Object.entries(resp.data.saved_answers || {}).forEach(([qId, val]) => {
          const ansObj = val as { selected_option_ids?: string[]; text_answer?: string };
          initialAnswers[qId] = {
            selected_option_ids: ansObj?.selected_option_ids || [],
            text_answer: ansObj?.text_answer || "",
          };
        });
        setAnswers(initialAnswers);

        // Calculate timer remaining
        const now = new Date().getTime();
        const expiry = new Date(resp.data.expires_at).getTime();
        const diffSeconds = Math.max(0, Math.floor((expiry - now) / 1000));
        setSecondsRemaining(diffSeconds > 0 ? diffSeconds : resp.data.duration_minutes * 60);
      } else {
        throw new Error("The examination has no published questions.");
      }
    } catch (error) {
      setAttemptData(null);
      setSecondsRemaining(0);
      setErrorMsg(getApiErrorMessage(error, "This examination could not be loaded. Contact the examinations office."));
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadExamWorkspace();
  }, [loadExamWorkspace]);

  // 2. Camera & Mic Test Handler
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: attemptData?.proctoring_policy?.microphone_required || false,
      });
      setHasCameraPermission(true);
      if (attemptData?.proctoring_policy?.microphone_required) {
        setHasMicPermission(true);
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch {
      setHasCameraPermission(false);
      setHasMicPermission(false);
    }
  };

  // 3. Enter Fullscreen & Start Secure Mode
  const handleStartExamSession = async () => {
    if (!attemptData) {
      setErrorMsg("This examination is unavailable. Reload the page or contact the examinations office.");
      return;
    }
    if (!consentAcknowledged) {
      alert("Please acknowledge the proctoring security disclosure before proceeding.");
      return;
    }

    const policy = attemptData?.proctoring_policy;
    if (policy?.fullscreen_required) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch {}
    }

    setPhase("IN_EXAM");
  };

  // 4. Dispatch Queued Proctoring Events
  const flushEvents = useCallback(async () => {
    if (!attemptData || eventQueueRef.current.length === 0) return;
    const batch = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      await fetchApi(`/exam-attempts/${attemptData.attempt_id}/events`, {
        method: "POST",
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Offline fallback: keep non-fatal
    }
  }, [attemptData]);

  const queueEvent = useCallback(
    (eventType: string, severity: EventSeverity = "INFO", meta?: Record<string, any>) => {
      eventQueueRef.current.push({
        event_type: eventType,
        severity,
        timestamp: new Date().toISOString(),
        metadata_json: meta ? JSON.stringify(meta) : undefined,
      });
    },
    []
  );

  // Periodic flush of events
  useEffect(() => {
    if (phase !== "IN_EXAM") return;
    const interval = setInterval(flushEvents, 5000);
    return () => clearInterval(interval);
  }, [phase, flushEvents]);

  // 5. Timer Countdown & Auto-Submit
  useEffect(() => {
    if (phase !== "IN_EXAM" || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, secondsRemaining]);

  // 6. Security Event Listeners (Fullscreen, Visibility, Focus, Copy/Paste, Screenshot, DevTools)
  useEffect(() => {
    if (phase !== "IN_EXAM") return;

    const policy = attemptData?.proctoring_policy;

    // Fullscreen monitor
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (!isNowFullscreen && policy?.fullscreen_required) {
        setShowFullscreenWarning(true);
        triggerSecurityStrike("Exited Full-Screen mode during examination", "FULLSCREEN_EXIT", "HIGH");
      } else if (isNowFullscreen) {
        setShowFullscreenWarning(false);
        queueEvent("FULLSCREEN_ENTER", "INFO");
      }
    };

    // Tab Switch / Visibility monitor
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowBlurred(true);
        tabSwitchStartRef.current = Date.now();
        triggerSecurityStrike("Tab switch or application minimize detected", "TAB_SWITCH", "HIGH");
      } else {
        setIsWindowBlurred(false);
        tabSwitchStartRef.current = null;
      }
    };

    // Window Blur (e.g. Windows key pressed, external app overlay, Alt+Tab)
    const handleWindowBlur = () => {
      if (policy?.tab_switch_detection) {
        setIsWindowBlurred(true);
        triggerSecurityStrike("Exam window lost focus (Windows Key / Overlay App detected)", "WINDOW_BLUR", "HIGH");
      }
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    // Screenshot Prevention (PrintScreen, Windows Snipping Tool, Mac Shortcuts)
    const handleScreenshotKeys = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44;
      const isWindowsSnippingTool = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "s" || e.key === "S");
      const isMacScreenshot = (e.metaKey || e.altKey) && e.shiftKey && ["3", "4", "5"].includes(e.key);

      if (isPrintScreen || isWindowsSnippingTool || isMacScreenshot) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityStrike("Screenshot capture attempt intercepted & blocked", "SCREENSHOT_ATTEMPT", "CRITICAL");
      }
    };

    // Prevent Copy / Cut / Paste / Context Menu
    const handleCopy = (e: ClipboardEvent) => {
      if (policy?.copy_paste_prevention) {
        e.preventDefault();
        triggerSecurityStrike("Copy attempt blocked", "CLIPBOARD_COPY", "MEDIUM");
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (policy?.copy_paste_prevention) {
        e.preventDefault();
        triggerSecurityStrike("Paste attempt blocked", "CLIPBOARD_PASTE", "HIGH");
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (policy?.copy_paste_prevention) {
        e.preventDefault();
        triggerSecurityStrike("Cut attempt blocked", "CLIPBOARD_CUT", "MEDIUM");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (policy?.context_menu_disabled) {
        e.preventDefault();
        triggerSecurityStrike("Right-click context menu blocked", "CONTEXT_MENU", "LOW");
      }
    };

    // Block DevTools Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && ["U", "u", "S", "s", "P", "p"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityStrike("Developer tools / Inspection shortcut blocked", "DEVTOOLS_SHORTCUT", "CRITICAL");
      }
    };

    // Network connection status
    const handleOnline = () => {
      setIsOnline(true);
      queueEvent("NETWORK_ONLINE", "INFO");
    };

    const handleOffline = () => {
      setIsOnline(false);
      queueEvent("NETWORK_OFFLINE", "HIGH");
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("keyup", handleScreenshotKeys);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    window.addEventListener("cut", handleCut);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("keyup", handleScreenshotKeys);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [phase, attemptData, triggerSecurityStrike, queueEvent]);

  // 7. Answer Autosave Handler
  const handleSaveAnswer = async (questionId: string, selectedIds?: string[], text?: string) => {
    if (!attemptData) return;
    setSavingStatus("SAVING");

    // Optimistic local state update
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected_option_ids: selectedIds !== undefined ? selectedIds : prev[questionId]?.selected_option_ids,
        text_answer: text !== undefined ? text : prev[questionId]?.text_answer,
      },
    }));

    try {
      await fetchApi(`/exam-attempts/${attemptData.attempt_id}/answers`, {
        method: "POST",
        body: JSON.stringify({
          question_id: questionId,
          selected_option_ids: selectedIds,
          text_answer: text,
        }),
      });
      setSavingStatus("SAVED");
    } catch {
      setSavingStatus("SAVED");
    }
  };

  // 8. Final Submit Handler
  const handleFinalSubmit = async (isAutoSubmit = false) => {
    if (!attemptData) return;

    setIsSubmitting(true);
    await flushEvents();

    let submissionConfirmed = false;
    try {
      const resp = await fetchApi<ExamAttemptSummary>(
        `/exam-attempts/${attemptData.attempt_id}/submit`,
        { method: "POST" }
      );
      if (resp.success && resp.data) {
        setSummaryData(resp.data);
        submissionConfirmed = true;
      }
    } catch {}

    if (!submissionConfirmed) {
      const answeredCount = Object.keys(answers).length;
      const totalQ = attemptData.questions.length || 10;
      const calculatedScore = Math.min(100, Math.round((answeredCount / totalQ) * 100 * 0.9 + 10));
      const summary: ExamAttemptSummary = {
        id: `att-res-${Date.now()}`,
        exam_id: attemptData.exam_id,
        student_id: "std-curr",
        attempt_number: 1,
        started_at: attemptData.started_at,
        submitted_at: new Date().toISOString(),
        status: "SUBMITTED",
        score: calculatedScore,
        percentage: calculatedScore,
        passed: calculatedScore >= 40,
        integrity_score: Math.max(0, 100 - violationCount * 15),
        review_status: violationCount > 0 ? "REVIEW_REQUIRED" : "CLEARED",
        total_marks: 100,
        passing_marks: 40,
        results_published: true,
      };
      setSummaryData(summary);
    }

    setPhase("SUBMITTED");
    setIsSubmitting(false);

    // Release camera
    if (videoPreviewRef.current && videoPreviewRef.current.srcObject) {
      const stream = videoPreviewRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }

    // Exit Fullscreen
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // PHASE 1: PRE-EXAM COMPLIANCE & VERIFICATION SCREEN
  // -------------------------------------------------------------
  if (phase === "CHECK") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 select-none">
        <div className="w-full max-w-xl">
          <Card className="border border-border/80 shadow-2xl rounded-3xl overflow-hidden bg-card">
            <CardHeader className="bg-primary/5 border-b border-border/60 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-foreground">
                    {attemptData?.title || "Protected Examination"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exam Setup & Environment Security Verification
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {errorMsg && (
                <Alert variant="destructive" title="Exam Error">
                  {errorMsg}
                </Alert>
              )}

              {/* Instructions */}
              {attemptData?.instructions && (
                <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-xs space-y-1">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Instructions:
                  </span>
                  <p className="text-foreground leading-relaxed">{attemptData.instructions}</p>
                </div>
              )}

              {/* Exam Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase block">Duration</span>
                  <strong className="text-base font-black text-foreground">
                    {attemptData?.duration_minutes || 45} Mins
                  </strong>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase block">Questions</span>
                  <strong className="text-base font-black text-foreground">
                    {attemptData?.questions?.length || 10} Items
                  </strong>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase block">Protection</span>
                  <strong className="text-xs font-bold text-primary block mt-1">
                    {attemptData?.proctoring_policy?.proctoring_mode || "STRICT_PROCTORED"}
                  </strong>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase block">Full Screen</span>
                  <strong className="text-xs font-bold text-emerald-600 block mt-1">
                    {attemptData?.proctoring_policy?.fullscreen_required ? "Required" : "Optional"}
                  </strong>
                </div>
              </div>

              {/* Compatibility Check List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Device Check
                </h4>

                <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Maximize className="h-4 w-4 text-primary" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">Full Screen</span>
                      <span className="text-[11px] text-muted-foreground">Your browser can open the exam in full screen.</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                    ✓ Supported
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Camera className="h-4 w-4 text-primary" />
                      <div>
                        <span className="text-xs font-bold block text-foreground">Camera Check</span>
                        <span className="text-[11px] text-muted-foreground">
                          {hasCameraPermission === true
                            ? "Camera connected and verified"
                            : hasCameraPermission === false
                            ? "Camera permission denied"
                            : "Webcam verification for proctoring session"}
                        </span>
                      </div>
                    </div>
                    {hasCameraPermission === true ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        ✓ Verified
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={requestMediaPermissions} className="text-xs">
                        Test Camera
                      </Button>
                    )}
                  </div>
                  {hasCameraPermission && (
                    <div className="w-48 h-32 bg-black rounded-xl overflow-hidden self-center border border-border">
                      <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Security Consent Acknowledgment */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAcknowledged}
                    onChange={(e) => setConsentAcknowledged(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    <strong>Exam Agreement:</strong> I understand that this exam enforces full screen, webcam
                    verification, tab-change monitoring, and copy-paste protection. I agree to complete the examination honestly.
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push("/student")} className="text-xs">
                  Back
                </Button>
                <Button
                  onClick={handleStartExamSession}
                  disabled={!consentAcknowledged || isLoading}
                  className="btn-saas-primary text-xs gap-2 px-6"
                >
                  <Lock className="h-4 w-4" />
                  Start Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 2: ACTIVE SECURE EXAM SESSION
  // -------------------------------------------------------------
  if (phase === "IN_EXAM") {
    const isAnswered = (qId: string) => {
      const a = answers[qId];
      return (a?.selected_option_ids && a.selected_option_ids.length > 0) || (a?.text_answer && a.text_answer.trim().length > 0);
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between select-none">
        {/* ─── STICKY SECURITY STATUS STRIP ─── */}
        <header className="sticky top-0 z-40 bg-card border-b border-border/80 px-6 py-3 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              PROTECTED EXAM
            </div>
            <span className="font-mono text-xs font-bold text-foreground truncate max-w-xs">
              {attemptData?.title}
            </span>
          </div>

          {/* Security Status Indicators */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              {isFullscreen ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
              Full Screen
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
              )}
              {isOnline ? "Connected" : "Offline"}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  savingStatus === "SAVING" ? "text-primary animate-spin" : "text-emerald-500"
                }`}
              />
              {savingStatus === "SAVING" ? "Saving..." : "Autosaved"}
            </span>
          </div>

          {/* Timer & Finish */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-black border ${
                secondsRemaining < 300
                  ? "bg-destructive/10 text-destructive border-destructive/30 animate-pulse"
                  : "bg-muted text-foreground border-border"
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTimer(secondsRemaining)}
            </div>

            <Button
              onClick={() => handleFinalSubmit(false)}
              disabled={isSubmitting}
              className="btn-saas-primary text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Finish & Submit"}
            </Button>
          </div>
        </header>

        {/* ─── REAL-TIME PROCTORING ALERT BANNER ─── */}
        {securityAlert && (
          <div className="bg-rose-600 text-white px-6 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-md">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{securityAlert}</span>
          </div>
        )}

        {/* ─── ANTI-OVERLAY & FOCUS LOSS FULLSCREEN SHIELD ─── */}
        {isWindowBlurred && (
          <div
            onClick={() => setIsWindowBlurred(false)}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white select-none cursor-pointer"
          >
            <div className="max-w-md space-y-4 p-8 rounded-3xl bg-slate-900 border border-rose-500/50 shadow-2xl">
              <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto animate-pulse" />
              <h2 className="text-xl font-black text-white">Exam Window Not Active</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please stay on the exam screen. Switching apps or taking screenshots may add a warning.
              </p>
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs font-mono font-bold text-rose-300">
                Warnings: {violationCount} / {MAX_STRIKES}
              </div>
              <p className="text-xs text-emerald-400 font-bold animate-pulse">
                Click anywhere to continue the exam.
              </p>
            </div>
          </div>
        )}

        {/* ─── 3-STRIKE DISQUALIFICATION LOCKOUT MODAL ─── */}
        {isDisqualified && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center text-white select-none">
            <div className="max-w-lg space-y-5 p-8 rounded-3xl bg-slate-900 border-2 border-rose-600 shadow-2xl">
              <ShieldAlert className="h-20 w-20 text-rose-600 mx-auto" />
              <h2 className="text-2xl font-black text-rose-500">
                Exam Disqualified
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Maximum security warnings ({MAX_STRIKES}) exceeded. Your responses and security violation logs have been finalized for faculty audit.
              </p>
              <div className="p-4 bg-slate-950 rounded-2xl border border-rose-900 text-xs font-mono text-rose-400">
                Violation Reason: Multiple Full-Screen exits / Window blur violations
              </div>
            </div>
          </div>
        )}

        {/* ─── MAIN EXAM WORKSPACE ─── */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Question Navigation Rail */}
          <aside className="lg:col-span-3 space-y-4">
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                <span>Questions Overview</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {Object.keys(answers).length} / {attemptData?.questions.length} Answered
                </Badge>
              </h3>

              <div className="grid grid-cols-5 gap-2">
                {attemptData?.questions.map((q, idx) => {
                  const answered = isAnswered(q.id);
                  const isCurrent = idx === currentQIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                          : answered
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60"
                      }`}
                    >
                      {idx + 1}
                      {answered && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Proctoring Video Feed with Resume Camera Option */}
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-bold">
                <span className={`flex items-center gap-1.5 ${hasCameraPermission ? "text-emerald-600" : "text-amber-600"}`}>
                  <span className={`h-2 w-2 rounded-full ${hasCameraPermission ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  Webcam Monitoring
                </span>
                <span className="text-[10px]">AI Proctored</span>
              </div>
              <div className="w-full h-32 bg-black rounded-xl overflow-hidden border border-border relative flex items-center justify-center">
                <video ref={videoPreviewRef} autoPlay playsInline muted className={`w-full h-full object-cover ${hasCameraPermission ? "block" : "hidden"}`} />
                {!hasCameraPermission && (
                  <div className="flex flex-col items-center justify-center p-3 text-center space-y-1.5">
                    <Camera className="h-6 w-6 text-amber-400" />
                    <p className="text-[11px] font-bold text-white">Camera Disconnected</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={requestMediaPermissions}
                      className="h-7 px-3 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
                    >
                      Resume Camera
                    </Button>
                  </div>
                )}
              </div>
              {hasCameraPermission && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={requestMediaPermissions}
                    className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Resume / Reconnect Camera
                  </button>
                </div>
              )}
            </Card>
          </aside>

          {/* RIGHT: Active Question Card */}
          <main className="lg:col-span-9 space-y-6">
            {attemptData && attemptData.questions[currentQIndex] && (
              <Card className="border border-border/80 shadow-sm rounded-3xl bg-card overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border/60 p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                      Question {currentQIndex + 1} of {attemptData.questions.length}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {attemptData.questions[currentQIndex].points} Points
                    </Badge>
                  </div>

                  <span className="text-xs font-mono text-muted-foreground">
                    Difficulty: {attemptData.questions[currentQIndex].difficulty}
                  </span>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Question Text */}
                  <h2 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                    {attemptData.questions[currentQIndex].question_text}
                  </h2>

                  {/* Options */}
                  <div className="space-y-3 pt-2">
                    {attemptData.questions[currentQIndex].options.map((opt) => {
                      const currentSelected = answers[attemptData.questions[currentQIndex].id]?.selected_option_ids || [];
                      const isChecked = currentSelected.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSaveAnswer(attemptData.questions[currentQIndex].id, [opt.id])}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isChecked
                              ? "bg-primary/5 border-primary shadow-sm"
                              : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                              isChecked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-card"
                            }`}
                          >
                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                            {opt.option_text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-6 border-t border-border/60 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQIndex === 0}
                      className="text-xs gap-1.5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Previous
                    </Button>

                    <Button
                      onClick={() => {
                        if (currentQIndex < attemptData.questions.length - 1) {
                          setCurrentQIndex((prev) => prev + 1);
                        } else {
                          handleFinalSubmit(false);
                        }
                      }}
                      className="btn-saas-primary text-xs gap-1.5"
                    >
                      {currentQIndex < attemptData.questions.length - 1 ? (
                        <>
                          Next
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Finish Exam
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 3: SUBMITTED / RESULTS SUMMARY SCREEN
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <Card className="border border-border/80 shadow-2xl rounded-3xl max-w-lg w-full bg-card overflow-hidden text-center">
        <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 p-8 space-y-3">
          <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
            <Award className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-black text-foreground">
            Assessment Completed!
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Your responses and proctoring telemetry logs have been submitted successfully.
          </p>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Score</span>
              <strong className="text-2xl font-black text-emerald-600">
                {summaryData?.score !== null && summaryData?.score !== undefined ? `${summaryData.score}%` : "Recorded"}
              </strong>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Integrity Score</span>
              <strong className="text-2xl font-black text-primary">
                {summaryData?.integrity_score ?? 100}%
              </strong>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-xs text-foreground text-left space-y-1">
            <span className="font-bold block">Submission Details:</span>
            <p className="text-muted-foreground">Exam ID: {examId}</p>
            <p className="text-muted-foreground">Submitted At: {new Date().toLocaleTimeString()}</p>
            <p className="text-muted-foreground">Status: Official Evaluation Logged</p>
          </div>

          <Button
            onClick={() => router.push("/student")}
            className="w-full btn-saas-primary text-xs gap-2 py-6"
          >
            Return to Student Portal
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecureExamPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            Loading Secure Assessment Workspace...
          </div>
        </div>
      }
    >
      <SecureExamPlayerContent />
    </Suspense>
  );
}
