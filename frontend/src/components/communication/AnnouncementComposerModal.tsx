"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  X,
  Megaphone,
  AlertCircle,
} from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import {
  AnnouncementScope,
  AnnouncementPriority,
  AIDraftResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AnnouncementComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultScopeType?: AnnouncementScope;
  defaultScopeId?: string | null;
  courses?: Array<{ id: string; name: string; course_code: string }>;
  userRole: string;
}

export const AnnouncementComposerModal: React.FC<AnnouncementComposerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultScopeType = "COURSE",
  defaultScopeId = null,
  courses = [],
  userRole,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scopeType, setScopeType] = useState<AnnouncementScope>(defaultScopeType);
  const [scopeId, setScopeId] = useState<string>(defaultScopeId || (courses[0]?.id || ""));
  const [priority, setPriority] = useState<AnnouncementPriority>("NORMAL");
  const [isAckRequired, setIsAckRequired] = useState(false);

  // Draft helper state
  const [aiTopic, setAiTopic] = useState("");
  const [isDraftingAI, setIsDraftingAI] = useState(false);
  const [aiHelperOpen, setAiHelperOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateAIDraft = async () => {
    if (!aiTopic.trim()) return;
    setIsDraftingAI(true);
    setErrorMsg(null);
    try {
      const resp = await fetchApi<AIDraftResponse>("/announcements/ai-draft", {
        method: "POST",
        body: JSON.stringify({
          topic_or_purpose: aiTopic,
          audience: scopeType === "COURSE" ? "STUDENTS" : scopeType === "DEPARTMENT" ? "DEPARTMENT" : "INSTITUTION",
          key_points: [aiTopic],
          tone: "Professional and Academic",
        }),
      });

      if (resp.success && resp.data) {
        setTitle(resp.data.draft_title);
        setContent(resp.data.draft_content);
        setAiHelperOpen(false);
      } else {
        setErrorMsg("Failed to generate a draft. You can write your announcement directly.");
      }
    } catch {
      setErrorMsg("Failed to connect to the drafting service.");
    } finally {
      setIsDraftingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg("Please provide both a title and notice content.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const resp = await fetchApi("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          scope_type: scopeType,
          scope_id: scopeType === "COURSE" ? scopeId : null,
          priority,
          is_acknowledgement_required: isAckRequired,
          publish_now: true,
        }),
      });

      if (resp.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(resp.error?.message || "Failed to publish announcement.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred while publishing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Post Academic Announcement</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drafting Helper Trigger */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Draft Helper
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAiHelperOpen(!aiHelperOpen)}
                className="h-6 text-[11px] font-bold text-primary hover:bg-primary/10"
              >
                {aiHelperOpen ? "Close Helper" : "Draft Notice"}
              </Button>
            </div>

            {aiHelperOpen && (
              <div className="space-y-2 pt-2 border-t border-primary/10">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Reschedule lecture to Friday 2 PM due to guest speaker"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="text-xs bg-background"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isDraftingAI || !aiTopic.trim()}
                    onClick={handleGenerateAIDraft}
                    className="text-xs font-bold shrink-0"
                  >
                    {isDraftingAI ? "Drafting..." : "Generate Draft"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Generate an editable draft, then review and refine before publication.
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input
              placeholder="Notice title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm font-semibold"
              required
            />
          </div>

          {/* Scope & Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRole === "FACULTY" && courses.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Course</label>
                <select
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="CRITICAL">Critical / Urgent</option>
              </select>
            </div>
          </div>

          {/* Notice Body */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Content</label>
            <textarea
              rows={5}
              placeholder="Write the full announcement text..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Acknowledgement Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="ackReq"
              checked={isAckRequired}
              onChange={(e) => setIsAckRequired(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="ackReq" className="text-xs font-medium text-foreground cursor-pointer">
              Require students/recipients to explicitly acknowledge this notice
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1 font-bold">
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Publishing..." : "Publish Announcement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
