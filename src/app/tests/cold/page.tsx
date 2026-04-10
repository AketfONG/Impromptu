import { TestPageShell } from "@/components/test-page-shell";

export default async function ColdTestPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const params = await searchParams;
  return <TestPageShell testType="Cold" subject={params.subject} />;
}
