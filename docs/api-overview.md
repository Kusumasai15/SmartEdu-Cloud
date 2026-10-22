# SmartEdu Cloud — Comprehensive API Architecture Overview

## 1. Authentication & Users
- `POST /api/v1/auth/login`: Issue access & refresh token.
- `POST /api/v1/auth/refresh`: Refresh JWT access token.
- `POST /api/v1/auth/logout`: Revoke active session.
- `GET /api/v1/auth/me`: Get current authenticated user profile.

## 2. Academic Core & LMS
- `/api/v1/departments`, `/api/v1/courses`, `/api/v1/semesters`, `/api/v1/content`, `/api/v1/assignments`.

## 3. Assessments & Proctoring
- `/api/v1/exams`, `/api/v1/exams/{id}/attempts`, `/api/v1/exams/{id}/proctoring-events`.

## 4. Attendance, Scheduling & Results
- `/api/v1/attendance`, `/api/v1/scheduling`, `/api/v1/results`, `/api/v1/academic-intelligence`.

## 5. Communication & Administration
- `/api/v1/notifications`, `/api/v1/announcements`, `/api/v1/messages`, `/api/v1/admin`.
