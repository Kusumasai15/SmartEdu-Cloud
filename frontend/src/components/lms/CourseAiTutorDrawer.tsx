"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Bot,
  Sparkles,
  BookOpen,
  Calendar,
  ChevronRight,
  Loader2,
  RotateCcw,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  followups?: string[];
  timestamp: string;
}

export function FormattedMarkdownMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  const formatInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        parts.push(str.substring(lastIdx, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px] text-indigo-600 dark:text-indigo-300">
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < str.length) {
      parts.push(str.substring(lastIdx));
    }

    return parts;
  };

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-sm text-slate-900 dark:text-white mt-2 mb-0.5">
              {formatInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-sm text-slate-900 dark:text-white mt-2 mb-0.5">
              {formatInline(trimmed.slice(3))}
            </h3>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-1 my-1">
              <span className="font-bold text-purple-600 dark:text-purple-400 shrink-0 font-mono text-[11px]">
                {numMatch[1]}.
              </span>
              <div className="flex-1">{formatInline(numMatch[2])}</div>
            </div>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-1 my-1">
              <span className="text-purple-500 font-bold shrink-0">•</span>
              <div className="flex-1">{formatInline(trimmed.slice(2))}</div>
            </div>
          );
        }

        return <p key={idx}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

interface CourseAiTutorDrawerProps {
  courseCode: string;
  courseTitle: string;
  todayTaughtTopic: string;
  currentUnit: string;
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  studentName?: string;
}

export function CourseAiTutorDrawer({
  courseCode,
  courseTitle,
  todayTaughtTopic,
  currentUnit,
  isOpen,
  onClose,
  initialPrompt,
  studentName = "Student",
}: CourseAiTutorDrawerProps) {
  const [messages, setMessages] = useState<TutorMessage[]>(() => [
    {
      id: "initial-greeting",
      role: "assistant",
      content: `Hello ${studentName}.\n\nToday's recorded topic is **${todayTaughtTopic}** (${currentUnit}).\n\nThe course learning assistant can provide a short concept review, key study points, or a practice activity for **${courseTitle} (${courseCode})**.`,
      followups: [
        `Walk me through today's topic: ${todayTaughtTopic}`,
        `Give me 3 key exam questions on ${todayTaughtTopic}`,
        `What is the real-world architectural use case?`,
        `Teach me how this is implemented in code`,
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Handle external initialPrompt if triggered from Weak Topics or Card
  useEffect(() => {
    if (isOpen && initialPrompt) {
      void handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: TutorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      let replyText = "";
      let followupsList: string[] = [];

      // 1. Try Backend Intelligence Tutor Endpoint with Bearer Authentication
      try {
        const historyPayload = messages.slice(-4).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await apiClient.post<{
          reply?: string;
          suggested_followups?: string[];
          is_ai_generated?: boolean;
        }>("/intelligence/tutor/chat", {
          course_code: courseCode,
          course_title: courseTitle,
          current_topic: todayTaughtTopic,
          unit_title: currentUnit,
          message: text,
          history: historyPayload,
        });

        if (res && res.reply) {
          replyText = res.reply;
          followupsList = res.suggested_followups || [];
        }
      } catch (backendErr) {
        console.warn("Backend tutor endpoint unreachable, falling back to frontend AI route:", backendErr);
      }

      // 2. Try Frontend Next.js Gemini AI Route
      if (!replyText) {
        try {
          const feRes = await fetch("/api/ai/tutor-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseCode,
              courseName: courseTitle,
              topic: todayTaughtTopic,
              question: text,
              history: messages.slice(-4).map((m) => ({
                sender: m.role === "user" ? "USER" : "AI",
                text: m.content,
              })),
            }),
          });
          const feData = await feRes.json();
          if (feData?.success && feData?.reply) {
            replyText = feData.reply;
          }
        } catch {}
      }

      if (!replyText) {
        throw new Error("The learning assistant returned no answer.");
      }

      const assistantMsg: TutorMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
        followups: followupsList.length > 0 ? followupsList : [
          `Can you give me a key exam question on ${todayTaughtTopic}?`,
          `How is ${todayTaughtTopic} implemented in real systems?`,
          `What are common traps examiners test for?`,
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: error instanceof Error ? error.message : "The learning assistant is unavailable. Please try again.",
        followups: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "assistant",
        content: `Chat session refreshed! Today's faculty focus is **${todayTaughtTopic}**. What topic or question would you like to explore?`,
        followups: [
          `Walk me through today's topic: ${todayTaughtTopic}`,
          `Give me 3 key exam questions`,
          `Explain real-world architecture example`,
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-fade-in">
      {/* ─── Drawer Header ─── */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-[#FAF7FC] dark:bg-purple-950/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#582C64] text-white flex items-center justify-center shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Course Learning Assistant</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                ACTIVE
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {courseCode} • Grounded in Course Syllabus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Reset Conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Close Tutor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ─── Today's Session Plan Banner ─── */}
      <div className="px-4 py-2.5 bg-purple-50/70 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 flex items-center gap-2.5 shrink-0 text-xs">
        <Calendar className="h-4 w-4 text-[#582C64] dark:text-purple-300 shrink-0" />
        <div className="truncate">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
            Today's Session Plan Topic
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
            {todayTaughtTopic}
          </span>
        </div>
      </div>

      {/* ─── Chat Messages Body ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
              {m.role === "user" ? (
                <>
                  <span>You</span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-purple-600" />
                  <span className="font-bold text-purple-800 dark:text-purple-300">
                    Course Learning Assistant
                  </span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[92%] ${
                m.role === "user"
                  ? "bg-[#582C64] text-white rounded-tr-xs"
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs shadow-2xs"
              }`}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <FormattedMarkdownMessage text={m.content} />
              )}
            </div>

            {/* Suggested Follow-up Chips for Assistant Messages */}
            {m.role === "assistant" && m.followups && m.followups.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                {m.followups.map((chip, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isSending}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 text-[#582C64] dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors text-left cursor-pointer flex items-center gap-1"
                  >
                    <ChevronRight className="h-3 w-3 text-purple-500 shrink-0" />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-[#582C64] dark:text-purple-300" />
            <span>AI Tutor is formulating conceptual explanation...</span>
          </div>
        )}
      </div>

      {/* ─── Chat Input Footer ─── */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask a doubt about ${todayTaughtTopic}...`}
            disabled={isSending}
            className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-purple-400 text-slate-800 dark:text-slate-100"
          />

          <Button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="bg-[#582C64] hover:bg-[#4A235A] text-white h-9 px-3.5 rounded-xl cursor-pointer shadow-xs disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <p className="text-[10px] text-center text-slate-400">
          Answers use the published {courseCode} syllabus and recorded lesson plans.
        </p>
      </div>
    </div>
  );
}
