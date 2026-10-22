"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import {
  Bell,
  Sun,
  Moon,
  Search,
  MessageSquare,
  ChevronDown,
  LogOut,
  Sparkles,
  BookOpen,
  ClipboardList,
  FileCheck,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Settings,
  User,
  Menu,
  Key,
  HelpCircle,
} from "lucide-react";
import { MobileSidebarDrawer } from "./AppSidebar";
import { FacultyPresenceSwitcher } from "@/components/faculty/FacultyPresenceSwitcher";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { getUserAvatarUrl } from "@/lib/avatar";

export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    courses,
    assignments,
    discussions,
    announcements,
    notifications,
    departments,
    markNotificationAsRead,
  } = useAcademicData();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [messagesOpen, setMessagesOpen] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      setIsDark(document.documentElement.classList.contains("dark"));
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  // Keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setMessagesOpen(false);
        setMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const userInitials = (
    (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase() +
    (user?.last_name?.[0] || "").toUpperCase()
  );

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : "User";

  const userRole = (
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || "STUDENT"
  ).toLowerCase();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const updateAvatar = () => {
      setAvatarUrl(getUserAvatarUrl(user));
    };
    updateAvatar();
    window.addEventListener("user-avatar-updated", updateAvatar);
    return () => window.removeEventListener("user-avatar-updated", updateAvatar);
  }, [user]);

  // Filter items for quick search palette
  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const combinedAlerts = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      timestamp: string;
      unread: boolean;
      href?: string;
      notifId?: string;
    }> = [];

    const userEmail = (user?.email || "").toLowerCase().trim();
    const userRoleStr = (
      typeof user?.role === "string"
        ? user.role
        : user?.role?.name || "STUDENT"
    ).toUpperCase();
    const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim().toLowerCase();
    const userFirstName = (user?.first_name || "").trim().toLowerCase();
    const userId = user?.id || "";

    // Cohorts advised by this user (if faculty)
    const myAdvisedCohorts = new Set<string>();
    if (userRoleStr === "FACULTY" || userRoleStr === "TEACHER") {
      (departments || []).forEach((dept) => {
        dept.cohorts?.forEach((cohort) => {
          const advEmail = (cohort.classAdvisorEmail || "").toLowerCase().trim();
          const advName = (cohort.classAdvisor || "").toLowerCase().trim();
          const matchesAdvisor =
            (advEmail && advEmail === userEmail) ||
            (advName && advName !== "not assigned" && (
              advName === userFullName ||
              advName.includes(userFullName) ||
              userFullName.includes(advName) ||
              (userFirstName.length >= 3 && advName.includes(userFirstName))
            ));
          if (matchesAdvisor) {
            if (cohort.name) myAdvisedCohorts.add(cohort.name.toLowerCase().trim());
            if (cohort.id) myAdvisedCohorts.add(cohort.id.toLowerCase().trim());
            if (cohort.section) myAdvisedCohorts.add(cohort.section.toLowerCase().trim());
          }
        });
      });
    }

    (notifications || []).forEach((n) => {
      // 1. Direct student recipient ID target
      if (n.targetStudentId && n.targetStudentId !== userId) {
        return;
      }

      // 2. Direct recipient email match
      if (n.targetRecipientEmail) {
        const targetEmail = n.targetRecipientEmail.toLowerCase().trim();
        if (targetEmail && targetEmail !== userEmail) {
          return;
        }
      }

      // 3. Direct recipient name match (if no email target was given)
      if (n.targetRecipientName && !n.targetRecipientEmail) {
        const targetName = n.targetRecipientName.toLowerCase().trim();
        const matchesName =
          targetName === userFullName ||
          targetName.includes(userFullName) ||
          userFullName.includes(targetName) ||
          (userFirstName.length >= 3 && targetName.includes(userFirstName));
        if (!matchesName) {
          return;
        }
      }

      // 4. Target Role check (STUDENT vs FACULTY vs HOD vs ADMIN)
      if (n.targetRole) {
        const roleUpper = n.targetRole.toUpperCase();
        if (roleUpper === "FACULTY" && userRoleStr !== "FACULTY" && userRoleStr !== "TEACHER" && userRoleStr !== "HOD" && userRoleStr !== "ADMIN") {
          return;
        }
        if (roleUpper === "STUDENT" && userRoleStr !== "STUDENT") {
          return;
        }
        if (roleUpper === "HOD" && userRoleStr !== "HOD" && userRoleStr !== "ADMIN") {
          return;
        }
        if (roleUpper === "ADMIN" && userRoleStr !== "ADMIN") {
          return;
        }
      }

      // 5. Attendance & Student Leave scoping for faculty advisors vs students
      if (n.type === "ATTENDANCE" && (n.title || "").toLowerCase().includes("leave application")) {
        if (userRoleStr === "FACULTY" || userRoleStr === "TEACHER") {
          let isAdvisorForThisLeave = false;
          if (n.targetRecipientEmail) {
            if (n.targetRecipientEmail.toLowerCase().trim() === userEmail) {
              isAdvisorForThisLeave = true;
            }
          } else if (n.targetRecipientName && n.targetRecipientName.toLowerCase().trim() !== "cohort advisor" && n.targetRecipientName.toLowerCase().trim() !== "class advisor") {
            const tName = n.targetRecipientName.toLowerCase().trim();
            if (tName && (tName.includes(userFullName) || userFullName.includes(tName))) {
              isAdvisorForThisLeave = true;
            }
          } else if (n.targetClass) {
            const cLower = n.targetClass.toLowerCase().trim();
            if (myAdvisedCohorts.has(cLower)) isAdvisorForThisLeave = true;
            for (const advised of Array.from(myAdvisedCohorts)) {
              if (cLower.includes(advised) || advised.includes(cLower)) isAdvisorForThisLeave = true;
            }
          }
          if (!isAdvisorForThisLeave) {
            return;
          }
        } else if (userRoleStr === "STUDENT") {
          return;
        }
      }

      // 6. Course-level scoping for students
      if (n.courseCode && userRoleStr === "STUDENT") {
        const studentCourseCodes = new Set(
          (courses || []).map((c) => c.code.toLowerCase().trim())
        );
        if (studentCourseCodes.size > 0 && !studentCourseCodes.has(n.courseCode.toLowerCase().trim())) {
          return;
        }
      }

      const isCs =
        (n.title || "").toLowerCase().includes("case study") ||
        (n.message || (n as any).description || "").toLowerCase().includes("case study");
      const isConsultation =
        (n.title || "").toLowerCase().includes("doubt") ||
        (n.title || "").toLowerCase().includes("consultation") ||
        (n.title || "").toLowerCase().includes("1:1");
      const isLeave =
        (n.title || "").toLowerCase().includes("leave") ||
        (n.title || "").toLowerCase().includes("on-duty") ||
        (n.title || "").toLowerCase().includes("od ");

      let alertHref: string | undefined = undefined;
      if (userRole === "student") {
        if (isCs) alertHref = "/student?tab=case-studies";
        else if (n.type === "ATTENDANCE" || n.aiCatchUpAvailable) alertHref = "/student?tab=attendance";
        else alertHref = "/student?tab=notifications";
      } else if (userRole === "faculty") {
        if (isConsultation) alertHref = "/faculty?tab=consultations";
        else if (isLeave) alertHref = "/faculty?tab=leaves";
        else if (isCs) alertHref = "/faculty?tab=case-studies";
        else if (n.type === "EXAM") alertHref = "/faculty?tab=quizzes";
        else if (n.type === "ASSIGNMENT") alertHref = "/faculty?tab=assignments";
      }

      list.push({
        id: `notif-${n.id}`,
        notifId: n.id,
        title: n.title,
        message: n.message || (n as any).description || "",
        timestamp: n.createdAt || (n as any).timestamp || "Just now",
        unread: !n.isRead || Boolean((n as any).unread),
        href: alertHref,
      });
    });

    (announcements || []).forEach((a) => {
      const aud = (a.audience || "ALL").toUpperCase();
      if (userRoleStr === "STUDENT") {
        if (aud === "FACULTY" || aud === "HOD" || aud === "ADMIN" || aud === "STAFF") return;
      } else if (userRoleStr === "FACULTY" || userRoleStr === "TEACHER") {
        if (aud === "STUDENTS") return;
      }

      if (a.courseCode && userRoleStr === "STUDENT") {
        const studentCourseCodes = new Set(
          (courses || []).map((c) => c.code.toLowerCase().trim())
        );
        if (studentCourseCodes.size > 0 && !studentCourseCodes.has(a.courseCode.toLowerCase().trim())) {
          return;
        }
      }

      list.push({
        id: `ann-${a.id}`,
        title: a.title,
        message: a.content,
        timestamp: a.createdAt || "Notice",
        unread: false,
        href: userRole === "student" ? "/student?tab=notifications" : undefined,
      });
    });

    return list;
  }, [notifications, announcements, userRole, user, courses, departments]);

  const unreadCount = combinedAlerts.filter((a) => a.unread).length;

  return (
    <>
      {/* Mobile Navigation Drawer */}
      <MobileSidebarDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <header className="w-full h-14 px-3 sm:px-5 lg:px-6 bg-transparent transition-colors flex items-center justify-between">
        {/* Left Side: Mobile Hamburger & Search Input Bar matching reference image */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </motion.button>

          {/* Search: Compact icon button on mobile screens (< sm) */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => setSearchOpen(true)}
            className="sm:hidden h-9 w-9 rounded-lg border border-blue-100 bg-white hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Quick Search"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </motion.button>

          {/* Search Input Bar (Visible on tablet & desktop >= sm) */}
          <div className="hidden sm:block relative flex-1 max-w-md lg:max-w-xl">
            <motion.button
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full h-9 pl-3 pr-2.5 rounded-lg border border-blue-100 dark:border-slate-700 bg-white/90 dark:bg-slate-800/80 hover:border-blue-300 dark:hover:border-blue-700 text-left text-xs font-medium text-slate-600 dark:text-slate-400 shadow-2xs focus:outline-none transition-[background-color,border-color,box-shadow,transform] duration-150 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                <span className="truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                  Search courses, assignments, quizzes, schedules...
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-400 shadow-2xs shrink-0 flex items-center gap-0.5">
                Ctrl K
              </span>
            </motion.button>
          </div>
        </div>

        {/* Right edge controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={toggleDarkMode}
            className="h-9 w-9 rounded-lg border border-blue-100 bg-white/90 text-slate-600 shadow-2xs hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-[background-color,border-color,color,transform] duration-150 flex items-center justify-center cursor-pointer"
            title={isDark ? "Use light theme" : "Use dark theme"}
            aria-label={isDark ? "Use light theme" : "Use dark theme"}
            aria-pressed={isDark}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.button>

          {/* Notification Bell */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setMessagesOpen(false);
                setMenuOpen(false);
              }}
              className="h-9 w-9 rounded-lg border border-blue-100 bg-white/90 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer relative"
              title="Announcements & Alerts"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-white dark:ring-slate-900" />
              )}
            </motion.button>

            <AnimatePresence>
              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="fixed left-3 right-3 top-16 w-auto max-h-[calc(100dvh-5rem)] overflow-y-auto p-3.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-[0_12px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-50 text-xs space-y-2.5 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 sm:max-h-[420px]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-bold text-slate-900 dark:text-slate-100">Notices &amp; Alerts</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 font-mono">
                          {unreadCount} New
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {combinedAlerts.length > 0 ? (
                        combinedAlerts.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (item.notifId) {
                                markNotificationAsRead(item.notifId);
                              }
                              setNotificationsOpen(false);
                              if (item.href) {
                                router.push(item.href);
                              }
                            }}
                            className={`p-2.5 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                              item.unread
                                ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80"
                                : "bg-slate-50 dark:bg-slate-800/70 border-slate-100 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-slate-900 dark:text-slate-200 line-clamp-1">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 shrink-0 font-mono ml-1">
                                {item.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                              {item.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                          <span>No new notifications</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Messages / Course Discussions Button */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setMessagesOpen(!messagesOpen);
                setNotificationsOpen(false);
                setMenuOpen(false);
              }}
              className="h-9 w-9 rounded-lg border border-blue-100 bg-white/90 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer relative"
              title="Discussions & Messages"
            >
              <MessageSquare className="h-4 w-4" />
              {discussions.length > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
              )}
            </motion.button>

            <AnimatePresence>
              {messagesOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs"
                    onClick={() => setMessagesOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="fixed left-3 right-3 top-16 w-auto p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.15)] z-50 text-xs space-y-2.5 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="font-bold text-slate-900 dark:text-slate-100">Course Discussions</span>
                      </div>
                      <Link
                        href={`/${userRole}?tab=discussions`}
                        onClick={() => setMessagesOpen(false)}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View All
                      </Link>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                      {discussions && discussions.length > 0 ? (
                        discussions.slice(0, 3).map((discussion) => (
                          <Link
                            key={discussion.id}
                            href={`/${userRole}?tab=discussions`}
                            onClick={() => setMessagesOpen(false)}
                            className="block p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-blue-50/70 dark:hover:bg-slate-700/60 border border-slate-100 dark:border-slate-800 transition-colors space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-slate-900 dark:text-slate-200 truncate">{discussion.courseCode} · {discussion.title}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono shrink-0 ml-1">{discussion.createdAt}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {discussion.content}
                            </p>
                          </Link>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 py-4 text-center">No active course messages.</p>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* 4. Help & Guide Button (Available in menu on mobile) */}
          <Link
            href={userRole === "student" ? "/student?tab=help" : "/help"}
            className="hidden sm:flex h-9 w-9 rounded-lg border border-blue-100 bg-white/90 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 items-center justify-center transition-all cursor-pointer"
            title="Help Center & Guide"
          >
            <HelpCircle className="h-4 w-4" />
          </Link>

          {/* 5. Settings Gear Button (Available in menu on mobile) */}
          <Link
            href="/settings"
            className="hidden sm:flex h-9 w-9 rounded-lg border border-blue-100 bg-white/90 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 items-center justify-center transition-all cursor-pointer"
            title="System & Account Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* Faculty Real-time Cabin Presence Switcher (Shown for Faculty & HOD) */}
          {(userRole === "faculty" || userRole === "hod") && (
            <div className="hidden xl:block">
              <FacultyPresenceSwitcher />
            </div>
          )}

          {/* 6. User Capsule Avatar Pill (matches reference image: Blue circle initials, Name, Role, Chevron) */}
          <div className="relative ml-1 sm:ml-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setMenuOpen(!menuOpen);
                setNotificationsOpen(false);
                setMessagesOpen(false);
              }}
              className="flex items-center gap-2.5 py-1 pl-1 pr-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden ring-2 ring-white dark:ring-slate-800">
                <img
                  src={avatarUrl || getUserAvatarUrl(user)}
                  alt={userName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("freepik")) {
                      target.src = "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg";
                    }
                  }}
                />
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                  {userName}
                </span>
                <span className="text-[11px] font-medium text-slate-400 capitalize block leading-tight">
                  {userRole === "admin" ? "Administrator" : userRole === "faculty" ? "Faculty" : userRole === "student" ? "Student" : userRole}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            </motion.button>


            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="fixed left-3 right-3 top-16 w-auto p-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.15)] z-50 text-xs space-y-1.5 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-56"
                    onClick={() => setMenuOpen(false)}
                  >
                    <div className="p-2.5 border-b border-slate-200 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{userName}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email || "signed-in user"}</p>
                      <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 capitalize">
                        {userRole} Account
                      </span>
                    </div>

                    <div className="space-y-0.5 pt-1">
                      <Link
                        href={`/${userRole}`}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                        <span>My Dashboard</span>
                      </Link>
                      <Link
                        href={`/${userRole}?tab=gradebook`}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors"
                      >
                        <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span>My Grades</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-blue-600" />
                        <span>Profile &amp; Settings</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors text-left cursor-pointer"
                      >
                        <Key className="h-3.5 w-3.5 text-blue-600" />
                        <span>Change Password</span>
                      </button>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Quick Search Command Palette Modal */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 z-10"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search courses, assignments, quizzes..."
                  className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none bg-transparent"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Instant Search Results */}
              <div className="max-h-80 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* Courses Results */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                    Courses
                  </span>
                  {filteredCourses.slice(0, 3).map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(`/courses/${c.code}/learn`);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                          {c.code.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.code} • {c.instructor}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    </button>
                  ))}
                </div>

                {/* Assignments Results */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                    Assignments
                  </span>
                  {filteredAssignments.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(`/${userRole}?tab=assignments`);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                          <ClipboardList className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-200">{a.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{a.courseCode} • Due {a.dueDate}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span>Navigation: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">↵ to select</kbd></span>
                <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">ESC</kbd></span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direct Password Update Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userEmail={user?.email}
      />

      {/* Mobile Drawer Sidebar Navigation */}
      <MobileSidebarDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />
    </>
  );
}
