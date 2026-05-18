from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(creds: LoginRequest):
    return {"message": "Login successful"}

@router.get("/me")
def get_me():
    return {
        "id": 1,
        "email": "test@example.com",
        "full_name": "Test User",
        "phone": "1234567890",
        "city": "Mumbai",
        "profile": {
            "profile_type": "Admin",
            "fields": {}
        },
        "is_active": True,
        "access_token": "dummy_access_token",
        "refresh_token": "dummy_refresh_token"
    }

@router.post("/logout")
def logout():
    return {"message": "Logout successful"}
