"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  ShieldCheck,
  UsersRound,
  Sparkles,
  Zap,
  Award,
  Video,
  BrainCircuit,
  LifeBuoy,
  ChevronRight,
  Lock,
  ChevronDown,
  Layers,
  Code2,
} from "lucide-react";

const ROLE_WORKSPACES = [
  {
    id: "student",
    role: "Student Portal",
    badge: "Learner Workspace",
    icon: GraduationCap,
    headline: "End-to-End Course Delivery, Timetables & AI Tutor",
    description: "Access registered courses, lecture slides, submit coding & written assignments, track attendance percentage against the statutory 75% rule, and practice with the AI Tutor.",
    features: [
      "Semester Course Modules & Downloadable Lecture Slides",
      "Continuous Assessment (50% DSA Weightage) & SpeedGrader Rubrics",
      "Real-time Attendance Tracker & Medical/OD Leave Filing",
      "Automated Hall Ticket (Admit Card) with Encrypted QR",
      "Interactive AI Academic Tutor & Mock Interview Simulator",
    ],
    path: "/student",
  },
  {
    id: "faculty",
    role: "Faculty Portal",
    badge: "Instructional Suite",
    icon: UsersRound,
    headline: "Curriculum Delivery, SpeedGrader & Office Hours",
    description: "Design multi-unit syllabus plans, publish assignments with automated test-case evaluation, track student attendance, and endorse OD leave requests.",
    features: [
      "Multi-Unit Syllabus Builder & Digital Learning Assets",
      "SpeedGrader Rubric Evaluation with Inline Remarks",
      "Workload Timetable with Lecture Hall Allocations",
      "Student OD & Medical Leave Verification Chain",
      "Module Feedback Analytics & 1:1 Consultation Scheduler",
    ],
    path: "/faculty",
  },
  {
    id: "examination",
    role: "Examination Wing",
    badge: "Statutory Governance",
    icon: Award,
    headline: "Centralized Exam Planning, Proctoring & Hall Tickets",
    description: "Schedule university semester-end examinations (SEE), manage encrypted question paper vaults, supervise camera proctoring telemetry, and publish approved grade sheets.",
    features: [
      "Master Examination Schedule & Seating Allocation",
      "Encrypted Question Paper Vault with SHA-256 Hashes",
      "Camera-Based Live Proctoring & Infraction Incident Logs",
      "Statutory 75% Attendance Audit & Admit Card Release",
      "Grade Moderation Pipeline & Official Transcripts",
    ],
    path: "/examination",
  },
  {
    id: "hod",
    role: "Department HOD",
    badge: "Executive Leadership",
    icon: Layers3,
    headline: "Departmental Operations, Faculty Workload & Grade Sanctions",
    description: "Monitor syllabus completion rates across cohorts, approve escalated student leaves, review student feedback scores, and validate semester grade distributions.",
    features: [
      "Cohort-Level Attendance & Early-Warning At-Risk Flags",
      "Final OD & Medical Leave Sanction with Roster Adjustments",
      "Continuous Module Feedback & Teaching Quality Analytics",
      "Faculty Teaching Workload & Classroom Utilization",
      "Continuous Internal Assessment (DSA) Grade Approvals",
    ],
    path: "/hod",
  },
  {
    id: "vc",
    role: "Vice Chancellor",
    badge: "Institutional Oversight",
    icon: BarChart3,
    headline: "University-Wide Strategic Analytics & Institutional Directives",
    description: "High-level governance over school performance, accreditation metrics, dropout prediction telemetry, and statutory compliance across all university departments.",
    features: [
      "University-Wide Enrollment & Financial KPI Dashboard",
      "Cross-Department Comparative Performance Index",
      "Early-Warning Dropout Prediction Telemetry",
      "Executive Statutory Directive Issuance System",
      "Institutional Accreditation & NAAC/ABET Alignment",
    ],
    path: "/vc",
  },
  {
    id: "admin",
    role: "Administrator",
    badge: "Campus Operations",
    icon: Building2,
    headline: "Role-Based Access Control, Facilities & Timetables",
    description: "Provision secure accounts across the 6 institutional roles, configure academic batches and regulation schemes, manage campus lecture halls, and enforce 2FA security.",
    features: [
      "Complete 6-Role User Directory & RBAC Lifecycle",
      "Academic Regulation Config (50/50 DSA + SEE Schemes)",
      "Classroom & Laboratory Scheduling Engine",
      "Program & Cohort Capacity Allocation",
      "System Audit Logs & Security Policy Enforcement",
    ],
    path: "/admin",
  },
];

const PLATFORM_PILLARS = [
  {
    icon: BookOpenCheck,
    title: "Curriculum & Digital Delivery",
    description: "Unit-wise syllabus modules, lecture notes, video assets, and discussion forums unified in a high-speed campus repository.",
  },
  {
    icon: ClipboardCheck,
    title: "50/50 Evaluation Regulation",
    description: "Full compliance with the institutional 50% Continuous Internal Assessment (DSA) + 50% Semester End Exam (SEE) framework.",
  },
  {
    icon: Video,
    title: "Camera-Based Exam Proctoring",
    description: "High-integrity online examinations with active webcam telemetry, browser fullscreen lockdown, and automated incident logs.",
  },
  {
    icon: CalendarDays,
    title: "75% Attendance & Leave System",
    description: "Statutory 75% attendance tracking with two-step digital leave verification (Class Advisor endorsement -> HOD sanction).",
  },
  {
    icon: BrainCircuit,
    title: "AI Academic & Career Suite",
    description: "24/7 AI-assisted concept tutoring, personalized study roadmaps, and realistic technical mock interviews in a sandboxed layer.",
  },
  {
    icon: ShieldCheck,
    title: "AWS Cloud Infrastructure",
    description: "Enterprise-grade containerized FastAPI services, PostgreSQL persistence, Redis caching, and robust RBAC governance on AWS.",
  },
];

export default function HomePage() {
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);

  const currentRole = ROLE_WORKSPACES[activeRoleIndex];
  const CurrentRoleIcon = currentRole.icon;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ─── Modern Sticky Top Header ─── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group" aria-label="UniFlow home">
            <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center p-1 overflow-hidden transition-transform group-hover:scale-105">
              <Image src="/uniflow-logo.png" alt="UniFlow" width={36} height={36} className="h-full w-full object-contain" priority />
            </div>
            <div className="leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">UniFlow</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">PRO</span>
              </div>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Campus OS</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#portals" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">Institutional Portals</a>
            <a href="#features" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">Core Capabilities</a>
            <a href="#security" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">Governance &amp; Security</a>
            <Link href="/help" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
              <span>Student Guide</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            </Link>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section with Visual SaaS Elevation ─── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-3xl space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SmartEdu Cloud LMS • Enterprise University Campus OS</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white">
              One Unified Campus.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-400 dark:via-indigo-300 dark:to-blue-500">
                Six Dedicated Portals.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Bring curriculum delivery, continuous assessment, examinations, attendance, student support, and institutional governance into one connected academic workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-7 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                <span>Launch Institutional Portal</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#portals"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-6 shadow-xs transition-all"
              >
                Explore 6 Role Portals
              </a>

              <Link
                href="/help"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold px-4"
              >
                <LifeBuoy className="h-4 w-4" />
                <span>Student Feature Guide</span>
              </Link>
            </div>
          </motion.div>

          {/* Quick Metrics Capsule Bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className="mt-14 grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-blue-100 dark:border-slate-800 shadow-[0_12px_36px_rgba(37,99,235,0.08)] divide-x divide-y sm:divide-y-0 divide-blue-100 dark:divide-slate-800 overflow-hidden"
          >
            <div className="p-5 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">6 Roles</span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Permission-Governed Portals</p>
            </div>
            <div className="p-5 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">Live</span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Database-Backed Records</p>
            </div>
            <div className="p-5 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">RBAC</span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Backend Authorization</p>
            </div>
            <div className="p-5 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">Audit</span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Traceable Workflows</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SECTION: INTERACTIVE 6-ROLE PORTALS PREVIEW ─── */}
      <section id="portals" className="py-20 sm:py-28 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Institutional Role-Based Access Control
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Dedicated Workspaces for Every University Stakeholder
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Each portal provides an isolated, permission-governed environment tailored to statutory responsibilities.
            </p>
          </div>

          {/* Interactive Role Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {ROLE_WORKSPACES.map((w, idx) => {
              const Icon = w.icon;
              const isActive = activeRoleIndex === idx;
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveRoleIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{w.role}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Showcase Card */}
          <AnimatePresence mode="wait">
          <motion.div
            key={currentRole.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="p-6 sm:p-10 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 shadow-[0_12px_36px_rgba(37,99,235,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
                <CurrentRoleIcon className="h-3.5 w-3.5" />
                <span>{currentRole.badge}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {currentRole.headline}
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentRole.description}
              </p>

              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Key Operational Workflows:
                </span>
                <ul className="space-y-2">
                  {currentRole.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4">
                <Link
                  href={currentRole.path}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
                >
                  <span>Open {currentRole.role}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-[#f8fbff] dark:bg-slate-950/60 text-slate-900 dark:text-white border border-blue-100 dark:border-slate-800 shadow-inner space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Workspace access</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {currentRole.id} portal
                </span>
              </div>

              <div className="space-y-3 py-2">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold shadow-2xs">
                  <span>RBAC Security Clearance</span>
                  <span className="text-blue-700 dark:text-blue-300 font-mono">VERIFIED</span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 text-xs space-y-2 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Authorized workspace</span>
                  <p className="text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed">
                    Navigation and data access adapt to the signed-in user’s institutional role and assigned academic scope.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Backend authorization policies active.</span>
                </div>
              </div>
            </div>
          </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─── SECTION: CORE PLATFORM CAPABILITIES ─── */}
      <section id="features" className="py-20 sm:py-28 bg-white dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Engineered for Real Academic Institutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Six Interconnected Core Capabilities
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Eliminate disjointed software stacks. SmartEdu synchronizes courses, attendance, examination proctoring, and student transcripts under one institutional roof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-3 group"
                >
                  <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION: SECURITY & GOVERNANCE ─── */}
      <section id="security" className="py-20 sm:py-28 bg-[#f8fbff] dark:bg-slate-950 border-b border-blue-100 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Institutional Cloud Security</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              Protected Academic Records &amp; Immutable Audit Logs
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              University data integrity is non-negotiable. SmartEdu Cloud LMS separates AI-assisted formative feedback from official university transcripts, enforces two-factor authentication, and records tamper-evident proctoring telemetry.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                "Strict Six-Role RBAC Authorization",
                "Sandboxed AI Tutoring (Zero Grade Tampering)",
                "Proctored Exam Browser Fullscreen Lock",
                "AWS Encrypted Cloud Storage & Backups",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 space-y-4 shadow-[0_14px_40px_rgba(37,99,235,0.08)]">
            <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Ready to Access Your University Portal?</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Authenticate using your institutional credentials issued by the University Registrar or Department Controller.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/login"
                className="btn-saas-primary w-full sm:w-auto text-xs py-3 px-6 flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/help"
                className="w-full sm:w-auto text-center text-xs text-blue-600 dark:text-blue-400 hover:underline py-2"
              >
                Visit Help &amp; Knowledge Base
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-200">
            <Image src="/uniflow-logo.png" alt="UniFlow" width={24} height={24} className="h-6 w-6 object-contain" />
            <span>UniFlow SmartEdu Cloud LMS</span>
          </div>

          <p className="text-center sm:text-right">
            Authorized educational institution use only. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
