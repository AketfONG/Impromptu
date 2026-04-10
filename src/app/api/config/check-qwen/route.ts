import { NextResponse } from "next/server";

export async function GET() {
  const isConfigured = !!process.env.REPLICATE_API_TOKEN || !!process.env.QWEN_API_KEY;
  return NextResponse.json({ qwenConfigured: isConfigured });
}
