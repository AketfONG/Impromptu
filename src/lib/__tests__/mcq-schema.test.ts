import test from "node:test";
import assert from "node:assert/strict";
import { generatedQuizSchema } from "@/lib/mcq-schema";
import { normalizeQuizForTest } from "@/lib/docgen-client";

test("generated quiz schema enforces 10 questions and four options", () => {
  const valid = generatedQuizSchema.safeParse({
    title: "Cold - Networks",
    topic: "Networks",
    difficulty: "MEDIUM",
    questions: Array.from({ length: 10 }, (_, i) => ({
      prompt: `Question ${i + 1}`,
      options: ["A", "B", "C", "D"],
      correctIdx: i % 4,
      explanation: "Because of source context.",
    })),
  });
  assert.equal(valid.success, true);
});

test("normalizer repairs malformed quiz output", () => {
  const repaired = normalizeQuizForTest({
    title: "Broken",
    questions: Array.from({ length: 10 }, (_, i) => ({
      prompt: "",
      options: ["A"],
      correctIdx: 9,
      explanation: "",
      media: i === 0 ? { kind: "diagram", src: "x", alt: "y" } : undefined,
    })),
  });
  assert.ok(repaired);
  assert.equal(repaired?.questions.length, 10);
  assert.equal(repaired?.questions[0].options.length, 4);
  assert.equal(repaired?.questions[0].correctIdx, 0);
  assert.ok(repaired?.questions[0].explanation.length);
});
