"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Search,
  BookOpen,
  Award,
  ShieldCheck,
  Calendar,
  Sparkles,
  Users,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LifeBuoy,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowRight,
  ShieldAlert,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface FeatureCard {
  id: string;
  title: string;
  category: string;
  icon: any;
  description: string;
  keyPoints: string[];
  portalLink?: string;
}

const FEATURE_CATALOG: FeatureCard[] = [
  {
    id: "courses-modules",
    title: "Course Curriculum & Digital Assets",
    category: "Academic",
    icon: BookOpen,
    description: "Access registered semester courses, multi-unit lecture modules, downloadable study slides, and syllabus objectives.",
    keyPoints: [
      "View unit-wise lecture materials and required readings",
      "Track completed vs upcoming syllabus units in real time",
      "Submit anonymous module feedback to faculty every 3 units",
    ],
    portalLink: "/student?tab=courses",
  },
  {
    id: "assessment-gradebook",
    title: "Continuous Assessment (DSA) & Rubrics",
    category: "Assessments",
    icon: Award,
    description: "Institutional 50% Continuous Internal Assessment (DSA) + 50% Semester End Exam (SEE) regulation breakdown.",
    keyPoints: [
      "Submit written, coding, and PDF assignments before statutory deadlines",
      "Interactive code runner with automated test cases and memory bounds",
      "View SpeedGrader rubric breakdowns and professor comments",
    ],
    portalLink: "/student?tab=assignments",
  },
  {
    id: "proctored-exams",
    title: "Camera-Based Proctored Examinations",
    category: "Examinations",
    icon: ShieldCheck,
    description: "High-integrity online examination environment supervised by camera telemetry and automated incident monitors.",
    keyPoints: [
      "Active webcam facial verification prior to question paper unlock",
      "Fullscreen lock preventing tab switches or secondary monitor usage",
      "Hall Ticket (Admit Card) with encrypted verification code",
    ],
    portalLink: "/student?tab=hall-ticket",
  },
  {
    id: "attendance-leaves",
    title: "Attendance Tracking & OD / Leave System",
    category: "Governance",
    icon: Calendar,
    description: "Statutory 75% attendance threshold monitoring with multi-tier digital leave application workflows.",
    keyPoints: [
      "Real-time attendance percentage calculator per course",
      "Apply for Medical, On-Duty (OD), or College Event leaves with proof upload",
      "Automated two-step approval chain: Class Advisor -> HOD clearance",
    ],
    portalLink: "/student?tab=leaves",
  },
  {
    id: "ai-learning-career",
    title: "AI Tutor & Mock Interview Suite",
    category: "AI & Career",
    icon: Sparkles,
    description: "24/7 AI-assisted pedagogical support, lesson catch-up summaries, and career interview preparation.",
    keyPoints: [
      "Ask complex course doubts with instant step-by-step proofs and diagrams",
      "Practice technical & behavioral interviews with Dr. Sarah Vance AI avatar",
      "Strictly sandboxed: AI assistance never modifies official university grades",
    ],
    portalLink: "/student?tab=ai-tutor",
  },
  {
    id: "mcp-server",
    title: "Model Context Protocol (MCP) Server",
    category: "MCP & AI",
    icon: Zap,
    description: "Enterprise Model Context Protocol (MCP) server connecting SmartEdu to AI assistants like Antigravity, Claude, Cursor, and ChatGPT.",
    keyPoints: [
      "24 production tools: author coursework, create quizzes, launch ideathons & case studies, inspect class dossiers, and track attendance",
      "Mandatory authentication with RBAC: faculty/admin author curriculum while student accounts submit work and access study tools",
      "Compatible via stdio (Claude Desktop, Cursor) and HTTP SSE (ChatGPT, Antigravity, custom agents)",
    ],
    portalLink: "/help",
  },
  {
    id: "campus-faculty",
    title: "Faculty Cabins & Timetable Directory",
    category: "Campus Life",
    icon: Users,
    description: "Lookup professor office cabins, consultation hours, and department announcements.",
    keyPoints: [
      "Locate faculty cabins, phone extensions, and office consultation slots",
      "Participate in subject discussion boards and resolve peer queries",
      "Receive push notices on room changes and examination circulars",
    ],
    portalLink: "/student?tab=faculty-directory",
  },
];

const FAQ_LIST = [
  {
    question: "What is the SmartEdu MCP Server and what capabilities does it provide?",
    category: "MCP & AI",
    answer: "The SmartEdu MCP (Model Context Protocol) Server exposes university infrastructure securely to AI coding assistants (such as Antigravity, Claude Desktop, Cursor, and OpenAI tools). It provides 24 tools including: account authentication, assignment creation, quiz authoring & proctoring, SpeedGrader evaluations, case study creation, project & ideathon launches, class dossier inspection, student attendance verification, announcement broadcasting, and weekly timetable retrieval.",
  },
  {
    question: "How do I connect Claude Desktop, Cursor, or Antigravity to the SmartEdu MCP server?",
    category: "MCP & AI",
    answer: "Add the following configuration to your Claude Desktop config (claude_desktop_config.json) or Cursor MCP settings:\n{\n  \"mcpServers\": {\n    \"smartedu\": {\n      \"command\": \"python\",\n      \"args\": [\"C:/Users/275680/Desktop/DESIGN PROJECT 5SEM/smartedu_mcp_server.py\"]\n    }\n  }\n}\nOnce connected, prompt the agent with: 'Connect to SmartEdu using my institutional email/registration number and password' to unlock your university academic toolkit.",
  },

  {
    question: "What happens if my attendance drops below the 75% statutory threshold?",
    category: "Attendance",
    answer: "As per university academic regulations, students with attendance below 75% in a course cannot generate their Hall Ticket (Admit Card) for the Semester End Examination (SEE). You must apply for approved Medical Leaves or On-Duty (OD) credits through the Leave & OD portal, which must be sanctioned by your Class Advisor and HOD before the audit cutoff.",
  },
  {
    question: "How are internal assessments (DSA) and final exams (SEE) weighted?",
    category: "Grading",
    answer: "Under the active 2024 University Regulation, each course is evaluated on a 50 DSA + 50 SEE model. The 50 DSA marks are derived from: Assignments & Coding Labs (25%), Mid-Term Exam (25%), Class Quizzes (25%), and Practical Laboratory performance (25%). The remaining 50% is determined by the centrally scheduled Semester End Examination.",
  },
  {
    question: "What hardware and browser actions are monitored during online proctored exams?",
    category: "Examinations",
    answer: "During a proctored examination, your front-facing camera must remain enabled and unobstructed. The proctoring engine monitors: face presence (flags if face leaves camera view or multiple persons appear), tab switching or window defocusing, and keyboard shortcuts (copy, paste, inspect). Any infractions trigger immediate warning dialogs and are logged for review by the Controller of Examinations.",
  },
  {
    question: "How do I apply for On-Duty (OD) attendance credit for hackathons or sports symposiums?",
    category: "Leaves",
    answer: "Navigate to the Leave & OD portal, select 'On Duty (OD)' as the leave category, specify the affected dates and courses, and attach your official permission letter or event invitation. Your Class Advisor reviews the proof first; once endorsed, the HOD performs final approval, which automatically credits your attendance roster.",
  },
  {
    question: "Do AI Tutor answers or AI Mock Interview scores affect my official GPA?",
    category: "AI & Career",
    answer: "No. The AI Academic Tutor and AI Mock Interview tools operate in an isolated pedagogical sandbox. AI outputs are designed purely for your individual skill enhancement and conceptual mastery. They have zero authority to alter your official university marks, transcripts, or academic standing.",
  },
];

export function StudentHelpCenterView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const filteredFeatures = FEATURE_CATALOG.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.keyPoints.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === "ALL" || f.category.toUpperCase() === selectedCategory.toUpperCase();
    return matchesSearch && matchesCat;
  });

  const filteredFaqs = FAQ_LIST.filter((faq) => {
    return (
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      setTicketSubmitted(true);
      setTicketSubject("");
      setTicketMessage("");
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ─── Hero Header & Search Bar ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-blue-500/20">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>SmartEdu Campus OS Knowledge Base</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            UniFlow Student Help &amp; Platform Guide
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Explore all capabilities of your Cloud LMS—from proctored examinations and attendance regulations to AI career simulation and gradebook moderation.
          </p>

          {/* Quick Search */}
          <div className="relative pt-2">
            <Search className="absolute left-4 top-5.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics (e.g. 'attendance 75%', 'hall ticket', 'AI tutor', 'DSA weightage')..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/10 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 text-white placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── PLATFORM FEATURE DIRECTORY ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Platform Feature &amp; Capability Directory
            </h2>
            <p className="text-xs text-slate-500">
              Direct access to all 6 academic pillars configured in your institutional portal
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {["ALL", "ACADEMIC", "ASSESSMENTS", "EXAMINATIONS", "GOVERNANCE", "AI & CAREER", "MCP & AI"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {feat.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <ul className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {feat.keyPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {feat.portalLink && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      href={feat.portalLink}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Open in Student Portal</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── FREQUENTLY ASKED QUESTIONS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Frequently Answered Academic Policies
            </h2>
            <p className="text-xs text-slate-500">
              Clear answers regarding statutory university regulations and portal workflows
            </p>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                        Q
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Desk & Advisor Help Desk Card */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Academic Advisor Helpdesk
                </h3>
                <p className="text-[11px] text-slate-400">
                  Have an unresolved concern or attendance dispute?
                </p>
              </div>
            </div>

            {ticketSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Query Dispatched Successfully</span>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Your message has been routed to your Department Class Advisor and Controller of Examinations Helpdesk.
                </p>
                <button
                  onClick={() => setTicketSubmitted(false)}
                  className="text-xs text-emerald-800 underline font-bold mt-2"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Subject / Concern Area
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="e.g., Attendance Discrepancy in CS301"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Message Details
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Explain the specific issue, dates, and course codes..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="btn-saas-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmittingTicket ? "Routing to Advisor..." : "Submit Inquiry to Advisor"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
