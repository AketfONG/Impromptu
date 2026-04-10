import { NextRequest, NextResponse } from "next/server";
import { backendDisabledResponse, isBackendDisabled } from "@/lib/backend-toggle";
import { connectToDatabase } from "@/lib/mongodb";
import { QuizModel } from "@/models/Quiz";
import { db } from "@/lib/db";
import { generateMcqFromDocument } from "@/lib/docgen-client";

// POST /api/quizzes/generate-followup
// Body: { sourceDocumentId: string, subject: string, week: number, type: "Hot" | "Review" }
export async function POST(req: NextRequest) {
  if (isBackendDisabled()) return backendDisabledResponse();
  await connectToDatabase();
  const { sourceDocumentId, subject, week, type } = await req.json();
  if (!sourceDocumentId || !subject || !week || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Find the source document
  const sourceDocument = await db.sourceDocument.findUnique({ where: { id: sourceDocumentId } });
  if (!sourceDocument) {
    return NextResponse.json({ error: "Source document not found" }, { status: 404 });
  }
  // Generate quiz
  const generatedQuizzes = await generateMcqFromDocument({
    filePath: sourceDocument.storagePath,
    filename: sourceDocument.filename,
    mimeType: sourceDocument.mimeType,
    questionCount: 10,
    fileContentBase64: undefined,
    subject,
    week,
  });
  const created = [];
  for (const generated of generatedQuizzes) {
    const quiz = await db.quiz.create({
      data: {
        title: `${type} - Week ${week} - ${generated.title}`,
        topic: subject,
        difficulty: type,
        sourceDocumentId: sourceDocument.id,
        questions: {
          create: generated.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            correctIdx: q.correctIdx,
            explanation: q.explanation,
          })),
        },
      },
      include: { questions: true },
    });
    created.push(quiz);
  }
  return NextResponse.json({ quizzes: created }, { status: 201 });
}
