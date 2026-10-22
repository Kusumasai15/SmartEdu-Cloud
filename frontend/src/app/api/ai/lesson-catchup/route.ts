import { NextRequest, NextResponse } from "next/server";
import { buildAiCacheKey, getCachedAiGeneration, setCachedAiGeneration } from "@/lib/aiCache";

export const runtime = "nodejs";

interface CatchUpRequestPayload {
  courseCode: string;
  courseName: string;
  lectureNumber: number;
  topic: string;
  facultyName: string;
  sessionAgenda?: string[];
  facultyNotes?: string;
}

const isLessonPayload = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  const lesson = value as Record<string, unknown>;
  return typeof lesson.title === "string" &&
    Array.isArray(lesson.sessionAgenda) &&
    Array.isArray(lesson.keyConcepts) &&
    typeof lesson.workedExample === "object" &&
    Array.isArray(lesson.quickCheck) &&
    typeof lesson.summary === "string";
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CatchUpRequestPayload;
    if (!body.courseCode?.trim() || !body.topic?.trim()) {
      return NextResponse.json({ success: false, error: "Course code and topic are required." }, { status: 400 });
    }
    if (body.topic.length > 300 || (body.facultyNotes?.length || 0) > 10_000 || (body.sessionAgenda?.length || 0) > 30) {
      return NextResponse.json({ success: false, error: "Lesson request exceeds allowed limits." }, { status: 413 });
    }

    const cacheKey = buildAiCacheKey(body.courseCode, "CATCHUP", `${body.lectureNumber}_${body.topic}`);
    const cached = await getCachedAiGeneration(cacheKey);
    if (cached && cached.data) {
      return NextResponse.json({ success: true, fromCache: true, data: cached.data });
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const prompt = `Create a rigorous remedial university lesson using only the supplied course context. Return JSON only with this schema: {"title":string,"sessionAgenda":[string],"keyConcepts":[{"title":string,"explanation":string,"codeOrFormula":string}],"workedExample":{"problem":string,"solution":string},"quickCheck":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}],"summary":string}.\nCourse: ${body.courseCode} - ${body.courseName}\nLecture: ${body.lectureNumber}\nTopic: ${body.topic}\nFaculty: ${body.facultyName}\nRecorded agenda: ${(body.sessionAgenda || []).join("; ") || "Not provided"}\nFaculty notes: ${body.facultyNotes?.trim() || "Not provided"}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("Lesson provider request failed", { status: response.status, model });
      return NextResponse.json(
        { success: false, error: "Lesson generation is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    const providerResult = await response.json();
    const raw = providerResult?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string" || !raw.trim()) {
      return NextResponse.json({ success: false, error: "The lesson provider returned no content." }, { status: 502 });
    }

    const lesson = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!isLessonPayload(lesson)) {
      return NextResponse.json({ success: false, error: "The generated lesson format was invalid." }, { status: 502 });
    }
    await setCachedAiGeneration(cacheKey, lesson, {
      courseCode: body.courseCode,
      topic: body.topic,
      mode: "CATCHUP",
      source: "GEMINI",
    });
    return NextResponse.json({ success: true, fromCache: false, data: lesson });
  } catch (error) {
    console.error("Catch-up lesson generation error:", error);
    return NextResponse.json(
      { success: false, error: "Lesson generation failed. Please try again." },
      { status: 500 }
    );
  }
}
