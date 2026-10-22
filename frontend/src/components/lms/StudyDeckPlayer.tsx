"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
  ListTree,
  Bot,
  ChevronDown,
  Loader2,
  Check,
  X,
  Maximize2,
  Minimize2,
  ArrowRight,
  Play,
  Square,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleLearningNode, TopicLearningNode } from "@/types";
import { requestGeminiFlashcardGeneration } from "@/lib/gemini-ai";

export interface StudyCard {
  card_index: number;
  total_cards: number;
  title: string;
  question_title?: string;
  lead_summary?: string;
  definition: string;
  construction: string;
  olap_or_key_concepts: string;
  example: string;
  card_category?: string;
  diagram_type?: "DFA_STATE" | "TUPLE_ARCH" | "TRANSITION_TABLE" | "NFA_BRANCH" | "SUBSET_CONSTRUCT" | "PIPELINE_EXEC";
  highlight_terms?: string[];
}

interface StudyDeckPlayerProps {
  courseCode: string;
  courseTitle: string;
  modules: ModuleLearningNode[];
  initialTopicId?: string | null;
  onOpenAiTutor?: (topic: string, prompt?: string) => void;
  onMarkTopicMastered?: (topicId: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { label: "English", code: "en-IN" },
  { label: "Hindi", code: "hi-IN" },
  { label: "Kannada", code: "kn-IN" },
  { label: "Telugu", code: "te-IN" },
  { label: "Tamil", code: "ta-IN" },
];

/**
 * Helper to highlight key technical terms in UniFlow Blue (#2563eb)
 * matching the Edwisely study card typography style.
 */
function renderHighlightedText(text: string, terms: string[] = []) {
  if (!text) return null;
  const defaultTerms = [
    "finite automaton (FA)",
    "finite automaton",
    "Deterministic Finite Automaton (DFA)",
    "Nondeterministic Finite Automaton (NFA)",
    "states",
    "accepts",
    "rejects",
    "transition function",
    "initial state",
    "accepting states",
    "alphabet",
    "epsilon transitions",
    "subset construction",
    "invariants",
    "asymptotic complexity",
    "deterministic",
    "state transitions",
    "time complexity",
    "space complexity",
    "boundary conditions",
    "formal verification",
    "Object-Oriented Programming (OOP)",
    "Object-Oriented Programming",
    "Encapsulation",
    "Inheritance",
    "Polymorphism",
    "Abstraction",
    "Interfaces",
    "Abstract Class",
    "dynamic method dispatch",
    "bytecode",
    "JVM",
    "Garbage Collection",
    "Heap memory",
    "Thread Stack",
    "Exception",
    "try-catch-finally",
    "Collections Framework",
    "ArrayList",
    "HashMap",
    "Generics",
    "SOLID principles",
    "Singleton",
    "Factory Pattern",
    ...terms,
  ].filter(Boolean);

  // Sort longest first so multi-word phrases match before single words
  const sorted = Array.from(new Set(defaultTerms)).sort((a, b) => b.length - a.length);
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return text;

  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const isMatch = sorted.some((t) => t.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <span key={idx} className="text-blue-600 dark:text-blue-400 font-semibold">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

import { ConceptVisualDiagram } from "@/components/lms/ConceptVisualDiagram";

export function StudyDeckPlayer({
  courseCode,
  courseTitle,
  modules,
  initialTopicId,
  onOpenAiTutor,
  onMarkTopicMastered,
}: StudyDeckPlayerProps) {
  // Flattened Topics across all modules
  const allTopics = useMemo(() => {
    return modules.flatMap((m, mIdx) =>
      m.topics.map((t, tIdx) => ({
        ...t,
        moduleIndex: mIdx,
        moduleTitle: m.title,
        topicOrder: tIdx + 1,
      }))
    );
  }, [modules]);

  // Selected Unit/Module Index
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const activeModule = modules[selectedModuleIdx] || modules[0] || null;

  // Topics in current module
  const moduleTopics = useMemo(() => {
    return activeModule ? activeModule.topics : [];
  }, [activeModule]);

  // Selected Topic in Module (Deck X of Y)
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const currentTopic = moduleTopics[activeTopicIndex] || moduleTopics[0] || null;

  // Sync with initialTopicId if provided
  useEffect(() => {
    if (!initialTopicId || allTopics.length === 0) return;
    const match = allTopics.find((t) => t.id === initialTopicId);
    if (match) {
      setSelectedModuleIdx(match.moduleIndex);
      const modTopics = modules[match.moduleIndex]?.topics || [];
      const tIdx = modTopics.findIndex((t) => t.id === initialTopicId);
      if (tIdx >= 0) setActiveTopicIndex(tIdx);
    }
  }, [initialTopicId, allTopics, modules]);

  // View Mode: "DECK" (Edwisely Flashcard Player in UniFlow Blue) or "SYLLABUS_TREE"
  const [viewMode, setViewMode] = useState<"DECK" | "SYLLABUS_TREE">("DECK");
  const [isFullscreenOverlay, setIsFullscreenOverlay] = useState(false);

  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    modules.forEach((m, idx) => {
      init[m.id] = idx === 0;
    });
    return init;
  });

  // Card Navigation State (1 / 6)
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [masteredTopics, setMasteredTopics] = useState<Set<string>>(new Set());

  // Audio Speech Synthesis & Language State
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [activeDeck, setActiveDeck] = useState<StudyCard[]>([]);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [deckGenerationError, setDeckGenerationError] = useState<string | null>(null);

  const currentCard = activeDeck[currentCardIndex] || activeDeck[0] || null;

  // Speech Synthesizer Handler
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentCard) return;

    window.speechSynthesis.cancel();
    const qTitle = currentCard.question_title || currentCard.title;
    const lead = currentCard.lead_summary || "";
    const textToSpeak = `${qTitle}. ${lead} ${currentCard.definition} ${currentCard.olap_or_key_concepts}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = selectedLanguage.code;
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Next Card / Next Deck Handler
  const handleNext = useCallback(() => {
    handleStopSpeech();
    if (currentCardIndex < activeDeck.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else if (activeTopicIndex < moduleTopics.length - 1) {
      setActiveTopicIndex((prev) => prev + 1);
      setCurrentCardIndex(0);
    } else if (selectedModuleIdx < modules.length - 1) {
      setSelectedModuleIdx((prev) => prev + 1);
      setActiveTopicIndex(0);
      setCurrentCardIndex(0);
    }
  }, [activeDeck.length, activeTopicIndex, currentCardIndex, moduleTopics.length, modules.length, selectedModuleIdx]);

  // Prev Card / Prev Deck Handler
  const handlePrev = useCallback(() => {
    handleStopSpeech();
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    } else if (activeTopicIndex > 0) {
      setActiveTopicIndex((prev) => prev - 1);
      setCurrentCardIndex(0);
    } else if (selectedModuleIdx > 0) {
      const prevModIdx = selectedModuleIdx - 1;
      const prevModTopics = modules[prevModIdx]?.topics || [];
      setSelectedModuleIdx(prevModIdx);
      setActiveTopicIndex(Math.max(0, prevModTopics.length - 1));
      setCurrentCardIndex(0);
    }
  }, [activeTopicIndex, currentCardIndex, modules, selectedModuleIdx]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (viewMode !== "DECK") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape" && isFullscreenOverlay) {
        setIsFullscreenOverlay(false);
        handleStopSpeech();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isFullscreenOverlay, handleNext, handlePrev]);

  // AI Re-Generate Deck with Gemini 2.5 Flash
  const handleRegenerateDeckWithAi = useCallback(async () => {
    if (!currentTopic) return;
    setIsGeneratingDeck(true);
    setDeckGenerationError(null);
    handleStopSpeech();
    try {
      const syllabusDetails = [
        currentTopic.description ? `Syllabus Overview: ${currentTopic.description}` : "",
        ...(currentTopic.contents || []).map((cnt: any) => cnt.text_content || cnt.body_text || cnt.title || ""),
      ].filter(Boolean).join("\n\n");

      const promptText = `Create a rigorous 6-card study flashcard deck specifically for "${currentTopic.title}" in course ${courseCode} (${courseTitle}). Tailor every definition, execution mechanic, and example specifically to this academic subject without mixing up other subjects.${syllabusDetails ? `\n\nUploaded Syllabus / Lecture Content to base cards on:\n${syllabusDetails.substring(0, 3000)}` : ""}`;

      const result = await requestGeminiFlashcardGeneration({
        courseCode,
        topic: `${courseTitle}: ${currentTopic.title}`,
        prompt: promptText,
      });

      if (result && result.data && Array.isArray(result.data.cards) && result.data.cards.length > 0) {
        const enriched: StudyCard[] = result.data.cards.map((c: any, i: number) => ({
          ...c,
          card_index: i + 1,
          total_cards: result.data.cards.length,
          question_title: c.question_title || (c.title?.endsWith("?") ? c.title : `What is ${c.title || currentTopic.title}?`),
          lead_summary: c.lead_summary || c.construction || c.definition?.substring(0, 90),
        }));
        setActiveDeck(enriched);
        setCurrentCardIndex(0);
      } else {
        throw new Error("The study service returned no flashcards.");
      }
    } catch (err) {
      console.error("Flashcard generation failed:", err);
      setActiveDeck([]);
      setCurrentCardIndex(0);
      setDeckGenerationError(err instanceof Error ? err.message : "Flashcards could not be generated. Please try again.");
    } finally {
      setIsGeneratingDeck(false);
      setIsSettingsPopoverOpen(false);
    }
  }, [courseCode, courseTitle, currentTopic]);

  // Load the faculty-published flashcard deck from course learning content.
  useEffect(() => {
    if (!currentTopic) {
      setActiveDeck([]);
      setDeckGenerationError(null);
      return;
    }

    const publishedDeck = (currentTopic.contents || []).find((content: any) => {
      if (content.content_type !== "EMBEDDED_CONTENT" || !content.text_content) return false;
      try {
        const payload = JSON.parse(content.text_content);
        return payload.kind === "FLASHCARD_DECK" && Array.isArray(payload.cards);
      } catch {
        return false;
      }
    });

    if (!publishedDeck) {
      setActiveDeck([]);
      setCurrentCardIndex(0);
      setIsGeneratingDeck(false);
      setDeckGenerationError("No flashcard deck has been published for this topic.");
      return;
    }

    try {
      if (typeof publishedDeck.text_content !== "string") {
        throw new Error("Flashcard content is missing.");
      }
      const payload = JSON.parse(publishedDeck.text_content);
      const cards: StudyCard[] = payload.cards
        .filter((card: any) => typeof card?.term === "string" && typeof card?.definition === "string")
        .map((card: any, index: number) => ({
          card_index: index + 1,
          total_cards: payload.cards.length,
          title: card.term,
          question_title: card.term,
          lead_summary: card.definition,
          definition: card.definition,
          example: typeof card.example === "string" ? card.example : "",
        }));
      setActiveDeck(cards);
      setCurrentCardIndex(0);
      setIsGeneratingDeck(false);
      setDeckGenerationError(cards.length > 0 ? null : "The published flashcard deck contains no valid cards.");
    } catch {
      setActiveDeck([]);
      setCurrentCardIndex(0);
      setIsGeneratingDeck(false);
      setDeckGenerationError("The published flashcard deck could not be read.");
    }
  }, [currentTopic?.id, courseCode, courseTitle]);

  const isCurrentTopicMastered = currentTopic
    ? masteredTopics.has(currentTopic.id) || currentTopic.is_topic_completed
    : false;

  const handleToggleMastered = () => {
    if (!currentTopic) return;
    const next = new Set(masteredTopics);
    if (next.has(currentTopic.id)) {
      next.delete(currentTopic.id);
    } else {
      next.add(currentTopic.id);
    }
    setMasteredTopics(next);
    if (onMarkTopicMastered) {
      onMarkTopicMastered(currentTopic.id);
    }
  };

  const totalTopicsCount = allTopics.length;

  return (
    <div className="space-y-4">
      {/* ─── Mode & Unit Bar (Visible when not in fullscreen overlay) ─── */}
      {!isFullscreenOverlay && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("DECK")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === "DECK"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Interactive Study Flashcards</span>
            </button>

            <button
              onClick={() => setViewMode("SYLLABUS_TREE")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === "SYLLABUS_TREE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <ListTree className="h-4 w-4" />
              <span>Syllabus ({modules.length} units · {totalTopicsCount} topics)</span>
            </button>
          </div>

          {/* Unit Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Units:
            </span>
            {modules.map((m, idx) => (
              <button
                key={m.id || idx}
                onClick={() => {
                  setSelectedModuleIdx(idx);
                  setActiveTopicIndex(0);
                  setCurrentCardIndex(0);
                  setViewMode("DECK");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedModuleIdx === idx
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {m.title.split(":")[0] || `Unit ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: EDWISELY-STYLE STUDY FLASHCARD PLAYER (UNIFLOW BLUE THEME)    */}
      {/* ===================================================================== */}
      {viewMode === "DECK" && !currentCard && (
        <div className="min-h-[420px] rounded-2xl border border-slate-200 bg-white px-6 py-12 shadow-sm flex items-center justify-center">
          {isGeneratingDeck ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Preparing your study cards</h2>
              <p className="mt-1 text-sm text-slate-600">Generating cards from the selected course topic.</p>
            </div>
          ) : (
            <div className="max-w-md text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Study cards unavailable</h2>
              <p className="mt-1 text-sm text-slate-600">
                {deckGenerationError || "Select a syllabus topic to generate study cards."}
              </p>
              {currentTopic && (
                <Button className="mt-5" onClick={() => void handleRegenerateDeckWithAi()}>
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {viewMode === "DECK" && currentCard && (
        <div
          className={
            isFullscreenOverlay
              ? "fixed inset-0 z-50 bg-gradient-to-br from-slate-900/90 via-blue-950/85 to-slate-900/90 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200"
              : "relative rounded-3xl bg-gradient-to-br from-slate-800/95 via-blue-950/90 to-slate-900/95 p-4 sm:p-7 shadow-xl border border-blue-900/40 flex flex-col justify-between min-h-[680px]"
          }
        >
          {/* ─── 1. TOP HEADER BAR (Close, DECK X OF Y, Title | Counter, Language, Listen, Stop, Settings) ─── */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Top-Left: Close Button + DECK X OF Y + Topic Title */}
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => {
                    handleStopSpeech();
                    if (isFullscreenOverlay) {
                      setIsFullscreenOverlay(false);
                    } else {
                      setViewMode("SYLLABUS_TREE");
                    }
                  }}
                  title={isFullscreenOverlay ? "Exit Fullscreen (Esc)" : "View All Syllabus Units"}
                  className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-white/15"
                >
                  <X className="h-4 w-4" />
                </button>

                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-blue-200/90 block">
                    DECK {activeTopicIndex + 1} OF {Math.max(1, moduleTopics.length)}
                  </span>
                  <h2 className="text-base sm:text-xl font-bold text-white tracking-tight leading-snug">
                    {currentTopic?.title || "Finite state automata"}
                  </h2>
                </div>
              </div>

              {/* Top-Right: 1 / 6 Counter, Language Dropdown, Listen, Stop, Settings, Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                {/* Card Counter: 1 / 6 */}
                <span className="text-xs sm:text-sm font-bold text-white/95 font-mono px-2">
                  {currentCardIndex + 1} / {activeDeck.length}
                </span>

                {/* AI Study Deck Button */}
                <button
                  onClick={handleRegenerateDeckWithAi}
                  disabled={isGeneratingDeck}
                  className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-60"
                  title="Generate fresh AI flashcards tailored to this topic using AI Engine"
                >
                  {isGeneratingDeck ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  )}
                  <span className="hidden sm:inline">{isGeneratingDeck ? "Generating..." : "Smart AI Deck"}</span>
                </button>

                {/* Language Selector Dropdown */}
                <div className="relative">
                  <select
                    aria-label="Select Study Narration Language"
                    value={selectedLanguage.label}
                    onChange={(e) => {
                      const found = SUPPORTED_LANGUAGES.find((l) => l.label === e.target.value);
                      if (found) {
                        setSelectedLanguage(found);
                        handleStopSpeech();
                      }
                    }}
                    className="appearance-none bg-white text-slate-800 font-semibold text-xs sm:text-sm rounded-xl pl-3.5 pr-8 py-2 shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.label}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Listen Button */}
                <button
                  onClick={handleToggleSpeech}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                    isSpeaking
                      ? "bg-blue-600 text-white ring-2 ring-blue-300"
                      : "bg-white hover:bg-blue-50 text-slate-900"
                  }`}
                >
                  <Play className={`h-3.5 w-3.5 ${isSpeaking ? "fill-white text-white" : "text-slate-800"}`} />
                  <span>{isSpeaking ? "Playing..." : "Listen"}</span>
                </button>

                {/* Stop (Square) Button */}
                <button
                  onClick={handleStopSpeech}
                  title="Stop Audio Narration"
                  className="h-9 w-9 rounded-xl bg-white hover:bg-rose-50 text-slate-900 hover:text-rose-600 shadow-sm flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>

                {/* Settings / Playback Speed Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsSettingsPopoverOpen((prev) => !prev)}
                    title="Flashcard & Audio Settings"
                    className="h-9 w-9 rounded-xl bg-white hover:bg-blue-50 text-slate-900 shadow-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>

                  {isSettingsPopoverOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 z-40 space-y-3 text-slate-800 dark:text-slate-100">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold">Study Deck Settings</span>
                        <button
                          onClick={() => setIsSettingsPopoverOpen(false)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Narration Speed
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => setSpeechRate(rate)}
                              className={`py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                speechRate === rate
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                        <button
                          onClick={handleRegenerateDeckWithAi}
                          disabled={isGeneratingDeck}
                          className="w-full py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isGeneratingDeck ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          <span>Regenerate Cards with AI</span>
                        </button>

                        <button
                          onClick={() => {
                            handleToggleMastered();
                            setIsSettingsPopoverOpen(false);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{isCurrentTopicMastered ? "Topic Mastered ✓" : "Mark Topic Mastered"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle Button */}
                <button
                  onClick={() => setIsFullscreenOverlay((prev) => !prev)}
                  title={isFullscreenOverlay ? "Exit Fullscreen" : "Expand Fullscreen"}
                  className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 text-white shadow-sm flex items-center justify-center transition-colors cursor-pointer border border-white/15"
                >
                  {isFullscreenOverlay ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ─── 2. HORIZONTAL NUMBERED DECK PILLS ─── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
              {moduleTopics.map((topic, tIdx) => {
                const isSelected = activeTopicIndex === tIdx;
                const isMastered = masteredTopics.has(topic.id) || topic.is_topic_completed;
                return (
                  <button
                    key={topic.id || tIdx}
                    onClick={() => {
                      setActiveTopicIndex(tIdx);
                      setCurrentCardIndex(0);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50"
                        : "bg-white/95 text-slate-800 hover:bg-blue-50 shadow-xs"
                    }`}
                  >
                    <span>
                      {tIdx + 1}. {topic.title}
                    </span>
                    {isMastered && (
                      <Check
                        className={`h-3.5 w-3.5 ${
                          isSelected ? "text-blue-100" : "text-emerald-600"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─── 3. MULTI-SEGMENT HORIZONTAL PROGRESS BAR ─── */}
            <div className="grid grid-cols-6 gap-2 pt-0.5">
              {activeDeck.map((card, idx) => {
                const isCompletedOrActive = idx <= currentCardIndex;
                return (
                  <button
                    key={card.card_index || idx}
                    onClick={() => {
                      handleStopSpeech();
                      setCurrentCardIndex(idx);
                    }}
                    aria-label={`Jump to card ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isCompletedOrActive
                        ? "bg-blue-500 shadow-2xs"
                        : "bg-white/25 hover:bg-white/40"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* ─── 4. MAIN FLASHCARD CONTAINER (MATCHING SCREENSHOT IN UNIFLOW BLUE) ─── */}
          <div className="my-5 max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 flex flex-col">
              {/* Card Top Banner (UniFlow Corporate Blue Gradient) */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 sm:px-10 py-6 sm:py-7 flex items-center justify-between gap-4">
                <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  {currentCard.question_title ||
                    (currentCard.title.endsWith("?")
                      ? currentCard.title
                      : `What is ${currentCard.title}?`)}
                </h3>

                {onOpenAiTutor && currentTopic && (
                  <button
                    onClick={() =>
                      onOpenAiTutor(
                        currentTopic.title,
                        `Explain "${currentCard.question_title || currentCard.title}" with an example and exam tips.`
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 border border-white/20 transition-colors cursor-pointer"
                    title="Ask AI Tutor about this card"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ask AI</span>
                  </button>
                )}
              </div>

              {/* Card Body Content + Interactive SVG Diagram */}
              <div className="px-6 sm:px-10 py-6 sm:py-8 space-y-5 overflow-y-auto max-h-[54vh]">
                {/* Lead Concise Summary Line */}
                <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                  {currentCard.lead_summary || currentCard.construction}
                </p>

                {/* Detailed Paragraph with Blue Highlighted Technical Keywords */}
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  {renderHighlightedText(
                    currentCard.definition,
                    currentCard.highlight_terms
                  )}
                </p>

                {/* Visual Textbook SVG Diagram */}
                <div className="pt-2 pb-1">
                  <ConceptVisualDiagram
                    cardIndex={currentCardIndex}
                    topicTitle={currentTopic?.title || ""}
                    courseTitle={courseTitle}
                    courseCode={courseCode}
                  />
                </div>

                {/* Key Invariant / Exam Note Strip */}
                {currentCard.olap_or_key_concepts && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                    <div>
                      <span className="font-bold text-blue-700 uppercase tracking-wider mr-2">
                        Key Takeaway:
                      </span>
                      <span>
                        {renderHighlightedText(currentCard.olap_or_key_concepts)}
                      </span>
                    </div>
                    {currentCard.example && (
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {currentCard.card_category || `Card ${currentCardIndex + 1} of ${activeDeck.length}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── 5. BOTTOM FLOATING NAVIGATION PILLS (< Prev deck | Next →) ─── */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={handlePrev}
              disabled={
                currentCardIndex === 0 &&
                activeTopicIndex === 0 &&
                selectedModuleIdx === 0
              }
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-md border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{currentCardIndex === 0 ? "Prev deck" : "Prev"}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={
                currentCardIndex >= activeDeck.length - 1 &&
                activeTopicIndex >= moduleTopics.length - 1 &&
                selectedModuleIdx >= modules.length - 1
              }
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <span>
                {currentCardIndex >= activeDeck.length - 1 ? "Next deck" : "Next"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: FULL SYLLABUS TREE                                            */}
      {/* ===================================================================== */}
      {viewMode === "SYLLABUS_TREE" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Syllabus</span>
                  <span className="text-slate-400 font-normal">•</span>
                  <span className="text-sm text-slate-500 font-medium">
                    {modules.length} units · {totalTopicsCount} topics
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select any topic below to launch its interactive study flashcard deck.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {courseCode}
              </span>
            </div>

            {/* Expandable Module Units */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-3">
              {modules.map((m, mIdx) => {
                const isExpanded = expandedUnitIds[m.id];
                const unitTopicsCount = m.topics.length;
                const masteredCount = m.topics.filter(
                  (t) => masteredTopics.has(t.id) || t.is_topic_completed
                ).length;
                const unitPct =
                  unitTopicsCount > 0
                    ? Math.round((masteredCount / unitTopicsCount) * 100)
                    : 0;

                return (
                  <div key={m.id || mIdx} className="py-3 space-y-2">
                    {/* Unit Accordion Header */}
                    <button
                      onClick={() =>
                        setExpandedUnitIds((prev) => ({
                          ...prev,
                          [m.id]: !prev[m.id],
                        }))
                      }
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                          U{mIdx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {m.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {unitTopicsCount} topics • {masteredCount} mastered ({unitPct}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${unitPct}%` }}
                          />
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Unit Topics Breakdown */}
                    {isExpanded && (
                      <div className="pl-6 sm:pl-12 pr-2 py-2 space-y-2">
                        {m.topics.map((t, tIdx) => {
                          const isTopicDone =
                            masteredTopics.has(t.id) || t.is_topic_completed;
                          return (
                            <div
                              key={t.id || tIdx}
                              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-mono font-bold text-slate-400 w-6">
                                  {tIdx + 1}.
                                </span>
                                <div className="truncate">
                                  <strong className="text-xs text-slate-800 dark:text-slate-200 block truncate">
                                    {t.title}
                                  </strong>
                                  <span className="text-[10px] text-slate-400">
                                    6 visual concept cards • Interactive Flashcard Deck
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isTopicDone && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    <span>Mastered</span>
                                  </span>
                                )}

                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedModuleIdx(mIdx);
                                    setActiveTopicIndex(tIdx);
                                    setCurrentCardIndex(0);
                                    setViewMode("DECK");
                                  }}
                                  className="text-xs h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                                >
                                  Open Flashcards
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
