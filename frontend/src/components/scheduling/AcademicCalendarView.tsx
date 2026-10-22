"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Tag,
} from "lucide-react";
import { CalendarEventItem, CalendarEventType } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AcademicCalendarViewProps {
  canManage?: boolean;
}

export function AcademicCalendarView({ canManage = false }: AcademicCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<CalendarEventType>("ACADEMIC_EVENT");
  const [newDesc, setNewDesc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isInstructional, setIsInstructional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi<CalendarEventItem[]>("/calendar");
      if (resp.success && resp.data) {
        setEvents(resp.data);
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const resp = await fetchApi<CalendarEventItem>("/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          event_type: newType,
          description: newDesc.trim() || undefined,
          start_date: startDate,
          end_date: endDate,
          is_instructional_day: isInstructional,
        }),
      });

      if (resp.success) {
        setNewTitle("");
        setNewDesc("");
        setStartDate("");
        setEndDate("");
        setIsCreateOpen(false);
        loadEvents();
      }
    } catch {
      // non-blocking
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    if (filterType === "ALL") return true;
    if (filterType === "HOLIDAYS") return evt.event_type === "HOLIDAY";
    if (filterType === "EXAMS") return evt.event_type === "EXAM_PERIOD";
    if (filterType === "SEMESTERS") return evt.event_type === "SEMESTER_START" || evt.event_type === "SEMESTER_END";
    return true;
  });

  const getEventBadge = (type: CalendarEventType) => {
    switch (type) {
      case "HOLIDAY":
        return <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">Holiday</Badge>;
      case "EXAM_PERIOD":
        return <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80">Exam Period</Badge>;
      case "SEMESTER_START":
      case "SEMESTER_END":
        return <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">Term Boundary</Badge>;
      case "REGISTRATION":
        return <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300">Registration</Badge>;
      default:
        return <Badge variant="outline">Academic Event</Badge>;
    }
  };

  return (
    <Card className="border border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Official Academic Calendar &amp; Holidays
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Authoritative university term milestones, examination windows, and recognized holidays.
          </CardDescription>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="btn-saas-primary text-xs font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Create Modal Drawer */}
        {isCreateOpen && (
          <form onSubmit={handleCreate} className="p-4 bg-muted/40 rounded-xl border border-border/70 space-y-3">
            <h4 className="text-xs font-bold text-foreground">Add New Calendar Milestone / Holiday</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midterm Examination Period"
                  className="text-xs mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Event Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CalendarEventType)}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ACADEMIC_EVENT">Academic Event</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="EXAM_PERIOD">Exam Period</option>
                  <option value="SEMESTER_START">Semester Start</option>
                  <option value="SEMESTER_END">Semester End</option>
                  <option value="REGISTRATION">Registration</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isInstructional"
                checked={isInstructional}
                onChange={(e) => setIsInstructional(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isInstructional" className="text-xs text-foreground font-medium">
                Instructional / Teaching Day
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="btn-saas-primary">
                {isSubmitting ? "Saving..." : "Save Milestone"}
              </Button>
            </div>
          </form>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "HOLIDAYS", "EXAMS", "SEMESTERS"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filterType === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Events Timeline List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl">
            No calendar milestones found for this selection.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{evt.title}</span>
                    {getEventBadge(evt.event_type)}
                  </div>
                  {evt.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{evt.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {evt.start_date === evt.end_date ? evt.start_date : `${evt.start_date} → ${evt.end_date}`}
                    </span>
                    <span>•</span>
                    <span>{evt.department_name}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {evt.is_instructional_day ? (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 sm:justify-end">
                      <CheckCircle2 className="h-3 w-3" /> Instructional
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 sm:justify-end">
                      Non-Instructional
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
