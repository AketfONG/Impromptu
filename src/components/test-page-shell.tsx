import { TopNav } from "@/components/top-nav";
import { QuizAttemptForm } from "@/components/quiz-attempt-form";
import { db } from "@/lib/db";
import { isBackendDisabled } from "@/lib/backend-toggle";
import { isDatabaseUnavailableError } from "@/lib/db-health";
import { uiOnlyQuizzes } from "@/lib/ui-quizzes";
import { QuizView } from "@/lib/quiz-types";

type TestType = "Cold" | "Hot" | "Review";

export async function TestPageShell({ testType }: { testType: TestType }) {
  let quiz: QuizView | undefined;

  if (!isBackendDisabled()) {
    try {
      const backendQuiz = await db.quiz.findFirst({
        where: { title: { startsWith: `${testType} -` } },
        include: { questions: true },
        orderBy: { createdAt: "desc" },
      });
      if (backendQuiz) {
        quiz = backendQuiz;
      }
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) throw error;
    }
  }
  if (!quiz) {
    quiz = uiOnlyQuizzes[0];
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">{testType} Test</h1>
        <p className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Generated quizzes are loaded from backend when available.
        </p>
        {!quiz ? (
          <p className="rounded border border-slate-200 bg-white p-4 text-slate-600">
            No quizzes available in UI-only mode.
          </p>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">{quiz.title}</h2>
              <p className="text-sm text-slate-600">
                {quiz.topic} · {quiz.difficulty}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Showing up to 10 questions with 4 options each.
              </p>
            </div>
            <QuizAttemptForm quiz={quiz} />
          </section>
        )}
      </main>
    </div>
  );
}
