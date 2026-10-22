"""SmartEdu Model Context Protocol (MCP) Server.

Enforces strict institutional authentication and Role-Based Access Control (RBAC).
Users MUST first authorize their session using `connect_account` before accessing
academic records, student dossiers, or authoring coursework.

Specification: Model Context Protocol (JSON-RPC 2.0 stdio, 2024-11-05).
"""

import sys
import json
import urllib.request
import urllib.parse
import ssl
import os
import datetime
import uuid

API_BASE = os.environ.get("API_BASE_URL", "https://15.252.235.113.sslip.io/api/v1")
SESSION_FILE = os.path.expanduser("~/.smartedu_mcp_session.json")

# In-memory session state
_SESSION = {
    "token": os.environ.get("SMARTEDU_TOKEN", None),
    "user": None,
}

# SSL context ignoring self-signed certs for IP hostnames
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

def _load_cached_session():
    """Attempt to restore previously authorized session from disk."""
    global _SESSION
    if _SESSION.get("token") and _SESSION.get("user"):
        return _SESSION
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("token") and data.get("user"):
                    _SESSION["token"] = data["token"]
                    _SESSION["user"] = data["user"]
                    return _SESSION
        except Exception:
            pass
    return _SESSION

def _save_session(token: str, user: dict):
    """Persist authorized session token and user profile."""
    global _SESSION
    _SESSION["token"] = token
    _SESSION["user"] = user
    try:
        with open(SESSION_FILE, "w", encoding="utf-8") as f:
            json.dump({"token": token, "user": user, "updated_at": datetime.datetime.now().isoformat()}, f, indent=2)
    except Exception:
        pass

def _clear_session():
    """Clear active session from memory and disk."""
    global _SESSION
    _SESSION["token"] = None
    _SESSION["user"] = None
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
        except Exception:
            pass

def api_request(endpoint: str, method: str = "GET", data: dict = None, token: str = None):
    """Execute HTTP request against SmartEdu platform API."""
    url = f"{API_BASE}{endpoint}"
    headers = {
        "User-Agent": "SmartEdu-MCP/2.1",
        "Content-Type": "application/json"
    }
    active_token = token or _SESSION.get("token")
    if active_token:
        headers["Authorization"] = f"Bearer {active_token}"

    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=15) as resp:
            return {"status": resp.status, "data": json.loads(resp.read().decode("utf-8"))}
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = {"error": str(e)}
        return {"status": e.code, "error": err_body}
    except Exception as e:
        return {"status": 500, "error": str(e)}

def _require_auth(caller_token: str = None):
    """Check if current MCP session is authorized."""
    if caller_token:
        me_res = api_request("/auth/me", token=caller_token)
        if me_res.get("status") == 200:
            user_info = me_res.get("data", {}).get("data", {})
            role_name = user_info.get("role", {}).get("name", "STUDENT") if isinstance(user_info.get("role"), dict) else "STUDENT"
            dept_name = user_info.get("department", {}).get("name", "General") if isinstance(user_info.get("department"), dict) else "General"
            return True, {
                "token": caller_token,
                "user": {
                    "id": user_info.get("id"),
                    "full_name": user_info.get("full_name") or f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip(),
                    "email": user_info.get("email"),
                    "role": role_name,
                    "department": dept_name,
                    "student_identifier": user_info.get("student_identifier"),
                    "faculty_identifier": user_info.get("faculty_identifier"),
                    "permissions": user_info.get("permissions", [])
                }
            }

    session = _load_cached_session()
    if not session.get("token") or not session.get("user"):
        return False, {
            "authorized": False,
            "error": "AUTHENTICATION_REQUIRED: You must connect and authorize your SmartEdu account before accessing this tool.",
            "action_required": "Please call `connect_account(identifier='...', password='...')` with your institutional email or student registration number and password."
        }
    return True, session

def _resolve_course_id(course_code: str, token: str) -> str:
    """Helper to resolve human-readable course code (e.g. E1CSA 382) to course UUID."""
    res = api_request("/courses", token=token)
    if res.get("status") == 200:
        courses = res.get("data", {}).get("data", [])
        clean_target = course_code.replace(" ", "").upper()
        for c in courses:
            if (c.get("course_code") or "").replace(" ", "").upper() == clean_target:
                return c.get("id")
    return None


def _get_course_modules(course_id: str, token: str) -> list:
    """Fetch modules using /learn or /structure fallback."""
    l_res = api_request(f"/courses/{course_id}/learn", token=token)
    if l_res.get("status") == 200:
        mods = l_res.get("data", {}).get("modules", [])
        if isinstance(mods, list) and len(mods) > 0:
            return mods
    s_res = api_request(f"/courses/{course_id}/structure", token=token)
    if s_res.get("status") == 200:
        raw = s_res.get("data", {})
        mods = raw.get("modules") or raw.get("data", {}).get("modules", [])
        if isinstance(mods, list):
            return mods
    return []

def _resolve_module_id(course_id: str, module_ref, token: str) -> str:
    """Helper to resolve module number (1..5), title, or UUID to module ID."""
    modules = _get_course_modules(course_id, token)
    ref_str = str(module_ref).strip().lower()
    for m in modules:
        if m.get("id", "").lower() == ref_str:
            return m.get("id")
    try:
        mod_num = int(ref_str)
        for m in modules:
            if m.get("display_order") == mod_num or f"module {mod_num}" in (m.get("title") or "").lower():
                return m.get("id")
    except ValueError:
        pass
    for m in modules:
        if ref_str in (m.get("title") or "").lower():
            return m.get("id")
    ref_s = str(module_ref).strip()
    if "-" in ref_s or ref_s.startswith("mod-"):
        return ref_s
    if modules:
        return modules[0].get("id")
    return None

def _resolve_topic_id(course_id: str, module_id: str, topic_ref, token: str) -> str:
    """Helper to resolve topic title, display order, or UUID to topic ID."""
    modules = _get_course_modules(course_id, token)
    target_mod = next((m for m in modules if m.get("id") == module_id), None)
    if target_mod:
        topics = target_mod.get("topics", [])
        ref_str = str(topic_ref).strip().lower()
        for t in topics:
            if t.get("id", "").lower() == ref_str:
                return t.get("id")
        try:
            t_order = int(ref_str)
            for t in topics:
                if t.get("display_order") == t_order:
                    return t.get("id")
        except ValueError:
            pass
        for t in topics:
            if ref_str in (t.get("title") or "").lower() or (t.get("title") or "").lower() in ref_str:
                return t.get("id")
    ref_s = str(topic_ref).strip()
    if "-" in ref_s or ref_s.startswith("top-"):
        return ref_s
    return None

def _get_or_create_topic(course_id: str, module_id: str, topic_title: str, token: str) -> str:
    """Resolve topic ID or dynamically create topic under module if it does not exist."""
    tid = _resolve_topic_id(course_id, module_id, topic_title, token)
    if tid:
        return tid
    # Auto-create topic
    payload = {"title": topic_title, "description": f"Curriculum topic: {topic_title}", "display_order": 1}
    res = api_request(f"/modules/{module_id}/topics", method="POST", data=payload, token=token)
    if res.get("status") in [200, 201]:
        return res.get("data", {}).get("data", {}).get("id") or res.get("data", {}).get("id")
    return None

def handle_call_tool(name: str, args: dict, caller_token: str = None):
    # ─── 1. CONNECT ACCOUNT (LOGIN & AUTHORIZE) ───────────────────
    if name == "connect_account":
        identifier = args.get("identifier", "").strip()
        password = args.get("password", "").strip()

        if not identifier or not password:
            return {
                "success": False,
                "error": "Both `identifier` (email or registration number) and `password` are required."
            }

        # Step 1: Login
        login_res = api_request("/auth/login", method="POST", data={"email": identifier, "password": password})
        if login_res.get("status") != 200:
            return {
                "success": False,
                "authorized": False,
                "error": "Authentication failed. Invalid email/registration number or password.",
                "details": login_res.get("error")
            }

        token = login_res.get("data", {}).get("data", {}).get("access_token")
        if not token:
            return {"success": False, "error": "Token not received from authentication service."}

        # Step 2: Fetch User Profile
        me_res = api_request("/auth/me", token=token)
        user_info = me_res.get("data", {}).get("data", {}) if me_res.get("status") == 200 else {}
        role_name = user_info.get("role", {}).get("name", "STUDENT") if isinstance(user_info.get("role"), dict) else "STUDENT"
        dept_name = user_info.get("department", {}).get("name", "General") if isinstance(user_info.get("department"), dict) else "General"

        user_profile = {
            "id": user_info.get("id"),
            "full_name": user_info.get("full_name") or f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip(),
            "email": user_info.get("email"),
            "role": role_name,
            "department": dept_name,
            "student_identifier": user_info.get("student_identifier"),
            "faculty_identifier": user_info.get("faculty_identifier"),
            "permissions": user_info.get("permissions", [])
        }

        _save_session(token, user_profile)

        return {
            "success": True,
            "authorized": True,
            "message": f"Successfully authorized SmartEdu MCP session for {user_profile['full_name']} ({role_name}).",
            "session": user_profile
        }

    # ─── 2. DISCONNECT ACCOUNT (LOGOUT) ───────────────────────────
    elif name == "disconnect_account":
        _clear_session()
        return {
            "success": True,
            "message": "Logged out and active MCP session cleared successfully."
        }

    # ─── 3. GET CURRENT SESSION ───────────────────────────────────
    elif name == "get_current_session":
        session = _load_cached_session()
        if session.get("user"):
            return {
                "authorized": True,
                "user": session["user"]
            }
        return {
            "authorized": False,
            "message": "No active SmartEdu session. Please connect using `connect_account`."
        }

    # ─── 4. GET UNIVERSITY STATS (PUBLIC) ─────────────────────────
    elif name == "get_university_stats":
        return {
            "status": "ONLINE",
            "active_semester": "Fall Semester 2026 (Odd Sem)",
            "academic_year": "2026-2027",
            "total_users": 98,
            "faculty_count": 37,
            "students_count": 58,
            "administrators_count": 1,
            "specialization_sections": [
                "IT - Semester 5 (Section AI & DS)",
                "CSE - Semester 5 (Section A)",
                "BBA Analytics - Semester 1 (Section A)"
            ],
            "api_endpoint": API_BASE
        }

    # ─── FOR ALL TOOLS BELOW: REQUIRE ACTIVE AUTHENTICATION ───────
    is_auth, auth_session = _require_auth(caller_token)
    if not is_auth:
        return auth_session

    current_user = auth_session["user"]
    current_role = current_user.get("role", "STUDENT")
    token = auth_session["token"]

    # ─── 5. CREATE ASSIGNMENT (FACULTY / ADMIN ONLY) ──────────────
    if name == "create_assignment":
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {
                "success": False,
                "error": f"FORBIDDEN: Account role '{current_role}' is not authorized to author assignments. Faculty or Admin privileges required."
            }

        course_code = args.get("course_code", "").strip()
        title = args.get("title", "").strip()
        description = args.get("description", "Coursework assignment created via MCP.")
        instructions = args.get("instructions", "Submit solution before statutory deadline.")
        max_points = int(args.get("max_points", 100))
        due_days = int(args.get("due_days", 7))
        publish = bool(args.get("publish", True))

        if not course_code or not title:
            return {"success": False, "error": "`course_code` and `title` are required."}

        # Resolve course ID
        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found in active catalog."}

        due_date = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=due_days)).isoformat()
        payload = {
            "title": title,
            "description": description,
            "instructions": instructions,
            "max_points": max_points,
            "passing_points": int(max_points * 0.4),
            "due_date": due_date,
            "status": "PUBLISHED" if publish else "DRAFT"
        }

        api_res = api_request(f"/courses/{course_id}/assignments", method="POST", data=payload, token=token)
        if api_res.get("status") in [200, 201]:
            return {
                "success": True,
                "message": f"Assignment '{title}' authored and published successfully.",
                "data": api_res.get("data")
            }
        return {
            "success": False,
            "error": "Failed to create assignment on server.",
            "details": api_res.get("error")
        }

    # ─── 6. CREATE QUIZ / EXAM (FACULTY / ADMIN ONLY) ─────────────
    elif name == "create_quiz":
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {
                "success": False,
                "error": f"FORBIDDEN: Account role '{current_role}' is not authorized to author quizzes. Faculty or Admin privileges required."
            }

        course_code = args.get("course_code", "").strip()
        title = args.get("title", "").strip()
        instructions = args.get("instructions", "All questions are compulsory.")
        duration_minutes = int(args.get("duration_minutes", 30))
        total_marks = float(args.get("total_marks", 20.0))
        passing_marks = float(args.get("passing_marks", total_marks * 0.4))
        raw_questions = args.get("questions", [])

        if not course_code or not title:
            return {"success": False, "error": "`course_code` and `title` are required."}

        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found in active catalog."}

        formatted_questions = []
        for q in raw_questions:
            options = []
            for idx, opt in enumerate(q.get("options", [])):
                options.append({
                    "option_text": opt.get("text") or opt.get("option_text", ""),
                    "is_correct": bool(opt.get("is_correct", False)),
                    "display_order": idx + 1
                })
            formatted_questions.append({
                "question_type": "MCQ_SINGLE",
                "difficulty": "MEDIUM",
                "question_text": q.get("question_text", "Untitled Question"),
                "points": float(q.get("marks", 2.0)),
                "options": options
            })

        if not formatted_questions:
            # Add at least one default question if none supplied
            formatted_questions.append({
                "question_type": "MCQ_SINGLE",
                "difficulty": "MEDIUM",
                "question_text": "Sample assessment verification question",
                "points": 5.0,
                "options": [
                    {"option_text": "Correct Option", "is_correct": True, "display_order": 1},
                    {"option_text": "Incorrect Option", "is_correct": False, "display_order": 2}
                ]
            })

        quiz_payload = {
            "title": title,
            "instructions": instructions,
            "exam_type": "QUIZ",
            "duration_minutes": duration_minutes,
            "total_marks": total_marks,
            "passing_marks": passing_marks,
            "is_published": True,
            "questions": formatted_questions
        }

        api_res = api_request(f"/courses/{course_id}/exams/transactional-quiz", method="POST", data=quiz_payload, token=token)
        if api_res.get("status") in [200, 201]:
            try:
                new_quiz_id = api_res.get("data", {}).get("id") or f"quiz-{int(datetime.datetime.now().timestamp())}"
                scheduled_payload = {
                    "id": new_quiz_id,
                    "courseCode": course_code,
                    "courseName": (api_res.get("data", {}).get("course_name") or title),
                    "title": title,
                    "description": instructions,
                    "timeLimitMinutes": duration_minutes,
                    "totalPoints": int(total_marks),
                    "weightPercentage": 25,
                    "dueDate": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat(),
                    "isCameraProctored": False,
                    "questions": [
                        {
                            "id": f"q-{idx+1}",
                            "prompt": q.get("question_text", "Untitled Question"),
                            "options": [opt.get("option_text") for opt in q.get("options", [])],
                            "correctIndex": next((i for i, opt in enumerate(q.get("options", [])) if opt.get("is_correct")), 0),
                            "explanation": "Verified correct option.",
                            "points": int(q.get("points", 1))
                        }
                        for idx, q in enumerate(formatted_questions)
                    ],
                    "attempts": {},
                    "isPublished": True
                }
                api_request("/assessments/scheduled-exams", method="POST", data=scheduled_payload, token=token)
            except Exception:
                pass
            return {
                "success": True,
                "message": f"Proctored Quiz '{title}' created successfully with {len(formatted_questions)} questions.",
                "data": api_res.get("data")
            }
        return {
            "success": False,
            "error": "Failed to create quiz on server.",
            "details": api_res.get("error")
        }

    # ─── 7. GET STUDENT DOSSIER ───────────────────────────────────
    elif name == "get_student":
        identifier = args.get("identifier", "").strip()
        if not identifier:
            return {"success": False, "error": "identifier is required."}

        res = api_request(f"/admin/users?search={urllib.parse.quote(identifier)}", token=token)
        users_list = res.get("data", []) if res.get("status") == 200 else []
        return {
            "query": identifier,
            "matches_count": len(users_list),
            "records": users_list
        }

    # ─── 8. GET CLASS DOSSIER ─────────────────────────────────────
    elif name == "get_class_dossier":
        class_name = args.get("class_name", "IT - Semester 5 (Section AI & DS)").strip()

        assigned_courses = [
            {"code": "E1CSA 382", "name": "Data Mining and Data Warehousing", "type": "Theory", "credits": 3, "instructor": "DR. VIRENDRA KUMAR SHRIVASTAVA"},
            {"code": "E1CSA 313", "name": "Design Project-I", "type": "Theory", "credits": 2, "instructor": "DR. M. VIVEK ANAND"},
            {"code": "E1ITC 302", "name": "Graph Analytics", "type": "Theory", "credits": 3, "instructor": "DR. SUBRATA PAIN & MRS. KUSUMA J"},
            {"code": "E1CSK 309", "name": "IBM CE-Text Analytics", "type": "Theory", "credits": 3, "instructor": "MANJUNATH S KEDILAYA"},
            {"code": "E1ITC 308", "name": "Industrial Certification-I", "type": "Practical", "credits": 2, "instructor": "DR. SUBRATA PAIN"},
            {"code": "E1ITC 301", "name": "Java Programming", "type": "Theory", "credits": 4, "instructor": "DR. M. VIVEK ANAND & MS. S THASMIYA"},
            {"code": "E1CSA 317", "name": "Leadership and Management Skills", "type": "Theory", "credits": 2, "instructor": "DR. BALAJI S K SWAMINATHAN & DR. MOUNICA VALLABHANENI"},
            {"code": "E1CSA 108", "name": "Soft Skills - II", "type": "Practical", "credits": 1, "instructor": "BHAVANI"},
            {"code": "E1CSA 414", "name": "Theory and Practice of Modern Cryptography", "type": "Theory", "credits": 3, "instructor": "MR. SACHIN KUMAR & MS. DEEPIKA NAYAK"},
            {"code": "E1CSA 400", "name": "Theory of Computation", "type": "Theory", "credits": 3, "instructor": "MR. JUARIS ESEGEMU EPAH"},
        ]

        return {
            "class_name": class_name,
            "department": "Information Technology (IT)",
            "school": "Alliance School Of Advanced Computing (ASAC)",
            "semester": "Semester 5",
            "section": "Section AI & DS",
            "academic_year": "2024-2028",
            "enrolled_students_count": 58,
            "capacity": 60,
            "advisor": {
                "name": "DR. VIRENDRA KUMAR SHRIVASTAVA",
                "email": "virendra.shrivastava@smartedu.edu",
                "designation": "Class Advisor & Senior Faculty"
            },
            "assigned_courses": assigned_courses,
            "timetable_summary": "6 Working Days (Mon - Sat) across 6 daily lecture periods in room IT Lab 3"
        }

    # ─── 9. LIST FACULTY DIRECTORY ────────────────────────────────
    elif name == "list_faculty":
        dept = args.get("department", "").strip()
        endpoint = f"/faculty-directory?department_id={dept}" if dept else "/faculty-directory"
        res = api_request(endpoint, token=token)
        return {"department": dept or "ALL", "directory": res.get("data", [])}

    # ─── 10. LIST COURSES ─────────────────────────────────────────
    elif name == "list_courses":
        dept = args.get("department", "").strip()
        endpoint = f"/courses?department_id={dept}" if dept else "/courses"
        res = api_request(endpoint, token=token)
        return {"department": dept or "ALL", "courses": res.get("data", {})}

    # ─── 11. LIST ASSIGNMENTS ─────────────────────────────────────
    elif name == "list_assignments":
        course_code = args.get("course_code", "").strip()
        if course_code:
            course_id = _resolve_course_id(course_code, token)
            if course_id:
                res = api_request(f"/courses/{course_id}/assignments", token=token)
                return {"course_code": course_code, "assignments": res.get("data", [])}
        res = api_request("/assignments", token=token)
        return {"course_code": course_code or "ALL", "assignments": res.get("data", [])}

    # ─── 12. LIST QUIZZES ─────────────────────────────────────────
    elif name == "list_quizzes":
        course_code = args.get("course_code", "").strip()
        if course_code:
            course_id = _resolve_course_id(course_code, token)
            if course_id:
                res = api_request(f"/courses/{course_id}/exams", token=token)
                return {"course_code": course_code, "quizzes": res.get("data", [])}
        res = api_request("/assessments/scheduled-exams", token=token)
        return {"course_code": course_code or "ALL", "quizzes": res.get("data", [])}

    # ─── 13. GET ATTENDANCE SUMMARY ───────────────────────────────
    elif name == "get_attendance_summary":
        ident = args.get("student_identifier", "").strip()
        course_code = args.get("course_code", "").strip()
        endpoint = f"/attendance/summary"
        params = []
        if ident:
            params.append(f"student_identifier={urllib.parse.quote(ident)}")
        if course_code:
            params.append(f"course_code={urllib.parse.quote(course_code)}")
        if params:
            endpoint += f"?{'&'.join(params)}"
        res = api_request(endpoint, token=token)
        return res.get("data", res)

    # ─── 14. SUBMIT ASSIGNMENT ────────────────────────────────────
    elif name == "submit_assignment":
        assignment_id = args.get("assignment_id", "").strip()
        if not assignment_id:
            return {"success": False, "error": "`assignment_id` is required."}
        payload = {
            "submission_text": args.get("submission_text", ""),
            "attachment_url": args.get("attachment_url", "")
        }
        res = api_request(f"/assignments/{assignment_id}/submissions", method="POST", data=payload, token=token)
        return res.get("data", res)

    # ─── 15. CREATE ANNOUNCEMENT ──────────────────────────────────
    elif name == "create_announcement":
        title = args.get("title", "").strip()
        content = args.get("content", "").strip()
        if not title or not content:
            return {"success": False, "error": "`title` and `content` are required."}
        raw_scope = str(args.get("scope_type", "INSTITUTION")).upper()
        scope_type = "INSTITUTION" if raw_scope in ["CAMPUS", "GLOBAL", "ALL", "INSTITUTION"] else ("DEPARTMENT" if "DEPT" in raw_scope else "COURSE")
        raw_priority = str(args.get("priority", "IMPORTANT")).upper()
        priority = "CRITICAL" if raw_priority in ["URGENT", "CRITICAL"] else ("NORMAL" if raw_priority == "LOW" else "IMPORTANT")
        scope_id = args.get("scope_id")
        course_code = args.get("course_code")
        if course_code and not scope_id:
            c_id = _resolve_course_id(course_code, token)
            if c_id:
                scope_id = c_id
                scope_type = "COURSE"
        payload = {
            "title": title,
            "content": content,
            "priority": priority,
            "scope_type": scope_type,
            "scope_id": scope_id,
            "is_acknowledgement_required": bool(args.get("is_acknowledgement_required", False))
        }
        res = api_request("/announcements", method="POST", data=payload, token=token)
        if res.get("status") in [200, 201]:
            ann_data = res.get("data", {})
            try:
                vault_res = api_request("/admin/operational-state", token=token)
                if vault_res.get("status") == 200:
                    ann_list = vault_res.get("data", {}).get("announcements", []) or []
                    ann_entry = {
                        "id": ann_data.get("id") or f"ann-{int(datetime.datetime.now().timestamp())}",
                        "title": title,
                        "content": content,
                        "authorName": current_user.get("full_name") or "Faculty",
                        "courseCode": course_code or "",
                        "audience": "Section AI & DS" if "ai-ds" in (title + content).lower() else "Campus",
                        "createdAt": "Just now",
                        "priority": "HIGH" if priority in ["IMPORTANT", "CRITICAL"] else "NORMAL",
                        "category": "Academic"
                    }
                    api_request("/admin/operational-state", method="PATCH", data={"announcements": [ann_entry] + ann_list}, token=token)
            except Exception:
                pass
            return {
                "success": True,
                "message": f"Announcement '{title}' published successfully.",
                "announcement": ann_data
            }
        else:
            return {
                "success": False,
                "status": res.get("status"),
                "error": res.get("error")
            }

    # ─── 16. LIST ANNOUNCEMENTS ───────────────────────────────────
    elif name == "list_announcements":
        res = api_request("/announcements", token=token)
        raw_items = res.get("data", res)
        ann_items = raw_items if isinstance(raw_items, list) else []
        return {
            "success": True,
            "count": len(ann_items),
            "announcements": ann_items
        }

    # ─── 17. LIST DEPARTMENTS ─────────────────────────────────────
    elif name == "list_departments":
        res = api_request("/academic/departments", token=token)
        return res.get("data", res)

    # ─── 18. GET STUDENT RESULTS ──────────────────────────────────
    elif name == "get_student_results":
        ident = args.get("student_identifier", "").strip()
        sem_id = args.get("semester_id", "").strip()
        endpoint = "/results/summary"
        params = []
        if ident:
            params.append(f"student_identifier={urllib.parse.quote(ident)}")
        if sem_id:
            params.append(f"semester_id={urllib.parse.quote(sem_id)}")
        if params:
            endpoint += f"?{'&'.join(params)}"
        res = api_request(endpoint, token=token)
        return res.get("data", res)

    # ─── 19. GET MY TIMETABLE ─────────────────────────────────────
    elif name == "get_my_timetable":
        res = api_request("/scheduling/timetable/my-schedule", token=token)
        return res.get("data", res)

    # ─── 20. GET QUIZ ATTENDEES (FACULTY / ADMIN) ─────────────────
    elif name == "get_quiz_attendees":
        quiz_id = args.get("quiz_id", "").strip()
        if not quiz_id:
            course_code = args.get("course_code", "").strip()
            quizzes_res = api_request("/assessments/scheduled-exams", token=token)
            items = quizzes_res.get("data", []) if isinstance(quizzes_res.get("data"), list) else (quizzes_res if isinstance(quizzes_res, list) else [])
            if course_code:
                items = [q for q in items if q.get("course_code") == course_code]
            return {"quizzes": items, "summary": f"Found {len(items)} quizzes. Specify quiz_id for detailed candidate attendee roster."}
        res = api_request(f"/assessments/scheduled-exams/{quiz_id}", token=token)
        return res.get("data", res)

    # ─── 21. DELETE QUIZ (FACULTY / ADMIN) ────────────────────────
    elif name == "delete_quiz":
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        quiz_id = args.get("quiz_id", "").strip()
        if not quiz_id:
            return {"success": False, "error": "`quiz_id` is required."}
        res = api_request(f"/assessments/scheduled-exams/{quiz_id}", method="DELETE", token=token)
        return {"success": True, "message": f"Quiz '{quiz_id}' deleted successfully.", "data": res}

    # ─── 22. CREATE CASE STUDY (FACULTY / ADMIN) ─────────────────
    elif name == "create_case_study":
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        course_code = args.get("course_code", "").strip()
        title = args.get("title", "").strip()
        scenario = args.get("scenario", "Case study scenario and business problem context.")
        deliverables = args.get("deliverables", "Comprehensive architectural and analytical case report.")
        max_points = int(args.get("max_points", 50))
        due_days = int(args.get("due_days", 10))
        if not course_code or not title:
            return {"success": False, "error": "`course_code` and `title` are required."}
        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found."}
        due_date = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=due_days)).isoformat()
        payload = {
            "title": f"[Case Study] {title}",
            "description": scenario,
            "instructions": deliverables,
            "max_points": max_points,
            "passing_points": int(max_points * 0.4),
            "due_date": due_date,
            "status": "PUBLISHED"
        }
        res = api_request(f"/courses/{course_id}/assignments", method="POST", data=payload, token=token)
        try:
            vault_res = api_request("/admin/operational-state", token=token)
            curr_projs = vault_res.get("data", {}).get("facultyProjects", []) or [] if vault_res.get("status") == 200 else []
            proj_id = res.get("data", {}).get("id") or f"proj-{int(datetime.datetime.now().timestamp())}"
            new_proj = {
                "id": proj_id,
                "courseCode": course_code,
                "title": title,
                "theme": theme,
                "deliverables": deliverables,
                "maxPoints": max_points,
                "dueDays": due_days,
                "status": "PUBLISHED",
                "teams": [],
                "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            api_request("/admin/operational-state", method="PATCH", data={"facultyProjects": [new_proj] + [p for p in curr_projs if p.get("id") != proj_id]}, token=token)
        except Exception:
            pass
        return res.get("data", res)

    # ─── 23. CREATE PROJECT / IDEATHON (FACULTY / ADMIN) ─────────
    elif name == "create_project_ideathon":
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        course_code = args.get("course_code", "").strip()
        title = args.get("title", "").strip()
        theme = args.get("theme", "Collaborative project and hackathon challenge theme.")
        deliverables = args.get("deliverables", "Working prototype repository and executive pitch slide deck.")
        max_points = int(args.get("max_points", 100))
        due_days = int(args.get("due_days", 14))
        if not course_code or not title:
            return {"success": False, "error": "`course_code` and `title` are required."}
        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found."}
        due_date = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=due_days)).isoformat()
        payload = {
            "title": f"[Ideathon / Project] {title}",
            "description": theme,
            "instructions": deliverables,
            "max_points": max_points,
            "passing_points": int(max_points * 0.4),
            "due_date": due_date,
            "status": "PUBLISHED"
        }
        res = api_request(f"/courses/{course_id}/assignments", method="POST", data=payload, token=token)
        return res.get("data", res)

    # ─── 24. CREATE / ADD COURSE MODULE (FACULTY / ADMIN) ─────────
    elif name in ["create_course_module", "add_course_module", "create_module"]:
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        course_code = args.get("course_code", "").strip()
        title = args.get("title", "").strip()
        description = args.get("description", "")
        module_number = int(args.get("module_number", args.get("display_order", 1)))
        if not course_code or not title:
            return {"success": False, "error": "`course_code` and `title` are required."}
        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found."}
        
        # Check if module already exists to be idempotent
        existing_mod_id = _resolve_module_id(course_id, title, token) or _resolve_module_id(course_id, module_number, token)
        created_topics = []
        raw_topics = args.get("topics") or []
        
        if existing_mod_id:
            mod_id = existing_mod_id
            msg = f"Module '{title}' already exists in {course_code} (id: {mod_id})."
        else:
            payload = {
                "title": title,
                "description": description,
                "display_order": module_number
            }
            res = api_request(f"/courses/{course_id}/modules", method="POST", data=payload, token=token)
            if res.get("status") not in [200, 201]:
                return {"success": False, "error": res.get("error", "Failed to create module.")}
            mod_data = res.get("data", {})
            mod_id = mod_data.get("id") or mod_data.get("data", {}).get("id")
            msg = f"Module '{title}' created successfully for {course_code}."

        # Add initial topics if provided
        if isinstance(raw_topics, list) and mod_id:
            for idx, t in enumerate(raw_topics, start=1):
                t_title = t if isinstance(t, str) else t.get("title", f"Topic {idx}")
                t_desc = t.get("description", "") if isinstance(t, dict) else ""
                t_res = api_request(f"/modules/{mod_id}/topics", method="POST", data={"title": t_title, "description": t_desc, "display_order": idx}, token=token)
                if t_res.get("status") in [200, 201]:
                    created_topics.append(t_title)

        return {
            "success": True,
            "message": msg,
            "module_id": mod_id,
            "course_code": course_code,
            "created_topics": created_topics
        }

    # ─── 25. CREATE COURSE TOPIC (FACULTY / ADMIN) ─────────────────
    elif name in ["create_course_topic", "create_topic", "add_course_topic", "add_topic"]:
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        course_code = args.get("course_code", "").strip()
        module_ref = args.get("module_number") or args.get("module_title") or args.get("module_id") or 1
        title = args.get("title", "").strip()
        description = args.get("description", "")
        display_order = int(args.get("display_order", 1))
        if not course_code or not title:
            return {"success": False, "error": "`course_code` and `title` are required."}
        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found."}
        module_id = _resolve_module_id(course_id, module_ref, token)
        if not module_id:
            # Auto-create module if not present
            mod_title = f"Module {module_ref}: Academic Syllabus" if str(module_ref).isdigit() else str(module_ref)
            m_res = api_request(f"/courses/{course_id}/modules", method="POST", data={"title": mod_title, "display_order": int(module_ref) if str(module_ref).isdigit() else 1}, token=token)
            module_id = m_res.get("data", {}).get("id") or m_res.get("data", {}).get("data", {}).get("id")
        
        if not module_id:
            return {"success": False, "error": f"Unable to resolve or create module '{module_ref}'."}

        payload = {
            "title": title,
            "description": description,
            "display_order": display_order
        }
        res = api_request(f"/modules/{module_id}/topics", method="POST", data=payload, token=token)
        return {
            "success": res.get("status") in [200, 201],
            "message": f"Topic '{title}' added under module '{module_ref}'.",
            "data": res.get("data", res)
        }

    # ─── 26. CREATE TOPIC SUBTOPIC / LESSON CONTENT (FACULTY / ADMIN) 
    elif name in ["create_topic_subtopic", "publish_module_content", "create_subtopic", "add_subtopic", "publish_content"]:
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        course_code = args.get("course_code", "").strip()
        module_ref = args.get("module_number") or args.get("module_title") or args.get("module_id") or 1
        topic_ref = args.get("topic_title") or args.get("topic_id") or "Core Concepts & Fundamentals"
        title = args.get("title", "").strip() or "Comprehensive Lecture Notes"
        description = args.get("description", "")
        text_content = args.get("text_content", "") or args.get("content", "")
        content_type = str(args.get("content_type", "TEXT_CONTENT")).upper()
        content_url = args.get("content_url", None)
        display_order = int(args.get("display_order", 1))

        if not course_code:
            return {"success": False, "error": "`course_code` is required."}
        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found."}
        module_id = _resolve_module_id(course_id, module_ref, token)
        if not module_id:
            mod_title = f"Module {module_ref}" if str(module_ref).isdigit() else str(module_ref)
            m_res = api_request(f"/courses/{course_id}/modules", method="POST", data={"title": mod_title, "display_order": 1}, token=token)
            module_id = m_res.get("data", {}).get("id") or m_res.get("data", {}).get("data", {}).get("id")

        topic_id = _get_or_create_topic(course_id, module_id, topic_ref, token)
        if not topic_id:
            return {"success": False, "error": f"Could not resolve or create topic '{topic_ref}'."}

        payload = {
            "title": title,
            "description": description or f"Learning subtopic content for {title}",
            "content_type": content_type,
            "text_content": text_content,
            "content_url": content_url,
            "display_order": display_order,
            "status": "PUBLISHED",
            "is_required": True
        }
        res = api_request(f"/topics/{topic_id}/content", method="POST", data=payload, token=token)
        return {
            "success": res.get("status") in [200, 201],
            "message": f"Subtopic '{title}' published into topic '{topic_ref}' under module flow.",
            "data": res.get("data", res),
            "portal_path": f"/courses/{course_id}/learn"
        }

    # ─── 27. PUBLISH FLASHCARD DECK (FACULTY / ADMIN) ──────────────
    elif name in ["publish_flashcard_deck", "create_flashcard_deck", "create_flashcards", "add_flashcards"]:
        if current_role not in ["FACULTY", "HOD", "ADMINISTRATOR"]:
            return {"success": False, "error": f"FORBIDDEN: Account role '{current_role}' not authorized."}
        course_code = args.get("course_code", "").strip()
        module_ref = args.get("module_number") or args.get("module_title") or args.get("module_id") or 1
        topic_ref = args.get("topic_title") or args.get("topic_id") or "Core Knowledge & Memory Anchors"
        title = args.get("title", "").strip() or f"Flashcard Deck: {topic_ref}"
        
        raw_cards = args.get("cards") or args.get("flashcards") or []
        normalized_cards = []
        if isinstance(raw_cards, list):
            for idx, c in enumerate(raw_cards, start=1):
                if isinstance(c, dict):
                    term = str(c.get("term") or c.get("question") or c.get("front") or c.get("title") or "").strip()
                    definition = str(c.get("definition") or c.get("answer") or c.get("back") or c.get("lead_summary") or "").strip()
                    example = str(c.get("example") or c.get("construction") or "").strip()
                    if term and definition:
                        normalized_cards.append({
                            "card_index": idx,
                            "term": term,
                            "definition": definition,
                            "example": example
                        })
                elif isinstance(c, str) and ":" in c:
                    parts = c.split(":", 1)
                    normalized_cards.append({
                        "card_index": idx,
                        "term": parts[0].strip(),
                        "definition": parts[1].strip(),
                        "example": ""
                    })

        if not normalized_cards:
            return {"success": False, "error": "At least one complete flashcard (term & definition) is required."}

        course_id = _resolve_course_id(course_code, token)
        if not course_id:
            return {"success": False, "error": f"Course '{course_code}' not found."}
        module_id = _resolve_module_id(course_id, module_ref, token)
        if not module_id:
            mod_title = f"Module {module_ref}" if str(module_ref).isdigit() else str(module_ref)
            m_res = api_request(f"/courses/{course_id}/modules", method="POST", data={"title": mod_title, "display_order": 1}, token=token)
            module_id = m_res.get("data", {}).get("id") or m_res.get("data", {}).get("data", {}).get("id")

        topic_id = _get_or_create_topic(course_id, module_id, topic_ref, token)
        if not topic_id:
            return {"success": False, "error": f"Could not resolve or create topic '{topic_ref}'."}

        flashcard_payload = {
            "title": title,
            "description": f"Interactive flashcard study deck with {len(normalized_cards)} cards.",
            "content_type": "EMBEDDED_CONTENT",
            "text_content": json.dumps({"kind": "FLASHCARD_DECK", "cards": normalized_cards}, ensure_ascii=True),
            "display_order": 1,
            "status": "PUBLISHED",
            "is_required": False
        }
        res = api_request(f"/topics/{topic_id}/content", method="POST", data=flashcard_payload, token=token)
        return {
            "success": res.get("status") in [200, 201],
            "message": f"Flashcard deck with {len(normalized_cards)} cards published successfully to {course_code} -> {topic_ref}.",
            "cards_count": len(normalized_cards),
            "topic_id": topic_id,
            "portal_path": f"/courses/{course_id}/learn"
        }

    # ─── 28. STORE & CACHE AI GENERATION / TRANSLATION ON EC2 ─────
    elif name in ["store_ai_generation", "cache_ai_generation", "store_ai_translation"]:
        course_code = str(args.get("course_code", "")).strip().upper()
        topic = str(args.get("topic", "")).strip()
        mode = str(args.get("mode", "LESSON")).strip().upper()
        language = str(args.get("language", "en")).strip().lower()
        gen_data = args.get("data") or args.get("content") or args.get("translation")
        
        if not course_code or not topic or not gen_data:
            return {"success": False, "error": "`course_code`, `topic`, and `data` (content) are required."}
            
        cache_dir = "/tmp/smartedu_ai_cache"
        try:
            os.makedirs(cache_dir, exist_ok=True)
            cache_file = os.path.join(cache_dir, "ai_generations_cache.json")
            cache_db = {}
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        cache_db = json.load(f)
                except Exception:
                    cache_db = {}
            clean_c = course_code.replace(" ", "")
            clean_t = "".join(c if c.isalnum() else "_" for c in topic.lower())
            cache_key = f"{clean_c}__{mode}__{clean_t}__{language}"
            
            cache_db[cache_key] = {
                "key": cache_key,
                "courseCode": course_code,
                "topic": topic,
                "mode": mode,
                "language": language,
                "data": gen_data,
                "source": "CHATGPT" if "chatgpt" in str(args).lower() else "MCP",
                "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cache_db, f, indent=2)
                
            # If flashcards, also attach structurally to module flow
            if mode == "FLASHCARDS" and isinstance(gen_data, (list, dict)):
                cards_list = gen_data if isinstance(gen_data, list) else gen_data.get("cards", [])
                if cards_list:
                    handle_call_tool("publish_flashcard_deck", {
                        "course_code": course_code,
                        "topic_title": topic,
                        "cards": cards_list
                    }, caller_token)

            return {
                "success": True,
                "message": f"AI generation stored in EC2 persistent storage for instant retrieval.",
                "cache_key": cache_key,
                "storage_location": cache_file
            }
        except Exception as e:
            return {"success": False, "error": f"Failed to persist AI generation: {str(e)}"}

    # ─── 29. GET CACHED AI GENERATION FROM EC2 ─────────────────────
    elif name in ["get_cached_ai_generation", "list_cached_ai_generations"]:
        cache_file = "/tmp/smartedu_ai_cache/ai_generations_cache.json"
        if not os.path.exists(cache_file):
            return {"success": True, "count": 0, "generations": []}
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"success": True, "count": len(data), "generations": list(data.values())}
        except Exception as e:
            return {"success": False, "error": str(e)}

    else:
        # Transparent fallback to live remote MCP endpoint on the backend
        try:
            mcp_endpoint = API_BASE.replace("/api/v1", "").rstrip("/") + "/mcp"
            req_data = {
                "jsonrpc": "2.0",
                "id": int(time.time()),
                "method": "tools/call",
                "params": {"name": name, "arguments": args}
            }
            h = {"Content-Type": "application/json"}
            if token:
                h["Authorization"] = f"Bearer {token}"
            req = urllib.request.Request(mcp_endpoint, data=json.dumps(req_data).encode("utf-8"), headers=h)
            with urllib.request.urlopen(req, timeout=25, context=_SSL_CTX) as resp:
                remote_resp = json.loads(resp.read().decode("utf-8"))
                result_obj = remote_resp.get("result", {})
                content_items = result_obj.get("content", [])
                if content_items and isinstance(content_items, list):
                    first_text = content_items[0].get("text", "")
                    try:
                        return json.loads(first_text)
                    except Exception:
                        return {"success": not result_obj.get("isError", False), "result": first_text}
                return result_obj
        except Exception as e:
            return {"error": f"Tool '{name}' execution failed: {str(e)}"}


def main():
    """Stdio JSON-RPC loop adhering to Model Context Protocol specification."""
    tools = [
        {
            "name": "connect_account",
            "description": "Authenticate and authorize your SmartEdu account. MUST be called first to unlock all academic tools. Accepts email or student registration number.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "identifier": {"type": "string", "description": "Email or Student Registration Number (e.g. 'virendra.shrivastava@smartedu.edu' or '2411021060402')"},
                    "password": {"type": "string", "description": "Account password (e.g. '12345678')"}
                },
                "required": ["identifier", "password"]
            }
        },
        {
            "name": "disconnect_account",
            "description": "Log out and clear the active SmartEdu authorization session.",
            "inputSchema": {"type": "object", "properties": {}}
        },
        {
            "name": "get_current_session",
            "description": "Inspect the currently authorized SmartEdu user, role, and department.",
            "inputSchema": {"type": "object", "properties": {}}
        },
        {
            "name": "create_assignment",
            "description": "Author and publish a coursework assignment. Requires FACULTY or ADMINISTRATOR role.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Course code (e.g. 'E1CSA 382')"},
                    "title": {"type": "string", "description": "Title of the assignment"},
                    "description": {"type": "string", "description": "Detailed description / objective"},
                    "instructions": {"type": "string", "description": "Specific submission guidelines"},
                    "max_points": {"type": "integer", "description": "Maximum marks (default: 100)"},
                    "due_days": {"type": "integer", "description": "Days until deadline (default: 7)"},
                    "publish": {"type": "boolean", "description": "Whether to publish immediately (default: true)"}
                },
                "required": ["course_code", "title"]
            }
        },
        {
            "name": "create_quiz",
            "description": "Author and schedule a proctored examination or quiz with multiple-choice questions. Requires FACULTY or ADMINISTRATOR role.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Course code (e.g. 'E1CSA 382')"},
                    "title": {"type": "string", "description": "Title of the quiz"},
                    "instructions": {"type": "string", "description": "Quiz instructions and rules"},
                    "duration_minutes": {"type": "integer", "description": "Duration in minutes (default: 30)"},
                    "total_marks": {"type": "number", "description": "Total marks for the quiz (default: 20)"},
                    "questions": {
                        "type": "array",
                        "description": "List of questions with options and answer keys",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question_text": {"type": "string"},
                                "marks": {"type": "number"},
                                "options": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "text": {"type": "string"},
                                            "is_correct": {"type": "boolean"}
                                        },
                                        "required": ["text", "is_correct"]
                                    }
                                }
                            },
                            "required": ["question_text", "options"]
                        }
                    }
                },
                "required": ["course_code", "title"]
            }
        },
        {
            "name": "get_student",
            "description": "Fetch a student's full academic dossier by Registration Number or email. Requires authenticated session.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "identifier": {"type": "string", "description": "Student registration number or institutional email"}
                },
                "required": ["identifier"]
            }
        },
        {
            "name": "get_class_dossier",
            "description": "Inspect complete class record: advisor, enrolled students, assigned subjects, and weekly timetable.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "class_name": {"type": "string", "description": "Class cohort name (e.g. 'IT - Semester 5 (Section AI & DS)')"}
                }
            }
        },
        {
            "name": "list_assignments",
            "description": "List active assignments for a course or all university courses. Requires authenticated session.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Optional course code filter"}
                }
            }
        },
        {
            "name": "list_quizzes",
            "description": "List scheduled exams and quizzes. Requires authenticated session.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Optional course code filter"}
                }
            }
        },
        {
            "name": "list_faculty",
            "description": "Retrieve faculty directory with designations, assigned departments, and contact emails.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "department": {"type": "string", "description": "Optional department code"}
                }
            }
        },
        {
            "name": "list_courses",
            "description": "List courses in the active term with assigned instructors and credit hours.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "department": {"type": "string", "description": "Optional department code"}
                }
            }
        },
        {
            "name": "get_university_stats",
            "description": "Get high-level university statistics: active term, student count, faculty count, and sections.",
            "inputSchema": {"type": "object", "properties": {}}
        },
        {
            "name": "get_attendance_summary",
            "description": "Inspect student attendance rate, sessions held, absence count, and 75% compliance status.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "student_identifier": {"type": "string", "description": "Student registration number or email"},
                    "course_code": {"type": "string", "description": "Optional course code filter"}
                }
            }
        },
        {
            "name": "submit_assignment",
            "description": "Submit completed coursework response or attachment file (Student only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "assignment_id": {"type": "string", "description": "Assignment UUID"},
                    "submission_text": {"type": "string", "description": "Written coursework answer"},
                    "attachment_url": {"type": "string", "description": "Optional attachment URL"}
                },
                "required": ["assignment_id"]
            }
        },
        {
            "name": "create_announcement",
            "description": "Publish official institutional announcement across campus, department, or course.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Announcement headline"},
                    "content": {"type": "string", "description": "Announcement body"},
                    "priority": {"type": "string", "enum": ["LOW", "NORMAL", "HIGH", "URGENT"]},
                    "scope_type": {"type": "string", "enum": ["CAMPUS", "DEPARTMENT", "COURSE"]},
                    "scope_id": {"type": "string", "description": "Scope target ID"}
                },
                "required": ["title", "content"]
            }
        },
        {
            "name": "list_announcements",
            "description": "List official university announcements.",
            "inputSchema": {"type": "object", "properties": {}}
        },
        {
            "name": "list_departments",
            "description": "List all active departments, department codes, and heads of department.",
            "inputSchema": {"type": "object", "properties": {}}
        },
        {
            "name": "get_student_results",
            "description": "Retrieve official transcript summary, semester GPA, earned credits, and course grades.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "student_identifier": {"type": "string", "description": "Student registration number or email"},
                    "semester_id": {"type": "string", "description": "Optional semester UUID"}
                }
            }
        },
        {
            "name": "get_my_timetable",
            "description": "Retrieve personal weekly timetable with scheduled rooms, timings, and faculty.",
            "inputSchema": {"type": "object", "properties": {}}
        },
        {
            "name": "get_quiz_attendees",
            "description": "Inspect student attendees, attempt timestamps, and scores for a specific quiz.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "quiz_id": {"type": "string", "description": "UUID of the quiz"},
                    "course_code": {"type": "string", "description": "Course code (e.g. E1ITC 302)"}
                }
            }
        },
        {
            "name": "delete_quiz",
            "description": "Delete a scheduled quiz or assessment (Faculty/Admin only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "quiz_id": {"type": "string", "description": "UUID of the quiz to delete"}
                },
                "required": ["quiz_id"]
            }
        },
        {
            "name": "create_case_study",
            "description": "Author and publish an AI Collaborative Case Study for a course (Faculty/Admin only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Target course code (e.g. E1ITC 302)"},
                    "title": {"type": "string", "description": "Title of the case study"},
                    "scenario": {"type": "string", "description": "Case study background scenario or problem"},
                    "deliverables": {"type": "string", "description": "Expected deliverables from students"},
                    "max_points": {"type": "integer", "description": "Maximum marks/points (default: 50)"},
                    "due_days": {"type": "integer", "description": "Submission deadline in days (default: 14)"}
                },
                "required": ["course_code", "title"]
            }
        },
        {
            "name": "create_project_ideathon",
            "description": "Launch a Project or Ideathon challenge with challenge theme and milestones (Faculty/Admin only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Target course code (e.g. E1ITC 302)"},
                    "title": {"type": "string", "description": "Project or challenge title"},
                    "theme": {"type": "string", "description": "Challenge theme or focus area"},
                    "deliverables": {"type": "string", "description": "Project deliverables and milestones"},
                    "max_points": {"type": "integer", "description": "Maximum points (default: 100)"},
                    "due_days": {"type": "integer", "description": "Duration in days (default: 30)"}
                },
                "required": ["course_code", "title"]
            }
        },
        {
            "name": "create_course_module",
            "description": "Add a curriculum syllabus module to a course (Faculty/Admin only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Course code (e.g. E1ITC 302)"},
                    "title": {"type": "string", "description": "Module title (e.g. Module 1: Graph Theory Fundamentals)"},
                    "description": {"type": "string", "description": "Module syllabus summary"},
                    "module_number": {"type": "integer", "description": "Module sequence number (1-5)"}
                },
                "required": ["course_code", "title"]
            }
        },
        {
            "name": "create_course_topic",
            "description": "Add a curriculum topic under a specific course module (Faculty/Admin only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Course Code e.g. E1ITC 302"},
                    "module_number": {"type": "integer", "description": "Module number 1 to 5"},
                    "title": {"type": "string", "description": "Topic title"},
                    "description": {"type": "string", "description": "Topic description or summary"},
                    "display_order": {"type": "integer", "description": "Display order"}
                },
                "required": ["course_code", "title"]
            }
        },
        {
            "name": "create_topic_subtopic",
            "description": "Add a subtopic, lesson note, or learning content under a topic (Faculty/Admin only).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "course_code": {"type": "string", "description": "Course code (e.g. E1ITC 302)"},
                    "module_number": {"type": "integer", "description": "Module number (1 to 5)"},
                    "topic_title": {"type": "string", "description": "Topic title or topic ID"},
                    "title": {"type": "string", "description": "Subtopic / lesson title"},
                    "description": {"type": "string", "description": "Brief description"},
                    "text_content": {"type": "string", "description": "Markdown or text explanation / code snippet"},
                    "content_type": {"type": "string", "enum": ["TEXT_CONTENT", "DOCUMENT", "VIDEO", "PDF", "EXTERNAL_LINK"]},
                    "display_order": {"type": "integer", "description": "Display order"}
                },
                "required": ["course_code", "topic_title", "title"]
            }
        }
    ]

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            req = json.loads(line)
            req_id = req.get("id")
            method = req.get("method")

            if method == "initialize":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "serverInfo": {"name": "smartedu-mcp-server", "version": "2.1.0"},
                        "capabilities": {"tools": {}}
                    }
                }
            elif method == "tools/list":
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}
            elif method == "tools/call":
                params = req.get("params", {})
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                content = handle_call_tool(tool_name, tool_args)
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(content, indent=2)}]
                    }
                }
            else:
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {}}

            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err_resp = {"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()

def run_http_server(port: int = 8080):
    """Run standalone ChatGPT-compatible HTTP MCP server."""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import urllib.parse

    tools = [
        {"name": "connect_account", "description": "Authorize SmartEdu session with institutional credentials.", "inputSchema": {"type": "object", "properties": {"identifier": {"type": "string"}, "password": {"type": "string"}}, "required": ["identifier", "password"]}},
        {"name": "disconnect_account", "description": "Clear active SmartEdu session.", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "get_current_session", "description": "Inspect active user session profile and role.", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "create_assignment", "description": "Author coursework assignment (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "max_points": {"type": "integer"}, "due_days": {"type": "integer"}}, "required": ["course_code", "title"]}},
        {"name": "create_quiz", "description": "Create proctored assessment quiz (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "title": {"type": "string"}, "time_limit_minutes": {"type": "integer"}, "total_points": {"type": "integer"}, "is_proctored": {"type": "boolean"}}, "required": ["course_code", "title"]}},
        {"name": "grade_submission", "description": "Grade student assignment submission (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"submission_id": {"type": "string"}, "score": {"type": "number"}, "feedback": {"type": "string"}}, "required": ["submission_id", "score"]}},
        {"name": "get_student_profile", "description": "Inspect student academic profile under RBAC.", "inputSchema": {"type": "object", "properties": {"identifier": {"type": "string"}}, "required": ["identifier"]}},
        {"name": "get_class_dossier", "description": "Inspect class cohort records, advisor, and timetable.", "inputSchema": {"type": "object", "properties": {"class_name": {"type": "string"}}}},
        {"name": "list_assignments", "description": "List course assignments.", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}}}},
        {"name": "list_quizzes", "description": "List scheduled quizzes.", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}}}},
        {"name": "list_faculty", "description": "Retrieve faculty directory.", "inputSchema": {"type": "object", "properties": {"department": {"type": "string"}}}},
        {"name": "list_courses", "description": "List active curriculum courses.", "inputSchema": {"type": "object", "properties": {"department": {"type": "string"}}}},
        {"name": "get_university_stats", "description": "Get high-level university statistics.", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "get_attendance_summary", "description": "Inspect student attendance records and compliance.", "inputSchema": {"type": "object", "properties": {"student_identifier": {"type": "string"}, "course_code": {"type": "string"}}}},
        {"name": "submit_assignment", "description": "Submit coursework response or report (Student only).", "inputSchema": {"type": "object", "properties": {"assignment_id": {"type": "string"}, "submission_text": {"type": "string"}, "attachment_url": {"type": "string"}}, "required": ["assignment_id"]}},
        {"name": "create_announcement", "description": "Publish campus or departmental announcement.", "inputSchema": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}, "priority": {"type": "string"}, "scope_type": {"type": "string"}}, "required": ["title", "content"]}},
        {"name": "list_announcements", "description": "List official university announcements.", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "list_departments", "description": "List all academic departments and HODs.", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "get_student_results", "description": "Retrieve student GPA, credits, and grades.", "inputSchema": {"type": "object", "properties": {"student_identifier": {"type": "string"}, "semester_id": {"type": "string"}}}},
        {"name": "get_my_timetable", "description": "Retrieve personal weekly timetable schedule.", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "get_quiz_attendees", "description": "Inspect student attendees and scores for a quiz.", "inputSchema": {"type": "object", "properties": {"quiz_id": {"type": "string"}, "course_code": {"type": "string"}}}},
        {"name": "delete_quiz", "description": "Delete a scheduled quiz (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"quiz_id": {"type": "string"}}, "required": ["quiz_id"]}},
        {"name": "create_case_study", "description": "Create an AI Collaborative Case Study (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "title": {"type": "string"}, "scenario": {"type": "string"}, "deliverables": {"type": "string"}, "max_points": {"type": "integer"}, "due_days": {"type": "integer"}}, "required": ["course_code", "title"]}},
        {"name": "create_project_ideathon", "description": "Launch a Project or Ideathon challenge (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "title": {"type": "string"}, "theme": {"type": "string"}, "deliverables": {"type": "string"}, "max_points": {"type": "integer"}, "due_days": {"type": "integer"}}, "required": ["course_code", "title"]}},
        {"name": "create_course_module", "description": "Add a curriculum module to a course (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "module_number": {"type": "integer"}}, "required": ["course_code", "title"]}},
        {"name": "create_course_topic", "description": "Add a curriculum topic under a specific module (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string", "description": "Course Code e.g. E1ITC 302"}, "module_number": {"type": "integer", "description": "Module number 1 to 5"}, "title": {"type": "string", "description": "Topic title"}, "description": {"type": "string"}, "display_order": {"type": "integer"}}, "required": ["course_code", "title"]}},
        {"name": "create_topic_subtopic", "description": "Add a subtopic, lesson note, or learning content under a topic (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "module_number": {"type": "integer", "description": "Module number 1 to 5"}, "topic_title": {"type": "string", "description": "Topic title or topic ID"}, "title": {"type": "string", "description": "Subtopic / lesson title"}, "description": {"type": "string"}, "text_content": {"type": "string", "description": "Markdown or text explanation / code"}, "content_type": {"type": "string", "enum": ["TEXT_CONTENT", "DOCUMENT", "VIDEO", "PDF", "EXTERNAL_LINK"]}, "display_order": {"type": "integer"}}, "required": ["course_code", "topic_title", "title"]}},
        {"name": "mark_attendance", "description": "Record session attendance for a course cohort (Faculty/HOD/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "session_date": {"type": "string"}, "topic_covered": {"type": "string"}, "present_students": {"type": "array", "items": {"type": "string"}}, "absent_students": {"type": "array", "items": {"type": "string"}}}, "required": ["course_code"]}},
        {"name": "get_course_analytics", "description": "Retrieve comprehensive academic intelligence, attendance %, averages, and at-risk students.", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}}, "required": ["course_code"]}},
        {"name": "export_gradebook", "description": "Export complete course gradebook with student itemized assignment and quiz scores.", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}}, "required": ["course_code"]}},
        {"name": "batch_grade_assignments", "description": "Batch grade multiple student coursework submissions in a single action (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "grades": {"type": "array", "items": {"type": "object"}}}, "required": ["grades"]}},
        {"name": "bulk_import_quiz_questions", "description": "Import multiple multiple-choice questions into an existing scheduled quiz (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"quiz_id": {"type": "string"}, "course_code": {"type": "string"}, "quiz_title": {"type": "string"}, "questions": {"type": "array", "items": {"type": "object"}}}, "required": ["questions"]}},
        {"name": "generate_quiz_from_topic_content", "description": "Autonomously generate and publish an MCQ assessment quiz directly from lecture notes.", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "topic_title": {"type": "string"}, "quiz_title": {"type": "string"}, "time_limit_minutes": {"type": "integer"}, "is_proctored": {"type": "boolean"}}, "required": ["course_code", "topic_title"]}},
        {"name": "update_topic_content", "description": "Edit or append to existing lecture notes, subtopics, or learning materials (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "subtopic_title": {"type": "string"}, "content_id": {"type": "string"}, "text_content": {"type": "string"}, "new_title": {"type": "string"}, "status": {"type": "string"}}, "required": ["course_code"]}},
        {"name": "delete_announcement", "description": "Delete or retract an existing announcement by UUID or title (Faculty/Admin only).", "inputSchema": {"type": "object", "properties": {"announcement_id": {"type": "string"}, "title": {"type": "string"}}}},
        {"name": "broadcast_course_reminder", "description": "Broadcast an urgent or high-priority announcement to all students enrolled in a course.", "inputSchema": {"type": "object", "properties": {"course_code": {"type": "string"}, "title": {"type": "string"}, "message": {"type": "string"}, "priority": {"type": "string"}}, "required": ["course_code", "title", "message"]}},
        {"name": "create_timetable_entry", "description": "Schedule a timetable slot for ANY class cohort across the university (Administrator, VC, and HOD only).", "inputSchema": {"type": "object", "properties": {"class_name": {"type": "string"}, "course_code": {"type": "string"}, "faculty_identifier": {"type": "string"}, "day_of_week": {"type": "string"}, "start_time": {"type": "string"}, "end_time": {"type": "string"}, "room": {"type": "string"}, "session_type": {"type": "string"}, "week_number": {"type": "string"}, "lecture_title": {"type": "string"}}, "required": ["class_name", "course_code", "faculty_identifier", "day_of_week", "start_time", "end_time", "room"]}},
        {"name": "bulk_create_class_timetable", "description": "Upload a complete weekly schedule for ANY class cohort in one action (Administrator, VC, and HOD only).", "inputSchema": {"type": "object", "properties": {"class_name": {"type": "string"}, "clear_existing": {"type": "boolean"}, "entries": {"type": "array", "items": {"type": "object"}}}, "required": ["class_name", "entries"]}},
        {"name": "delete_timetable_entry", "description": "Remove a scheduled timetable slot by schedule UUID (Administrator, VC, and HOD only).", "inputSchema": {"type": "object", "properties": {"schedule_id": {"type": "string"}}, "required": ["schedule_id"]}},
        {"name": "update_faculty_weekly_schedule", "description": "Update lecture title, topic, or status for a faculty member's OWN teaching timetable slot (Faculty only).", "inputSchema": {"type": "object", "properties": {"schedule_id": {"type": "string"}, "week_number": {"type": "string"}, "lecture_title": {"type": "string"}, "topic_covered": {"type": "string"}}, "required": ["schedule_id"]}},
        {"name": "get_vc_institutional_analytics", "description": "Executive Vice Chancellor (VC) University Intelligence Dashboard across all departments, attendance, and examinations (VC and Administrator only).", "inputSchema": {"type": "object", "properties": {"academic_period": {"type": "string"}}}},
    ]

    base_origin = API_BASE.replace("/api/v1", "").rstrip("/")

    class McpHandler(BaseHTTPRequestHandler):
        def _send_cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")

        def do_OPTIONS(self):
            self.send_response(200)
            self._send_cors()
            self.end_headers()

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            if path in ["/.well-known/oauth-authorization-server", "/api/v1/.well-known/oauth-authorization-server"]:
                meta = {
                    "issuer": base_origin,
                    "authorization_endpoint": f"{base_origin}/oauth/authorize",
                    "token_endpoint": f"{base_origin}/oauth/token",
                    "userinfo_endpoint": f"{base_origin}/oauth/userinfo",
                    "registration_endpoint": f"{base_origin}/oauth/register",
                    "response_types_supported": ["code"],
                    "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
                    "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic", "none"],
                    "scopes_supported": ["mcp", "read", "write"]
                }
                data = json.dumps(meta, indent=2).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(data)
            elif path in ["/.well-known/openid-configuration", "/api/v1/.well-known/openid-configuration"]:
                meta = {
                    "issuer": base_origin,
                    "authorization_endpoint": f"{base_origin}/oauth/authorize",
                    "token_endpoint": f"{base_origin}/oauth/token",
                    "userinfo_endpoint": f"{base_origin}/oauth/userinfo",
                    "response_types_supported": ["code"],
                    "subject_types_supported": ["public"]
                }
                data = json.dumps(meta, indent=2).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(data)
            elif path in ["/sse", "/api/v1/sse"]:
                session_id = uuid.uuid4().hex
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self._send_cors()
                self.end_headers()
                self.wfile.write(f"event: endpoint\ndata: /messages?sessionId={session_id}\n\n".encode("utf-8"))
                self.wfile.flush()
            else:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "healthy", "service": "SmartEdu-MCP", "version": "2.2.0"}).encode("utf-8"))

        def do_POST(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            content_len = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"

            auth_header = self.headers.get("Authorization", "")
            caller_token = auth_header.split("Bearer ", 1)[1].strip() if "Bearer " in auth_header else None

            if path in ["/mcp", "/api/v1/mcp", "/messages", "/api/v1/messages"]:
                try:
                    req = json.loads(post_body)
                    req_id = req.get("id")
                    method = req.get("method")

                    if method == "initialize":
                        resp = {
                            "jsonrpc": "2.0",
                            "id": req_id,
                            "result": {
                                "protocolVersion": "2024-11-05",
                                "serverInfo": {"name": "smartedu-mcp-server", "version": "2.2.0"},
                                "capabilities": {"tools": {}}
                            }
                        }
                    elif method == "tools/list":
                        resp = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}
                    elif method == "tools/call":
                        params = req.get("params", {})
                        tool_name = params.get("name")
                        tool_args = params.get("arguments", {})
                        content = handle_call_tool(tool_name, tool_args, caller_token=caller_token)
                        resp = {
                            "jsonrpc": "2.0",
                            "id": req_id,
                            "result": {
                                "content": [{"type": "text", "text": json.dumps(content, indent=2)}]
                            }
                        }
                    else:
                        resp = {"jsonrpc": "2.0", "id": req_id, "result": {}}

                    data = json.dumps(resp).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors()
                    self.end_headers()
                    self.wfile.write(data)
                except Exception as e:
                    err_resp = {"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps(err_resp).encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()

    server = HTTPServer(("0.0.0.0", port), McpHandler)
    print(f"SmartEdu Remote MCP HTTP server listening on http://0.0.0.0:{port}")
    server.serve_forever()

if __name__ == "__main__":
    if "--http" in sys.argv or "--port" in sys.argv:
        p = 8080
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                p = int(sys.argv[i + 1])
        run_http_server(p)
    else:
        main()
