from fastapi import APIRouter, Depends

from .. import config
from ..deps import get_current_user
from ..schemas import (
    SendOtpRequest,
    VerifyOtpRequest,
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
)
from ..services import auth_service

router = APIRouter(tags=["auth"])


@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    result = await auth_service.generate_otp(body.phone)
    data = {"expiresAt": result["expiresAt"]}
    if not config.IS_PROD and result.get("otp"):
        data["otp"] = result["otp"]
    return {"success": True, "message": "OTP sent successfully", "data": data}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpRequest):
    result = await auth_service.verify_otp(body.phone, body.otp)
    if result.get("token"):
        return {"success": True, "message": "OTP verified and logged in",
                "data": {"token": result["token"], "user": result["user"]}}
    return {"success": True, "message": "OTP verified. Please complete registration.",
            "data": {"verified": result.get("verified", True)}}


@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    result = await auth_service.register(body.model_dump())
    return {"success": True, "message": "User registered successfully", "data": result}


@router.post("/login-init")
async def login_init(body: LoginRequest):
    result = await auth_service.login_init(body.phone, body.password)
    return {"success": True, "message": "Credentials verified. Server OTP generated.", "data": result}


@router.post("/login")
async def login(body: LoginRequest):
    result = await auth_service.login(body.phone, body.password)
    return {"success": True, "message": "Login successful", "data": result}


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    if not body.token:
        return {"success": False, "error": "Token is required"}
    result = await auth_service.refresh(body.token)
    return {"success": True, "message": "Token refreshed", "data": result}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    profile = await auth_service.get_profile(user["id"])
    return {"success": True, "data": profile}
