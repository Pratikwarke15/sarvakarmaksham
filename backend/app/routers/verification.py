from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from ..deps import get_current_user
from ..schemas import (
    VerifyDigilockerRequest,
    SendAadhaarOtpRequest,
    VerifyAadhaarOtpRequest,
    VerifyConsumerRequest,
)
from ..services import verification_service

router = APIRouter(tags=["verification"])


class OfflineAadhaarRequest(BaseModel):
    data: str


@router.post("/digilocker")
async def digilocker(body: VerifyDigilockerRequest, user: dict = Depends(get_current_user)):
    result = await verification_service.verify_digilocker(body.aadhaarNumber)
    result["badgeLabel"] = "DEMO / SANDBOX VERIFICATION"
    result["disclaimer"] = "Simulated via DevelopmentMockProvider for SIH (Zero External Cost)"
    return {"success": True, "message": "DigiLocker verified (Demo / Sandbox)", "data": result}


@router.post("/aadhaar-qr")
async def aadhaar_qr(image: UploadFile = File(...), user: dict = Depends(get_current_user)):
    image_bytes = await image.read()
    if not image_bytes:
        from ..errors import AppError

        raise AppError("Empty image upload", 400)
    result = await verification_service.verify_aadhaar_qr(image_bytes)
    return {"success": True, "message": "Aadhaar Secure QR verified", "data": result}


@router.post("/aadhaar-otp/send")
async def aadhaar_otp_send(body: SendAadhaarOtpRequest, user: dict = Depends(get_current_user)):
    result = await verification_service.send_aadhaar_otp(body.aadhaarNumber, body.mobile)
    return {"success": True, "message": "OTP sent to Aadhaar-linked mobile", "data": result}


@router.post("/aadhaar-otp")
async def aadhaar_otp(body: VerifyAadhaarOtpRequest, user: dict = Depends(get_current_user)):
    result = await verification_service.verify_aadhaar_otp(body.aadhaarNumber, body.mobile, body.otp)
    return {"success": True, "message": "Aadhaar OTP verified", "data": result}


@router.post("/offline-aadhaar")
async def offline_aadhaar(body: OfflineAadhaarRequest, user: dict = Depends(get_current_user)):
    result = await verification_service.verify_offline_aadhaar(body.data)
    return {"success": True, "message": "Offline Aadhaar verified", "data": result}


@router.post("/consumer")
async def verify_consumer(body: VerifyConsumerRequest, user: dict = Depends(get_current_user)):
    result = await verification_service.verify_consumer_profile(user["id"], body.model_dump())
    return {"success": True, "message": "Consumer profile verified", "data": result}


@router.get("/consumer/status")
async def consumer_status(user: dict = Depends(get_current_user)):
    status = await verification_service.get_consumer_verification_status(user["id"])
    return {"success": True, "data": status}
