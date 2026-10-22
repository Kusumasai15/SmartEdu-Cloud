"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MessageSquare,
  Search,
  Plus,
  Send,
  Users,
  X,
  Pin,
  Clock,
  Sparkles,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  ThumbsUp,
  Smile,
  Reply,
  FileText,
  Share2,
  ExternalLink,
  Code2,
  MoreVertical,
  Layers,
  ChevronRight,
  Filter,
  Info,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAcademicData } from "@/context/AcademicDataContext";
import { useAuth } from "@/context/AuthContext";

export interface Thread {
  id: string;
  title: string;
  author_name: string;
  author_role?: "FACULTY" | "STUDENT" | "TA";
  created_at: string;
  message_count: number;
  course_code?: string;
  course_name?: string;
  cohort_name?: string;
  is_pinned?: boolean;
  is_unread?: boolean;
  preview?: string;
}

export interface Message {
  id: string;
  body: string;
  author_name: string;
  author_role?: "FACULTY" | "STUDENT" | "TA";
  author_avatar?: string;
  created_at: string;
  likes?: number;
  liked_by_me?: boolean;
}

interface Page<T> {
  items: T[];
  total: number;
}

export function LmsDiscussionBoard() {
  const { user } = useAuth();
  const { courses, users, departments } = useAcademicData();

  // Filter courses strictly based on user's assigned class cohort (or taught courses for faculty)
  const activeCourses = useMemo(() => {
    const allActive = (courses || []).filter((course) => course.status === "Active");
    if (!user) return allActive.slice(0, 10);

    const userRole = String(user.role || "").toUpperCase();

    // 1. If STUDENT: Filter to courses assigned to the student's class cohort or enrollment
    if (userRole === "STUDENT") {
      const studentClassName = (user.className || (user as any).class_name || "").trim().toLowerCase();
      // Look up assigned courses for the student's class from department cohorts
      const allCohorts = (departments || []).flatMap((d) => d.cohorts || []);
      const matchingClass = allCohorts.find(
        (cls) => cls.name.trim().toLowerCase() === studentClassName ||
                 studentClassName.includes(cls.name.trim().toLowerCase()) ||
                 cls.name.trim().toLowerCase().includes(studentClassName)
      );

      const assignedCourseCodes = new Set(
        (matchingClass?.assignedCourses || []).map((code) => code.replace(/\s+/g, "").toUpperCase())
      );

      // Flagship Semester 5 AI & DS 10-course bundle
      const defaultSem5Codes = new Set([
        "E1CSA382", "E1CSA313", "E1ITC302", "E1CSK309", "E1ITC308",
        "E1ITC301", "E1CSA317", "E1CSA108", "E1CSA414", "E1CSA400"
      ]);

      const filtered = allActive.filter((c) => {
        const cleanCode = c.code.replace(/\s+/g, "").toUpperCase();
        if (assignedCourseCodes.size > 0) {
          return assignedCourseCodes.has(cleanCode);
        }
        if (c.assignedClasses && c.assignedClasses.length > 0) {
          return c.assignedClasses.some((cls) => {
            const lc = cls.trim().toLowerCase();
            return lc === studentClassName || studentClassName.includes(lc) || lc.includes(studentClassName);
          });
        }
        return defaultSem5Codes.has(cleanCode);
      });

      return filtered.length > 0 ? filtered : allActive.filter((c) => defaultSem5Codes.has(c.code.replace(/\s+/g, "").toUpperCase()));
    }

    // 2. If FACULTY: Show courses taught by this faculty, or assigned to their department
    if (userRole === "FACULTY" || userRole === "HOD") {
      const facultyName = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase();
      const facultyEmail = (user.email || "").toLowerCase();

      const taughtCourses = allActive.filter((c) => {
        const inst = (c.instructor || "").toLowerCase();
        return inst.includes(facultyName) || facultyName.includes(inst) || (c as any).instructor_email === facultyEmail;
      });

      if (taughtCourses.length > 0) return taughtCourses;
    }

    // 3. For ADMINISTRATORS: Show the 10 core active courses of the current academic curriculum
    const defaultFlagshipCodes = new Set([
      "E1CSA382", "E1CSA313", "E1ITC302", "E1CSK309", "E1ITC308",
      "E1ITC301", "E1CSA317", "E1CSA108", "E1CSA414", "E1CSA400"
    ]);
    const flagshipCourses = allActive.filter((c) => defaultFlagshipCodes.has(c.code.replace(/\s+/g, "").toUpperCase()));
    return flagshipCourses.length > 0 ? flagshipCourses : allActive.slice(0, 10);
  }, [courses, user, departments]);

  const [courseCode, setCourseCode] = useState<string>("");

  // Real cohort students derived from context users
  const cohortStudentRoster = useMemo(() => {
    const realStudents = (users || []).filter((u) => u.role === "STUDENT");
    if (realStudents.length === 0) return [];
    return realStudents.map((s, idx) => {
      const initials = s.first_name && s.last_name
        ? `${s.first_name[0]}${s.last_name[0]}`.toUpperCase()
        : (s.first_name || "S").slice(0, 2).toUpperCase();
      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name || ""}`.trim(),
        rollNo: s.student_identifier || `STU-100${idx + 1}`,
        initials,
      };
    });
  }, [users]);

  // Real initial discussion channels derived strictly from active registered courses
  const initialChannelsFromCourses = useMemo(() => {
    return (activeCourses || []).map((c, idx) => ({
      id: `channel-${c.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title: `${c.code}: ${c.name} — Course Discussions`,
      author_name: c.instructor && c.instructor !== "Unassigned" ? c.instructor : "Course Faculty",
      author_role: "FACULTY" as const,
      created_at: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 24).toISOString(),
      message_count: 0,
      course_code: c.code,
      course_name: c.name,
      cohort_name: "IT - Sem 5 (AI & DS)",
      is_pinned: idx === 0,
      is_unread: false,
      preview: `Official course discussion channel for ${c.code} · ${c.name}.`,
    }));
  }, [activeCourses]);

  // Channel List and Active Selection
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Filter & Search Controls
  const [channelFilter, setChannelFilter] = useState<"ALL" | "UNREAD" | "PINNED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Right Side Drawer (Channel Info & Members Panel)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"about" | "members" | "pinned" | "files">("members");

  // Composer State
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize active course
  useEffect(() => {
    if (activeCourses.length > 0 && !courseCode) {
      setCourseCode(activeCourses[0].code);
    }
  }, [activeCourses, courseCode]);

  // Sync threads strictly with real enrolled courses (purge old mock channels)
  useEffect(() => {
    if (initialChannelsFromCourses.length === 0) return;
    try {
      localStorage.removeItem("smartedu_discussion_channels");
    } catch {}
    setThreads(initialChannelsFromCourses);
    setThreadId((prev) => (prev && initialChannelsFromCourses.some((m) => m.id === prev) ? prev : initialChannelsFromCourses[0].id));
  }, [initialChannelsFromCourses]);

  // Load threads from backend
  const loadThreads = useCallback(async () => {
    if (!courseCode) return;
    setLoading(true);
    try {
      const result = await apiClient.get<Page<Thread>>(`/courses/${encodeURIComponent(courseCode)}/discussions`);
      const backendItems = Array.isArray(result?.items) ? result.items : [];
      if (backendItems.length > 0) {
        setThreads((prev) => {
          const primaryBackendThread = backendItems.find((b) => b.title.includes(courseCode)) || backendItems[0];
          const defaultChannelId = `channel-${courseCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

          return prev.map((thread) => {
            if (thread.id === defaultChannelId || thread.course_code === courseCode) {
              return {
                ...thread,
                id: primaryBackendThread.id,
                title: `${courseCode}: ${thread.course_name || courseCode} — Course Discussions`,
                message_count: primaryBackendThread.message_count ?? thread.message_count,
              };
            }
            return thread;
          });
        });
      }
    } catch {
      // Fallback silently
    } finally {
      setLoading(false);
    }
  }, [courseCode]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  // Load messages when threadId changes
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    try {
      const saved = localStorage.getItem(`smartedu_discussion_msgs_${threadId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }

    let active = true;
    apiClient
      .get<Page<Message>>(`/discussions/${threadId}/messages`)
      .then((result) => {
        if (active && Array.isArray(result?.items) && result.items.length > 0) {
          setMessages(result.items);
          try {
            localStorage.setItem(`smartedu_discussion_msgs_${threadId}`, JSON.stringify(result.items));
          } catch {}
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [threadId]);

  // Scroll to bottom of message stream when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Active Thread details
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === threadId) || threads[0] || null;
  }, [threads, threadId]);

  // Filtered threads list
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (channelFilter === "UNREAD" && !t.is_unread) return false;
      if (channelFilter === "PINNED" && !t.is_pinned) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.course_name && t.course_name.toLowerCase().includes(q)) ||
          (t.preview && t.preview.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [threads, channelFilter, searchQuery]);

  // Send reply handler
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    setSending(true);
    const authorName = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student User";
    const authorRole = (user?.role?.name?.toUpperCase() === "FACULTY" ? "FACULTY" : "STUDENT") as "FACULTY" | "STUDENT";

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      body: replyText.trim(),
      author_name: authorName,
      author_role: authorRole,
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      likes: 0,
      liked_by_me: false,
    };

    const nextMsgs = [...messages, newMsg];
    setMessages(nextMsgs);
    setReplyText("");

    try {
      localStorage.setItem(`smartedu_discussion_msgs_${activeThread.id}`, JSON.stringify(nextMsgs));
    } catch {}

    // Update message count in thread list
    setThreads((prev) => {
      const next = prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              message_count: (t.message_count || 0) + 1,
              preview: newMsg.body.slice(0, 60),
            }
          : t
      );
      try {
        localStorage.setItem("smartedu_discussion_channels", JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await apiClient.post(`/discussions/${activeThread.id}/messages`, {
        body: newMsg.body,
      });
    } catch {
      // Message already appended to local state
    } finally {
      setSending(false);
    }
  };

  // Toggle message reaction / like
  const handleToggleLike = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const liked = !m.liked_by_me;
        return {
          ...m,
          liked_by_me: liked,
          likes: (m.likes || 0) + (liked ? 1 : -1),
        };
      })
    );
  };

  // Helper to parse URLs into clickable links in message text
  const renderFormattedMessage = (body: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = body.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const isYoutube = part.includes("youtube.com") || part.includes("youtu.be");
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold underline break-all my-0.5"
          >
            <span>{part}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-full">
      {/* ─── 1. TOP TITLE BANNER (Matching user's reference: "< Discussions / Course channels") ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
              Discussions
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Course channels — talk with classmates and faculty
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN WORKSPACE CONTAINER: Left Sidebar + Center Messages + Right Details Drawer ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[640px] max-h-[820px]">
        {/* ========================================================================= */}
        {/* ─── COLUMN A: LEFT CHANNELS LIST ─── */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
          {/* Search Bar */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter Pills: All, Unread, Pinned */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                onClick={() => setChannelFilter("ALL")}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                  channelFilter === "ALL"
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChannelFilter("UNREAD")}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                  channelFilter === "UNREAD"
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setChannelFilter("PINNED")}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                  channelFilter === "PINNED"
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pinned
              </button>
            </div>
          </div>

          {/* Channel Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeThread?.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => setThreadId(thread.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? "bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-900/60 shadow-2xs"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  {/* Purple Rounded Channel Icon (Matching User Screenshot 1) */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-[#582C64] text-white"
                        : "bg-purple-100 dark:bg-purple-950 text-[#582C64] dark:text-purple-300"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {thread.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {thread.is_pinned && <Pin className="h-3 w-3 inline text-purple-500 mr-1" />}
                        Sep 2
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {thread.course_name || thread.course_code}
                    </p>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {thread.preview || "No message preview"}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredThreads.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No discussion channels found matching this filter.
              </div>
            )}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* ─── COLUMN B: CENTER ACTIVE DISCUSSION CHAT FEED ─── */}
        {/* ========================================================================= */}
        <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
          {/* Channel Header (Matching Reference Screenshot 1) */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#582C64] text-white flex items-center justify-center shrink-0 shadow-xs">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {activeThread?.title || "Select a Discussion Channel"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeThread?.course_name || (activeThread?.course_code ? `Course ${activeThread.course_code}` : "Academic Discussion")}
                  {activeThread?.cohort_name ? ` · ${activeThread.cohort_name}` : ""}
                  {cohortStudentRoster.length > 0 ? ` · ${cohortStudentRoster.length} members` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle Right Details Drawer Button */}
              <button
                onClick={() => setIsDetailsDrawerOpen(!isDetailsDrawerOpen)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDetailsDrawerOpen
                    ? "bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-[#582C64] dark:text-purple-300"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                title="Channel info & enrolled roster"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#582C64] dark:text-purple-300 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    {activeThread ? `Welcome to #${activeThread.title}` : "Course Discussion Channel"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    {activeThread?.course_code ? `${activeThread.course_code} · ${activeThread.course_name}` : "Official Course Discussions"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Start the conversation! Post questions, discussion points, or study queries below.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isFaculty = msg.author_role === "FACULTY" || msg.author_name.includes("Dr.") || msg.author_name.includes("Prof.");
                return (
                  <div key={msg.id} className="flex items-start gap-3.5 group animate-fade-in">
                  {/* Author Avatar with Initials */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs ${
                      isFaculty ? "bg-[#582C64]" : "bg-blue-600"
                    }`}
                  >
                    {msg.author_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "U"}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Header: Name, Badge, Timestamp */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {msg.author_name}
                      </span>
                      {isFaculty ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-[#582C64] dark:text-purple-300 border border-purple-200/60">
                          FACULTY
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                          STUDENT
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium">
                        {msg.created_at}
                      </span>
                    </div>

                    {/* Message Bubble (Matching User Reference Image 1) */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-2xs leading-relaxed whitespace-pre-wrap">
                      {renderFormattedMessage(msg.body)}
                    </div>

                    {/* Footer Actions: Reaction, Reply */}
                    <div className="flex items-center gap-3 pt-0.5 text-slate-400 text-[11px]">
                      <button
                        onClick={() => handleToggleLike(msg.id)}
                        className={`flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer ${
                          msg.liked_by_me ? "text-purple-600 dark:text-purple-400 font-bold" : ""
                        }`}
                      >
                        <Smile className="h-3.5 w-3.5" />
                        <span>{msg.likes && msg.likes > 0 ? msg.likes : "React"}</span>
                      </button>

                      <button
                        onClick={() => setReplyText(`@${msg.author_name} `)}
                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
          </div>

          {/* Message Input Composer (Matching User Reference Screenshot 1) */}
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReplyText((prev) => `${prev}\n\nQuestion:\n`)}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center shrink-0 cursor-pointer bg-white dark:bg-slate-900 transition-colors"
                title="Insert prompt template"
              >
                <Plus className="h-4 w-4" />
              </button>

              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Message ${activeThread?.title || "channel"}...`}
                className="flex-1 py-2.5 px-4 text-xs rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-500 shadow-2xs"
              />

              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="w-9 h-9 rounded-full bg-[#582C64] hover:bg-[#472251] text-white flex items-center justify-center shrink-0 shadow-sm disabled:opacity-40 transition-colors cursor-pointer"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ─── COLUMN C: RIGHT DETAILS DRAWER (Matching Reference Image 2) ─── */}
        {/* ========================================================================= */}
        {isDetailsDrawerOpen && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-slate-900 animate-fade-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 text-center relative space-y-2">
              <button
                onClick={() => setIsDetailsDrawerOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-[#582C64] text-white flex items-center justify-center mx-auto shadow-md">
                <BookOpen className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeThread?.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Course channel · {cohortStudentRoster.length > 0 ? `${cohortStudentRoster.length} members` : "Enrolled members"}
                </p>
              </div>
            </div>

            {/* Subtabs: About, Members, Pinned, Files (Matching Screenshot 2) */}
            <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-center">
              <button
                onClick={() => setDrawerTab("about")}
                className={`py-2.5 transition-colors cursor-pointer ${
                  drawerTab === "about"
                    ? "border-b-2 border-purple-600 text-purple-600 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                About
              </button>
              <button
                onClick={() => setDrawerTab("members")}
                className={`py-2.5 transition-colors cursor-pointer ${
                  drawerTab === "members"
                    ? "border-b-2 border-purple-600 text-purple-600 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Members
              </button>
              <button
                onClick={() => setDrawerTab("pinned")}
                className={`py-2.5 transition-colors cursor-pointer ${
                  drawerTab === "pinned"
                    ? "border-b-2 border-purple-600 text-purple-600 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pinned
              </button>
              <button
                onClick={() => setDrawerTab("files")}
                className={`py-2.5 transition-colors cursor-pointer ${
                  drawerTab === "files"
                    ? "border-b-2 border-purple-600 text-purple-600 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Files
              </button>
            </div>

            {/* Drawer Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === "members" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>STUDENTS · {cohortStudentRoster.length}</span>
                    <span className="text-purple-600 font-bold">Active</span>
                  </div>

                  <div className="space-y-2">
                    {cohortStudentRoster.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No enrolled students in this cohort</p>
                    ) : (
                      cohortStudentRoster.map((std) => (
                        <div
                          key={std.id}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                            {std.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {std.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {std.rollNo}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {drawerTab === "about" && (
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-white block">Course Association</span>
                    <p className="font-bold text-slate-900 dark:text-white">{activeThread?.course_name || "Course Subject"}</p>
                    <p className="text-slate-400 font-mono text-[10px]">{activeThread?.course_code || ""}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-white block">Channel Guidelines</span>
                    <p>
                      Post homework queries, algorithm clarifications, and study questions for {activeThread?.course_code || "this course"}.
                    </p>
                  </div>
                </div>
              )}

              {drawerTab === "pinned" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 text-center">
                    <Pin className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No Pinned Announcements</p>
                    <p className="text-[11px]">Faculty can pin important homework updates or lecture references to this channel.</p>
                  </div>
                </div>
              )}

              {drawerTab === "files" && (
                <div className="space-y-2">
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 space-y-1">
                    <FileText className="h-5 w-5 mx-auto text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No Shared Files</p>
                    <p className="text-[11px]">Files uploaded to this discussion channel will appear here.</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
