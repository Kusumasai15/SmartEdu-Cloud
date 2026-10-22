---
name: smartedu-mcp
description: Manage and interface with SmartEdu university infrastructure via Model Context Protocol (MCP) with mandatory authentication and RBAC. Author and publish coursework assignments, create proctored quizzes and question sets, inspect class cohort dossiers, query student rosters by registration number or email, and access the campus faculty directory.
---

# SmartEdu Model Context Protocol (MCP) Guide

This skill guides connecting any AI model or client (Antigravity, Claude Desktop, Cursor, Continue.dev, or custom MCP clients) to the **SmartEdu** university platform via standard **Model Context Protocol (MCP)** with **mandatory institutional authentication**.

## Initial Response

When this skill is invoked without a specific instruction, respond with:

> I'm ready to manage your SmartEdu university workspace via MCP. To protect sensitive university records, you must first connect and authorize your account using `connect_account(identifier="...", password="...")`. Once authorized, Faculty and Administrators can author assignments and quizzes, inspect class dossiers (like `IT - Semester 5 (Section AI & DS)`), and look up student rosters.

---

## 🔒 Mandatory Authentication & Security Model

The SmartEdu MCP server enforces **Role-Based Access Control (RBAC)**:
1. **Unauthenticated access is blocked**: Any attempt to query students, classes, or author coursework before connecting will return `AUTHENTICATION_REQUIRED`.
2. **`connect_account(identifier, password)`**: Must be called first. Accepts:
   * Faculty / Admin institutional email (e.g. `virendra.shrivastava@smartedu.edu`)
   * Student 13-digit registration number (e.g. `2411021060402`) or lateral entry code (`PROV/ASAC/BTECH/LE/7/25/007`)
   * Password
3. **Role Enforcement**:
   * **FACULTY / ADMINISTRATOR**: Full permission to author coursework (`create_assignment`, `create_quiz`), view dossiers, and inspect student records.
   * **STUDENT**: Read-only access to their enrolled courses, schedules, and assignments. Course creation is blocked with `FORBIDDEN`.

---

## Architecture & Transport

The SmartEdu MCP server operates over standard **stdio (JSON-RPC 2.0)** following the official Model Context Protocol specification (`2024-11-05`).

* **Server Script**: `smartedu_mcp_server.py`
* **Target Cloud Endpoint**: `https://15.252.235.113.sslip.io/api/v1`
* **Local Alternative**: `http://localhost:8000/api/v1`

---

## Client Setup & Configuration

### 1. Antigravity / Gemini Configuration
To register the server in your Antigravity environment:

```json
{
  "mcpServers": {
    "smartedu": {
      "command": "python",
      "args": [
        "c:/Users/275680/Desktop/DESIGN PROJECT 5SEM/smartedu_mcp_server.py"
      ],
      "env": {
        "API_BASE_URL": "https://15.252.235.113.sslip.io/api/v1"
      }
    }
  }
}
```

### 2. Claude Desktop Configuration
Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "smartedu": {
      "command": "python",
      "args": [
        "C:\\Users\\275680\\Desktop\\DESIGN PROJECT 5SEM\\smartedu_mcp_server.py"
      ],
      "env": {
        "API_BASE_URL": "https://15.252.235.113.sslip.io/api/v1"
      }
    }
  }
}
```

---

## Available MCP Tools Reference

### 1. `connect_account` (Mandatory First Step)
Authenticate and unlock the MCP session.
```json
{
  "identifier": "virendra.shrivastava@smartedu.edu",
  "password": "your_password"
}
```

### 2. `create_assignment` (Faculty / Admin Only)
Author and publish coursework assignments directly from conversation.
```json
{
  "course_code": "E1CSA 382",
  "title": "Assignment 1: Data Warehouse Star Schema Modeling",
  "description": "Design fact and dimension tables for retail enterprise transactions.",
  "instructions": "Submit PDF and SQL DDL script before the deadline.",
  "max_points": 100,
  "due_days": 7,
  "publish": true
}
```

### 3. `create_quiz` (Faculty / Admin Only)
Create a proctored examination or quiz complete with questions, options, and duration.
```json
{
  "course_code": "E1ITC 301",
  "title": "Java OOP & Polymorphism Assessment",
  "instructions": "All questions are compulsory. Single choice only.",
  "duration_minutes": 30,
  "total_marks": 20,
  "questions": [
    {
      "question_text": "Which keyword prevents method overriding in Java?",
      "marks": 2,
      "options": [
        {"text": "static", "is_correct": false},
        {"text": "final", "is_correct": true},
        {"text": "abstract", "is_correct": false},
        {"text": "protected", "is_correct": false}
      ]
    }
  ]
}
```

### 4. `get_student`
Inspect student records using either 13-digit registration numbers or institutional emails.
```json
{
  "identifier": "2411021060402"
}
```

### 5. `get_class_dossier`
Inspect full class cohort records including Class Advisor, enrolled students count, capacity, assigned curriculum courses, and timetable matrix.
```json
{
  "class_name": "IT - Semester 5 (Section AI & DS)"
}
```

### 6. `get_current_session` & `disconnect_account`
Inspect active user session details or clear the session to log out.
