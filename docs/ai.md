# SmartEdu Cloud — Artificial Intelligence & Gemini Architecture

## 1. AI Integration Philosophy

AI in SmartEdu Cloud is an **intelligent assistant and recommendation layer**, not a replacement for core academic logic or authorized humans.

- **Human Authority**: Official academic records (grades, attendance, exam outcomes) can only be finalized by authorized humans (Faculty, Admin). AI may draft questions or suggest grades, but never publish them automatically.
- **Explainability**: AI recommendations and risk warnings must present clear citations and factual metrics, rather than opaque scores.
- **Provider Agnosticism**: AI capabilities are decoupled behind an `AIService` abstraction (`app/ai/`), isolating the application from direct Gemini SDK calls.

## 2. Gemini Service Layer Architecture (Phase 11+)

```
API Endpoint (/api/v1/ai/...)
           │
           ▼
Application Service Layer
           │
           ▼
AIService Interface
           │
   ┌───────┴───────────────────┐
   ▼                           ▼
GeminiClient (Live API)   MockClient (Unit Tests)
```

## 3. Retrieval-Augmented Generation (RAG) Flow (Phase 12)

```
1. Faculty uploads PDF -> S3 -> Text Extraction -> Chunking -> Embedding Model
2. Chunks & Embeddings stored in PostgreSQL (pgvector)
3. Student asks AI Tutor a question
4. Backend filters chunks: WHERE course_id IN (enrolled_courses) AND published = true
5. Top-K similar chunks retrieved via cosine distance
6. Prompt constructed with grounded context + student query
7. Gemini generates response grounded strictly in authorized course material
```

## 4. Structured Output Validation

All generative outputs (AI Quiz Generation, Flashcards, Summaries) use Gemini's structured JSON mode and are parsed through Pydantic schemas before reaching the database or frontend.
