"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  BookOpen,
  FileText,
  GraduationCap,
  Award,
  Clock,
  Sparkles,
  ShieldAlert,
  Megaphone,
  X,
} from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import { NotificationItem, UnreadCounts, NotificationCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface NotificationBellProps {
  onNavigateAction?: (url: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "ACADEMIC">("ALL");
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const resp = await fetchApi<UnreadCounts>("/notifications/unread-count");
      if (resp.success && resp.data) {
        setUnreadCount(resp.data.unread_notifications_count);
      }
    } catch {
      // non-blocking
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = activeFilter === "UNREAD" ? "/notifications?unread_only=true" : "/notifications";
      const resp = await fetchApi<NotificationItem[]>(url);
      if (resp.success && resp.data) {
        setNotifications(resp.data);
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const resp = await fetchApi<NotificationItem>(`/notifications/${id}/read`, { method: "PATCH" });
      if (resp.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // non-blocking
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const resp = await fetchApi("/notifications/read-all", { method: "POST" });
      if (resp.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
        setUnreadCount(0);
      }
    } catch {
      // non-blocking
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "ASSIGNMENT":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "EXAM":
      case "QUIZ":
        return <GraduationCap className="h-4 w-4 text-purple-500" />;
      case "RESULT":
        return <Award className="h-4 w-4 text-emerald-500" />;
      case "ATTENDANCE":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="h-4 w-4 text-indigo-500" />;
      case "AI_INSIGHT":
        return <Sparkles className="h-4 w-4 text-cyan-500" />;
      case "SECURITY":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Open notifications center"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-background animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-wider text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-border bg-card px-2 py-1 gap-1 text-[11px] font-bold">
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeFilter === "ALL" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("UNREAD")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeFilter === "UNREAD" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  You&apos;re all caught up. No notifications.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.action_url && onNavigateAction) onNavigateAction(notif.action_url);
                    }}
                    className={`p-3 transition-colors flex items-start gap-3 cursor-pointer ${
                      notif.status === "UNREAD" ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-background border border-border shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground truncate">{notif.title}</span>
                        {notif.status === "UNREAD" && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span>{formatDate(notif.created_at)}</span>
                        {notif.status === "UNREAD" && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-primary hover:underline flex items-center gap-0.5 font-semibold"
                          >
                            <Check className="h-3 w-3" /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
