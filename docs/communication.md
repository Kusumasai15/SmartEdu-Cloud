# SmartEdu Cloud — Communication, Notifications, Announcements & Messaging Architecture

## 1. Overview
The Communication & Collaboration Engine provides an authoritative, role-bounded, and auditable system for in-app notifications, scoped announcements, academic messaging, and Gemini AI-assisted drafting.

## 2. Core Modules
1. **Notifications**: User-scoped notifications with priority levels (`LOW`, `NORMAL`, `HIGH`, `URGENT`), fine-grained user category preferences, deterministic deduplication (`dedup_key`), fast unread counters, and ownership-guaranteed mark-as-read operations.
2. **Announcements**: Multi-level broadcast announcements scoped to Course, Department, or Institution with scheduling (`publish_at`, `expires_at`), formal mandatory acknowledgements, controlled editing, and automated notification dispatch to recipient cohorts.
3. **Academic Messaging**: Course-contextual and relationship-grounded direct conversations between authorized academic counterparts (e.g. enrolled Student <-> Course Instructor, departmental Faculty <-> HOD), soft deletion, edit tracking, and scoped message search.
4. **AI Assistant & Safety**: Isolated Gemini drafting, summarization, and tone adjustment with PII/token sanitization, deterministic offline fallback, and strict human review requirements before official publication.
