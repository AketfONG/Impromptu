import { TestPageShell } from "@/components/test-page-shell";

export default async function ReviewTestPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const params = await searchParams;
  return <TestPageShell testType="Review" subject={params.subject} />;
}
