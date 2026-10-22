"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck,
  ShieldAlert,
  History,
  Scale,
  Sparkles,
  Activity,
} from "lucide-react";

export type AdminViewSection =
  | "OVERVIEW"
  | "USERS"
  | "ACADEMIC"
  | "GOVERNANCE"
  | "SECURITY"
  | "AUDIT"
  | "POLICIES"
  | "AI"
  | "SYSTEM";

interface AdminSidebarProps {
  currentSection: AdminViewSection;
  onSelectSection: (section: AdminViewSection) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSelectSection,
}) => {
  const navItems: { id: AdminViewSection; label: string; icon: any; category: string }[] = [
    { id: "OVERVIEW", label: "Control Center", icon: LayoutDashboard, category: "Core" },
    { id: "USERS", label: "User Accounts", icon: Users, category: "Governance" },
    { id: "ACADEMIC", label: "Academic Catalog", icon: Building2, category: "Governance" },
    { id: "GOVERNANCE", label: "Approval Workflows", icon: FileCheck, category: "Governance" },
    { id: "SECURITY", label: "Security & Sessions", icon: ShieldAlert, category: "Operations" },
    { id: "AUDIT", label: "Audit Explorer", icon: History, category: "Operations" },
    { id: "POLICIES", label: "Institutional Policies", icon: Scale, category: "Operations" },
    { id: "AI", label: "Learning Support", icon: Sparkles, category: "Operations" },
    { id: "SYSTEM", label: "System Health", icon: Activity, category: "Operations" },
  ];

  return (
    <aside className="w-64 bg-card/60 backdrop-blur-md border-r border-border p-4 flex flex-col gap-6 shrink-0">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Admin Console</h2>
          <p className="text-[11px] text-muted-foreground">Governance &amp; Control</p>
        </div>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
