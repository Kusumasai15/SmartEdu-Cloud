import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface TutorChatPayload {
  courseCode: string;
  courseName?: string;
  topic: string;
  facultyName?: string;
  question: string;
  materials?: Array<{ title: string; type: string; description: string; url?: string }>;
  history?: Array<{ sender: "AI" | "USER" | "ai" | "user"; text: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: TutorChatPayload = await req.json();
    const {
      courseCode,
      courseName = "",
      topic,
      facultyName = "Faculty Professor",
      question,
      materials = [],
      history = [],
    } = body;

    if (!question || !topic) {
      return NextResponse.json(
        { success: false, error: "Question and topic are required." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
    ];

    const materialsContext = materials.length > 0
      ? `\n\nOFFICIAL COURSE MATERIALS & SLIDES UPLOADED BY FACULTY (${facultyName}):\n` +
        materials
          .map((m, idx) => `[Material #${idx + 1}] Type: ${m.type} | Title: "${m.title}"\nDescription / Content: ${m.description}`)
          .join("\n\n")
      : "";

    if (apiKey) {
      const systemPrompt = `You are an elite University Professor and Academic Teaching Assistant for course "${courseCode}${courseName ? ` - ${courseName}` : ""}".
The student is asking a doubt regarding Lecture topic "${topic}" taught by Professor ${facultyName}.${materialsContext}
Answer their question directly, thoroughly, and pedagogically in 2-4 clear paragraphs. If relevant, explicitly reference and explain concepts from the faculty's uploaded lecture slides and materials. Include concise code snippets, mathematical proofs, or concrete counter-examples if appropriate.
Keep your tone academic, encouraging, and authoritative.`;

      const conversationParts = history.slice(-4).map((m) => ({
        role: m.sender.toLowerCase() === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      conversationParts.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nStudent Doubt: ${question}` }],
      });

      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: conversationParts,
              generationConfig: {
                temperature: 0.3,
              },
            }),
          });

          if (response.ok) {
            const geminiData = await response.json();
            const parts = geminiData.candidates?.[0]?.content?.parts || [];
            const textPart = parts.find((p: any) => !p.thought && typeof p.text === "string" && p.text.trim()) || parts[0];
            const replyText = textPart?.text;
            if (replyText) {
              return NextResponse.json({
                success: true,
                isAi: true,
                reply: replyText,
                modelUsed: model,
              });
            }
          }
        } catch (geminiError) {
          console.error(`Gemini Tutor Chat error with model ${model}:`, geminiError);
        }
      }
    }

    return NextResponse.json(
      { success: false, error: "Tutoring service did not return an approved response." },
      { status: 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to answer question" },
      { status: 500 }
    );
  }
}
