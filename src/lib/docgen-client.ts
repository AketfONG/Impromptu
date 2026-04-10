import { generatedQuizBatchSchema, type GeneratedQuiz } from "@/lib/mcq-schema";

const DOCGEN_SERVICE_URL = process.env.DOCGEN_SERVICE_URL ?? "http://127.0.0.1:8001/generate-mcq";

type DocgenPayload = {
  filePath: string;
  filename: string;
  mimeType: string;
  questionCount: number;
  fileContentBase64?: string;
  subject?: string;
  week?: number;
};

export function normalizeQuizForTest(quiz: unknown): GeneratedQuiz | null {
  if (!quiz || typeof quiz !== "object") return null;
  const cast = quiz as {
    title?: string;
    topic?: string;
    difficulty?: string;
    questions?: Array<{
      prompt?: string;
      options?: unknown[];
      correctIdx?: number;
      explanation?: string;
      media?: { kind?: "image" | "diagram"; src?: string; alt?: string };
    }>;
  };
  if (!Array.isArray(cast.questions)) return null;
  const questions = cast.questions.slice(0, 10).map((q, idx) => {
    const rawOptions = Array.isArray(q.options) ? q.options.map((x) => String(x ?? "")).filter(Boolean) : [];
    const options = rawOptions.slice(0, 4);
    while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    const correctIdx = Number.isInteger(q.correctIdx) && (q.correctIdx ?? -1) >= 0 && (q.correctIdx ?? -1) < 4 ? (q.correctIdx as number) : 0;
    return {
      prompt: (q.prompt?.trim() || `Generated question ${idx + 1}`),
      options,
      correctIdx,
      explanation: q.explanation?.trim() || "Explanation unavailable. Please review source material.",
      media: q.media?.src && q.media?.alt && (q.media.kind === "image" || q.media.kind === "diagram")
        ? { kind: q.media.kind, src: q.media.src, alt: q.media.alt }
        : undefined,
    };
  });
  if (questions.length !== 10) return null;
  return {
    title: cast.title?.trim() || "Generated Quiz",
    topic: cast.topic?.trim() || "Uploaded Document",
    difficulty: cast.difficulty?.trim() || "MIXED",
    questions,
  };
}

export async function generateMcqFromDocument(payload: DocgenPayload): Promise<GeneratedQuiz[]> {
  const res = await fetch(DOCGEN_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Docgen service failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const raw = await res.json();
  const parsed = generatedQuizBatchSchema.safeParse(raw);
  if (parsed.success) return parsed.data.quizzes;

  const maybeQuizzes = Array.isArray((raw as { quizzes?: unknown[] })?.quizzes) ? (raw as { quizzes: unknown[] }).quizzes : [];
  const repaired = maybeQuizzes.map(normalizeQuizForTest).filter((q): q is GeneratedQuiz => q !== null);
  const repairedParsed = generatedQuizBatchSchema.safeParse({ quizzes: repaired });
  if (!repairedParsed.success) {
    throw new Error("Generated output did not pass schema validation.");
  }
  return repairedParsed.data.quizzes;
}
