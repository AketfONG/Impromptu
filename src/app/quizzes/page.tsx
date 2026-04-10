
"use client";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { QuizAttemptForm } from "@/components/quiz-attempt-form";
import { UiQuiz } from "@/lib/ui-quizzes";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<UiQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuizzes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/quizzes");
        if (!res.ok) throw new Error("Failed to fetch quizzes");
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  // Categorize quizzes by difficulty
  const cold = quizzes.filter((q) => q.difficulty.toLowerCase() === "cold");
  const hot = quizzes.filter((q) => q.difficulty.toLowerCase() === "hot");
  const review = quizzes.filter((q) => q.difficulty.toLowerCase() === "review");

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Quizzes</h1>
        {loading && <p>Loading quizzes...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <>
            <QuizCategory title="Cold" quizzes={cold} />
            <QuizCategory title="Hot" quizzes={hot} />
            <QuizCategory title="Review" quizzes={review} />
            {quizzes.length === 0 && (
              <p className="rounded border border-slate-200 bg-white p-4 text-slate-600">
                No quizzes yet. Click Initialize Demo Data on Home.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function QuizCategory({ title, quizzes }: { title: string; quizzes: UiQuiz[] }) {
  if (quizzes.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">{title} Quizzes</h2>
      <div className="space-y-4">
        {quizzes.map((quiz) => (
          <section key={quiz.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">{quiz.title}</h3>
              <p className="text-sm text-slate-600">
                {quiz.topic} · {quiz.difficulty}
              </p>
            </div>
            <QuizAttemptForm quiz={quiz} />
          </section>
        ))}
      </div>
    </section>
  );
}
