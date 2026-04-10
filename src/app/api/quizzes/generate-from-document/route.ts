import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backendDisabledResponse, isBackendDisabled } from "@/lib/backend-toggle";
import { generateMcqFromDocument } from "@/lib/docgen-client";

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-powerpoint",
]);

export async function POST(req: NextRequest) {
  if (isBackendDisabled()) return backendDisabledResponse();

  const formData = await req.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const weekRaw = String(formData.get("week") ?? "").trim();
  const week = Number(weekRaw);
  if (!subject) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!Number.isInteger(week) || week < 1) {
    return NextResponse.json({ error: "Week must be a positive integer." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing uploaded file." }, { status: 400 });
  }
  if (!SUPPORTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or PPTX." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), ".uploads");
  await mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const baseName = `${Date.now()}-${randomUUID()}${ext}`;
  const storagePath = path.join(uploadsDir, baseName);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(storagePath, Buffer.from(arrayBuffer));

  const sourceDocument = await db.sourceDocument.create({
    data: {
      filename: file.name,
      mimeType: file.type,
      storagePath,
      status: "PROCESSING",
      metadata: { size: file.size, subject, week } as object,
    },
  });

  try {
    const generatedQuizzes = await generateMcqFromDocument({
      filePath: storagePath,
      filename: file.name,
      mimeType: file.type,
      questionCount: 10,
      fileContentBase64: Buffer.from(arrayBuffer).toString("base64"),
      subject,
      week,
    });


    // Only create the Cold quiz on upload
    const created = [];
    for (const generated of generatedQuizzes) {
      const quiz = await db.quiz.create({
        data: {
          title: `Cold - Week ${week} - ${generated.title}`,
          topic: subject,
          difficulty: "Cold",
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

    await db.sourceDocument.update({
      where: { id: sourceDocument.id },
      data: { status: "READY", metadata: { size: file.size, subject, week, quizzesCreated: created.length } as object },
    });

    return NextResponse.json({ sourceDocument, quizzes: created }, { status: 201 });
  } catch (error) {
    await db.sourceDocument.update({
      where: { id: sourceDocument.id },
      data: { status: "FAILED", metadata: { size: file.size, subject, week, error: String(error) } as object },
    });
    return NextResponse.json({ error: "Failed to generate quiz questions from document." }, { status: 502 });
  }
}
