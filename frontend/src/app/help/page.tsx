"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { StudentHelpCenterView } from "@/components/student/StudentHelpCenterView";

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/student"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Student Portal</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              U
            </div>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              UniFlow Campus Help Center
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <StudentHelpCenterView />
      </main>
    </div>
  );
}
