"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Video,
  Code,
  BookOpen,
  Plus,
  Settings,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LtiTool {
  id: string;
  name: string;
  category: "Plagiarism" | "Video Lecture" | "Autograder" | "Proctoring" | "Interactive";
  description: string;
  status: "ACTIVE" | "INACTIVE";
  version: "LTI 1.3 Advantage" | "LTI 1.1";
  lastUsed: string;
  icon: string;
}

const initialTools: LtiTool[] = [
  {
    id: "lti-1",
    name: "Turnitin Plagiarism Detection",
    category: "Plagiarism",
    description: "Automated similarity reporting and content review embedded directly into assignment submission rubrics.",
    status: "ACTIVE",
    version: "LTI 1.3 Advantage",
    lastUsed: "Today, 10:45 AM",
    icon: "🔍",
  },
  {
    id: "lti-2",
    name: "Zoom Virtual Lecture Classrooms",
    category: "Video Lecture",
    description: "Automatic meeting generation for scheduled lecture periods, cloud recording sync, and attendance reporting.",
    status: "ACTIVE",
    version: "LTI 1.3 Advantage",
    lastUsed: "Today, 09:00 AM",
    icon: "📹",
  },
  {
    id: "lti-3",
    name: "Gradescope Code Autograder",
    category: "Autograder",
    description: "Automated test case grading for Python, C++, and Java programming assignments with instant feedback.",
    status: "ACTIVE",
    version: "LTI 1.3 Advantage",
    lastUsed: "Yesterday, 04:30 PM",
    icon: "💻",
  },
  {
    id: "lti-4",
    name: "Proctorio Exam Monitoring",
    category: "Proctoring",
    description: "Secure browser lockdown, webcam biometric validation, and multi-monitor detection for high-stakes online examinations.",
    status: "ACTIVE",
    version: "LTI 1.3 Advantage",
    lastUsed: "Sep 01, 2026",
    icon: "🛡️",
  },
  {
    id: "lti-5",
    name: "GitHub Classroom Integration",
    category: "Interactive",
    description: "Direct Git repository synchronization for computer science assignments and automatic pull request grading.",
    status: "ACTIVE",
    version: "LTI 1.3 Advantage",
    lastUsed: "Aug 29, 2026",
    icon: "🐙",
  },
  {
    id: "lti-6",
    name: "Wolfram Alpha Math Engine",
    category: "Interactive",
    description: "Symbolic computation and mathematical diagram generator embedded into course quizzes and lesson notes.",
    status: "INACTIVE",
    version: "LTI 1.1",
    lastUsed: "Never configured",
    icon: "📐",
  },
];

export function LtiIntegrationsView() {
  const [tools, setTools] = useState<LtiTool[]>(initialTools);
  const [notification, setNotification] = useState<string | null>(null);

  const toggleTool = (id: string) => {
    setTools((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
          setNotification(`✓ ${t.name} is now ${nextStatus.toLowerCase()}.`);
          setTimeout(() => setNotification(null), 3500);
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span>Learning Tools Interoperability (LTI 1.3) &amp; External Apps</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Configure external education tools, automated code graders, video lecture streams, and proctoring engines.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          Standard: IMS Global LTI 1.3 Advantage
        </span>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((t) => {
          const isActive = t.status === "ACTIVE";

          return (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{t.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">{t.version}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleTool(t.id)}
                    className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {isActive ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Disabled</span>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {t.description}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Category: <strong className="text-slate-700 dark:text-slate-300">{t.category}</strong></span>
                  <span>Active: {t.lastUsed}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px]">Client ID: lti-sec-***84</span>
                <button
                  onClick={() => toggleTool(t.id)}
                  className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                      : "btn-saas-primary"
                  }`}
                >
                  {isActive ? "Disable App" : "Activate App"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
