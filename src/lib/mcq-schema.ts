import { z } from "zod";

export const generatedQuestionSchema = z.object({
  prompt: z.string().min(3),
  options: z.array(z.string().min(1)).length(4),
  correctIdx: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  media: z
    .object({
      kind: z.enum(["image", "diagram"]),
      src: z.string().min(1),
      alt: z.string().min(1),
    })
    .optional(),
});

export const generatedQuizSchema = z.object({
  title: z.string().min(3),
  topic: z.string().min(2),
  difficulty: z.string().min(2),
  questions: z.array(generatedQuestionSchema).length(10),
});

export const generatedQuizBatchSchema = z.object({
  quizzes: z.array(generatedQuizSchema).min(1),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
