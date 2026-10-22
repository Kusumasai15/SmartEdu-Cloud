# 🌐 SmartEdu Model Context Protocol (MCP) & ChatGPT Integration Guide

This guide provides the complete documentation and exact step-by-step instructions for connecting **ChatGPT**, **Claude Desktop**, **Antigravity**, **Cursor**, and custom LLM agents to your **SmartEdu Institutional Platform** using the official **Model Context Protocol (MCP)** and **OAuth 2.0 Authorization Code Grant**.

---

## 🔒 Security Architecture: Mandatory Authorization & RBAC

To protect student privacy and university records, **unauthenticated API access is strictly prohibited**:
1. **OAuth 2.0 Authorization Code Flow**:
   * Users sign in through the official SmartEdu login portal.
   * Credentials (passwords) are verified against institutional PBKDF2/bcrypt password hashes.
   * Access tokens (JWT) are signed and cryptographically verified on every tool execution.
2. **Role-Based Access Control (RBAC)**:
   * **FACULTY / ADMINISTRATOR**: Full permission to author assignments (`create_assignment`), publish proctored quizzes (`create_quiz`), grade submissions (`grade_submission`), and inspect class rosters (`get_class_dossier`).
   * **STUDENTS**: Strict read-only access to their own profile and enrolled courses. Coursework authoring is strictly blocked (`FORBIDDEN: Account role 'STUDENT' is not authorized`). Students attempting to query other students' dossiers are blocked (`PRIVACY_VIOLATION`).

---

## 🚀 ChatGPT Integration Details

### Discovery & Endpoints Summary

| Service | Public URL | Description |
| :--- | :--- | :--- |
| **Server Base URL** | `https://15.252.235.113.sslip.io` | Primary server domain |
| **Remote MCP Endpoint** | `https://15.252.235.113.sslip.io/mcp` | Streamable HTTP JSON-RPC 2.0 MCP endpoint |
| **SSE Transport Endpoint** | `https://15.252.235.113.sslip.io/sse` | Server-Sent Events (SSE) stream |
| **OAuth Authorization Server** | `https://15.252.235.113.sslip.io/.well-known/oauth-authorization-server` | RFC 8414 Discovery Metadata |
| **OAuth Protected Resource** | `https://15.252.235.113.sslip.io/.well-known/oauth-protected-resource` | RFC 9470 Resource Metadata |
| **OpenID Connect Discovery** | `https://15.252.235.113.sslip.io/.well-known/openid-configuration` | OpenID Connect Discovery |
| **OAuth Authorize URL** | `https://15.252.235.113.sslip.io/oauth/authorize` | Interactive login & consent screen |
| **OAuth Token URL** | `https://15.252.235.113.sslip.io/oauth/token` | Token exchange endpoint |
| **OAuth Client Registration** | `https://15.252.235.113.sslip.io/oauth/register` | RFC 7591 Dynamic Client Registration |
| **OpenAPI 3.1.0 Action Schema** | `https://15.252.235.113.sslip.io/mcp/openapi.json` | Schema for Custom GPT Actions |

---

## 🛠️ Step-by-Step Instructions: Connect in ChatGPT

### Method A: ChatGPT Custom GPT (Recommended)

1. Open [ChatGPT](https://chatgpt.com) and go to **Explore GPTs** &rarr; **+ Create**.
2. Go to the **Configure** tab.
3. Under **Actions**, click **Create new action**.
4. In the **Schema** box, choose **Import from URL** and paste:
   ```
   https://15.252.235.113.sslip.io/mcp/openapi.json
   ```
   *(Alternatively, copy and paste the OpenAPI JSON directly).*
5. Under **Authentication**, select **OAuth**:
   * **Client ID**: `chatgpt`
   * **Client Secret**: `smartedu_mcp_chatgpt_secret`
   * **Authorization URL**: `https://15.252.235.113.sslip.io/oauth/authorize`
   * **Token URL**: `https://15.252.235.113.sslip.io/oauth/token`
   * **Scope**: `mcp`
   * **Token Exchange Method**: `Default (POST request)`
6. Click **Save** (in the top-right corner) and choose **Only me** or **Anyone with a link**.
7. In the GPT chat window, click **Sign in with SmartEdu**.
8. A secure pop-up window opens displaying the SmartEdu Cloud Login screen:
   * **Faculty / Admin**: Enter your institutional email (e.g. `admin@smartedu.com`) and password (`AdminPassword123!`).
   * **Students**: Enter your 13-digit Registration Number (e.g. `2411021060402`) and password (`12345678`).
9. Click **Authorize & Connect Session**.
10. ChatGPT connects and immediately has access to authorized tools!

---

### Method B: ChatGPT Developer Platform / Remote MCP (Direct Server URL)

If you are using ChatGPT's Remote MCP / Connected Apps connector:
1. Enter the Server URL:
   ```
   https://15.252.235.113.sslip.io
   ```
   *or*
   ```
   https://15.252.235.113.sslip.io/mcp
   ```
2. ChatGPT automatically queries `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`.
3. Because both endpoints are now live on the server, ChatGPT automatically discovers the authorization parameters without showing **"Couldn't discover OAuth settings."**
4. Complete the sign-in prompt to authorize the session.

---

## 💻 Connecting from Claude Desktop

Edit your Claude Desktop configuration file:
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

## 📋 Available MCP Tools Reference (28 Production Tools)

| Tool Name | Access Level | Description |
| :--- | :--- | :--- |
| `get_university_stats` | **Public** | High-level university population, active term, and department stats. |
| `connect_account` | **Public** | Authorize session in-band using username/password. |
| `disconnect_account` | **Authenticated** | Wipe active token and disconnect. |
| `get_current_session` | **Authenticated** | Inspect active session user, role, and department. |
| `create_assignment` | **Faculty / Admin** | Create and publish assignments with deadlines and points. |
| `update_assignment` | **Faculty / Admin** | Update assignment metadata, due date, status, or description. |
| `create_quiz` | **Faculty / Admin** | Author continuous assessment exams and proctored quizzes. |
| `grade_submission` | **Faculty / Admin** | Grade student assignment submissions and provide feedback. |
| `list_assignment_submissions` | **Faculty / Admin** | Review all submissions and evaluation statuses for an assignment. |
| `submit_assignment` | **Student** | Submit coursework response text and/or attachment file link. |
| `get_class_dossier` | **Faculty / Admin** | Inspect complete class record: advisor, roster, curriculum, timetable. |
| `get_student_profile` | **RBAC Protected** | Students see own profile; Faculty/Admin can view any student. |
| `get_attendance_summary` | **RBAC Protected** | Inspect student attendance percentage, session count, and 75% compliance. |
| `get_student_results` | **RBAC Protected** | View semester GPA, earned credits, and course grade breakdown. |
| `get_my_timetable` | **Authenticated** | Inspect weekly timetable schedule with rooms and assigned faculty. |
| `get_course_workspace` | **RBAC Protected** | Full course overview: modules, assignments, exams, and enrolled students. |
| `list_assignments` | **Authenticated** | List course assignments. |
| `list_quizzes` | **Authenticated** | List scheduled quizzes and examinations. |
| `list_courses` | **Authenticated** | View active courses with credits and assigned faculty. |
| `list_faculty` | **Authenticated** | Access faculty directory and designations. |
| `list_departments` | **Authenticated** | View all academic departments, codes, and HODs. |
| `create_announcement` | **Faculty / Admin** | Publish university, department, or course-wide official announcements. |
| `list_announcements` | **Authenticated** | View official university notices and announcements. |
| `create_course` | **Admin / HOD** | Create new accredited academic course. |
| `add_course_module` | **Faculty / Admin** | Add syllabus module unit to a course. |
| `publish_module_content` | **Faculty / Admin** | Publish syllabus topic learning content or lecture notes. |
| `publish_flashcard_deck` | **Faculty / Admin** | Publish interactive study flashcard decks into course modules. |
| `onboard_user` | **Admin / VC** | Provision new student, faculty, or staff accounts with institutional roles. |
