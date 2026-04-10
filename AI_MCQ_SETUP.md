# AI-Powered MCQ Generation Setup Guide

## Overview
This system generates 10 MCQs from uploaded course materials (PDF, PPT, Word docs) using:
- **Docling**: Document parsing (PDF/PPT/Word → Markdown)
- **Qwen2.5-VL-72B**: Multimodal LLM for MCQ generation (reads text + analyzes images/diagrams)

## Prerequisites

### 1. Get Qwen2.5-VL-72B API Key

#### Option A: Together AI (Recommended - Easiest)
1. Go to https://www.together.ai/
2. Sign up for a free account
3. Navigate to Settings → API Keys
4. Create a new API key
5. Copy the key

#### Option B: Hugging Face Inference API
1. Go to https://huggingface.co/settings/tokens
2. Create a new token (read-only is fine)
3. Deploy Qwen2.5-VL-72B on HF Spaces or use their inference endpoint

#### Option C: Self-Hosted (Advanced)
1. Use Ollama or vLLM to run Qwen2.5-VL-72B locally
2. Requires GPU with ≥48GB VRAM (for 72B model)

### 2. Configure Environment Variables

Create or update `.env.local`:

```bash
# Qwen API Configuration
QWEN_API_KEY=your_together_ai_api_key_here
QWEN_API_ENDPOINT=https://api.together.ai/v1/chat/completions
QWEN_MODEL=Qwen/Qwen2.5-VL-72B-Instruct

# Document Processing
MAX_UPLOAD_SIZE_MB=50
SUPPORTED_FILE_TYPES=pdf,ppt,pptx,docx,doc
```

### 3. Install Python Dependencies (for Docling)

Option A: Use Together AI's document parsing API (easier, no local Python needed)
```bash
# Skip local Docling installation
```

Option B: Local Docling installation
```bash
pip install docling pillow requests
```

## File Structure

```
src/
├── app/
│   └── api/
│       └── quizzes/
│           └── generate-from-document/
│               └── route.ts          # API endpoint
├── components/
│   └── document-upload.tsx           # Frontend component
├── lib/
│   └── ai/
│       ├── docling-service.ts        # Document parsing
│       └── qwen-service.ts           # MCQ generation
```

## API Endpoint

**POST** `/api/quizzes/generate-from-document`

### Request
```
multipart/form-data
- file: File (PDF, PPT, DOCX)
- topic: string (optional, defaults to "General")
```

### Response
```json
{
  "success": true,
  "questions": [
    {
      "question": "What is photosynthesis?",
      "options": ["...A", "...B", "...C", "...D"],
      "correctAnswer": "A",
      "correctAnswerIndex": 0,
      "explanation": "Photosynthesis is...",
      "difficulty": "medium",
      "topic": "Biology"
    }
  ],
  "document": {
    "title": "Lecture Notes",
    "fileName": "lecture_notes.pdf"
  }
}
```

## Testing the Integration

### 1. Test with cURL
```bash
curl -X POST http://localhost:3000/api/quizzes/generate-from-document \
  -F "file=@your_document.pdf" \
  -F "topic=Biology"
```

### 2. Test with Frontend
Navigate to `/upload` and use the Document Upload component (to be created)

## Troubleshooting

### "QWEN_API_KEY not configured"
- Check `.env.local` has the correct key
- Restart dev server after updating `.env.local`

### "Unsupported file type"
- Only PDF, PPTX, and DOCX are supported
- Check file extension

### "File size exceeds limit"
- Default limit is 50MB
- Change `MAX_UPLOAD_SIZE_MB` in `.env.local`

### API Rate Limits
Together AI free tier: 1000 requests/month
- Upgrade to paid plan for higher limits
- Or use Replicate ($0.0007 per API call for Qwen)

## Cost Estimation

### Together AI
- Free tier: 1000 API calls/month
- Pay-as-you-go: ~$0.0001 per request

### Replicate  
- ~$0.0007 per API call for Qwen2.5-VL-72B

### Local (GPU Cost)
- Requires GPU (A100: $1-2/hour on cloud)
- Good for high volume / production use

## Next Steps

1. ✅ Set up API key in `.env.local`
2. ⏳ Create document upload component
3. ⏳ Test MCQ generation
4. ⏳ Integrate with Quiz management system
5. ⏳ Add batch processing for multiple documents
