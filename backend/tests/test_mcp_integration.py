"""Regression coverage for portal-visible MCP operations."""
import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.main import app
from app.models import CourseModule, LearningContent
from tests.fixtures import seed_database


client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def auth_token(email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "DevPassword123!"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["access_token"]


def call_tool(token: str, name: str, arguments: dict) -> dict:
    response = client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "jsonrpc": "2.0",
            "id": "test-call",
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        },
    )
    assert response.status_code == 200, response.text
    text = response.json()["result"]["content"][0]["text"]
    return json.loads(text)


def test_mcp_rejects_assignment_that_faculty_portal_cannot_show():
    result = call_tool(
        auth_token("faculty2@smartedu.local"),
        "create_assignment",
        {"course_code": "CS101", "title": "Unauthorized MCP assignment"},
    )
    assert result["success"] is False
    assert "not assigned" in result["error"].lower()


def test_mcp_course_workspace_matches_authorized_portal_scope():
    result = call_tool(
        auth_token("faculty1@smartedu.local"),
        "get_course_workspace",
        {"course_code": "CS101"},
    )
    assert result["success"] is True
    assert result["course"]["code"] == "CS101"
    assert isinstance(result["assignments"], int)
    assert isinstance(result["quizzes"], int)


def test_mcp_refuses_to_publish_empty_quiz():
    result = call_tool(
        auth_token("faculty1@smartedu.local"),
        "create_quiz",
        {"course_code": "CS101", "title": "Empty quiz", "questions": []},
    )
    assert result["success"] is False
    assert "at least one valid question" in result["error"].lower()


def test_mcp_exposes_extended_database_backed_tools():
    response = client.post(
        "/mcp",
        json={"jsonrpc": "2.0", "id": "tools", "method": "tools/list", "params": {}},
    )
    assert response.status_code == 200
    names = {tool["name"] for tool in response.json()["result"]["tools"]}
    assert {
        "get_course_workspace",
        "update_assignment",
        "list_assignment_submissions",
        "get_my_timetable",
        "onboard_user",
        "create_course",
        "add_course_module",
        "publish_module_content",
        "publish_flashcard_deck",
    } <= names


def test_mcp_faculty_timetable_is_role_scoped():
    result = call_tool(auth_token("faculty1@smartedu.local"), "get_my_timetable", {})
    assert result["success"] is True
    assert isinstance(result["schedule"], list)


def test_mcp_blocks_faculty_from_administrator_onboarding():
    result = call_tool(
        auth_token("faculty1@smartedu.local"),
        "onboard_user",
        {
            "email": "must-not-exist@smartedu.local",
            "password": "ValidPassword123!",
            "first_name": "Blocked",
            "role": "STUDENT",
        },
    )
    assert result["success"] is False
    assert "only administrators" in result["error"].lower()


def test_mcp_blocks_faculty_from_catalog_course_creation():
    result = call_tool(
        auth_token("faculty1@smartedu.local"),
        "create_course",
        {"course_code": "BLOCK101", "name": "Blocked course", "department_code": "CSE", "semester_id": "missing"},
    )
    assert result["success"] is False
    assert "only administrators" in result["error"].lower()


def test_mcp_faculty_publishes_persistent_module_flashcards():
    suffix = uuid4().hex[:8]
    module_title = f"MCP module {suffix}"
    topic_title = f"MCP topic {suffix}"
    token = auth_token("faculty1@smartedu.local")

    module_result = call_tool(
        token,
        "add_course_module",
        {"course_code": "CS101", "title": module_title, "topics": [topic_title]},
    )
    assert module_result["success"] is True

    deck_result = call_tool(
        token,
        "publish_flashcard_deck",
        {
            "course_code": "CS101",
            "module_title": module_title,
            "topic_title": topic_title,
            "title": "Verified deck",
            "cards": [{"term": "Atomicity", "definition": "All operations succeed or all are rolled back."}],
        },
    )
    assert deck_result["success"] is True
    assert deck_result["verified_persisted"] is True

    db: Session = SessionLocal()
    try:
        stored = db.query(LearningContent).filter(LearningContent.id == deck_result["content"]["id"]).one()
        payload = json.loads(stored.text_content)
        assert payload["kind"] == "FLASHCARD_DECK"
        assert payload["cards"][0]["term"] == "Atomicity"
        module = db.query(CourseModule).filter(CourseModule.id == module_result["module"]["id"]).one()
        db.delete(module)
        db.commit()
    finally:
        db.close()
