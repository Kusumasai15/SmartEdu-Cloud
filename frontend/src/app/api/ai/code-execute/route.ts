import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("code" in body) || typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Code snippet is required for execution." }, { status: 400 });
  }

  return NextResponse.json(
    {
      success: false,
      status: "UNAVAILABLE",
      stdout: "",
      stderr: "Code execution is unavailable until a secure isolated runner is connected.",
      executionTime: null,
      memoryUsed: null,
      testCases: [],
      passedTestCases: 0,
      totalTestCases: 0,
      scorePercentage: null,
    },
    { status: 503 }
  );
}
