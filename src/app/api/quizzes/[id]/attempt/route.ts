import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runInterventionCycle } from "@/lib/interventions/orchestrator";
import { backendDisabledResponse, isBackendDisabled } from "@/lib/backend-toggle";
import { connectToDatabase } from "@/lib/mongodb";
import { QuizModel } from "@/models/Quiz";
import { QuizAttemptModel } from "@/models/QuizAttempt";
import { PassiveSignalEventModel } from "@/models/PassiveSignalEvent";
import { verifyRequestToken } from "@/lib/auth/verify-token";
import { Types } from "mongoose";

type QuizQuestion = {
  _id: Types.ObjectId;
  correctIdx: number;
};
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function testTypeFromTitle(title: string): "Cold" | "Hot" | "Review" | null {
  if (title.startsWith("Cold -")) return "Cold";
  if (title.startsWith("Hot -")) return "Hot";
  if (title.startsWith("Review -")) return "Review";
  return null;
}

const submitAttemptSchema = z.object({
  durationSec: z.number().int().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedIdx: z.number().int().min(0),
      responseMs: z.number().int().min(0),
    }),
  ),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (isBackendDisabled()) return backendDisabledResponse();
  const auth = await verifyRequestToken(req);
  if (!auth.ok) return auth.response;
  await connectToDatabase();

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid quiz id" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = submitAttemptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = auth.user;
  const quiz = await QuizModel.findById(id).lean();
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const testType = testTypeFromTitle(String(quiz.title ?? ""));
  const subject = String(quiz.topic ?? "").trim();
  if (testType === "Hot" || testType === "Review") {
    const priorAttempts = await QuizAttemptModel.find({ userId: user._id })
      .sort({ submittedAt: -1 })
      .populate("quizId")
      .lean();

    const latestCold = priorAttempts.find((attempt) => {
      const q = attempt.quizId as { title?: string; topic?: string } | null;
      return q && testTypeFromTitle(String(q.title ?? "")) === "Cold" && String(q.topic ?? "").trim() === subject;
    });

    const latestHot = priorAttempts.find((attempt) => {
      const q = attempt.quizId as { title?: string; topic?: string } | null;
      return q && testTypeFromTitle(String(q.title ?? "")) === "Hot" && String(q.topic ?? "").trim() === subject;
    });

    if (testType === "Hot") {
      if (!latestCold) {
        return NextResponse.json(
          { error: "Hot test is locked. Complete the Cold test for this subject first." },
          { status: 403 },
        );
      }
      const unlockAt = new Date(latestCold.submittedAt).getTime() + ONE_WEEK_MS;
      if (Date.now() < unlockAt) {
        return NextResponse.json(
          { error: "Hot test is locked until one week after your Cold test attempt." },
          { status: 403 },
        );
      }
    }

    if (testType === "Review" && !latestHot) {
      return NextResponse.json(
        { error: "Review test is locked. Complete the Hot test for this subject first." },
        { status: 403 },
      );
    }
  }

  const questions = (quiz.questions ?? []) as QuizQuestion[];
  const questionMap = new Map<string, QuizQuestion>(questions.map((q) => [String(q._id), q]));
  let correct = 0;
  const questionAttempts = parsed.data.answers.map((answer) => {
    const question = questionMap.get(answer.questionId);
    const isCorrect = question ? question.correctIdx === answer.selectedIdx : false;
    if (isCorrect) correct += 1;
    return {
      questionId: answer.questionId,
      selectedIdx: answer.selectedIdx,
      responseMs: answer.responseMs,
      isCorrect,
    };
  });

  const score = questions.length === 0 ? 0 : correct / questions.length;

  const attempt = await QuizAttemptModel.create({
    userId: user._id,
    quizId: quiz._id,
    score,
    durationSec: parsed.data.durationSec,
    questionAttempts,
  });

  await PassiveSignalEventModel.create({
    userId: user._id,
    type: "QUIZ_SUBMIT",
    meta: { quizId: String(quiz._id), score },
  });

  // After Cold quiz completion, generate Hot quiz if not exists
  if (testType === "Cold") {
    // Find the source document ID
    const sourceDocumentId = quiz.sourceDocumentId || null;
    if (sourceDocumentId) {
      // Check if Hot quiz already exists for this subject/week/document
      const hotQuiz = await QuizModel.findOne({
        sourceDocumentId,
        topic: subject,
        difficulty: "Hot",
      });
      if (!hotQuiz) {
        // Call the followup generator
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/quizzes/generate-followup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceDocumentId,
            subject,
            week: quiz.title.match(/Week (\d+)/)?.[1] ? Number(quiz.title.match(/Week (\d+)/)[1]) : undefined,
            type: "Hot",
          }),
        });
      }
    }
  }

  // After Hot quiz completion, generate Review quiz if not exists
  if (testType === "Hot") {
    const sourceDocumentId = quiz.sourceDocumentId || null;
    if (sourceDocumentId) {
      const reviewQuiz = await QuizModel.findOne({
        sourceDocumentId,
        topic: subject,
        difficulty: "Review",
      });
      if (!reviewQuiz) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/quizzes/generate-followup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceDocumentId,
            subject,
            week: quiz.title.match(/Week (\d+)/)?.[1] ? Number(quiz.title.match(/Week (\d+)/)[1]) : undefined,
            type: "Review",
          }),
        });
      }
    }
  }

  const cycle = await runInterventionCycle(String(user._id));
  return NextResponse.json({ attempt: attempt.toObject(), assessment: cycle.assessment, intervention: cycle.intervention });
}
