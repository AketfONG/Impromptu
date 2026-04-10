import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import axios from "axios";

const GenerateSchema = z.object({
  filePath: z.string().optional(),
  filename: z.string(),
  mimeType: z.string(),
  questionCount: z.number().min(1).max(20).default(10),
  fileContentBase64: z.string().optional(),
  subject: z.string().optional(),
  week: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error }, { status: 400 });
  }

  try {
    // Call the Python docgen service
    const response = await axios.post(
      process.env.DOCGEN_URL || "http://localhost:8001/generate",
      parsed.data,
      { timeout: 15000 }
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate quiz", details: error?.message }, { status: 500 });
  }
}
