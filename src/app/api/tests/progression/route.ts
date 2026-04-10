import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyRequestToken } from "@/lib/auth/verify-token";
import { QuizModel } from "@/models/Quiz";
import { QuizAttemptModel } from "@/models/QuizAttempt";
import { backendDisabledResponse, isBackendDisabled } from "@/lib/backend-toggle";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function testTypeFromTitle(title: string): "Cold" | "Hot" | "Review" | null {
  if (title.startsWith("Cold -")) return "Cold";
  if (title.startsWith("Hot -")) return "Hot";
  if (title.startsWith("Review -")) return "Review";
  return null;
}

export async function GET(req: NextRequest) {
  if (isBackendDisabled()) return backendDisabledResponse();
  const auth = await verifyRequestToken(req);
  if (!auth.ok) return auth.response;
  await connectToDatabase();

  const quizzes = await QuizModel.find({}).sort({ createdAt: -1 }).lean();
  const attempts = await QuizAttemptModel.find({ userId: auth.user._id })
    .sort({ submittedAt: -1 })
    .populate("quizId")
    .lean();

  const subjects = new Map<
    string,
    {
      subject: string;
      quizIds: Partial<Record<"Cold" | "Hot" | "Review", string>>;
      coldAttemptAt: string | null;
      hotAttemptAt: string | null;
      canTakeHot: boolean;
      canTakeReview: boolean;
      hotAvailableAt: string | null;
    }
  >();

  for (const quiz of quizzes) {
    const type = testTypeFromTitle(String(quiz.title ?? ""));
    const subject = String(quiz.topic ?? "").trim();
    if (!type || !subject) continue;
    if (!subjects.has(subject)) {
      subjects.set(subject, {
        subject,
        quizIds: {},
        coldAttemptAt: null,
        hotAttemptAt: null,
        canTakeHot: false,
        canTakeReview: false,
        hotAvailableAt: null,
      });
    }
    const row = subjects.get(subject)!;
    if (!row.quizIds[type]) row.quizIds[type] = String(quiz._id);
  }

  for (const attempt of attempts) {
    const quiz = attempt.quizId as { topic?: string; title?: string } | null;
    if (!quiz) continue;
    const subject = String(quiz.topic ?? "").trim();
    const type = testTypeFromTitle(String(quiz.title ?? ""));
    if (!subject || !type || !subjects.has(subject)) continue;
    const row = subjects.get(subject)!;
    const submittedAtIso = new Date(attempt.submittedAt).toISOString();
    if (type === "Cold" && !row.coldAttemptAt) row.coldAttemptAt = submittedAtIso;
    if (type === "Hot" && !row.hotAttemptAt) row.hotAttemptAt = submittedAtIso;
  }

  const now = Date.now();
  for (const row of subjects.values()) {
    if (row.coldAttemptAt) {
      const unlockTs = new Date(row.coldAttemptAt).getTime() + ONE_WEEK_MS;
      row.hotAvailableAt = new Date(unlockTs).toISOString();
      row.canTakeHot = now >= unlockTs;
    }
    row.canTakeReview = Boolean(row.hotAttemptAt);
  }

  return NextResponse.json({ subjects: Array.from(subjects.values()) });
}
