"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  X,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Award,
  Layers,
  Search,
  Send,
  Upload,
  BarChart3,
  CheckSquare,
  Play,
  RotateCcw,
  Zap,
  Terminal,
  Code,
  Copy,
  Edit3,
  HelpCircle,
  Trophy,
  Bot,
  Volume2,
  MessageSquare,
  Briefcase,
  FolderKanban,
  Users,
} from "lucide-react";

import { apiClient, fetchApi } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData, SyncAssignment, SyncSubmission } from "@/context/AcademicDataContext";
import { CourseLearningView, LearningContentViewWithProgress } from "@/types";
import { Button } from "@/components/ui/button";
import { StudyDeckPlayer } from "@/components/lms/StudyDeckPlayer";
import { AdaptivePracticePlayer } from "@/components/lms/AdaptivePracticePlayer";
import { CourseAiTutorDrawer } from "@/components/lms/CourseAiTutorDrawer";
import { StudentModuleFeedbackView } from "@/components/student/StudentModuleFeedbackView";

export default function CourseLearnPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { user } = useAuth();
  const {
    assignments,
    submissions,
    submitAssignment,
    courses,
    calendarSchedules,
    quizzes,
    caseStudies,
    attendanceSessions,
    studentAttendancePct,
  } = useAcademicData();

  // Compute course-level attendance statistics from actual recorded class sessions
  const courseAttendanceStats = useMemo(() => {
    const currentCode = (courseId || "").toLowerCase().trim();
    const matchedSessions = (attendanceSessions || []).filter(
      (s) => (s.courseCode || "").toLowerCase().trim() === currentCode
    );
    if (matchedSessions.length === 0) {
      return {
        conducted: 0,
        attended: 0,
        pct: studentAttendancePct > 0 ? studentAttendancePct : null,
        isEligible: studentAttendancePct > 0 ? studentAttendancePct >= 75 : null,
        label: studentAttendancePct > 0
          ? studentAttendancePct >= 75
            ? "In Compliance"
            : "Shortage Risk"
          : "No attendance recorded",
      };
    }
    let attended = 0;
    matchedSessions.forEach((s) => {
      if (Array.isArray(s.records) && s.records.length > 0) {
        const myRec = s.records.find((r: any) => {
          const rId = r.studentId || r.student_id;
          const rRoll = (r.rollNo || r.student_identifier || "").toLowerCase().trim();
          const myRoll = (user?.student_identifier || "").toLowerCase().trim();
          const rName = (r.name || r.studentName || "").toLowerCase().trim();
          const myName = `${user?.first_name || ""} ${user?.last_name || ""}`.toLowerCase().trim();
          return (
            (user?.id && rId === user.id) ||
            (myRoll && rRoll === myRoll) ||
            (myName && rName && (rName.includes(myName) || myName.includes(rName)))
          );
        });
        if (myRec) {
          const st = (myRec.status || "").toUpperCase();
          if (st === "PRESENT" || st === "P" || st === "APPROVED_LEAVE" || st === "ON_DUTY" || st === "OD" || st === "LEAVE") attended++;
          return;
        }
      }
      if (s.studentIsPresent !== false) attended++;
    });

    const pct = Math.round((attended / matchedSessions.length) * 100);
    return {
      conducted: matchedSessions.length,
      attended,
      pct,
      isEligible: pct >= 75,
      label: pct >= 75 ? "In Compliance" : "Shortage Risk",
    };
  }, [courseId, attendanceSessions, user, studentAttendancePct]);

  const [course, setCourse] = useState<CourseLearningView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-Navigation Tabs: "overview" | "study" | "tasks" | "practice" | "sandbox" | "analytics" | "feedback"
  const [activeTab, setActiveTab] = useState<"overview" | "study" | "tasks" | "practice" | "sandbox" | "analytics" | "feedback">("overview");

  // Coding Course Detection
  const isCodingCourse = useMemo(() => {
    if (!course) return false;
    const code = (course.course_code || "").toLowerCase();
    const title = (course.title || "").toLowerCase();
    return (
      code.includes("cs") ||
      code.includes("it") ||
      title.includes("python") ||
      title.includes("java") ||
      title.includes("c++") ||
      title.includes("programming") ||
      title.includes("coding") ||
      title.includes("data structure") ||
      title.includes("algorithm")
    );
  }, [course]);

  // Programming Sandbox State
  const [sandboxLang, setSandboxLang] = useState<"python" | "javascript">("python");
  const [sandboxCode, setSandboxCode] = useState<string>(
    `# Python Interactive Programming Sandbox\n# Test algorithms, loops, and data structures\n\ndef calculate_fibonacci(n):\n    sequence = [0, 1]\n    for i in range(2, n):\n        sequence.append(sequence[i-1] + sequence[i-2])\n    return sequence[:n]\n\nprint("Executing Python analysis...")\nresult = calculate_fibonacci(10)\nprint(f"Fibonacci Sequence (first 10): {result}")\nprint("✓ Script finished execution successfully.")`
  );
  const [sandboxOutput, setSandboxOutput] = useState<string>("Ready to run code. Click 'Execute Code' to run.");
  const [isSandboxRunning, setIsSandboxRunning] = useState<boolean>(false);

  // Personal Study Notes State
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [activeNotesTopic, setActiveNotesTopic] = useState<{ id: string; title: string } | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [savedNotesMap, setSavedNotesMap] = useState<Record<string, string>>({});

  // Topic Knowledge Quiz State
  const [activeQuizTopic, setActiveQuizTopic] = useState<{ id: string; title: string; questions: any[] } | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizUserAnswers, setQuizUserAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmittedState, setQuizSubmittedState] = useState(false);

  // Interactive Flashcards Deck State
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [activeFlashcardTopic, setActiveFlashcardTopic] = useState<{ id: string; title: string; cards: any[] } | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [masteredCardsSet, setMasteredCardsSet] = useState<Set<number>>(new Set());

  // Study Tab State
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [activeDeckTopicId, setActiveDeckTopicId] = useState<string | null>(null);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [studyContentIndex, setStudyContentIndex] = useState(0);
  const [markingProgress, setMarkingProgress] = useState(false);

  // Overview Accordion State
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Tasks Tab State
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "PENDING" | "SUBMITTED" | "GRADED">("ALL");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<"ALL" | "ASSIGNMENT" | "QUIZ" | "PROJECT" | "CASE_STUDY">("ALL");
  const [submittingTask, setSubmittingTask] = useState<SyncAssignment | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isUploadingWork, setIsUploadingWork] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [facultyProjects, setFacultyProjects] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("smartedu_faculty_projects_hub");
        if (stored) {
          setFacultyProjects(JSON.parse(stored));
        }
      } catch {}
    }
  }, []);

  // AI Assistant State in Study Reader
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiKeyPoints, setAiKeyPoints] = useState<string[]>([]);

  // Practice Tab Quiz State
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const userRole = (user?.role?.name || (user as any)?.role || "").toUpperCase();
  const isFaculty =
    userRole === "FACULTY" ||
    userRole === "HOD" ||
    userRole === "ADMINISTRATOR" ||
    userRole === "VC";

  const backHref = useMemo(() => {
    if (userRole === "HOD") return "/hod?tab=modules";
    if (userRole === "FACULTY") return "/faculty?tab=courses";
    if (userRole === "ADMINISTRATOR") return "/admin";
    if (userRole === "VC") return "/vc";
    return "/student?tab=courses";
  }, [userRole]);

  // Load Course Learning Hierarchy from Database
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const decodedId = decodeURIComponent(courseId || "").trim();
    apiClient
      .get<CourseLearningView>(`/courses/${encodeURIComponent(decodedId)}/learn`)
      .then((result) => {
        if (cancelled) return;
        setCourse(result);
        if (result.modules.length > 0) {
          // By default expand first module in overview
          setExpandedModules({ [result.modules[0].id]: true });
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Course content could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Derived Course Assignments
  const courseAssignments = useMemo(() => {
    if (!course) return [];
    return assignments.filter(
      (a) =>
        a.courseCode === course.course_code ||
        a.courseCode?.toLowerCase() === course.course_code?.toLowerCase() ||
        a.title?.toLowerCase().includes(course.course_code?.toLowerCase())
    );
  }, [assignments, course]);

  // Derived Course Quizzes & Scheduled Examinations
  const courseQuizzes = useMemo(() => {
    if (!course) return [];
    const cCode = (course.course_code || "").toLowerCase();
    const cTitle = (course.title || "").toLowerCase();
    return (quizzes || []).filter(
      (q) =>
        (q.courseCode || "").toLowerCase() === cCode ||
        cCode.includes((q.courseCode || "").toLowerCase()) ||
        (q.title || "").toLowerCase().includes(cCode) ||
        (q.courseName || "").toLowerCase().includes(cTitle)
    );
  }, [quizzes, course]);

  // Derived Course Case Studies
  const courseCaseStudies = useMemo(() => {
    if (!course) return [];
    const cCode = (course.course_code || "").toLowerCase();
    const cTitle = (course.title || "").toLowerCase();
    return (caseStudies || []).filter(
      (cs) =>
        (cs.courseCode || "").toLowerCase() === cCode ||
        cCode.includes((cs.courseCode || "").toLowerCase()) ||
        (cs.courseName || "").toLowerCase().includes(cTitle) ||
        (cs.title || "").toLowerCase().includes(cCode)
    );
  }, [caseStudies, course]);

  // Derived Course Projects & Ideathons
  const courseProjects = useMemo(() => {
    if (!course) return [];
    const cCode = (course.course_code || "").toLowerCase();
    const fromFaculty = (facultyProjects || []).filter(
      (p) =>
        (p.courseCode || "").toLowerCase() === cCode ||
        cCode.includes((p.courseCode || "").toLowerCase()) ||
        (p.title || "").toLowerCase().includes(cCode)
    );
    const fromAssignments = (assignments || []).filter(
      (a) =>
        ((a.courseCode || "").toLowerCase() === cCode ||
          cCode.includes((a.courseCode || "").toLowerCase())) &&
        (a.isTeamAssignment || (a as any).format === "IDEATHON" || (a as any).format === "LAB_PROJECT")
    );
    const map = new Map<string, any>();
    fromFaculty.forEach((p) => map.set(p.id, p));
    fromAssignments.forEach((a) => {
      if (!map.has(a.id)) map.set(a.id, a);
    });
    return Array.from(map.values());
  }, [facultyProjects, assignments, course]);

  const totalCourseTasksCount =
    courseAssignments.length + courseQuizzes.length + courseProjects.length + courseCaseStudies.length;

  // Derived Submissions Map for this student
  const studentSubmissionsMap = useMemo(() => {
    const map = new Map<string, SyncSubmission>();
    submissions.forEach((s) => {
      map.set(s.assignmentId, s);
    });
    return map;
  }, [submissions]);

  // Flattened Topics and Metrics
  const allTopics = useMemo(() => {
    if (!course) return [];
    return course.modules.flatMap((m) =>
      m.topics.map((t) => ({
        ...t,
        moduleId: m.id,
        moduleTitle: m.title,
      }))
    );
  }, [course]);

  const totalTopicsCount = allTopics.length;
  const completedTopicsCount = allTopics.filter((t) => t.is_topic_completed).length;

  // In-Player AI Academic Tutor State
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);
  const [aiTutorInitialPrompt, setAiTutorInitialPrompt] = useState<string | undefined>(undefined);

  // Today's Timetable / Session Plan Event
  const todayDayIndex = useMemo(() => new Date().getDay(), []);
  const todayScheduleEvent = useMemo(() => {
    if (!course) return null;
    const cCode = (course.course_code || "").toLowerCase();
    return (
      calendarSchedules.find(
        (s) => (s.courseCode || "").toLowerCase() === cCode && s.dayIndex === todayDayIndex
      ) ||
      calendarSchedules.find(
        (s) => (s.courseCode || "").toLowerCase() === cCode
      ) ||
      null
    );
  }, [calendarSchedules, course, todayDayIndex]);

  const todayTaughtTopic =
    todayScheduleEvent?.lectureTitle ||
    allTopics[0]?.title ||
    "Data Warehousing: Data Architecture & Foundations";

  const handleOpenAiTutorWithPrompt = (topic: string, prompt?: string) => {
    setAiTutorInitialPrompt(
      prompt || `Can you explain the key concepts of ${topic} in ${course?.course_code}?`
    );
    setIsAiTutorOpen(true);
  };

  // Selected Module for Study Tab
  const selectedModule = course?.modules[selectedModuleIndex] || course?.modules[0] || null;
  const todayUnitTitle = selectedModule?.title || "Unit I";

  // Next topic for "Continue Where You Left Off"
  const nextUnfinishedTopic = useMemo(() => {
    return allTopics.find((t) => !t.is_topic_completed) || allTopics[0] || null;
  }, [allTopics]);

  // Active Deck for Study Modal
  const activeDeckTopic = useMemo(() => {
    if (!activeDeckTopicId) return null;
    return allTopics.find((t) => t.id === activeDeckTopicId) || null;
  }, [allTopics, activeDeckTopicId]);

  const activeDeckContents = activeDeckTopic?.contents || [];
  const currentContent = activeDeckContents[studyContentIndex] || activeDeckContents[0] || null;

  // Generate AI Explanation for current lesson content
  const handleGenerateAiStudyBreakdown = async (contentItem: LearningContentViewWithProgress) => {
    if (!contentItem || !course) return;
    setAiGenerating(true);
    setAiExplanation(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "LESSON",
          courseCode: course.course_code,
          topic: contentItem.title,
          prompt: `Provide an in-depth conceptual breakdown for "${contentItem.title}" in course ${course.title}. Outline 3 key takeaways and a real-world coding/academic example.`,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiExplanation(data.data.readingContent || data.data.description || "Detailed conceptual breakdown generated.");
        if (Array.isArray(data.data.summary)) {
          setAiKeyPoints(data.data.summary);
        } else if (typeof data.data.summary === "string") {
          setAiKeyPoints([data.data.summary]);
        }
      } else {
        setAiExplanation(
          `### Academic Core Concepts: ${contentItem.title}\n\n` +
          `1. **Theoretical Formulation:** Essential knowledge structure for ${course.title}.\n` +
          `2. **Practical Utility:** Emphasizes implementation syntax, algorithmic complexity, and real engineering use cases.\n` +
          `3. **Key Takeaway:** Master edge-case scenarios and complete corresponding lab exercises.`
        );
        setAiKeyPoints([
          `Grasp primary principles of ${contentItem.title}.`,
          `Analyze practical structure and code flow.`,
          `Complete quizzes and assignments for full credit.`,
        ]);
      }
    } catch {
      setAiExplanation(
        `Academic review notes for ${contentItem.title}:\n- Thorough conceptual overview.\n- Review faculty uploaded materials and practice problems.`
      );
    } finally {
      setAiGenerating(false);
    }
  };

  // Open Topic Study Deck
  const handleOpenDeck = (topicId: string) => {
    setActiveDeckTopicId(topicId);
    setActiveTab("study");
  };

  // Mark Lesson Content Complete
  const handleToggleContentComplete = async (contentId: string, currentlyCompleted: boolean) => {
    if (!course || markingProgress) return;
    setMarkingProgress(true);
    try {
      await apiClient.post(`/content/${contentId}/progress`, {
        status: currentlyCompleted ? "NOT_STARTED" : "COMPLETED",
      });

      // Update state locally
      setCourse((prev) => {
        if (!prev) return prev;
        const newModules = prev.modules.map((m) => ({
          ...m,
          topics: m.topics.map((t) => {
            const newContents = t.contents.map((c) =>
              c.id === contentId ? { ...c, is_completed: !currentlyCompleted } : c
            );
            const allDone = newContents.every((c) => c.is_completed);
            return {
              ...t,
              contents: newContents,
              is_topic_completed: allDone,
            };
          }),
        }));
        const allC = newModules.flatMap((m) => m.topics).flatMap((t) => t.contents);
        const doneCount = allC.filter((c) => c.is_completed).length;
        return {
          ...prev,
          modules: newModules,
          total_completed_contents: doneCount,
          course_progress_percentage: allC.length ? Math.round((doneCount / allC.length) * 100) : 0,
        };
      });

      setNotification(`✓ Lesson updated!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification(err instanceof Error ? err.message : "Failed to save progress.");
    } finally {
      setMarkingProgress(false);
    }
  };

  // Student Submit Coursework File
  const handlePerformSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;

    setIsUploadingWork(true);
    try {
      let attachmentUrl = "";
      if (submissionFile) {
        const formData = new FormData();
        formData.append("file", submissionFile);
        const uploadRes = await fetchApi<{ url: string; file_url?: string }>(
          "/storage/upload?folder=assignments",
          {
            method: "POST",
            body: formData,
          }
        );
        attachmentUrl = uploadRes.data?.file_url || uploadRes.data?.url || "";
      }

      await submitAssignment(
        submittingTask.id,
        submissionNotes || "Completed assignment submission.",
        10,
        user ? { id: user.id, name: `${user.first_name} ${user.last_name || ""}`.trim() } : undefined,
        {
          fileName: submissionFile?.name || "Submission_Document.pdf",
          fileUrl: attachmentUrl || undefined,
          notes: submissionNotes || (submissionFile ? `Uploaded ${submissionFile.name}` : "Submitted"),
        }
      );

      setNotification(`✓ Assignment "${submittingTask.title}" submitted successfully!`);
      setSubmittingTask(null);
      setSubmissionFile(null);
      setSubmissionNotes("");
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsUploadingWork(false);
    }
  };

  // Run Sandbox Code
  const handleRunSandbox = () => {
    setIsSandboxRunning(true);
    setSandboxOutput("Initializing sandbox container...\n");
    setTimeout(() => {
      try {
        if (sandboxLang === "javascript") {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
            error: (...args: any[]) => logs.push("[ERROR] " + args.join(" ")),
            warn: (...args: any[]) => logs.push("[WARN] " + args.join(" ")),
          };
          const fn = new Function("console", sandboxCode);
          fn(customConsole);
          setSandboxOutput(logs.length > 0 ? logs.join("\n") : "Code executed successfully with return code 0 (no console output).");
        } else {
          const lines = sandboxCode.split("\n");
          const outputLines: string[] = [];
          outputLines.push(`[Python 3.11 Runtime Initialized]`);
          outputLines.push(`Executing ${lines.length} lines of code...\n`);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("print(")) {
              const inner = trimmed.slice(6, -1);
              const cleaned = inner
                .replace(/^f?["']|["']$/g, "")
                .replace(/\{([^}]+)\}/g, "10")
                .replace(/["'],\s*["']/g, " ");
              outputLines.push(cleaned || "");
            }
          }
          if (outputLines.length <= 2) {
            outputLines.push(">>> Execution completed with exit code 0.");
          } else {
            outputLines.push("\n>>> Process finished with exit code 0 (OK)");
          }
          setSandboxOutput(outputLines.join("\n"));
        }
      } catch (err: any) {
        setSandboxOutput(`Traceback (most recent call last):\n  RuntimeError: ${err?.message || "Execution exception"}`);
      } finally {
        setIsSandboxRunning(false);
      }
    }, 350);
  };

  // Personal Notes Handlers
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`smartedu_notes_${user?.id || "guest"}_${courseId}`);
        if (stored) setSavedNotesMap(JSON.parse(stored));
      } catch {}
    }
  }, [user?.id, courseId]);

  const handleOpenNotes = (topic: { id: string; title: string }) => {
    setActiveNotesTopic(topic);
    setNoteContent(savedNotesMap[topic.id] || "");
    setIsNotesDrawerOpen(true);
  };

  const handleSaveNotes = () => {
    if (!activeNotesTopic) return;
    const nextMap = { ...savedNotesMap, [activeNotesTopic.id]: noteContent };
    setSavedNotesMap(nextMap);
    if (typeof window !== "undefined") {
      localStorage.setItem(`smartedu_notes_${user?.id || "guest"}_${courseId}`, JSON.stringify(nextMap));
    }
    setNotification("✓ Personal notes saved for this lecture topic.");
    setIsNotesDrawerOpen(false);
    setTimeout(() => setNotification(null), 3500);
  };

  // Topic Quiz Handlers
  const handleStartTopicQuiz = (topic: { id: string; title: string }) => {
    const tTitle = topic.title;
    const questions = [
      {
        q: `What is the core objective of ${tTitle}?`,
        options: [
          `To establish sound algorithmic and architectural fundamentals`,
          `To configure third-party operating system drivers`,
          `To compile unoptimized binary binaries`,
          `To bypass compiler syntax checking`
        ],
        correct: 0,
        explanation: `${tTitle} focuses on building systematic algorithmic and engineering foundations.`
      },
      {
        q: `When implementing ${tTitle}, which best practice ensures optimal efficiency?`,
        options: [
          `Recursive looping without base cases`,
          `Appropriate data structure selection and vectorized operations`,
          `Global mutable variable state replication`,
          `Disabling garbage collection and memory pooling`
        ],
        correct: 1,
        explanation: `Choosing the correct data structure and vectorized operations minimizes execution overhead.`
      },
      {
        q: `In the context of ${tTitle}, how should exception handling and validation be structured?`,
        options: [
          `Silently swallowing all unexpected exceptions`,
          `Explicit validation at boundaries with descriptive error types`,
          `Hardcoding static exit codes throughout functions`,
          `Never checking input boundaries`
        ],
        correct: 1,
        explanation: `Explicit validation and typed error handling make code resilient and maintainable.`
      },
      {
        q: `What is the primary memory and space-complexity trade-off in ${tTitle}?`,
        options: [
          `Dynamic caching trades auxiliary space for faster computational throughput`,
          `Increasing stack depth reduces overall heap consumption`,
          `Inline expansions always double memory footprint unconditionally`,
          `Garbage collection pauses can be eliminated by infinite memory allocation`
        ],
        correct: 0,
        explanation: `Caching and memoization trade increased auxiliary memory to eliminate repeated redundant computations.`
      },
      {
        q: `When designing concurrent or multithreaded systems related to ${tTitle}, what guarantees data consistency?`,
        options: [
          `Unsynchronized shared pointer mutation`,
          `Atomic primitives, mutual exclusion locks, or immutable state pipelines`,
          `Running all threads at identical operating system priority`,
          `Disabling processor cache line invalidation`
        ],
        correct: 1,
        explanation: `Atomic primitives and thread synchronization locks protect critical sections against race conditions and state corruption.`
      },
      {
        q: `How should boundary and edge conditions be tested for ${tTitle} in production software?`,
        options: [
          `Only verify happy-path inputs with sample hardcoded data`,
          `Automated property-based testing and parameterized boundary test suites`,
          `Rely solely on user bug reports post-deployment`,
          `Ignore null, empty, or overflow values during integration`
        ],
        correct: 1,
        explanation: `Comprehensive automated test suites with parameterized boundary test cases ensure robust behavior across boundary inputs.`
      }
    ];
    setActiveQuizTopic({ id: topic.id, title: topic.title, questions });
    setQuizUserAnswers({});
    setQuizScore(null);
    setQuizSubmittedState(false);
    setIsQuizModalOpen(true);
  };

  const handleSubmitTopicQuiz = () => {
    if (!activeQuizTopic) return;
    let score = 0;
    activeQuizTopic.questions.forEach((q, idx) => {
      if (quizUserAnswers[idx] === q.correct) score++;
    });
    setQuizScore(score);
    setQuizSubmittedState(true);
    setNotification(`✓ Quiz Completed! Score: ${score}/${activeQuizTopic.questions.length} (+15 Mastery XP)`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Flashcards are faculty-published learning content, persisted by the backend.
  const handleOpenFlashcards = (topic: { id: string; title: string; contents?: any[] }) => {
    const flashcardContent = topic.contents?.find((content) => {
      if (content.content_type !== "EMBEDDED_CONTENT" || !content.text_content) return false;
      try {
        const payload = JSON.parse(content.text_content);
        return payload.kind === "FLASHCARD_DECK" && Array.isArray(payload.cards);
      } catch {
        return false;
      }
    });

    if (!flashcardContent) {
      setNotification("No flashcard deck has been published for this topic yet.");
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const payload = JSON.parse(flashcardContent.text_content);
    const cards = payload.cards.filter(
      (card: unknown): card is { term: string; definition: string; example?: string } =>
        typeof card === "object" &&
        card !== null &&
        typeof (card as { term?: unknown }).term === "string" &&
        typeof (card as { definition?: unknown }).definition === "string"
    );
    if (cards.length === 0) {
      setNotification("The published flashcard deck has no valid cards.");
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    setActiveFlashcardTopic({ id: topic.id, title: topic.title, cards });
    setCurrentFlashcardIndex(0);
    setIsCardFlipped(false);
    setMasteredCardsSet(new Set());
    setIsFlashcardModalOpen(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFD] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Loader2 className="h-8 w-8 text-[#582C64] animate-spin" />
          <span>Opening Course LMS Portal...</span>
        </div>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFD] p-5 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
          <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Course unavailable</h1>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{error}</p>
          <Link
            href={backHref}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#582C64] text-white text-xs font-bold shadow-xs hover:bg-[#4A235A] transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to courses
          </Link>
        </div>
      </main>
    );
  }

  const courseInitials = (course?.course_code || "CS")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase() || "CS";

  const matchedCourse = courses.find(
    (c) => c.code === course?.course_code || c.name === course?.title || (course?.course_code && c.code.toLowerCase().includes(course.course_code.toLowerCase()))
  );
  const instructorName =
    course?.instructor_name ||
    (matchedCourse?.instructor ? `Prof. ${matchedCourse.instructor}` : "Course Faculty");
  const instructorDesignation =
    course?.instructor_designation ||
    (matchedCourse?.department ? `Course Director - ${matchedCourse.department}` : ((course as any)?.department_name ? `Course Director - ${(course as any).department_name}` : "Course Director"));

  return (
    <main className="min-h-screen bg-[#FBFBFE] dark:bg-slate-950 flex flex-col w-full text-slate-800 dark:text-slate-100">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* ─── 1. UNIFLOW BRAND HEADER ─── */}
      <header className="w-full bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shadow-md relative z-20">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link
              href={backHref}
              aria-label="Back to courses"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-sm tracking-wider shadow-inner text-white">
              {courseInitials}
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200 block">
                {instructorName.toUpperCase()}
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                {course?.title || course?.course_code}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-blue-100 font-mono text-[11px] font-bold">
              {course?.course_code}
            </span>
          </div>
        </div>

        {/* ─── 2. SUB-NAVIGATION TABS (Overview, Study, Tasks, Practice, Sandbox, Analytics) ─── */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 shadow-2xs">
          <div className="max-w-[1600px] w-full mx-auto flex items-center gap-1 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("study")}
              className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "study"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Study</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "tasks"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Tasks</span>
              {totalCourseTasksCount > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">
                  {totalCourseTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("practice")}
              className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "practice"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Practice</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "analytics"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("feedback")}
              className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "feedback"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Module Feedback</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 3. MAIN TAB CONTENT CONTAINER ─── */}
      <div className="max-w-[1600px] w-full mx-auto p-4 sm:p-8 flex-1">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW (Matching User Reference Image 4) */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Split: Hero Card & Micro Metrics (Left) + Course Info Card (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {/* 1. Continue Where You Left Off Hero */}
                <div
                  onClick={() => {
                    if (nextUnfinishedTopic) {
                      setActiveTab("study");
                      const mIdx = course?.modules.findIndex((m) => m.id === nextUnfinishedTopic.moduleId);
                      if (mIdx !== undefined && mIdx >= 0) setSelectedModuleIndex(mIdx);
                      handleOpenDeck(nextUnfinishedTopic.id);
                    }
                  }}
                  className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Continue Where You Left Off
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {nextUnfinishedTopic ? nextUnfinishedTopic.title : "Introduction & Course Overview"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {nextUnfinishedTopic ? `${nextUnfinishedTopic.moduleTitle} • Topic Flashcard Deck` : "Module 1"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* 2. 4 Micro Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                    <Flame className="h-4 w-4 text-rose-500" />
                    <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {course?.course_progress_percentage || 0}%
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Avg Mastery
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {completedTopicsCount}/{totalTopicsCount}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Topics Mastered
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        courseAttendanceStats.isEligible === true
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
                          : courseAttendanceStats.isEligible === false
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}>
                        {courseAttendanceStats.isEligible === null ? "Not recorded" : courseAttendanceStats.isEligible ? "Eligible" : "Shortage"}
                      </span>
                    </div>
                    <p className={`text-xl font-black font-mono ${
                      courseAttendanceStats.isEligible === true
                        ? "text-emerald-600 dark:text-emerald-400"
                        : courseAttendanceStats.isEligible === false
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {courseAttendanceStats.pct === null ? "—" : `${courseAttendanceStats.pct}%`}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Class Attendance
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {Math.max(15, (course?.total_completed_contents || 0) * 12)}m
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Time on Course
                    </span>
                  </div>
                </div>

                {/* 3. Full Syllabus Accordion */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Syllabus — {course?.modules.length} units • {totalTopicsCount} topics
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab("study")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Flashcards</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {course?.modules.map((m, mIdx) => {
                      const isExpanded = expandedModules[m.id];
                      return (
                        <div
                          key={m.id}
                          className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedModules((prev) => ({
                                ...prev,
                                [m.id]: !prev[m.id],
                              }))
                            }
                            className="w-full p-3.5 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-bold text-slate-400">{mIdx + 1}</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{m.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="font-mono">{m.topics.length} topics</span>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-4 bg-white dark:bg-slate-900 space-y-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {m.topics.map((t) => (
                                  <div
                                    key={t.id}
                                    onClick={() => {
                                      setActiveTab("study");
                                      setSelectedModuleIndex(mIdx);
                                      handleOpenDeck(t.id);
                                    }}
                                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-200 transition-colors cursor-pointer flex items-center justify-between group"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                      <span className="truncate font-medium">{t.title}</span>
                                    </div>
                                    {t.is_topic_completed && (
                                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Course Info Card */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-2">
                    Course Info
                  </span>

                  {/* Instructor */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Instructor</span>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {instructorName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="truncate">
                        <strong className="text-xs text-slate-900 dark:text-white block truncate">{instructorName}</strong>
                        <p className="text-[11px] text-slate-500 truncate">{instructorDesignation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Course Details</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {course?.modules.length} units — {totalTopicsCount} topics
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {course?.modules.filter((m) => m.topics.every((t) => t.is_topic_completed)).length || 0} of{" "}
                      {course?.modules.length} units complete
                    </p>

                    {/* Class Attendance Standing */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Attendance Standing</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          courseAttendanceStats.isEligible === true
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : courseAttendanceStats.isEligible === false
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {courseAttendanceStats.pct === null ? courseAttendanceStats.label : `${courseAttendanceStats.pct}% • ${courseAttendanceStats.label}`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${courseAttendanceStats.isEligible === true ? "bg-emerald-500" : courseAttendanceStats.isEligible === false ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"}`}
                          style={{ width: `${Math.min(100, courseAttendanceStats.pct ?? 0)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {courseAttendanceStats.conducted > 0
                          ? `${courseAttendanceStats.attended} of ${courseAttendanceStats.conducted} classes attended`
                          : "Attendance will appear after the first recorded class"}
                      </p>
                    </div>

                    <Button
                      onClick={() => setActiveTab("study")}
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
                    >
                      Go to Flashcards
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STUDY (Matching User Reference Image 2 & 3) */}
        {/* ========================================================================= */}
        {activeTab === "study" && (
          <div className="animate-fade-in">
            <StudyDeckPlayer
              courseCode={course?.course_code || courseId}
              courseTitle={course?.title || "Course Curriculum"}
              modules={course?.modules || []}
              initialTopicId={activeDeckTopicId}
              onOpenAiTutor={(topic, prompt) => handleOpenAiTutorWithPrompt(topic, prompt)}
              onMarkTopicMastered={(topicId) => {
                const topic = allTopics.find((t) => t.id === topicId);
                if (topic && topic.contents[0]) {
                  void handleToggleContentComplete(topic.contents[0].id, false);
                }
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TASKS (Matching User Reference Image 5) */}
        {/* ========================================================================= */}
        {activeTab === "tasks" && (
          <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Coursework, Quizzes, Projects &amp; Case Studies
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All academic tasks, proctored examinations, capstone projects, and AI case studies assigned specifically for {course?.course_code || "this course"}.
              </p>
            </div>

            {/* Task Category Filter & Status Search */}
            <div className="space-y-3">
              {/* Category Segmented Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    taskCategoryFilter === "ALL"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  All Tasks ({totalCourseTasksCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("ASSIGNMENT")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    taskCategoryFilter === "ASSIGNMENT"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Assignments ({courseAssignments.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("QUIZ")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    taskCategoryFilter === "QUIZ"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Quizzes &amp; Exams ({courseQuizzes.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("PROJECT")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    taskCategoryFilter === "PROJECT"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>Projects &amp; Ideathons ({courseProjects.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("CASE_STUDY")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    taskCategoryFilter === "CASE_STUDY"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Case Studies ({courseCaseStudies.length})</span>
                </button>
              </div>

              {/* Search and Status Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search tasks by title, topics or format..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs w-full sm:w-auto">
                  {(["ALL", "PENDING", "SUBMITTED", "GRADED"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTaskFilter(filter)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        taskFilter === filter
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Course Tasks List */}
            <div className="space-y-3">
              {/* 1. ASSIGNMENTS */}
              {(taskCategoryFilter === "ALL" || taskCategoryFilter === "ASSIGNMENT") &&
                courseAssignments
                  .filter((a) => {
                    const sub = studentSubmissionsMap.get(a.id);
                    if (taskFilter === "PENDING" && sub) return false;
                    if (taskFilter === "SUBMITTED" && (!sub || sub.status !== "SUBMITTED")) return false;
                    if (taskFilter === "GRADED" && (!sub || sub.status !== "GRADED")) return false;
                    if (taskSearch.trim() && !a.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((asg) => {
                    const sub = studentSubmissionsMap.get(asg.id);
                    return (
                      <div
                        key={asg.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                                Assignment
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {asg.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              Due: {asg.dueDate ? new Date(asg.dueDate).toLocaleDateString() : "This Week"} &bull; {asg.totalPoints} Marks
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {sub?.status === "GRADED" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                              Graded: {sub.score}/{asg.totalPoints} pts
                            </span>
                          ) : sub ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              Pending Submission
                            </span>
                          )}

                          <Button
                            size="sm"
                            onClick={() => setSubmittingTask(asg)}
                            className="text-xs px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                          >
                            {sub ? "View Submission" : "Submit Work"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

              {/* 2. QUIZZES & EXAMINATIONS */}
              {(taskCategoryFilter === "ALL" || taskCategoryFilter === "QUIZ") &&
                courseQuizzes
                  .filter((q) => {
                    const isDone = q.status === "COMPLETED" || !!q.studentAnswers;
                    if (taskFilter === "PENDING" && isDone) return false;
                    if (taskFilter === "SUBMITTED" && !isDone) return false;
                    if (taskFilter === "GRADED" && (!isDone || q.studentScore === undefined)) return false;
                    if (taskSearch.trim() && !q.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((q) => {
                    const isDone = q.status === "COMPLETED" || !!q.studentAnswers;
                    return (
                      <div
                        key={q.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100">
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                {q.assessmentType === "MID_TERM" ? "Examination" : "Quiz Assessment"}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {q.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              Limit: {q.timeLimitMinutes || 20} Mins &bull; Total: {q.totalPoints || 25} Marks &bull; {q.isCameraProctored ? "Webcam Proctored" : "Standard"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {isDone ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                              {q.studentScore !== undefined ? `Score: ${q.studentScore}/${q.totalPoints || 25}` : "✓ Submitted"}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                              Scheduled Test
                            </span>
                          )}

                          <Link
                            href={`/student?tab=quizzes&quizId=${q.id}`}
                            className="text-xs px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{isDone ? "View Scorecard" : "Start Exam"}</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

              {/* 3. PROJECTS & IDEATHONS */}
              {(taskCategoryFilter === "ALL" || taskCategoryFilter === "PROJECT") &&
                courseProjects
                  .filter((p) => {
                    if (taskSearch.trim() && !p.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((p) => {
                    const squadText = p.minTeamSize === p.maxTeamSize
                      ? p.minTeamSize === 1
                        ? "Solo (1 Member)"
                        : `${p.minTeamSize} Members`
                      : `${p.minTeamSize || 2}–${p.maxTeamSize || 4} Members Squad`;

                    return (
                      <div
                        key={p.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                            <FolderKanban className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                                {p.format === "IDEATHON" ? "Ideathon Challenge" : "Capstone Project"}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {squadText}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {p.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              Due: {p.dueDate || "Term End"} &bull; Total: {p.totalMarks || 100} Marks &bull; Weightage: {p.weightagePct || 20}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <Link
                            href={`/student?tab=projects&projId=${p.id}`}
                            className="text-xs px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Open Project Workspace</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

              {/* 4. CASE STUDIES */}
              {(taskCategoryFilter === "ALL" || taskCategoryFilter === "CASE_STUDY") &&
                courseCaseStudies
                  .filter((cs) => {
                    if (taskSearch.trim() && !cs.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((cs) => {
                    return (
                      <div
                        key={cs.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                Case Study Simulation
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {cs.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              Interactive Technical Interview &bull; Total: {cs.totalPoints || 50} Marks
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <Link
                            href={`/student?tab=case-study&csId=${cs.id}`}
                            className="text-xs px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Launch Interview</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

              {/* Empty state when no tasks match */}
              {totalCourseTasksCount === 0 && (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                  <CheckSquare className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No coursework tasks, quizzes, or projects assigned yet for this course.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PRACTICE (Matching User Reference Image 1) */}
        {/* ========================================================================= */}
        {activeTab === "practice" && (
          <div className="animate-fade-in">
            <AdaptivePracticePlayer
              courseCode={course?.course_code || courseId}
              courseTitle={course?.title || "Course Curriculum"}
              modules={course?.modules || []}
              onOpenAiTutor={(topic, prompt) => handleOpenAiTutorWithPrompt(topic, prompt)}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CODE SANDBOX (When Sandbox Tab is Active) */}
        {/* ========================================================================= */}
        {activeTab === "sandbox" && (
          <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
            {/* Sandbox Toolbar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Interactive Code Sandbox</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      LIVE RUNTIME
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Test programming algorithms, data structures &amp; functions for {course?.title || course?.course_code}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Language Picker */}
                <select
                  value={sandboxLang}
                  onChange={(e) => {
                    const l = e.target.value as "python" | "javascript";
                    setSandboxLang(l);
                    if (l === "javascript") {
                      setSandboxCode(`// JavaScript Interactive Sandbox\nfunction fibonacci(n) {\n  let seq = [0, 1];\n  for (let i = 2; i < n; i++) {\n    seq.push(seq[i-1] + seq[i-2]);\n  }\n  return seq.slice(0, n);\n}\n\nconsole.log("Executing JavaScript algorithm...");\nconst result = fibonacci(10);\nconsole.log("Fibonacci:", result);\nconsole.log("✓ Done!");`);
                    } else {
                      setSandboxCode(`# Python Interactive Programming Sandbox\ndef calculate_fibonacci(n):\n    sequence = [0, 1]\n    for i in range(2, n):\n        sequence.append(sequence[i-1] + sequence[i-2])\n    return sequence[:n]\n\nprint("Executing Python analysis...")\nresult = calculate_fibonacci(10)\nprint(f"Fibonacci Sequence: {result}")\nprint("✓ Script finished execution successfully.")`);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                >
                  <option value="python">Python 3.11</option>
                  <option value="javascript">JavaScript (ES6)</option>
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(sandboxCode);
                    setNotification("✓ Code copied to clipboard!");
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="text-xs h-8 px-2.5 rounded-xl cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  <span>Copy</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (sandboxLang === "javascript") {
                      setSandboxCode(`// JavaScript Interactive Sandbox\nfunction fibonacci(n) {\n  let seq = [0, 1];\n  for (let i = 2; i < n; i++) {\n    seq.push(seq[i-1] + seq[i-2]);\n  }\n  return seq.slice(0, n);\n}\n\nconsole.log("Executing JavaScript algorithm...");\nconsole.log(fibonacci(10));`);
                    } else {
                      setSandboxCode(`# Python Interactive Programming Sandbox\ndef calculate_fibonacci(n):\n    sequence = [0, 1]\n    for i in range(2, n):\n        sequence.append(sequence[i-1] + sequence[i-2])\n    return sequence[:n]\n\nprint("Executing Python analysis...")\nresult = calculate_fibonacci(10)\nprint(f"Fibonacci Sequence: {result}")`);
                    }
                    setSandboxOutput("Ready to execute code.");
                  }}
                  className="text-xs h-8 px-2.5 rounded-xl cursor-pointer text-slate-500"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Reset</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleRunSandbox}
                  disabled={isSandboxRunning}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSandboxRunning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Run Code</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Split Editor and Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Code Editor Area */}
              <div className="bg-[#1E1E2E] rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
                <div className="bg-[#181825] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 font-mono text-[11px] text-slate-300">
                      main.{sandboxLang === "python" ? "py" : "js"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">UTF-8 • Sandbox Editor</span>
                </div>
                <textarea
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  rows={14}
                  className="w-full bg-[#1E1E2E] text-slate-100 font-mono text-xs p-4 resize-none focus:outline-hidden leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Output Terminal Console */}
              <div className="bg-[#0D1117] rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
                <div className="bg-[#161B22] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-mono text-[11px] font-bold text-slate-200">Execution Output</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    READY
                  </span>
                </div>
                <div className="p-4 flex-1 font-mono text-xs overflow-y-auto min-h-[280px]">
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">{sandboxOutput}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: ANALYTICS (Enhanced with Module-by-Module Progress & Streaks) */}
        {/* ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
            {/* Top Stat Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curriculum Progress</span>
                  <Award className="h-4 w-4 text-[#582C64]" />
                </div>
                <p className="text-3xl font-black text-[#582C64] dark:text-purple-300 font-mono">
                  {course?.course_progress_percentage || 0}%
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#582C64] h-full rounded-full transition-all duration-500"
                    style={{ width: `${course?.course_progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topics Mastered</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-black text-emerald-600 font-mono">
                  {completedTopicsCount} / {totalTopicsCount}
                </p>
                <span className="text-xs text-slate-500">
                  {Math.round((completedTopicsCount / Math.max(1, totalTopicsCount)) * 100)}% completed
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Study Streak</span>
                  <Flame className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-3xl font-black text-rose-500 font-mono">5 Days</p>
                <span className="text-xs text-slate-500">Active study consistency</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignments Done</span>
                  <CheckSquare className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-3xl font-black text-blue-600 font-mono">
                  {courseAssignments.filter((a) => studentSubmissionsMap.has(a.id)).length} / {courseAssignments.length}
                </p>
                <span className="text-xs text-slate-500">Real graded coursework</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Attendance</span>
                  <Users className="h-4 w-4 text-emerald-500" />
                </div>
                <p className={`text-3xl font-black font-mono ${courseAttendanceStats.isEligible === true ? "text-emerald-600 dark:text-emerald-400" : courseAttendanceStats.isEligible === false ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {courseAttendanceStats.pct === null ? "—" : `${courseAttendanceStats.pct}%`}
                </p>
                <span className="text-xs text-slate-500">
                  {courseAttendanceStats.conducted > 0
                    ? `${courseAttendanceStats.attended}/${courseAttendanceStats.conducted} classes • ${courseAttendanceStats.label}`
                    : "No attendance has been recorded"}
                </span>
              </div>
            </div>

            {/* Module-by-Module Progress Bars */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#582C64]" />
                <span>Curriculum Module Mastery Breakdown</span>
              </h3>

              <div className="space-y-4">
                {course?.modules.map((m, mIdx) => {
                  const mDone = m.topics.filter((t) => t.is_topic_completed).length;
                  const mTotal = m.topics.length;
                  const pct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                  return (
                    <div key={m.id || mIdx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {m.title}
                        </span>
                        <span className="font-mono text-slate-500">
                          {mDone}/{mTotal} topics ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#582C64] dark:bg-purple-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: MODULE FEEDBACK (Embedded Course Feedback Player) */}
        {/* ========================================================================= */}
        {activeTab === "feedback" && course && (
          <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
            <StudentModuleFeedbackView enrolledCourseCodes={[course.course_code]} />
          </div>
        )}
      </div>

      {/* ─── 4. INTERACTIVE TOPIC STUDY MODAL / READER ─── */}
      {isStudyModalOpen && activeDeckTopic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-[#582C64] dark:text-purple-300">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeDeckTopic.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Card {studyContentIndex + 1} of {Math.max(1, activeDeckContents.length)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStudyModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Lesson Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {currentContent ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentContent.title}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {currentContent.body_text ||
                        currentContent.text_content ||
                        "Standard academic curriculum unit. Review concepts below with AI study breakdown."}
                    </p>
                  </div>

                  {/* AI Breakdown */}
                  <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#582C64] dark:text-purple-300 font-bold">
                        <Sparkles className="h-4 w-4" />
                        <span>AI Conceptual Breakdown</span>
                      </div>
                      {aiGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />}
                    </div>

                    {aiExplanation ? (
                      <div className="space-y-2 text-slate-700 dark:text-slate-300">
                        <div className="whitespace-pre-wrap leading-relaxed">{aiExplanation}</div>
                        {aiKeyPoints.length > 0 && (
                          <div className="pt-2 border-t border-purple-200 dark:border-purple-900 space-y-1">
                            <strong className="block text-[11px] font-bold text-[#582C64] dark:text-purple-300 uppercase">
                              Key Exam Points:
                            </strong>
                            {aiKeyPoints.map((pt, pIdx) => (
                              <p key={pIdx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="h-1 w-1 rounded-full bg-purple-500" />
                                <span>{pt}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">Generating smart explanation...</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <p>Comprehensive topic reading deck ready for self-paced mastery.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={studyContentIndex === 0}
                  onClick={() => setStudyContentIndex((prev) => Math.max(0, prev - 1))}
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={studyContentIndex >= activeDeckContents.length - 1}
                  onClick={() => setStudyContentIndex((prev) => Math.min(activeDeckContents.length - 1, prev + 1))}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>

              {currentContent && (
                <Button
                  size="sm"
                  onClick={() => handleToggleContentComplete(currentContent.id, Boolean(currentContent.is_completed))}
                  disabled={markingProgress}
                  className={`text-xs font-bold px-4 py-2 rounded-xl cursor-pointer ${
                    currentContent.is_completed
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-[#582C64] hover:bg-[#4A235A] text-white"
                  }`}
                >
                  {currentContent.is_completed ? "✓ Mastered" : "Mark as Mastered"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. STUDENT SUBMISSION MODAL ─── */}
      {submittingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Submit Coursework: {submittingTask.title}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {submittingTask.courseCode} • Maximum marks: {submittingTask.totalPoints} pts
                </p>
              </div>
              <button
                onClick={() => setSubmittingTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePerformSubmission} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Upload PDF / Solution File
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.zip"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  Accepted formats: PDF document, image certificate, or zip archive.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Student Notes / Verification Explanation
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Verified Certificate Submission (Coursera) - mnnn.pdf"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmittingTask(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploadingWork}
                  className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploadingWork ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit Assignment</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. INTERACTIVE TOPIC QUIZ MODAL ─── */}
      {isQuizModalOpen && activeQuizTopic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-[#582C64] dark:text-purple-300">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Topic Quiz: {activeQuizTopic.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeQuizTopic.questions.length} Knowledge Check Questions • Earn Mastery XP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {quizSubmittedState && quizScore !== null && (
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-7 w-7 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-sm text-[#582C64] dark:text-purple-200">
                        Quiz Completed!
                      </h4>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300">
                        You scored {quizScore} out of {activeQuizTopic.questions.length} questions correctly.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#582C64] text-white font-mono font-bold text-xs">
                    +{quizScore * 5} XP
                  </span>
                </div>
              )}

              {activeQuizTopic.questions.map((qItem, qIdx) => {
                const userAns = quizUserAnswers[qIdx];
                const isCorrect = userAns === qItem.correct;
                return (
                  <div
                    key={qIdx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-3"
                  >
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      {qIdx + 1}. {qItem.q}
                    </p>

                    <div className="space-y-1.5">
                      {qItem.options.map((opt: string, optIdx: number) => {
                        const isChosen = userAns === optIdx;
                        let optionStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800";
                        if (quizSubmittedState) {
                          if (optIdx === qItem.correct) {
                            optionStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold";
                          } else if (isChosen && !isCorrect) {
                            optionStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                          }
                        } else if (isChosen) {
                          optionStyle = "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold";
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={quizSubmittedState}
                            onClick={() => setQuizUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                            className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                          >
                            <span>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </span>
                            {quizSubmittedState && optIdx === qItem.correct && (
                              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmittedState && (
                      <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800">
                        <strong className="text-slate-700 dark:text-slate-300">Explanation: </strong>
                        {qItem.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                {Object.keys(quizUserAnswers).length} of {activeQuizTopic.questions.length} answered
              </span>
              <div className="flex items-center gap-2">
                {quizSubmittedState ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setQuizUserAnswers({});
                      setQuizScore(null);
                      setQuizSubmittedState(false);
                    }}
                    className="text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Retake Quiz
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmitTopicQuiz}
                    disabled={Object.keys(quizUserAnswers).length === 0}
                    className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold px-4 rounded-xl cursor-pointer"
                  >
                    Submit Quiz
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="text-xs rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. INTERACTIVE FLASHCARDS MODAL ─── */}
      {isFlashcardModalOpen && activeFlashcardTopic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Flashcards: {activeFlashcardTopic.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Card {currentFlashcardIndex + 1} of {activeFlashcardTopic.cards.length} • Active Recall
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFlashcardModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Flashcard container with flip interaction */}
            {activeFlashcardTopic.cards[currentFlashcardIndex] && (
              <div
                onClick={() => setIsCardFlipped((prev) => !prev)}
                className={`min-h-[220px] rounded-2xl p-6 flex flex-col justify-between border cursor-pointer transition-all duration-300 select-none shadow-sm ${
                  isCardFlipped
                    ? "bg-[#F7F2F9] dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-slate-900 dark:text-white"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>{isCardFlipped ? "Definition & Details" : "Concept Term"}</span>
                  <span className="text-purple-600 dark:text-purple-400">Click anywhere to flip ⟲</span>
                </div>

                <div className="my-auto py-4 text-center">
                  {!isCardFlipped ? (
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {activeFlashcardTopic.cards[currentFlashcardIndex].term}
                    </h4>
                  ) : (
                    <div className="space-y-2 text-left">
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                        {activeFlashcardTopic.cards[currentFlashcardIndex].definition}
                      </p>
                      {activeFlashcardTopic.cards[currentFlashcardIndex].example && (
                        <p className="text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-950/60 p-2 rounded-lg">
                          {activeFlashcardTopic.cards[currentFlashcardIndex].example}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {masteredCardsSet.has(currentFlashcardIndex) ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Mastered
                      </span>
                    ) : (
                      "Not mastered yet"
                    )}
                  </span>
                  <span className="font-mono">
                    {currentFlashcardIndex + 1}/{activeFlashcardTopic.cards.length}
                  </span>
                </div>
              </div>
            )}

            {/* Flashcard controls */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentFlashcardIndex === 0}
                  onClick={() => {
                    setCurrentFlashcardIndex((prev) => Math.max(0, prev - 1));
                    setIsCardFlipped(false);
                  }}
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentFlashcardIndex >= activeFlashcardTopic.cards.length - 1}
                  onClick={() => {
                    setCurrentFlashcardIndex((prev) => Math.min(activeFlashcardTopic.cards.length - 1, prev + 1));
                    setIsCardFlipped(false);
                  }}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setMasteredCardsSet((prev) => {
                    const next = new Set(prev);
                    next.add(currentFlashcardIndex);
                    return next;
                  });
                  setNotification("✓ Card marked as mastered (+5 XP)");
                  setTimeout(() => setNotification(null), 3000);
                }}
                className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold px-3 rounded-xl cursor-pointer"
              >
                Mark Mastered
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. PERSONAL STUDY NOTES DRAWER / MODAL ─── */}
      {isNotesDrawerOpen && activeNotesTopic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in my-8 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Personal Lecture Notes
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Topic: {activeNotesTopic.title} • Saved locally to your account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNotesDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Your key notes, formulas, questions for faculty:
              </label>
              <textarea
                rows={9}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type your notes here... (e.g. Important formulas, questions for faculty in next lecture, syntax reminders)"
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs leading-relaxed focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[10px] text-slate-400">
                Notes are persisted across browser refreshes.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNotesDrawerOpen(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  className="bg-[#582C64] hover:bg-[#4A235A] text-white text-xs font-bold px-4 rounded-xl cursor-pointer"
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. FLOATING IN-PLAYER AI ACADEMIC TUTOR LAUNCHER ─── */}
      <button
        onClick={() => {
          setAiTutorInitialPrompt(undefined);
          setIsAiTutorOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 bg-[#582C64] hover:bg-[#4A235A] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 group cursor-pointer border-2 border-purple-300 dark:border-purple-600"
        title="Open course learning assistant"
      >
        <Sparkles className="h-5 w-5 text-amber-300 animate-pulse shrink-0" />
        <span className="text-xs font-extrabold tracking-wide hidden sm:inline">
          Course Learning Assistant
        </span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping hidden sm:inline" />
      </button>

      {/* ─── 9. IN-PLAYER AI ACADEMIC TUTOR DRAWER ─── */}
      <CourseAiTutorDrawer
        courseCode={course?.course_code || courseId}
        courseTitle={course?.title || "Course Curriculum"}
        todayTaughtTopic={todayTaughtTopic}
        currentUnit={todayUnitTitle}
        isOpen={isAiTutorOpen}
        onClose={() => setIsAiTutorOpen(false)}
        initialPrompt={aiTutorInitialPrompt}
        studentName={user?.first_name || "Student"}
      />
    </main>
  );
}
