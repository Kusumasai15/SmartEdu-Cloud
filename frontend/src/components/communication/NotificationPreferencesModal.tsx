"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Sliders,
  Check,
  Shield,
  BookOpen,
  Calendar,
  Award,
  Clock,
  Sparkles,
  Save,
  X,
} from "lucide-react";
import { NotificationPreference } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadPrefs = async () => {
      setLoading(true);
      try {
        const resp = await fetchApi<NotificationPreference>("/notifications/preferences");
        if (resp.success && resp.data) {
          setPrefs(resp.data);
        }
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    };
    loadPrefs();
  }, [isOpen]);

  const handleToggle = (key: keyof NotificationPreference) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const resp = await fetchApi<NotificationPreference>("/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          email_enabled: prefs.email_enabled,
          academic_alerts: prefs.academic_alerts,
          assignment_reminders: prefs.assignment_reminders,
          exam_notifications: prefs.exam_notifications,
          result_notifications: prefs.result_notifications,
          announcements_enabled: prefs.announcements_enabled,
          ai_insights_enabled: prefs.ai_insights_enabled,
        }),
      });
      if (resp.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1000);
      }
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Notification Preferences</h3>
              <p className="text-xs text-muted-foreground">Configure in-app alert categories and delivery preferences.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : prefs ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Email Digest &amp; Forwarding</span>
                    <span className="text-[11px] text-muted-foreground">Receive academic summaries via university email</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email_enabled}
                  onChange={() => handleToggle("email_enabled")}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Academic Alerts</span>
                    <span className="text-[11px] text-muted-foreground">Attendance shortage warnings and status updates</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.academic_alerts}
                  onChange={() => handleToggle("academic_alerts")}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Assignment Reminders</span>
                    <span className="text-[11px] text-muted-foreground">Notifications for new assignments and due dates</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.assignment_reminders}
                  onChange={() => handleToggle("assignment_reminders")}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Exam &amp; Schedule Notifications</span>
                    <span className="text-[11px] text-muted-foreground">Exam schedules, seating allocations, and changes</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.exam_notifications}
                  onChange={() => handleToggle("exam_notifications")}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Result Publications</span>
                    <span className="text-[11px] text-muted-foreground">Grade releases, GPA/CGPA calculations, and transcripts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.result_notifications}
                  onChange={() => handleToggle("result_notifications")}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Learning Insights</span>
                    <span className="text-[11px] text-muted-foreground">Personalized study tips and academic recommendations</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.ai_insights_enabled}
                  onChange={() => handleToggle("ai_insights_enabled")}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Unable to load preferences.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/10">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !prefs}
            className="btn-saas-primary text-xs gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" /> Saved!
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
