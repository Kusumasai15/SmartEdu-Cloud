# SmartEdu Cloud — AI Insights & Gemini Integration

## 1. Architectural Principles
Gemini AI is integrated strictly as a **non-authoritative advising assistant** for generating natural language study tips and cohort summaries:
- **Zero Primary Authority**: Gemini cannot change grades, marks, attendance, or transcripts.
- **Strict Backend Isolation**: Calls are made exclusively on the server (`app/intelligence/ai/insight_service.py`).
- **PII Minimization**: The prompt context sends only numerical aggregates (`GPA`, `attendance %`, `assignment %`). Names, emails, student IDs, and contact info are stripped before sending.
- **Deterministic Offline Fallback**: If `GEMINI_API_KEY` is absent, invalid, or experiences network disruption, the system falls back to `AISafetyManager.get_deterministic_student_fallback()` with zero UI degradation.

---

## 2. Validation & Hallucination Prevention

```mermaid
sequenceDiagram
    participant User
    participant Router
    participant AIService as AcademicAIInsightService
    participant Safety as AISafetyManager
    participant Gemini as Google Gemini API

    User->>Router: GET /api/v1/intelligence/student/me
    Router->>AIService: generate_student_study_insights()
    AIService->>Safety: sanitize_student_context(metrics)
    Safety-->>AIService: Anonymized Aggregates
    alt Key configured & API Online
        AIService->>Gemini: generate_content(prompt)
        Gemini-->>AIService: Raw Output
        AIService->>Safety: validate_ai_output(text)
        alt Valid
            Safety-->>AIService: Clean AI Text (is_ai=True)
        else Malformed / Unsafe
            AIService->>Safety: get_deterministic_student_fallback()
            Safety-->>AIService: Fallback Text (is_ai=False)
        end
    else Offline / Missing Key
        AIService->>Safety: get_deterministic_student_fallback()
        Safety-->>AIService: Fallback Text (is_ai=False)
    end
    AIService-->>Router: Response (text, is_ai)
    Router-->>User: StudentIntelligenceResponse
```
