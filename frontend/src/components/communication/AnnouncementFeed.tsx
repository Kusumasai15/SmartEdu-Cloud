"use client";

import React, { useState } from "react";
import {
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Building,
  BookOpen,
  Globe,
  Plus,
} from "lucide-react";
import { AnnouncementItem } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface AnnouncementFeedProps {
  announcements: AnnouncementItem[];
  loading?: boolean;
  canCreate?: boolean;
  onOpenComposer?: () => void;
  onRefresh?: () => void;
}

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
  announcements,
  loading = false,
  canCreate = false,
  onOpenComposer,
  onRefresh,
}) => {
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      const resp = await fetchApi(`/announcements/${id}/acknowledge`, { method: "POST" });
      if (resp.success && onRefresh) {
        onRefresh();
      }
    } catch {
      // non-blocking
    } finally {
      setAcknowledgingId(null);
    }
  };

  const getPriorityBadge = (priority: AnnouncementItem["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <Badge variant="destructive" className="text-[10px] font-black uppercase tracking-wider">Critical</Badge>;
      case "IMPORTANT":
        return <Badge className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">Important</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">Normal</Badge>;
    }
  };

  const getScopeIcon = (scope: AnnouncementItem["scope_type"]) => {
    switch (scope) {
      case "INSTITUTION":
        return <Globe className="h-3.5 w-3.5 text-blue-500" />;
      case "DEPARTMENT":
        return <Building className="h-3.5 w-3.5 text-purple-500" />;
      case "COURSE":
        return <BookOpen className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Megaphone className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Compose Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Official Announcements & Notices
          </h3>
          <p className="text-xs text-muted-foreground">
            Authoritative university, departmental, and course broadcasts
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={onOpenComposer} className="gap-1 text-xs font-bold">
            <Plus className="h-3.5 w-3.5" /> Post Notice
          </Button>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
          No announcements available.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card
              key={ann.id}
              className={`border-l-4 transition-all duration-200 ${
                ann.priority === "CRITICAL"
                  ? "border-l-red-500 bg-red-50/20 dark:bg-red-950/10"
                  : ann.priority === "IMPORTANT"
                  ? "border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
                  : "border-l-primary"
              }`}
            >
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(ann.priority)}
                      <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        {getScopeIcon(ann.scope_type)}
                        {ann.scope_name || ann.scope_type}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground">
                      {ann.title}
                    </CardTitle>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDate(ann.publish_at)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-4 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>

                <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{ann.author_name}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4">
                      {ann.author_role}
                    </Badge>
                  </div>

                  {ann.is_acknowledgement_required && (
                    <div className="flex items-center gap-2">
                      {ann.is_acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="h-4 w-4" /> Acknowledged
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acknowledgingId === ann.id}
                          onClick={() => handleAcknowledge(ann.id)}
                          className="h-7 text-xs font-bold border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
                        >
                          {acknowledgingId === ann.id ? "Recording..." : "Acknowledge Notice"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
