# Docgen Service

Python service for document extraction (Docling) and MCQ generation (Qwen).

## Run

```bash
cd services/docgen
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

## Environment Variables

- `QWEN_BASE_URL`: chat completions endpoint for Qwen-compatible API
- `QWEN_API_KEY`: API key
- `QWEN_MODEL`: defaults to `Qwen2.5-VL-72B-Instruct`

If `QWEN_BASE_URL`/`QWEN_API_KEY` are missing, service returns deterministic fallback quizzes so the pipeline can still be tested end-to-end.
