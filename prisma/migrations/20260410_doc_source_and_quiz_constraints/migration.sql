-- Source document support
CREATE TABLE IF NOT EXISTS "SourceDocument" (
  "id" TEXT PRIMARY KEY,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Quiz"
  ADD COLUMN IF NOT EXISTS "sourceDocumentId" TEXT;

ALTER TABLE "Quiz"
  ADD CONSTRAINT "Quiz_sourceDocumentId_fkey"
  FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Guardrail: generated MCQs require exactly 4 options and valid correct index.
ALTER TABLE "QuizQuestion"
  ADD CONSTRAINT "QuizQuestion_options_len_check"
  CHECK (jsonb_typeof("options"::jsonb) = 'array' AND jsonb_array_length("options"::jsonb) = 4);

ALTER TABLE "QuizQuestion"
  ADD CONSTRAINT "QuizQuestion_correct_idx_bounds_check"
  CHECK ("correctIdx" >= 0 AND "correctIdx" < jsonb_array_length("options"::jsonb));
