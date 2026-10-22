"use client";

import React from "react";
import { motion } from "framer-motion";
import { Briefcase, Sparkles, Clock, Hammer, ArrowRight } from "lucide-react";
import Link from "next/link";

export function AiMockInterviewView() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-fade-in text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-14 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto h-20 w-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
          <Briefcase className="h-10 w-10 stroke-[1.75]" />
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Hammer className="h-3.5 w-3.5" />
            <span>Feature In Active Development</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AI Mock Interview &amp; Career Coach
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            We are building an intelligent, real-time voice and technical interview coach powered by Smart AI Coach. This feature is currently in active development and will be available in an upcoming release.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 max-w-md mx-auto text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>Expected release: Next Platform Update</span>
        </div>

        <div className="pt-2">
          <Link
            href="/student"
            className="btn-saas-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
