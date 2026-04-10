"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/auth/client-token";

type SubjectProgress = {
  subject: string;
  quizIds: Partial<Record<"Cold" | "Hot" | "Review", string>>;
  coldAttemptAt: string | null;
  hotAttemptAt: string | null;
  canTakeHot: boolean;
  canTakeReview: boolean;
  hotAvailableAt: string | null;
};

export function SubjectTestSelector() {
  const [rows, setRows] = useState<SubjectProgress[]>([]);
  const [status, setStatus] = useState("Loading subjects...");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/tests/progression", {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Failed to load subjects.");
        return;
      }
      setRows(data.subjects ?? []);
      setStatus("");
    }
    void load();
  }, []);

  if (status) return <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">{status}</p>;
  if (rows.length === 0) {
    return <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">No subject quizzes generated yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <section key={row.subject} className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{row.subject}</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Link
              className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              href={`/tests/cold?subject=${encodeURIComponent(row.subject)}`}
            >
              Cold Test
            </Link>
            {row.canTakeHot ? (
              <Link
                className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                href={`/tests/hot?subject=${encodeURIComponent(row.subject)}`}
              >
                Hot Test
              </Link>
            ) : (
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Hot locked
              </div>
            )}
            {row.canTakeReview ? (
              <Link
                className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                href={`/tests/review?subject=${encodeURIComponent(row.subject)}`}
              >
                Review Test
              </Link>
            ) : (
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Review locked
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {row.canTakeHot
              ? "Hot unlocked."
              : row.hotAvailableAt
                ? `Hot unlocks on ${new Date(row.hotAvailableAt).toLocaleString()}.`
                : "Complete Cold first to unlock Hot."}
            {" "}
            {row.canTakeReview ? "Review unlocked." : "Complete Hot first to unlock Review."}
          </p>
        </section>
      ))}
    </div>
  );
}
