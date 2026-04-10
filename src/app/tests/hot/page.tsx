import { TestPageShell } from "@/components/test-page-shell";

export default async function HotTestPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const params = await searchParams;
  return <TestPageShell testType="Hot" subject={params.subject} />;
}
