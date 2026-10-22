"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import { fetchApi } from "@/lib/api-client";
import { AdminDashboardStats } from "@/types";

// Modular Academic Software Administrator Components
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { TimetableCalendarAdminView } from "@/components/admin/TimetableCalendarAdminView";
import { CourseManagementView } from "@/components/admin/CourseManagementView";
import { AdmissionsEnrollmentView } from "@/components/admin/AdmissionsEnrollmentView";
import { AcademicTermsView } from "@/components/admin/AcademicTermsView";
import { UserManagementView } from "@/components/admin/UserManagementView";
import { DepartmentManagementView } from "@/components/admin/DepartmentManagementView";
import { ClassroomManagementView } from "@/components/admin/ClassroomManagementView";
import { PolicyManagementView } from "@/components/admin/PolicyManagementView";
import { AuditExplorer } from "@/components/admin/AuditExplorer";
import { AdminAnalyticsView } from "@/components/admin/AdminAnalyticsView";
import { AdminEventAttendanceView } from "@/components/admin/AdminEventAttendanceView";
import { CardGridSkeleton } from "@/components/smartedu/LoadingSkeleton";

function AdminDashboardContent() {
  const { user } = useAuth();
  const { courses, departments, policies, users, terms, calendarSchedules } = useAcademicData();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  // Synchronized activeTab state for immediate, responsive 1-click tab switching
  const tabParam = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin?tab=${tabId}`);
  };

  const loadAdminData = useCallback(async () => {
    try {
      const statsRes = await fetchApi<AdminDashboardStats>("/admin/dashboard");
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const totalUsers = stats
    ? stats.total_students + stats.total_faculty + stats.total_hods + stats.total_administrators
    : users.length;
  const activeSessions = stats?.active_sessions_count ?? 0;
  const systemUptime = stats ? "Available" : "Unavailable";
  const adminName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Academic Administrator";

  return (
    <RoleGuard allowedRoles={["ADMINISTRATOR"]}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6 pb-16"
      >


        {/* ─── TAB CONTENTS ─── */}
        {activeTab === "overview" && (
          <AdminOverviewTab
            adminName={adminName}
            stats={stats}
            totalUsers={totalUsers}
            activeSessions={activeSessions}
            systemUptime={systemUptime}
            onSelectTab={switchTab}
          />
        )}

        {activeTab === "timetable" && <TimetableCalendarAdminView />}

        {activeTab === "courses" && <CourseManagementView />}

        {activeTab === "admissions" && <AdmissionsEnrollmentView />}

        {activeTab === "departments" && <DepartmentManagementView />}

        {activeTab === "rooms" && <ClassroomManagementView />}

        {activeTab === "policies" && <PolicyManagementView />}

        {activeTab === "terms" && <AcademicTermsView />}

        {activeTab === "users" && <UserManagementView />}

        {activeTab === "audit" && <AuditExplorer />}

        {activeTab === "analytics" && <AdminAnalyticsView />}

        {(activeTab === "event-attendance" || activeTab === "bulk-attendance" || activeTab === "events") && (
          <AdminEventAttendanceView />
        )}
      </motion.div>
    </RoleGuard>
  );
}

export default function AdminDashboardPage() {
  return (
    <React.Suspense fallback={<CardGridSkeleton count={4} />}>
      <AdminDashboardContent />
    </React.Suspense>
  );
}
