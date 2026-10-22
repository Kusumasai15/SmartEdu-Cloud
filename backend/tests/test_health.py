"""Test suite for System Health and Discovery endpoints."""
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient) -> None:
    """Verify root endpoint returns basic application information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "SmartEdu Cloud"
    assert "documentation" in data
    assert data["health_check"] == "/api/v1/health"


def test_health_endpoint_structure(client: TestClient) -> None:
    """Verify /api/v1/health returns standardized envelope and health status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    
    # Assert standard envelope structure
    assert data["success"] is True
    assert "data" in data
    assert "message" in data
    
    # Assert health payload structure
    health_data = data["data"]
    assert health_data["status"] in ["healthy", "degraded"]
    assert health_data["app_name"] == "SmartEdu Cloud"
    assert health_data["version"] == "1.0.0"
    assert "environment" in health_data
    assert "services" in health_data
    assert "database" in health_data["services"]
    assert "redis" in health_data["services"]
