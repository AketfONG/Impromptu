export type QuizQuestionView = {
  id: string;
  prompt: string;
  options: unknown;
  correctIdx?: number;
  explanation?: string | null;
  media?: {
    kind: "image" | "diagram";
    src: string;
    alt: string;
  };
};

export type QuizView = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  questions: QuizQuestionView[];
};
