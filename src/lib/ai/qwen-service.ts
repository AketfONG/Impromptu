/**
 * Service for generating MCQs using Qwen2.5-VL-72B
 *
 * Qwen2.5-VL-72B is a multimodal LLM that can:
 * - Read text content
 * - Analyze images and diagrams
 * - Generate questions based on visual and textual information
 *
 * API: https://api.together.ai/ (or other providers)
 * Model: Qwen/Qwen2.5-VL-72B-Instruct
 */

export interface MCQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  imageReference?: string;
}

export interface QwenConfig {
  apiKey: string;
  apiEndpoint?: string;
  model?: string;
  temperature?: number;
}

const DEFAULT_ENDPOINT = "https://api.together.ai/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen2.5-VL-72B-Instruct";

async function callQwenAPI(
  prompt: string,
  images: Array<{ base64: string; description: string }>,
  config: QwenConfig
): Promise<string> {
  const endpoint = config.apiEndpoint || DEFAULT_ENDPOINT;
  const model = config.model || DEFAULT_MODEL;

  // Build message with multimodal content
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Add text
  content.push({
    type: "text",
    text: prompt,
  });

  // Add images (limit to first 3 to avoid token overflow)
  images.slice(0, 3).forEach((img) => {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${img.base64}`,
      },
    });
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content,
          },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Qwen API error (${response.status}): ${error.error?.message || error.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Qwen API request timed out after 60 seconds");
    }
    throw error;
  }
}

export async function generateMCQsFromContent(
  content: string,
  images: Array<{ base64: string; description: string }>,
  topic: string,
  numQuestions: number = 10,
  config: QwenConfig
): Promise<MCQuestion[]> {
  const prompt = `You are an expert educational content creator. Based on the provided course material and any accompanying diagrams, generate exactly ${numQuestions} multiple-choice questions about "${topic}".

Course Material:
${content}

For each question, provide:
1. A clear, well-written question
2. Four distinct options (A, B, C, D)
3. The correct answer (as a letter: A, B, C, or D)
4. A brief explanation (1-2 sentences)
5. Difficulty level (easy, medium, or hard)

Format the response as a JSON array with this structure:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Explanation text",
    "difficulty": "medium",
    "topic": "${topic}"
  }
]

Generate the questions now. Return ONLY valid JSON.`;

  try {
    const response = await callQwenAPI(prompt, images, config);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Qwen response");
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Map correctAnswer to correctAnswerIndex
    return questions.map((q: any) => ({
      ...q,
      correctAnswerIndex: q.correctAnswer.charCodeAt(0) - 65, // Convert A/B/C/D to 0/1/2/3
    }));
  } catch (error) {
    console.error("Error generating MCQs with Qwen:", error);
    throw error;
  }
}

export function validateQwenConfig(config: Partial<QwenConfig>): { valid: boolean; error?: string } {
  if (!config.apiKey) {
    return {
      valid: false,
      error:
        "QWEN_API_KEY not configured. Set it in .env.local: QWEN_API_KEY=your_api_key",
    };
  }

  return { valid: true };
}
