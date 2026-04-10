"use client";

import { useState } from "react";

export function DocumentUploadForm() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/quizzes/generate-from-document", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error ?? "Failed to generate quizzes.");
      return;
    }
    setStatus(`Success: created ${data.quizzes?.length ?? 0} quizzes from ${data.sourceDocument?.filename ?? "file"}.`);
  }

  return (
    <form action={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Generate MCQs from Document</h2>
      <p className="mt-1 text-sm text-slate-600">Upload PDF, DOCX, or PPTX. Generation produces 10 questions with 4 choices and one correct answer.</p>
      <input
        className="mt-3 block w-full text-sm"
        name="file"
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating..." : "Upload and Generate"}
      </button>
      {status ? <p className="mt-2 text-sm text-slate-700">{status}</p> : null}
    </form>
  );
}
