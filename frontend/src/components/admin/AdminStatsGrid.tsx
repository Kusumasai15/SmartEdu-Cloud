"use client";

import React from "react";
import {
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  BookOpen,
  Calendar,
  ShieldCheck,
  FileCheck,
  Activity,
} from "lucide-react";
import { AdminDashboardStats } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStatsGridProps {
  stats: AdminDashboardStats | null;
  loading: boolean;
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total Students", value: stats.total_students, icon: GraduationCap },
    { label: "Total Faculty", value: stats.total_faculty, icon: Briefcase },
    { label: "Total HODs", value: stats.total_hods, icon: Users },
    { label: "Administrators", value: stats.total_administrators, icon: ShieldCheck },
    { label: "Active Courses", value: stats.total_courses, icon: BookOpen },
    { label: "Departments", value: stats.total_departments, icon: Building2 },
    { label: "Pending Approvals", value: stats.pending_governance_count, icon: FileCheck },
    { label: "Active Sessions", value: stats.active_sessions_count, icon: Activity },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card key={idx} className="border-border bg-card shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">{item.label}</span>
                  <span className="text-xl font-semibold text-foreground font-mono tracking-tight">{item.value}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border text-xs gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Academic Term:</span>
          <span className="font-semibold text-foreground">{stats.active_semester_name} ({stats.active_academic_year})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">System Health:</span>
          <Badge
            variant={stats.system_health_status === "HEALTHY" ? "outline" : "destructive"}
            className="text-[10px] uppercase font-bold"
          >
            {stats.system_health_status}
          </Badge>
        </div>
      </div>
    </div>
  );
};
