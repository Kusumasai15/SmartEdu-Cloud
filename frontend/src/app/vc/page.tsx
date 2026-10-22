"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  RefreshCw,
  LayoutDashboard,
  Award,
  Clock,
  Activity,
  ShieldCheck,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/lib/use-api-resource";
import {
  LeadershipOverview,
  VCInstitutionResultAnalytics,
  VCInstitutionAttendanceAnalytics
} from "@/types";
import { VcOverviewTab } from "@/components/vc/VcOverviewTab";
import { VcIssueDirectiveModal } from "@/components/vc/VcIssueDirectiveModal";
import { ResultReviewTab } from "@/components/leadership/ResultReviewTab";
import { CardGridSkeleton } from "@/components/smartedu/LoadingSkeleton";

const VcDepartmentsTab = dynamic(() => import("@/components/vc/VcDepartmentsTab").then((module) => module.VcDepartmentsTab), { loading: () => <CardGridSkeleton count={3} /> });
const VcAttendanceTab = dynamic(() => import("@/components/vc/VcAttendanceTab").then((module) => module.VcAttendanceTab), { loading: () => <CardGridSkeleton count={3} /> });
const PeopleDirectory = dynamic(() => import("@/components/leadership/PeopleDirectory").then((module) => module.PeopleDirectory), { loading: () => <CardGridSkeleton count={3} /> });
const ScheduleTable = dynamic(() => import("@/components/leadership/ScheduleTable").then((module) => module.ScheduleTable), { loading: () => <CardGridSkeleton count={3} /> });
const PredictiveAtRiskInterventionView = dynamic(() => import("@/components/intelligence/PredictiveAtRiskInterventionView").then((module) => module.PredictiveAtRiskInterventionView), { loading: () => <CardGridSkeleton count={3} /> });
const VCResultsOverview = dynamic(() => import("@/components/results/VCResultsOverview").then((module) => module.VCResultsOverview), { loading: () => <CardGridSkeleton count={3} /> });

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "results", label: "Academic Results", icon: Award },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "intelligence", label: "Student Risk", icon: Activity },
  { id: "approvals", label: "Result Approvals", icon: ShieldCheck },
  { id: "curriculum", label: "Schools & Departments", icon: Building2 },
  { id: "faculty", label: "Faculty", icon: Users },
  { id: "students", label: "Students", icon: GraduationCap },
  { id: "timetable", label: "Timetable", icon: Calendar },
];

function VcDashboardContent() {
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const [notification, setNotification] = useState<string | null>(null);
  const [isDirectiveModalOpen, setIsDirectiveModalOpen] = useState(false);

  const requested = params.get("tab") || "overview";
  const activeTab = requested === "departments"
    ? "curriculum"
    : requested === "analytics"
    ? "results"
    : tabs.some((t) => t.id === requested)
    ? requested
    : "overview";

  // API Data hooks
  const isVcOrAdmin = user?.role.name === "VC" || user?.role.name === "ADMINISTRATOR";
  const { data: leadershipData, error, loading, refresh } = useApiResource<LeadershipOverview>(
    isVcOrAdmin ? "/leadership/overview" : null
  );

  const results = useApiResource<VCInstitutionResultAnalytics>(
    isVcOrAdmin && ["overview", "results", "analytics"].includes(activeTab)
      ? "/results/vc/institution/analytics"
      : null
  );

  const attendanceRes = useApiResource<VCInstitutionAttendanceAnalytics>(
    isVcOrAdmin && ["overview", "attendance"].includes(activeTab)
      ? "/attendance/vc/attendance/analytics"
      : null
  );

  const handleSelectTab = (tabId: string) => {
    router.push(`/vc?tab=${tabId}`);
  };

  const handleDirectiveIssued = (title: string) => {
    setNotification(`Institution notice "${title}" was published successfully.`);
    setTimeout(() => setNotification(null), 5000);
  };

  const vcDisplayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Vice-Chancellor"
    : "Vice-Chancellor";

  return (
    <RoleGuard allowedRoles={["VC", "ADMINISTRATOR"]}>
      <div className="min-w-0 space-y-5 px-1 pb-16 sm:px-0">
        {/* Toast Notification */}
        {notification && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          </div>
        )}

        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-blue-700">University administration</p>
            <h1 className="mt-0.5 text-xl font-semibold text-slate-950">Vice-Chancellor portal</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Refresh institutional records"
              aria-label="Refresh records"
              onClick={() => {
                void refresh();
                void results.refresh();
                void attendanceRes.refresh();
              }}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsDirectiveModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-700"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Publish notice</span>
            </button>
          </div>
        </header>

        {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}



        {/* ─── TAB CONTENT PANELS ─── */}
        {activeTab === "overview" && (
          <VcOverviewTab
            vcName={vcDisplayName}
            overview={leadershipData}
            results={results.data}
            attendance={attendanceRes.data}
            onSelectTab={handleSelectTab}
            onOpenDirectiveModal={() => setIsDirectiveModalOpen(true)}
          />
        )}

        {activeTab === "results" && (
          <div className="space-y-6 animate-fade-in">
            {results.loading ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Loading institutional academic results &amp; rankings...
              </div>
            ) : results.data ? (
              <VCResultsOverview analytics={results.data} loading={false} />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Scholastic examination results are synchronized with the continuous assessment pipeline.
              </div>
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <VcAttendanceTab
            analytics={attendanceRes.data}
            loading={attendanceRes.loading}
          />
        )}

        {activeTab === "intelligence" && (
          <div className="space-y-6 animate-fade-in">
            <PredictiveAtRiskInterventionView />
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-6 animate-fade-in">
            <ResultReviewTab results={leadershipData?.result_courses || []} onChanged={refresh} />
          </div>
        )}

        {activeTab === "curriculum" && (
          <div className="space-y-6 animate-fade-in">
            {loading ? (
              <p className="p-8 text-center text-xs text-slate-500">Loading constituent schools...</p>
            ) : leadershipData ? (
              <VcDepartmentsTab departments={leadershipData.departments} />
            ) : (
              <p className="p-8 text-center text-xs text-slate-500">No departments found.</p>
            )}
          </div>
        )}

        {activeTab === "faculty" && (
          <div className="space-y-6 animate-fade-in">
            <PeopleDirectory kind="faculty" />
          </div>
        )}

        {activeTab === "students" && (
          <div className="space-y-6 animate-fade-in">
            <PeopleDirectory kind="students" />
          </div>
        )}

        {activeTab === "timetable" && (
          <div className="space-y-6 animate-fade-in">
            <ScheduleTable />
          </div>
        )}

        {/* Modal: Issue Executive Directive */}
        <VcIssueDirectiveModal
          isOpen={isDirectiveModalOpen}
          onClose={() => setIsDirectiveModalOpen(false)}
          onDirectiveIssued={handleDirectiveIssued}
        />
      </div>
    </RoleGuard>
  );
}

export default function VcDashboardPage() {
  return (
    <React.Suspense fallback={<CardGridSkeleton count={4} />}>
      <VcDashboardContent />
    </React.Suspense>
  );
}
