import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { SubjectTestSelector } from "@/components/subject-test-selector";

export default function QuizzesPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <p className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Upload source documents to generate backend quizzes, then choose a test type.
        </p>
        <DocumentUploadForm />
        <SubjectTestSelector />
        <Link className="text-sm text-slate-600 underline hover:text-slate-900" href="/dashboard">
          Back to Dashboard
        </Link>
      </main>
    </div>
  );
}
