"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  Archive,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Eye,
  RotateCcw,
  Trash2,
  FileText,
  Video,
  Globe,
  X,
  Layers,
  Copy,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Course } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";

interface Content {
  id: string;
  title: string;
  status: string;
  content_type: string;
  text_content?: string;
  content_url?: string;
}

interface Topic {
  id: string;
  title: string;
  contents: Content[];
}

interface Module {
  id: string;
  title: string;
  description?: string;
  topics: Topic[];
}

interface Tree {
  modules: Module[];
}

interface ArchivedContentItem {
  id: string;
  title: string;
  description?: string;
  content_type: string;
  text_content?: string;
  content_url?: string;
  status: string;
  topic_id: string;
  topic_title: string;
  module_title: string;
  updated_at?: string;
}

export function LmsModuleBuilder() {
  const [courseId, setCourseId] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  const { data: courses, error: coursesError, loading: coursesLoading } = useApiResource<Course[]>(
    `/courses?page_size=100&search=${encodeURIComponent(courseSearch)}`
  );

  // Automatically select the first course when loaded to avoid blank screen
  useEffect(() => {
    if (!courseId && Array.isArray(courses) && courses.length > 0) {
      setCourseId(courses[0].id);
    }
  }, [courses, courseId]);

  const tree = useApiResource<Tree>(courseId ? `/courses/${courseId}/learn` : null);

  // Tab: "curriculum" vs "archived"
  const [activeTab, setActiveTab] = useState<"curriculum" | "archived">("curriculum");
  const [archivedList, setArchivedList] = useState<ArchivedContentItem[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Material Viewer Modal State
  const [viewerItem, setViewerItem] = useState<{
    id: string;
    title: string;
    content_type: string;
    text_content?: string;
    content_url?: string;
    status: string;
    topic_title?: string;
    module_title?: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const [form, setForm] = useState<{ kind: "module" | "topic" | "content"; parentId: string } | null>(null);
  const [contentType, setContentType] = useState("TEXT_CONTENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Excel Import & Template State
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelParsingError, setExcelParsingError] = useState<string | null>(null);
  const [parsedModules, setParsedModules] = useState<Array<{
    moduleTitle: string;
    moduleDescription: string;
    topics: Array<{
      topicTitle: string;
      contentType: string;
      bodyOrUrl: string;
    }>;
  }>>([]);
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  // Export/Download Excel Template with REAL course modules and structure
  const handleDownloadExcelTemplate = () => {
    const selectedCourse = courses?.find((c) => c.id === courseId);
    const courseCode = selectedCourse?.course_code || (selectedCourse as any)?.code || "CS-02";
    const courseName = selectedCourse?.name || "Course Curriculum";

    let exportRows: any[] = [];

    // 1. If existing modules are present in the course tree, export real modules and topics!
    if (tree.data?.modules && tree.data.modules.length > 0) {
      tree.data.modules.forEach((mod) => {
        if (!mod.topics || mod.topics.length === 0) {
          exportRows.push({
            "Module Title": mod.title,
            "Module Description": mod.description || `${courseName} syllabus module`,
            "Topic Title": "Topic 1: Introduction & Fundamentals",
            "Content Type (TEXT / VIDEO / LINK)": "TEXT",
            "Content Body or URL": `Academic study notes for ${mod.title}`,
          });
        } else {
          mod.topics.forEach((top) => {
            if (!top.contents || top.contents.length === 0) {
              exportRows.push({
                "Module Title": mod.title,
                "Module Description": mod.description || `${courseName} syllabus module`,
                "Topic Title": top.title,
                "Content Type (TEXT / VIDEO / LINK)": "TEXT",
                "Content Body or URL": `Key reading materials and concept overview for ${top.title}.`,
              });
            } else {
              top.contents.forEach((cnt) => {
                const typeStr = cnt.content_type === "VIDEO_STREAM" ? "VIDEO" : cnt.content_type === "RESOURCE_LINK" ? "LINK" : "TEXT";
                exportRows.push({
                  "Module Title": mod.title,
                  "Module Description": mod.description || `${courseName} syllabus module`,
                  "Topic Title": top.title,
                  "Content Type (TEXT / VIDEO / LINK)": typeStr,
                  "Content Body or URL": cnt.content_url || cnt.text_content || `Reading notes for ${cnt.title}`,
                });
              });
            }
          });
        }
      });
    }

    // 2. If no modules created yet, pre-fill with realistic curriculum tailored to this specific course!
    if (exportRows.length === 0) {
      exportRows = [
        {
          "Module Title": `Module 1: Foundations of ${courseName}`,
          "Module Description": `Fundamental architectural concepts, definitions, and principles of ${courseName}.`,
          "Topic Title": `Topic 1: Core Principles of ${courseCode}`,
          "Content Type (TEXT / VIDEO / LINK)": "TEXT",
          "Content Body or URL": `Comprehensive introductory briefing and theoretical foundations of ${courseName}.`,
        },
        {
          "Module Title": `Module 1: Foundations of ${courseName}`,
          "Module Description": `Fundamental architectural concepts, definitions, and principles of ${courseName}.`,
          "Topic Title": `Topic 2: Architectural Patterns & Paradigms`,
          "Content Type (TEXT / VIDEO / LINK)": "TEXT",
          "Content Body or URL": `Detailed analysis of core patterns, structures, and execution models.`,
        },
        {
          "Module Title": `Module 2: Advanced ${courseName} Mechanics`,
          "Module Description": `Design implementations, memory management, and practical algorithms.`,
          "Topic Title": `Topic 3: Execution Pipelines & Algorithms`,
          "Content Type (TEXT / VIDEO / LINK)": "TEXT",
          "Content Body or URL": `Implementation strategies, time/space complexity trade-offs, and optimization benchmarks.`,
        },
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [
      { wch: 38 },
      { wch: 45 },
      { wch: 38 },
      { wch: 25 },
      { wch: 60 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modules_Curriculum");
    XLSX.writeFile(workbook, `${courseCode}_Modules_Curriculum.xlsx`);
  };

  // Parse Uploaded Excel File
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setExcelParsingError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          setExcelParsingError("The selected spreadsheet contains no data rows.");
          setParsedModules([]);
          return;
        }

        // Group rows by Module Title
        const moduleMap = new Map<string, {
          moduleTitle: string;
          moduleDescription: string;
          topics: Array<{
            topicTitle: string;
            contentType: string;
            bodyOrUrl: string;
          }>;
        }>();

        rows.forEach((r, idx) => {
          const modTitle = (r["Module Title"] || r["module title"] || r["Module"] || `Module ${idx + 1}`).toString().trim();
          const modDesc = (r["Module Description"] || r["module description"] || r["Description"] || "").toString().trim();
          const topicTitle = (r["Topic Title"] || r["topic title"] || r["Topic"] || `Topic ${idx + 1}`).toString().trim();
          const rawType = (r["Content Type (TEXT / VIDEO / LINK)"] || r["Content Type"] || r["content_type"] || "TEXT").toString().toUpperCase().trim();
          let contentType = "TEXT_CONTENT";
          if (rawType.includes("VID")) contentType = "VIDEO_URL";
          else if (rawType.includes("LINK") || rawType.includes("WEB")) contentType = "EXTERNAL_LINK";

          const bodyOrUrl = (r["Content Body or URL"] || r["Content"] || r["Body"] || r["URL"] || "").toString().trim();

          if (!moduleMap.has(modTitle)) {
            moduleMap.set(modTitle, {
              moduleTitle: modTitle,
              moduleDescription: modDesc,
              topics: [],
            });
          }

          moduleMap.get(modTitle)!.topics.push({
            topicTitle,
            contentType,
            bodyOrUrl: bodyOrUrl || "Lecture notes and reading material.",
          });
        });

        const list = Array.from(moduleMap.values());
        setParsedModules(list);
      } catch (err: any) {
        setExcelParsingError(err?.message || "Failed to parse the Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Execute Bulk Import to Backend API
  const handleConfirmBulkImport = async () => {
    if (!courseId || parsedModules.length === 0) return;
    setIsImportingExcel(true);
    setError(null);
    setMessage(null);

    try {
      let createdModulesCount = 0;
      let createdTopicsCount = 0;
      const currentOrder = tree.data?.modules.length || 0;

      for (let mIdx = 0; mIdx < parsedModules.length; mIdx++) {
        const pMod = parsedModules[mIdx];
        const modRes = await apiClient.post<{ id: string }>(`/courses/${courseId}/modules`, {
          title: pMod.moduleTitle,
          description: pMod.moduleDescription,
          display_order: currentOrder + mIdx + 1,
        });

        if (modRes && modRes.id) {
          createdModulesCount++;
          for (let tIdx = 0; tIdx < pMod.topics.length; tIdx++) {
            const pTop = pMod.topics[tIdx];
            const topRes = await apiClient.post<{ id: string }>(`/modules/${modRes.id}/topics`, {
              title: pTop.topicTitle,
              description: `Unit: ${pTop.topicTitle}`,
              display_order: tIdx + 1,
            });

            if (topRes && topRes.id) {
              createdTopicsCount++;
              await apiClient.post(`/topics/${topRes.id}/content`, {
                title: pTop.topicTitle,
                content_type: pTop.contentType,
                text_content: pTop.contentType === "TEXT_CONTENT" ? pTop.bodyOrUrl : null,
                content_url: pTop.contentType !== "TEXT_CONTENT" ? pTop.bodyOrUrl : null,
                status: "PUBLISHED",
              });
            }
          }
        }
      }

      await tree.refresh();
      if (courseId) await fetchArchived(courseId);
      setIsExcelImportOpen(false);
      setExcelFile(null);
      setParsedModules([]);
      setMessage(`✓ Successfully imported ${createdModulesCount} modules and ${createdTopicsCount} topics from Excel!`);
      setTimeout(() => setMessage(null), 4500);
    } catch (err: any) {
      setError(err?.message || "Failed to import modules from Excel.");
    } finally {
      setIsImportingExcel(false);
    }
  };

  const selectedCourse = courses?.find((c) => c.id === courseId);

  // Fetch archived items
  const fetchArchived = useCallback(async (cId: string) => {
    if (!cId) return;
    setArchivedLoading(true);
    try {
      const data = await apiClient.get<ArchivedContentItem[]>(`/courses/${cId}/archived-content`);
      setArchivedList(Array.isArray(data) ? data : []);
    } catch {
      setArchivedList([]);
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (courseId) {
      void fetchArchived(courseId);
    }
  }, [courseId, fetchArchived]);

  const run = async (action: () => Promise<unknown>, successMsg = "✓ Changes saved successfully.") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setForm(null);
      await tree.refresh();
      if (courseId) await fetchArchived(courseId);
      setMessage(successMsg);
      setTimeout(() => setMessage(null), 3500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Changes could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async (contentId: string, title: string) => {
    await run(
      () => apiClient.post(`/content/${contentId}/archive`),
      `✓ "${title}" archived. Access it anytime under Archived Materials.`
    );
  };

  const handleRestore = async (contentId: string, title: string) => {
    await run(
      () => apiClient.post(`/content/${contentId}/restore`),
      `✓ "${title}" restored back to active curriculum.`
    );
  };

  const handleDeletePermanent = async (contentId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    await run(
      () => apiClient.delete(`/content/${contentId}`),
      `✓ "${title}" permanently removed.`
    );
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete module "${title}" and all its topics?`)) return;
    await run(
      () => apiClient.delete(`/modules/${moduleId}`),
      `✓ Module "${title}" deleted successfully.`
    );
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title")).trim();
    const description = String(fields.get("description") || "").trim();
    const current = form;
    let textContent: FormDataEntryValue | string | null = null;
    let storedContentType = contentType;
    if (contentType === "FLASHCARD_DECK") {
      const cards = String(fields.get("flashcards") || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [term = "", definition = "", example = ""] = line.split("|").map((part) => part.trim());
          return { term, definition, example };
        })
        .filter((card) => card.term && card.definition);
      if (cards.length === 0) {
        setError("Add at least one flashcard using: Term | Definition | Optional example");
        return;
      }
      storedContentType = "EMBEDDED_CONTENT";
      textContent = JSON.stringify({ kind: "FLASHCARD_DECK", cards });
    } else if (contentType === "TEXT_CONTENT") {
      textContent = fields.get("body");
    }

    void run(() =>
      current.kind === "module"
        ? apiClient.post(`/courses/${courseId}/modules`, {
            title,
            description,
            display_order: (tree.data?.modules.length || 0) + 1,
          })
        : current.kind === "topic"
        ? apiClient.post(`/modules/${current.parentId}/topics`, {
            title,
            description,
            display_order:
              (tree.data?.modules.find((module) => module.id === current.parentId)?.topics.length || 0) + 1,
          })
        : apiClient.post(`/topics/${current.parentId}/content`, {
            title,
            content_type: storedContentType,
            text_content: textContent,
            content_url: ["TEXT_CONTENT", "FLASHCARD_DECK"].includes(contentType) ? null : fields.get("url"),
            status: fields.get("published") ? "PUBLISHED" : "DRAFT",
          })
    );
  };

  return (
    <section className="min-w-0 space-y-5">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Department Curriculum &amp; Content Management
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Curriculum Modules &amp; Study Materials Authoring
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create structured units, lecture topics, reading notes, and manage archived curriculum.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedCourse && (
            <Link
              href={`/courses/${encodeURIComponent(selectedCourse.course_code)}/learn`}
              target="_blank"
              className="px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Preview Course Player</span>
            </Link>
          )}

          {/* Download Excel Template */}
          <button
            onClick={handleDownloadExcelTemplate}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            title="Download an Excel template to prepare modules offline"
          >
            <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            <span>Excel Template</span>
          </button>

          {/* Import Modules from Excel */}
          {courseId && (
            <button
              onClick={() => {
                setIsExcelImportOpen(true);
                setExcelParsingError(null);
                setParsedModules([]);
                setExcelFile(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Bulk import modules and lecture topics from an Excel (.xlsx) file"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}

          {courseId && (
            <button
              disabled={busy}
              onClick={() => setForm({ kind: "module", parentId: courseId })}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Module</span>
            </button>
          )}
        </div>
      </div>

      {/* Course Search & Switcher */}
      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <input
          aria-label="Search courses"
          placeholder="Search course code or title..."
          value={courseSearch}
          onChange={(event) => setCourseSearch(event.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
        />
        <select
          aria-label="Select course"
          value={courseId}
          onChange={(event) => {
            const nextId = event.target.value;
            setCourseId(nextId);
            setForm(null);
            setMessage(null);
            void fetchArchived(nextId);
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 font-bold text-xs text-slate-800 dark:text-slate-100"
        >
          {coursesLoading && <option value="">Loading courses...</option>}
          {!coursesLoading && (!courses || courses.length === 0) && (
            <option value="">No courses available</option>
          )}
          {courses?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.course_code}: {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Section Switcher Tabs: Active Curriculum vs Archived Materials */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("curriculum")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "curriculum"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Active Curriculum</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "curriculum"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {tree.data?.modules?.length || 0} Modules
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("archived");
            if (courseId) void fetchArchived(courseId);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "archived"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Archive className="h-4 w-4" />
          <span>Archived Materials</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "archived"
                ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
            }`}
          >
            {archivedList.length}
          </span>
        </button>
      </div>

      {(error || tree.error || coursesError) && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200 font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error || tree.error || coursesError}</span>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-200 font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Creation Form */}
      {form && (
        <form
          onSubmit={save}
          className="space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Add {form.kind === "content" ? "Lesson Material" : form.kind === "module" ? "Curriculum Module" : "Topic Unit"}
            </h3>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Title
            <input
              name="title"
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Introduction to Database Warehousing"
              className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </label>

          {form.kind !== "content" ? (
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description
              <textarea
                name="description"
                rows={2}
                placeholder="Curriculum module description and learning objectives..."
                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </label>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Lesson Type
                <select
                  value={contentType}
                  onChange={(event) => setContentType(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="TEXT_CONTENT">Reading Deck / Lecture Notes</option>
                  <option value="FLASHCARD_DECK">Flashcard Deck</option>
                  <option value="VIDEO">Video Lecture URL (YouTube / Stream)</option>
                  <option value="EXTERNAL_LINK">External Resource Link</option>
                </select>
              </label>

              {contentType === "TEXT_CONTENT" ? (
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reading Material / Notes
                  <textarea
                    name="body"
                    required
                    rows={6}
                    placeholder="Provide lecture notes, formulas, markdown definitions, and code snippets..."
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white font-mono leading-relaxed"
                  />
                </label>
              ) : contentType === "FLASHCARD_DECK" ? (
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Flashcards
                  <textarea
                    name="flashcards"
                    required
                    rows={7}
                    placeholder={"Term | Definition | Optional example\nAtomicity | All operations succeed or all are rolled back | A database transaction"}
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white font-mono leading-relaxed"
                  />
                  <span className="mt-1 block font-normal text-slate-500">Enter one card per line. Term and definition are required.</span>
                </label>
              ) : (
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Resource URL
                  <input
                    name="url"
                    type="url"
                    required
                    pattern="https?://.*"
                    placeholder="https://..."
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </label>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                <input name="published" type="checkbox" defaultChecked className="rounded accent-blue-600" />
                <span>Publish immediately for student study access</span>
              </label>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              {busy ? "Saving..." : "Save Material"}
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() => setForm(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: ACTIVE CURRICULUM TREE */}
      {activeTab === "curriculum" && (
        <>
          {tree.loading && (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading course syllabus modules...
            </div>
          )}

          <div className="space-y-4">
            {tree.data?.modules.map((module) => (
              <div
                key={module.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{module.title}</span>
                    </h3>
                    {module.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busy}
                      onClick={() => setForm({ kind: "topic", parentId: module.id })}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 text-blue-600" />
                      <span>Add Topic</span>
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void handleDeleteModule(module.id, module.title)}
                      className="p-1.5 px-2 rounded-xl border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Delete "${module.title}"`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete Module</span>
                    </button>
                  </div>
                </div>

                {module.topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="space-y-2 border-l-2 border-blue-500 pl-4 py-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{topic.title}</h4>
                      <button
                        disabled={busy}
                        onClick={() => setForm({ kind: "content", parentId: topic.id })}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="h-3 w-3 text-blue-600" />
                        <span>Add Lesson</span>
                      </button>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {topic.contents.map((content) => (
                        <li
                          key={content.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors group"
                        >
                          <div
                            onClick={() =>
                              setViewerItem({
                                ...content,
                                topic_title: topic.title,
                                module_title: module.title,
                              })
                            }
                            className="min-w-0 flex items-center gap-2.5 cursor-pointer flex-1"
                          >
                            {content.content_type === "VIDEO" ? (
                              <Video className="h-4 w-4 text-rose-500 shrink-0" />
                            ) : content.content_type === "EXTERNAL_LINK" ? (
                              <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {content.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                                content.status === "PUBLISHED"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60"
                              }`}
                            >
                              {content.status === "PUBLISHED" ? "Published" : "Draft"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* View Content Button */}
                            <button
                              disabled={busy}
                              title="View Study Material"
                              onClick={() =>
                                setViewerItem({
                                  ...content,
                                  topic_title: topic.title,
                                  module_title: module.title,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>View</span>
                            </button>

                            {content.status === "DRAFT" && (
                              <button
                                disabled={busy}
                                title="Publish Material"
                                onClick={() => void run(() => apiClient.post(`/content/${content.id}/publish`), "✓ Lesson published.")}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                              >
                                Publish
                              </button>
                            )}

                            {/* Archive Button */}
                            <button
                              disabled={busy}
                              title="Archive Material (moves to Archived Materials section)"
                              onClick={() => void handleArchive(content.id, content.title)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {topic.contents.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No lessons added to this topic yet.</p>
                    )}
                  </div>
                ))}

                {module.topics.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No topics in this module yet.</p>
                )}
              </div>
            ))}
          </div>

          {courseId && !tree.loading && tree.data?.modules.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No syllabus modules added yet for this course.</p>
              <p className="text-[11px] text-slate-400">Use Add Module to create the first curriculum unit.</p>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: ARCHIVED MATERIALS SECTION */}
      {activeTab === "archived" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Archive className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Archived materials are preserved here safely. You can inspect any lesson, restore it to active curriculum, or permanently delete it.
              </span>
            </div>
            <button
              onClick={() => courseId && void fetchArchived(courseId)}
              className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 font-bold text-[10px] text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
            >
              Refresh Archive
            </button>
          </div>

          {archivedLoading && (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading archived study materials...
            </div>
          )}

          {!archivedLoading && archivedList.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <Archive className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No archived materials found.
              </p>
              <p className="text-[11px] text-slate-400">
                When you archive a lesson from the curriculum, it will appear here safely for future reference or restoration.
              </p>
            </div>
          )}

          {!archivedLoading && archivedList.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
              {archivedList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        ARCHIVED
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {item.module_title} &bull; {item.topic_title}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    {item.updated_at && (
                      <p className="text-[10px] text-slate-400">
                        Archived on {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* View Archived Material */}
                    <button
                      disabled={busy}
                      title="View Archived Content"
                      onClick={() => setViewerItem(item)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span>View</span>
                    </button>

                    {/* Restore to Active Curriculum */}
                    <button
                      disabled={busy}
                      title="Restore Material to Active Curriculum"
                      onClick={() => void handleRestore(item.id, item.title)}
                      className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-xs font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </button>

                    {/* Permanent Delete */}
                    <button
                      disabled={busy}
                      title="Delete Permanently"
                      onClick={() => void handleDeletePermanent(item.id, item.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── STUDY MATERIAL VIEWER MODAL ─── */}
      {viewerItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {viewerItem.content_type === "VIDEO"
                      ? "VIDEO LECTURE"
                      : viewerItem.content_type === "EXTERNAL_LINK"
                      ? "EXTERNAL RESOURCE"
                      : "READING DECK"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      viewerItem.status === "ARCHIVED"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : viewerItem.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {viewerItem.status}
                  </span>
                  {viewerItem.module_title && (
                    <span className="text-[11px] text-slate-400 truncate">
                      {viewerItem.module_title} &bull; {viewerItem.topic_title}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {viewerItem.title}
                </h3>
              </div>

              <button
                onClick={() => setViewerItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {viewerItem.content_type === "TEXT_CONTENT" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Reading Notes &amp; Concept Explanations</span>
                    <button
                      onClick={() => {
                        if (viewerItem.text_content) {
                          void navigator.clipboard.writeText(viewerItem.text_content);
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2500);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                    {viewerItem.text_content || "No text notes provided for this lesson."}
                  </div>
                </div>
              ) : viewerItem.content_type === "VIDEO" ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Video Lecture Stream URL:</p>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-mono break-all text-blue-600 dark:text-blue-400">
                      {viewerItem.content_url || "No URL specified."}
                    </p>
                    {viewerItem.content_url && (
                      <a
                        href={viewerItem.content_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Video Player in New Tab</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">External Resource Link:</p>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-mono break-all text-blue-600 dark:text-blue-400">
                      {viewerItem.content_url || "No link provided."}
                    </p>
                    {viewerItem.content_url && (
                      <a
                        href={viewerItem.content_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Visit External Resource</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              {viewerItem.status === "ARCHIVED" ? (
                <button
                  onClick={() => {
                    void handleRestore(viewerItem.id, viewerItem.title);
                    setViewerItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restore to Active Curriculum</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    void handleArchive(viewerItem.id, viewerItem.title);
                    setViewerItem(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 cursor-pointer transition-colors"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive Material</span>
                </button>
              )}

              <button
                onClick={() => setViewerItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isExcelImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Bulk Import Modules from Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload an Excel (.xlsx or .csv) spreadsheet to automatically create curriculum modules &amp; topics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExcelImportOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Template Download Prompt */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Need the standard spreadsheet layout?</span>
                  <span className="text-slate-500">Download our formatted template with columns for Module Title, Description, Topics, and Content Types.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 shrink-0 shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Get Template</span>
                </button>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-3xl p-6 text-center space-y-3 transition-colors bg-white/50 dark:bg-slate-900/50">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {excelFile ? excelFile.name : "Choose an Excel (.xlsx / .csv) file to import"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {excelFile ? `${(excelFile.size / 1024).toFixed(1)} KB` : "Supports drag & drop or file selection"}
                  </p>
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors">
                    <span>Select File</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Parsing Errors */}
              {excelParsingError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{excelParsingError}</span>
                </div>
              )}

              {/* Parsed Modules Preview */}
              {parsedModules.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Parsed Curriculum Preview ({parsedModules.length} Modules detected)
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ✓ Ready to Import
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {parsedModules.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{m.moduleTitle}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{m.topics.length} Lecture Topics</span>
                        </div>
                        {m.moduleDescription && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{m.moduleDescription}</p>
                        )}
                        <div className="pt-1.5 flex flex-wrap gap-1">
                          {m.topics.map((t, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] font-medium bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              • {t.topicTitle} ({t.contentType.replace("_CONTENT", "").replace("_URL", "")})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setIsExcelImportOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedModules.length === 0 || isImportingExcel}
                onClick={handleConfirmBulkImport}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isImportingExcel ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing to Course...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Import Modules ({parsedModules.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
