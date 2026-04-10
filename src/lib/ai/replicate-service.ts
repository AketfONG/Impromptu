/**
 * Service for generating MCQs using Replicate API
 * Supports Gemini 3 Flash and other LLMs
 *
 * API: https://replicate.com/
 * Model: google/gemini-3-flash (or other models)
 */

export interface MCQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export interface ReplicateConfig {
  apiToken: string;
  model?: string;
}

const DEFAULT_MODEL = "google/gemini-3-flash";
const MAX_POLL_ATTEMPTS = 60; // 5 minutes with 5-second intervals
const POLL_INTERVAL = 5000; // 5 seconds

async function pollPrediction(
  predictionId: string,
  apiToken: string
): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === "succeeded") {
      if (Array.isArray(data.output)) {
        return data.output.join("");
      }
      return data.output || "";
    }

    if (data.status === "failed") {
      throw new Error(`Prediction failed: ${data.error}`);
    }
  }

  throw new Error("Prediction polling timed out after 5 minutes");
}

async function callReplicateAPI(
  prompt: string,
  config: ReplicateConfig
): Promise<string> {
  const model = config.model || DEFAULT_MODEL;

  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: model,
        input: {
          prompt: prompt,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `API error (${response.status}): ${error.detail || error.error || "Unknown error"}`
      );
    }

    const data = await response.json();
    const predictionId = data.id;

    if (!predictionId) {
      throw new Error("No prediction ID returned from API");
    }

    // Poll for completion
    return await pollPrediction(predictionId, config.apiToken);
  } catch (error) {
    throw error;
  }
}

export async function generateMCQsFromContent(
  content: string,
  topic: string,
  numQuestions: number = 10,
  config: ReplicateConfig
): Promise<MCQuestion[]> {
  const prompt = `You are an expert educational content creator. Based on the provided course material, generate exactly ${numQuestions} multiple-choice questions about "${topic}".

Course Material:
${content.substring(0, 3000)}

For each question, provide:
1. A clear, well-written question
2. Four distinct options (A, B, C, D)
3. The correct answer (as a letter: A, B, C, or D)
4. A brief explanation (1-2 sentences)
5. Difficulty level (easy, medium, or hard)

Format the response as a VALID JSON array ONLY. Do not add any other text before or after the JSON.
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Explanation text",
    "difficulty": "medium",
    "topic": "${topic}"
  }
]`;

  try {
    let response = await callReplicateAPI(prompt, config);

    // Clean up response - remove markdown code blocks if present
    response = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Try to find JSON array in response
    let jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
    
    if (!jsonMatch) {
      // Try to find just the array start and end
      const startIdx = response.indexOf("[");
      const endIdx = response.lastIndexOf("]");
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonMatch = [response.substring(startIdx, endIdx + 1)];
      }
    }

    if (!jsonMatch) {
      console.error("Response was:", response);
      throw new Error(
        "Could not find JSON array in response. Response may not be properly formatted."
      );
    }

    const questions = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array of questions");
    }

    // Map correctAnswer to correctAnswerIndex
    return questions.map((q: any) => ({
      question: q.question || "",
      options: (q.options || []).map((o: any) => String(o)),
      correctAnswer: q.correctAnswer || "A",
      correctAnswerIndex:
        (q.correctAnswer || "A").toUpperCase().charCodeAt(0) - 65,
      explanation: q.explanation || "No explanation provided",
      difficulty: (q.difficulty || "medium").toLowerCase() as
        | "easy"
        | "medium"
        | "hard",
      topic: q.topic || topic,
    }));
  } catch (error) {
    console.error("Error generating MCQs:", error);
    throw error;
  }
}

export function validateReplicateConfig(
  config: Partial<ReplicateConfig>
): { valid: boolean; error?: string } {
  if (!config.apiToken) {
    return {
      valid: false,
      error: "API token not configured. Check your environment variables.",
    };
  }

  return { valid: true };
}
