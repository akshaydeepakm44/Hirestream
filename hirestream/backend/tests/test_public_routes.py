from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_public_jobs():
    response = client.get("/public/jobs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_contact_form_validation_failure():
    # Missing fields or invalid email
    response = client.post("/public/contact", json={"email": "invalid-email", "message": "Hi"})
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "error"
    assert "errors" in data
