import json
import os
import base64
import random
import tempfile
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from docling.document_converter import DocumentConverter
except Exception:  # pragma: no cover
    DocumentConverter = None


class GenerateRequest(BaseModel):
    filePath: str
    filename: str
    mimeType: str
    questionCount: int = Field(default=10, ge=10, le=10)
    fileContentBase64: str | None = None
    subject: str | None = None
    week: int | None = None


class GeneratedQuestion(BaseModel):
    prompt: str
    options: list[str]
    correctIdx: int
    explanation: str
    media: dict[str, Any] | None = None


class GeneratedQuiz(BaseModel):
    title: str
    topic: str
    difficulty: str
    questions: list[GeneratedQuestion]


class GenerateResponse(BaseModel):
    quizzes: list[GeneratedQuiz]



app = FastAPI(title="Docgen Service")

def _balance_answer_positions(questions: list[dict[str, Any]]) -> None:
    """Permute options so correct answers are spread across A–D (no single-index bias)."""
    n = len(questions)
    if n != 10:
        return
    targets = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
    random.shuffle(targets)
    for i, q in enumerate(questions):
        opts = q.get("options", [])[:4]
        while len(opts) < 4:
            opts.append(f"Option {chr(65 + len(opts))}")
        c = q.get("correctIdx", 0)
        if not isinstance(c, int) or c < 0 or c > 3:
            c = 0
        correct = opts[c]
        wrong = [opts[j] for j in range(4) if j != c]
        random.shuffle(wrong)
        t = targets[i]
        new_opts: list[str] = [""] * 4
        new_opts[t] = correct
        wpos = 0
        for pos in range(4):
            if pos == t:
                continue
            new_opts[pos] = wrong[wpos]
            wpos += 1
        q["options"] = new_opts
        q["correctIdx"] = t


<<<<<<< HEAD
=======
def _balance_answer_positions(questions: list[dict[str, Any]]) -> None:
    """Permute options so correct answers are spread across A–D (no single-index bias)."""
    n = len(questions)
    if n != 10:
        return
    targets = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
    random.shuffle(targets)
    for i, q in enumerate(questions):
        opts = q.get("options", [])[:4]
        while len(opts) < 4:
            opts.append(f"Option {chr(65 + len(opts))}")
        c = q.get("correctIdx", 0)
        if not isinstance(c, int) or c < 0 or c > 3:
            c = 0
        correct = opts[c]
        wrong = [opts[j] for j in range(4) if j != c]
        random.shuffle(wrong)
        t = targets[i]
        new_opts: list[str] = [""] * 4
        new_opts[t] = correct
        wpos = 0
        for pos in range(4):
            if pos == t:
                continue
            new_opts[pos] = wrong[wpos]
            wpos += 1
        q["options"] = new_opts
        q["correctIdx"] = t


>>>>>>> 5a39ef12abdacee50cb605aa0b95a128473f7402
def extract_text_with_docling(file_path: str) -> str:
    if DocumentConverter is None:
        raise RuntimeError("Docling is not installed in this environment.")
    converter = DocumentConverter()
    result = converter.convert(file_path)
    try:
        return result.document.export_to_markdown()
    except Exception:
        return str(result.document)


def _repair_generated(raw: dict[str, Any]) -> GenerateResponse:
    quizzes = raw.get("quizzes", [])
    safe_quizzes: list[dict[str, Any]] = []
    for quiz in quizzes:
        questions = quiz.get("questions", [])[:10]
        if len(questions) < 10:
            continue
        normalized_questions: list[dict[str, Any]] = []
        for idx, q in enumerate(questions):
            options = [str(x) for x in q.get("options", []) if str(x).strip()][:4]
            while len(options) < 4:
                options.append(f"Option {chr(65 + len(options))}")
            correct_idx = q.get("correctIdx", 0)
            if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx > 3:
                correct_idx = 0
            normalized_questions.append(
                {
                    "prompt": (q.get("prompt") or f"Generated question {idx + 1}").strip(),
                    "options": options,
                    "correctIdx": correct_idx,
                    "explanation": (q.get("explanation") or "Review source content for context.").strip(),
                    "media": q.get("media"),
                }
            )
        _balance_answer_positions(normalized_questions)
        safe_quizzes.append(
            {
                "title": (quiz.get("title") or "Generated Quiz").strip(),
                "topic": (quiz.get("topic") or "Uploaded Document").strip(),
                "difficulty": (quiz.get("difficulty") or "MIXED").strip(),
                "questions": normalized_questions,
            }
        )
    return GenerateResponse(quizzes=[GeneratedQuiz(**q) for q in safe_quizzes])


async def call_qwen(document_text: str, question_count: int, subject: str | None, week: int | None) -> GenerateResponse:
    base_url = os.environ.get("QWEN_BASE_URL", "").strip()
    api_key = os.environ.get("QWEN_API_KEY", "").strip()
    model = os.environ.get("QWEN_MODEL", "Qwen2.5-VL-72B-Instruct")
    if not base_url or not api_key:
        # Fallback deterministic mock keeps pipeline testable without credentials.
        questions = []
        for i in range(question_count):
            questions.append(
                {
                    "prompt": f"Generated question {i + 1} from uploaded document",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctIdx": i % 4,
                    "explanation": "This explanation is generated in fallback mode.",
                }
            )
        return GenerateResponse(
            quizzes=[
                GeneratedQuiz(
                    title="Document Comprehension Quiz",
                    topic="Uploaded Document",
                    difficulty="MIXED",
                    questions=[GeneratedQuestion(**q) for q in questions],
                )
            ]
        )

    tag_context = ""
    if subject:
        tag_context += f"\nSubject: {subject}"
    if week:
        tag_context += f"\nWeek: {week}"

    prompt = f"""
Generate MCQs from this document.
Rules:
- Return strict JSON only
- Use format: {{"quizzes":[{{"title":"...","topic":"...","difficulty":"...","questions":[{{"prompt":"...","options":["A","B","C","D"],"correctIdx":0,"explanation":"..."}}]}}]}}
- Exactly {question_count} questions
- Exactly 4 options per question
- Exactly one correct answer
- Include explanation for every question
- Vary correctIdx across questions (values 0–3); do not use the same index for every question
Use the subject/week context if provided.
Context:
{tag_context.strip() or "No additional tags"}
Document:
{document_text[:14000]}
"""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(base_url, headers=headers, json=body)
    if resp.status_code >= 300:
        raise RuntimeError(f"Qwen API error: {resp.status_code} {resp.text[:300]}")

    data = resp.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    if isinstance(content, list):
        content = "".join([part.get("text", "") for part in content if isinstance(part, dict)])
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        parsed = json.loads(content[start : end + 1]) if start >= 0 and end > start else {"quizzes": []}
    return _repair_generated(parsed)


@app.post("/generate-mcq", response_model=GenerateResponse)
async def generate_mcq(payload: GenerateRequest) -> GenerateResponse:
    temp_file_path: Path | None = None
    file_path = Path(payload.filePath)
    if not file_path.exists():
        if not payload.fileContentBase64:
            raise HTTPException(status_code=404, detail="Uploaded file not found on worker.")
        suffix = Path(payload.filename).suffix or ".bin"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(base64.b64decode(payload.fileContentBase64))
        temp_file.flush()
        temp_file.close()
        temp_file_path = Path(temp_file.name)
        file_path = temp_file_path
    try:
        extracted = extract_text_with_docling(str(file_path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}") from exc
    try:
        return await call_qwen(extracted, payload.questionCount, payload.subject, payload.week)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Generation failed: {exc}") from exc
    finally:
        if temp_file_path is not None:
            try:
                temp_file_path.unlink(missing_ok=True)
            except Exception:
                pass
