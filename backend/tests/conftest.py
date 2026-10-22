"""Pytest configuration and test fixtures for SmartEdu Cloud."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """TestClient fixture for making HTTP requests against the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client
