"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Calendar,
  User,
  Users,
  Building2,
  Award,
  Settings,
  ShieldAlert,
  UserCheck,
  GraduationCap,
  Layers,
  BarChart3,
  Sparkles,
  MessageSquare,
  ClipboardList,
} from "lucide-react";

interface MobileNavItem {
  title: string;
  href: string;
  tab?: string;
  icon: React.ElementType;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { user } = useAuth();

  const role = (
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || "STUDENT"
  ).toUpperCase();

  const getNavItems = (): MobileNavItem[] => {
    switch (role) {
      case "FACULTY":
        return [
          { title: "Home", href: "/faculty", icon: LayoutDashboard },
          { title: "Modules", href: "/faculty?tab=modules", tab: "modules", icon: Layers },
          { title: "Feedback", href: "/faculty?tab=module-feedback", tab: "module-feedback", icon: MessageSquare },
          { title: "Attendance", href: "/faculty?tab=attendance", tab: "attendance", icon: UserCheck },
          { title: "Grading", href: "/faculty?tab=speedgrader", tab: "speedgrader", icon: FileCheck },
        ];
      case "ADMIN":
      case "ADMINISTRATOR":
        return [
          { title: "Overview", href: "/admin", icon: LayoutDashboard },
          { title: "Schools", href: "/admin?tab=departments", tab: "departments", icon: Building2 },
          { title: "Timetable", href: "/admin?tab=timetable", tab: "timetable", icon: Calendar },
          { title: "Users", href: "/admin?tab=users", tab: "users", icon: Users },
          { title: "Settings", href: "/settings", icon: Settings },
        ];
      case "EXAMINATION":
      case "EXAM":
      case "COE":
        return [
          { title: "Home", href: "/examination", icon: LayoutDashboard },
          { title: "Schedule", href: "/examination?tab=schedules", tab: "schedules", icon: Calendar },
          { title: "Proctoring", href: "/examination?tab=proctoring", tab: "proctoring", icon: ShieldAlert },
          { title: "Results", href: "/examination?tab=results", tab: "results", icon: Award },
          { title: "Settings", href: "/settings", icon: Settings },
        ];
      case "HOD":
        return [
          { title: "Overview", href: "/hod", icon: LayoutDashboard },
          { title: "Courses", href: "/hod?tab=courses", tab: "courses", icon: BookOpen },
          { title: "Feedback", href: "/hod?tab=module-feedback", tab: "module-feedback", icon: MessageSquare },
          { title: "Leaves/OD", href: "/hod?tab=student-leaves", tab: "student-leaves", icon: FileCheck },
          { title: "Approvals", href: "/hod?tab=approvals", tab: "approvals", icon: Award },
        ];
      case "VC":
        return [
          { title: "Overview", href: "/vc", icon: LayoutDashboard },
          { title: "Curriculum", href: "/vc?tab=curriculum", tab: "curriculum", icon: Building2 },
          { title: "Analytics", href: "/vc?tab=analytics", tab: "analytics", icon: BarChart3 },
          { title: "Approvals", href: "/vc?tab=approvals", tab: "approvals", icon: Award },
          { title: "Settings", href: "/settings", icon: Settings },
        ];
      case "STUDENT":
      default:
        return [
          { title: "Home", href: "/student", icon: LayoutDashboard },
          { title: "Courses", href: "/student?tab=courses", tab: "courses", icon: BookOpen },
          { title: "Tasks", href: "/student?tab=assignments", tab: "assignments", icon: ClipboardList },
          { title: "AI Tutor", href: "/student?tab=ai-tutor", tab: "ai-tutor", icon: Sparkles },
          { title: "Schedule", href: "/student?tab=schedule", tab: "schedule", icon: Calendar },
        ];
    }
  };

  const navItems = getNavItems();

  const isItemActive = (item: MobileNavItem) => {
    const basePath = item.href.split("?")[0];
    if (pathname !== basePath) return false;
    if (item.tab) {
      if (item.tab === "leaves") {
        return currentTab === "leaves" || currentTab === "leave" || currentTab === "student-leaves";
      }
      return currentTab === item.tab;
    }
    return !currentTab || currentTab === "overview";
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 w-full pointer-events-none">
      <nav
        aria-label="Mobile Navigation Dock"
        className="mobile-safe-bottom pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_18px_rgba(15,23,42,0.06)] px-2 pt-1.5 transition-colors"
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const IconComponent = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex-1 min-h-11 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg select-none group transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                  active ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="relative flex items-center justify-center">
                    <div>
                      <IconComponent
                        className={`h-5 w-5 transition-colors duration-200 ${
                          active
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] mt-1 font-semibold tracking-tight truncate max-w-[64px] transition-colors duration-200 ${
                      active
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
