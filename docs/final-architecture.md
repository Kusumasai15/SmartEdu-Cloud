# SmartEdu Cloud — Final End-to-End System Architecture

```
                                  [ Client Browser ]
                                          │
                        HTTPS / WSS (REST & Real-time)
                                          │
                       ┌──────────────────▼──────────────────┐
                       │        Next.js 15 Frontend         │
                       │   (Tailwind, TypeScript, App Router)│
                       └──────────────────┬──────────────────┘
                                          │
                           /api/v1 (Bearer JWT / JSON)
                                          │
                       ┌──────────────────▼──────────────────┐
                       │     FastAPI Production Backend      │
                       │ ┌─────────────────────────────────┐ │
                       │ │ CorrelationIdMiddleware (Trace) │ │
                       │ └─────────────────────────────────┘ │
                       │ ┌─────────────────────────────────┐ │
                       │ │ 5-Role RBAC & IDOR Authorization│ │
                       │ └─────────────────────────────────┘ │
                       │ ┌─────────────────────────────────┐ │
                       │ │ Domain Services & State Machines│ │
                       │ └─────────────────────────────────┘ │
                       └──────┬─────────────┬───────────┬────┘
                              │             │           │
                 SQLAlchemy   │       Cache │           │ Advisory
                Async Queries │    Sessions │           │ Isolated
                              ▼             ▼           ▼
                      ┌──────────────┐ ┌─────────┐ ┌─────────┐
                      │  PostgreSQL  │ │  Redis  │ │ Gemini  │
                      │  (Relational)│ │ (Broker)│ │   AI    │
                      └──────────────┘ └─────────┘ └─────────┘
```
