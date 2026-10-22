export interface GeneratedQuizResult {
  title: string;
  description: string;
  timeLimitMinutes: number;
  totalPoints: number;
  difficulty?: string;
  courseCode?: string;
  questions: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface GeneratedAssignmentResult {
  title: string;
  description: string;
  type: "CODING" | "WRITTEN" | "LAB_PROJECT";
  totalPoints: number;
  starterCode?: string;
  rubric: {
    criteria: string;
    points: number;
  }[];
}

export interface GeneratedLessonResult {
  title: string;
  duration: string;
  type: "reading" | "video";
  readingContent: string;
  summary: string;
}

export async function requestGeminiQuizGeneration(payload: {
  courseCode: string;
  topic: string;
  prompt?: string;
  count?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}): Promise<{ isAi: boolean; data: GeneratedQuizResult }> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "QUIZ",
        ...payload,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "AI generation service temporarily busy. Please try again.");
    }
    const json = await res.json();
    if (json.success && json.data) {
      return { isAi: !!json.isAi, data: json.data };
    }
    throw new Error(json.error || "Quiz generation could not parse questions.");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Quiz generation failed. Please try again.");
  }
}

export async function requestGeminiAssignmentGeneration(payload: {
  courseCode: string;
  topic: string;
  prompt?: string;
  assignmentType?: "CODING" | "WRITTEN" | "LAB_PROJECT";
  points?: number;
}): Promise<{ isAi: boolean; data: GeneratedAssignmentResult }> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ASSIGNMENT",
        ...payload,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "AI generation service temporarily busy. Please try again.");
    }
    const json = await res.json();
    if (json.success && json.data) {
      return { isAi: !!json.isAi, data: json.data };
    }
    throw new Error(json.error || "Assignment generation failed.");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Assignment generation failed. Please try again.");
  }
}

export interface GeneratedFlashcardItem {
  card_index: number;
  total_cards: number;
  card_category: string;
  question_title: string;
  title: string;
  lead_summary: string;
  definition: string;
  construction: string;
  olap_or_key_concepts: string;
  example: string;
}

export interface GeneratedFlashcardDeckResult {
  topicTitle: string;
  cards: GeneratedFlashcardItem[];
}

export async function requestGeminiFlashcardGeneration(payload: {
  courseCode: string;
  topic: string;
  prompt?: string;
}): Promise<{ isAi: boolean; data: GeneratedFlashcardDeckResult }> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "FLASHCARDS",
        ...payload,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "AI generation service temporarily busy. Please try again.");
    }
    const json = await res.json();
    if (json.success && json.data) {
      return { isAi: !!json.isAi, data: json.data };
    }
    throw new Error(json.error || "Flashcard generation failed.");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Flashcard generation failed.");
  }
}
