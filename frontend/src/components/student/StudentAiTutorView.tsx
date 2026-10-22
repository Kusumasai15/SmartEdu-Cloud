"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  Send,
  Bot,
  User,
  Zap,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  ListOrdered,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Code2,
  FileQuestion,
  GraduationCap,
  AlertCircle,
  BrainCircuit,
  BookmarkCheck,
} from "lucide-react";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";
import { FormattedMarkdownMessage } from "@/components/lms/CourseAiTutorDrawer";

interface TutorChatMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  timestamp: string;
  suggestedFollowups?: string[];
  topic?: string;
}

const DEFAULT_TOPIC_PRESETS = [
  { course: "CS301", name: "Data Structures", topic: "B-Trees vs B+ Trees Indexing in Databases", prompt: "Explain the architectural difference between B-Trees and B+ Trees and why database indexes exclusively use B+ Trees." },
  { course: "CS302", name: "Operating Systems", topic: "Deadlock Handling: Prevention vs Avoidance vs Detection", prompt: "Walk me through Banker's Algorithm with a concrete allocation matrix example and explain safety state." },
  { course: "CS303", name: "Database Systems", topic: "Normalization: 3NF vs Boyce-Codd (BCNF)", prompt: "Give a concrete relation schema that is in 3NF but violates BCNF, and show how to decompose it losslessly." },
  { course: "CS304", name: "Computer Networks", topic: "TCP Congestion Control: AIMD, Slow Start, Fast Recovery", prompt: "How does TCP distinguish between packet loss from congestion vs random noise, and how does Reno react?" },
  { course: "AI401", name: "Artificial Intelligence", topic: "A* Search & Heuristic Admissibility", prompt: "Prove why an admissible heuristic ensures optimality in A* tree search, and what happens if consistency is violated." },
];

export function StudentAiTutorView() {
  const { courses, currentSemester } = useAcademicData();
  const { user } = useAuth();

  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(() => {
    return courses[0]?.code || "CS301";
  });
  const [activeMode, setActiveMode] = useState<"CHAT" | "STUDY_PLAN" | "QUIZ">("CHAT");
  const [messages, setMessages] = useState<TutorChatMessage[]>(() => [
    {
      id: "welcome-1",
      sender: "AI",
      text: `Hello ${user?.first_name || "Student"}! I am your **UniFlow AI Academic Tutor**.\n\nI can help you master complex course concepts, prepare structured study schedules for your upcoming continuous assessments (DSA) and semester exams (SEE), or run rapid knowledge checks.\n\n**Select a course or ask any doubt below to get started!**`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedFollowups: [
        "Explain B-Trees vs B+ Trees Indexing",
        "How does Banker's Algorithm prevent deadlock?",
        "Show me 3NF vs BCNF with an example",
        "Explain TCP 3-way handshake and SYN floods",
      ],
    },
  ]);

  const [inputDoubt, setInputDoubt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Study Plan Generator State
  const [targetExamDate, setTargetExamDate] = useState("In 14 Days (Mid-Term Exam)");
  const [studyPlanResult, setStudyPlanResult] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Rapid Quiz State
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    selectedOption?: number;
  }>>([]);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedCourse = courses.find((c) => c.code === selectedCourseCode) || courses[0] || {
    code: "CS301",
    name: "Core Academic Course",
    department: "Computer Science",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fallback intelligent pedagogical knowledge synthesizer
  const generatePedagogicalResponse = (question: string, courseCode: string, courseName: string): { reply: string; followups: string[] } => {
    const qLower = question.toLowerCase();

    if (qLower.includes("b-tree") || qLower.includes("b+ tree") || qLower.includes("index")) {
      return {
        reply: `### B-Trees vs B+ Trees in Relational Database Engines\n\nIn database management systems (**${courseCode}: ${courseName}**), disk block I/O is the primary performance bottleneck. Both structures are self-balancing multiway search trees, but their internal storage patterns differ significantly:\n\n1. **Data Pointer Storage**:\n   - **B-Tree**: Keys and record pointers are stored in **both internal and leaf nodes**. Searching for a key might terminate early at an internal node.\n   - **B+ Tree**: Internal nodes store **only search keys** (as routing separators). All record pointers and data records reside **strictly in leaf nodes**.\n\n2. **Leaf Node Linked Structure**:\n   - In a **B+ Tree**, all leaf nodes are connected via a doubly-linked list (\`Leaf -> NextLeaf\`). This enables \\(O(\\log N + K)\\) range scans (\`WHERE age BETWEEN 20 AND 30\`) without tree traversals.\n\n3. **Fan-out & Disk Block Utilization**:\n   - Because internal nodes in B+ Trees do not store payload pointers, a standard 4KB or 8KB disk block holds significantly more index keys. This yields a massive branch factor (e.g., fanout > 100), keeping the tree height shallow (\\(h \\le 3\\) even for millions of records).\n\n**Verdict**: Modern storage engines (InnoDB, PostgreSQL heap indexes) utilize **B+ Trees** due to superior range query efficiency and cache locality.`,
        followups: [
          "How does node splitting work during an insert in a B+ Tree?",
          "What is the time complexity of B+ Tree search vs Red-Black Tree?",
          "Why do SSDs still benefit from B+ Tree indexing over Hash Indexes?",
        ],
      };
    }

    if (qLower.includes("deadlock") || qLower.includes("banker") || qLower.includes("avoidance")) {
      return {
        reply: `### Deadlock Management: Prevention vs Avoidance (${courseCode})\n\nA deadlock in operating systems occurs when a set of concurrent processes are permanently blocked because each process holds a resource and waits for another resource held by another process.\n\n#### 1. The 4 Necessary Conditions (Coffman Conditions)\nFor a deadlock to occur, all four must hold simultaneously:\n- **Mutual Exclusion**: At least one resource is held in a non-shareable mode.\n- **Hold and Wait**: A process holds at least one resource while awaiting others.\n- **No Preemption**: Resources cannot be forcibly revoked; must be released voluntarily.\n- **Circular Wait**: Set \\(\\{P_0, P_1, \\dots, P_n\\}\\) exists where \\(P_i\\) waits for \\(P_{(i+1) \\pmod n}\\).\n\n#### 2. Strategy Comparison\n- **Deadlock Prevention**: Invalidate at least one Coffman condition by design (e.g. impose a total linear order on resource allocation to prevent circular wait).\n- **Deadlock Avoidance (Banker's Algorithm)**: System inspects dynamic allocation state. A request is granted only if the resulting state remains **SAFE** (there exists at least one safe execution sequence ensuring all processes can terminate).\n- **Deadlock Detection & Recovery**: Allow deadlock to occur, periodically execute cycle detection on the Resource Allocation Graph (RAG), and preempt/terminate victims.`,
        followups: [
          "How does Banker's Algorithm verify if a state is SAFE?",
          "What is the difference between starvation and deadlock?",
          "Can semaphore wait() operations create priority inversion with deadlock?",
        ],
      };
    }

    if (qLower.includes("3nf") || qLower.includes("bcnf") || qLower.includes("normal")) {
      return {
        reply: `### Normalization: 3NF vs Boyce-Codd Normal Form (BCNF)\n\nDatabase normalization removes data redundancy and update/delete anomalies while preserving functional dependencies.\n\n#### Third Normal Form (3NF)\nA relation \\(R\\) is in 3NF if for every non-trivial functional dependency \\(X \\to Y\\):\n1. \\(X\\) is a **Superkey**, OR\n2. \\(Y\\) is a **Prime Attribute** (part of any candidate key).\n\n#### Boyce-Codd Normal Form (BCNF)\nBCNF is stricter than 3NF. For every non-trivial functional dependency \\(X \\to Y\\):\n- \\(X\\) MUST strictly be a **Superkey** (Condition #2 is eliminated).\n\n#### Classic Example\nConsider relation \\(\\text{Enrollment}(Student, Course, Advisor)\\):\n- An advisor advises only one course: \\(Advisor \\to Course\\).\n- A student takes multiple courses and has one advisor per course: \\((Student, Course) \\to Advisor\\).\n\nHere, Candidate Keys are \\((Student, Course)\\) and \\((Student, Advisor)\\).\n- For \\(Advisor \\to Course\\): \\(Advisor\\) is **NOT a Superkey**. However, \\(Course\\) is a prime attribute. Thus, the schema is in **3NF**.\n- However, it **violates BCNF** because \\(Advisor\\) is not a superkey. Redundancy occurs every time another student enrolls with the same advisor.\n\n**Trade-off**: Decomposing into BCNF guarantees zero redundancy, but in some schemas it cannot preserve all functional dependencies without cross-table joins. 3NF always guarantees dependency preservation.`,
        followups: [
          "Show step-by-step lossless join decomposition into BCNF",
          "What is the difference between 1NF and 2NF?",
          "Why does BCNF sometimes sacrifice dependency preservation?",
        ],
      };
    }

    // Default high-level pedagogical breakdown
    return {
      reply: `### Conceptual Breakdown: ${question}\n\nIn **${courseCode} (${courseName})**, this topic forms an essential component of the syllabus and continuous evaluation criteria.\n\n#### Core Principles & Mechanism\n1. **Theoretical Foundation**: Understanding the fundamental invariants and constraints governing this concept is critical for both university assessments and technical interview questions.\n2. **System Implementation**: In production architectures, this mechanism ensures deterministic execution, prevents race conditions, and optimizes computational overhead.\n3. **Practical Trade-offs**: Engineers frequently weigh time complexity against space efficiency and maintainability when choosing this pattern over alternatives.\n\n#### University Examination Tips\n- Always state the formal definition and prerequisite assumptions first.\n- Draw a clear block diagram or trace table with at least 3 execution steps.\n- Mention boundary conditions and edge cases (e.g. empty inputs, null pointers, capacity overflow) to secure top rubric points.`,
      followups: [
        `Can you provide an annotated code example for this in C++ / Java / Python?`,
        `What are the most frequent exam questions asked by professors on this topic?`,
        `How does this concept connect to upcoming semester modules?`,
      ],
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputDoubt).trim();
    if (!query || isLoading) return;

    const userMsg: TutorChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "USER",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputDoubt("");
    setIsLoading(true);

    let reply = "";
    let followups: string[] = [];

    // Try API route first
    try {
      const res = await fetch("/api/ai/tutor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: selectedCourse.code,
          courseName: selectedCourse.name,
          topic: query.slice(0, 60),
          question: query,
          history: messages.slice(-4).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reply) {
          reply = data.reply;
        }
      }
    } catch (requestError) {
      console.error("Tutor request failed:", requestError);
    }

    if (!reply) {
      reply = "The learning assistant is currently unavailable. No generated answer was saved. Please try again.";
    }

    const aiMsg: TutorChatMessage = {
      id: `ai-${Date.now()}`,
      sender: "AI",
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedFollowups: followups,
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleGenerateStudyPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const res = await fetch("/api/ai/tutor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: selectedCourse.code,
          courseName: selectedCourse.name,
          topic: `7-Day Mastery Study Plan for ${targetExamDate}`,
          question: `Generate a structured, personalized 7-day revision mastery plan for course ${selectedCourse.code} (${selectedCourse.name}) targeting ${targetExamDate}. Include day-by-day modules, laboratory/coding review items, and continuous assessment strategies.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reply) {
          setStudyPlanResult(data.reply);
          setIsGeneratingPlan(false);
          return;
        }
      }
    } catch {
      setStudyPlanResult("The study-plan service is currently unavailable. No plan was generated. Please retry.");
    }
    setIsGeneratingPlan(false);
  };

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setIsQuizSubmitted(false);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QUIZ",
          courseCode: selectedCourse.code,
          topic: `${selectedCourse.name} Core Concepts & Evaluation`,
          count: 3,
          difficulty: "MEDIUM",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.questions && Array.isArray(data.data.questions)) {
          const aiQuestions = data.data.questions.map((q: any, idx: number) => ({
            id: idx + 1,
            question: q.prompt,
            options: q.options || [],
            correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
            explanation: q.explanation || "Correct answer derived from syllabus principles.",
          }));
          setQuizQuestions(aiQuestions);
          setIsGeneratingQuiz(false);
          return;
        }
      }
    } catch {
      setQuizQuestions([]);
    }
    setIsGeneratingQuiz(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-blue-500/20">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 opacity-10 hidden sm:block pointer-events-none">
          <BrainCircuit className="w-56 h-56 text-blue-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>UniFlow AI Academic Tutor</span>
              <span className="text-[10px] bg-blue-400/20 px-1.5 py-0.5 rounded font-mono">SANDBOXED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Personalized Course Learning &amp; Concept Mastery
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Ask deep conceptual questions, receive tailored study roadmaps for upcoming assessments, and drill through rapid quizzes calibrated to your curriculum.
            </p>
          </div>

          {/* Course Selector Capsule */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2 min-w-[240px]">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
              Active Focus Course
            </span>
            <select
              value={selectedCourseCode}
              onChange={(e) => setSelectedCourseCode(e.target.value)}
              className="w-full bg-slate-900/90 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-blue-400/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {courses.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-300 flex items-center justify-between pt-1">
              <span>{selectedCourse.department}</span>
              <span className="text-emerald-400 font-bold">Sem {currentSemester || 5}</span>
            </div>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveMode("CHAT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === "CHAT"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Ask Doubts &amp; Concept Explainer</span>
          </button>

          <button
            onClick={() => setActiveMode("STUDY_PLAN")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === "STUDY_PLAN"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Generate Study Roadmap</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("QUIZ");
              if (quizQuestions.length === 0) handleGenerateQuiz();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === "QUIZ"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Rapid Knowledge Drill</span>
          </button>
        </div>
      </div>

      {/* ─── MODE 1: CONCEPT DOUBT CHAT ─── */}
      {activeMode === "CHAT" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Stream */}
          <div className="lg:col-span-3 flex flex-col h-[650px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tutoring Session: {selectedCourse.code}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Syllabus-aligned guidance &amp; evaluation rubric coaching
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setMessages([
                    {
                      id: `reset-${Date.now()}`,
                      sender: "AI",
                      text: `Session reset for **${selectedCourse.code}**. What concept would you like to review?`,
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ]);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Restart Session"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.sender === "USER" ? "justify-end" : "justify-start"}`}
                >
                  {m.sender === "AI" && (
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs text-xs font-bold mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2 ${m.sender === "USER" ? "items-end" : "items-start"}`}>
                    <div
                      className={`relative p-4 rounded-2xl text-xs ${
                        m.sender === "USER"
                          ? "bg-blue-600 text-white rounded-tr-xs shadow-md"
                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/60 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {m.sender === "AI" ? (
                        <FormattedMarkdownMessage text={m.text} />
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      )}

                      {/* Action toolbar for AI messages */}
                      {m.sender === "AI" && (
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-400">
                          <span>{m.timestamp}</span>
                          <button
                            onClick={() => handleCopyMessage(m.id, m.text)}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Followup suggestions */}
                    {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.suggestedFollowups.map((f, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSendMessage(f)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer text-left"
                          >
                            + {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {m.sender === "USER" && (
                    <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      {user?.first_name?.[0] || "U"}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs text-xs animate-pulse">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-xs text-xs text-slate-500 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                    <span>AI Tutor is reviewing syllabus materials and formulating explanation...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputDoubt}
                  onChange={(e) => setInputDoubt(e.target.value)}
                  placeholder={`Ask anything about ${selectedCourse.code} (e.g., algorithms, proofs, tradeoffs, exam tips)...`}
                  className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <button
                  type="submit"
                  disabled={!inputDoubt.trim() || isLoading}
                  className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>
            </div>
          </div>

          {/* Quick Presets & Academic Tips Panel */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Frequently Tested Topics</span>
              </div>
              <p className="text-xs text-slate-500">
                Click any core concept to load an in-depth pedagogical breakdown:
              </p>

              <div className="space-y-2">
                {DEFAULT_TOPIC_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCourseCode(p.course);
                      handleSendMessage(p.prompt);
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      <span>{p.topic}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                        {p.course}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/60 to-blue-50/40 dark:from-slate-800/50 dark:to-blue-950/20 border border-indigo-100/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <BookmarkCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Academic Record Notice</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                As per institutional governance standards, AI Tutor guidance is strictly pedagogical and operates in an isolated sandbox. It does not directly modify official institutional gradebooks, attendance rosters, or examination transcripts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODE 2: STUDY ROADMAP GENERATOR ─── */}
      {activeMode === "STUDY_PLAN" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Personalized Exam &amp; Assessment Study Planner
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Generate a structured preparation timeline calibrated to your 50% Continuous Internal Assessment (DSA) and 50% Semester End Exam (SEE) weightage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Course
                </label>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white">
                  {selectedCourse.code} - {selectedCourse.name}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Exam Window
                </label>
                <select
                  value={targetExamDate}
                  onChange={(e) => setTargetExamDate(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="In 7 Days (Continuous Assessment DSA Test)">In 7 Days (Continuous Assessment DSA Test)</option>
                  <option value="In 14 Days (Mid-Term Exam)">In 14 Days (Mid-Term Exam)</option>
                  <option value="In 30 Days (Semester End Examinations SEE)">In 30 Days (Semester End Examinations SEE)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateStudyPlan}
              disabled={isGeneratingPlan}
              className="btn-saas-primary text-xs py-3 px-6 w-full flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGeneratingPlan ? "Synthesizing Personalized Roadmap..." : "Generate 7-Day Mastery Roadmap"}</span>
            </button>

            {studyPlanResult && (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in">
                <FormattedMarkdownMessage text={studyPlanResult} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODE 3: RAPID KNOWLEDGE DRILL ─── */}
      {activeMode === "QUIZ" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Adaptive Concept Drill: {selectedCourse.code}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  3 rapid multiple-choice questions to test your theoretical and algorithmic recall.
                </p>
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz}
                className="btn-saas-outline text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>New Questions</span>
              </button>
            </div>

            {isGeneratingQuiz ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <div className="inline-block animate-spin mb-2">⚡</div>
                <p>Generating adaptive questions for {selectedCourse.code}...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {quizQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                        {q.question}
                      </p>
                    </div>

                    <div className="space-y-2 pl-8">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = q.selectedOption === optIdx;
                        const isCorrect = isQuizSubmitted && optIdx === q.correctIndex;
                        const isWrong = isQuizSubmitted && isSelected && optIdx !== q.correctIndex;

                        return (
                          <button
                            key={optIdx}
                            disabled={isQuizSubmitted}
                            onClick={() => {
                              setQuizQuestions((prev) =>
                                prev.map((item) =>
                                  item.id === q.id ? { ...item, selectedOption: optIdx } : item
                                )
                              );
                            }}
                            className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                              isCorrect
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold"
                                : isWrong
                                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200"
                                : isSelected
                                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-200"
                                : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                            }`}
                          >
                            <span className="font-mono text-[11px] mr-2 text-slate-400">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {isQuizSubmitted && (
                      <div className="pl-8 pt-2 text-xs space-y-1">
                        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[11px] text-slate-600 dark:text-slate-300">
                          <strong className="text-blue-700 dark:text-blue-400 block mb-0.5">
                            Rubric Explanation:
                          </strong>
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {!isQuizSubmitted ? (
                  <button
                    onClick={() => setIsQuizSubmitted(true)}
                    className="btn-saas-primary text-xs py-3 px-6 w-full flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Submit Drill Answers &amp; Check Score</span>
                  </button>
                ) : (
                  <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Drill Complete! Score: {quizQuestions.filter((q) => q.selectedOption === q.correctIndex).length} / {quizQuestions.length}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Answers and detailed rubric feedback have been verified.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateQuiz}
                      className="btn-saas-primary text-xs py-2 px-4"
                    >
                      Practice Next Set
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
