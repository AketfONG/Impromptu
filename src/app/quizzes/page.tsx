import { TopNav } from "@/components/top-nav";
import { QuizAttemptForm } from "@/components/quiz-attempt-form";
import { uiOnlyQuizzes } from "@/lib/ui-quizzes";

export default function QuizzesPage() {
  const quizzes = uiOnlyQuizzes;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Quizzes</h1>
        <p className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          UI-only mode is active. Quiz content and submission are mocked locally.
        </p>
        {quizzes.length === 0 ? (
          <p className="rounded border border-slate-200 bg-white p-4 text-slate-600">
            No quizzes available in UI-only mode.
          </p>
        ) : null}
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <section key={quiz.id} className="rounded-lg border border-slate-200 bg-white p-4">
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
          ))}
        </div>
      </main>
    </div>
  );
}
