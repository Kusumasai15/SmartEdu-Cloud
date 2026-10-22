"use client";

import React, { useState } from "react";
import { X, Send, ShieldAlert, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface VcIssueDirectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectiveIssued?: (title: string) => void;
}

export function VcIssueDirectiveModal({
  isOpen,
  onClose,
  onDirectiveIssued,
}: VcIssueDirectiveModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "URGENT">("HIGH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/announcements", {
        title: title.trim(),
        content: description.trim(),
        scope_type: "INSTITUTION",
        priority: priority === "URGENT" ? "CRITICAL" : priority === "HIGH" ? "IMPORTANT" : "NORMAL",
        is_acknowledgement_required: priority === "URGENT",
        publish_now: true,
      });

      if (onDirectiveIssued) {
        onDirectiveIssued(title.trim());
      }
      setTitle("");
      setDescription("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The institution notice could not be published.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="vc-notice-title" className="my-8 w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="vc-notice-title" className="text-sm font-semibold leading-tight text-slate-950">
                Publish institution notice
              </h3>
              <p className="text-[11px] text-slate-500">
                Send an official notice to all active university users
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notice form"
            className="rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Notice title *
            </label>
            <input
              type="text"
              required
              placeholder="Enter a clear notice title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-950 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="block text-xs font-semibold text-slate-700">Audience</span>
              <span className="mt-1 block text-xs text-slate-500">All active university users</span>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "NORMAL" | "HIGH" | "URGENT")}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-950 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Important</option>
                <option value="URGENT">Urgent (acknowledgement required)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Notice details *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Write the notice, deadline, and action required."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-950 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <span>
              The notice is saved to the database and delivered through the notification system.
            </span>
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Publishing..." : "Publish notice"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
