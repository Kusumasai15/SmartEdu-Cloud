"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import { MobileBottomNav } from "./MobileBottomNav";


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Public marketing, auth, and secure full-screen exam player pages should NOT show sidebar & top header
  const isStandalonePage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/exams/") ||
    pathname.includes("/take") ||
    pathname.includes("/learn");

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh flex bg-[#EEF2F6] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white transition-colors">
      <React.Suspense fallback={<aside className="hidden lg:flex w-64 h-dvh border-r border-slate-200 dark:border-slate-800 shrink-0 bg-[#F8FAFC] dark:bg-[#0D1322]" />}>
        <div className="hidden lg:flex sticky top-0 h-dvh shrink-0 z-40">
          <AppSidebar />
        </div>
      </React.Suspense>

      <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
        <React.Suspense fallback={<header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0D1322]" />}>
          <div className="shrink-0 sticky top-0 z-40 border-b border-slate-200/90 dark:border-slate-800/90 bg-[#F8FAFC]/95 dark:bg-[#0D1322]/95 backdrop-blur-xl shadow-2xs">
            <TopHeader />
          </div>
        </React.Suspense>

        {/* Dedicated Distinct Main Screen Container */}
        <main className="flex-1 w-full min-w-0 p-3 sm:p-4 lg:p-5 xl:p-6 pb-24 md:pb-10 transition-colors">
          <div className="w-full min-h-[calc(100dvh-5.5rem)] rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)] p-4 sm:p-6 lg:p-7 transition-all">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-[1920px] mx-auto"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile Floating Glass Bottom Navigation Bar */}
      <React.Suspense fallback={null}>
        <MobileBottomNav />
      </React.Suspense>
    </div>
  );
}
