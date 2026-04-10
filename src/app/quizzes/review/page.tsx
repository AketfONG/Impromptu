import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { db } from "@/lib/db";

type SearchParams = Promise<{ quizId?: string; attemptId?: string }>;

export default async function QuizReviewPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const quizId = searchParams.quizId;
  const attemptId = searchParams.attemptId;
  const quiz = quizId
    ? await db.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true },
      })
    : null;
  const attempt = attemptId
    ? await db.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { questionAttempts: true },
      })
    : null;

  if (!quiz || !attempt) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          <p className="rounded border border-slate-200 bg-white p-4 text-slate-700">
            Quiz review data not found.
          </p>
        </main>
      </div>
    );
  }

  const visibleQuestions = quiz.questions.slice(0, 10);
  const selectedAnswers = Object.fromEntries(
    attempt.questionAttempts.map((item) => [item.questionId, item.selectedIdx]),
  );

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Quiz Review</h1>
        <p className="text-sm text-slate-600">
          {quiz.title} · {quiz.topic} · {quiz.difficulty}
        </p>
        <div className="space-y-4">
          {visibleQuestions.map((question, index) => {
            const selectedIdx = selectedAnswers[question.id];
            const isCorrect = selectedIdx === question.correctIdx;
            const selectedText =
              selectedIdx === undefined ? "No answer selected" : question.options[selectedIdx] ?? "Invalid answer";
            const correctText = question.options[question.correctIdx] ?? "Unknown";
            return (
              <section key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">
                      Q{index + 1}. {question.prompt}
                    </h2>
                    <p className="mt-2 text-sm text-slate-700">
                      Your answer:{" "}
                      <span className={isCorrect ? "font-medium text-emerald-700" : "font-medium text-rose-700"}>
                        {selectedText}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Correct answer: <span className="font-medium text-slate-900">{correctText}</span>
                    </p>
                    <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
                      Explanation: {question.explanation}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <div>
          <Link
            href="/dashboard"
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
