import time
import uuid
from datetime import timedelta

from .. import config
from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..security import generate_jwt, verify_password, hash_password, refresh_token as _refresh
from ..utils import now_utc
from . import sms_service

ROLE_ENUM = ("CONSUMER", "WORKER")


async def generate_otp(phone: str) -> dict:
    otp = f"{_rand_int():06d}"
    expires_at = now_utc() + timedelta(minutes=config.OTP_EXPIRY_MINUTES)
    await db.execute(
        """
        INSERT INTO "OtpVerification" (id, phone, otp, purpose, "expiresAt", verified, "createdAt")
        VALUES ($1, $2, $3, 'LOGIN', $4, false, $5)
        """,
        str(uuid.uuid4()), phone, otp, expires_at, now_utc(),
    )
    await sms_service.send_otp_sms(phone, otp)
    return {"expiresAt": expires_at, "otp": otp}


async def verify_otp(phone: str, otp: str) -> dict:
    record = await db.fetchrow(
        """
        SELECT * FROM "OtpVerification"
        WHERE phone=$1 AND purpose='LOGIN' AND verified=false AND "expiresAt" >= $2
        ORDER BY "createdAt" DESC LIMIT 1
        """,
        phone, now_utc(),
    )
    if record is None:
        raise AppError("Invalid or expired OTP", 400)
    if record["otp"] != otp:
        raise AppError("Incorrect OTP", 400)
    await db.execute('UPDATE "OtpVerification" SET verified=true WHERE id=$1', record["id"])
    existing = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if existing is not None:
        token = generate_jwt({"id": existing["id"], "phone": existing["phone"], "role": existing["role"]})
        return {
            "verified": True,
            "token": token,
            "user": {"id": existing["id"], "phone": existing["phone"],
                     "name": existing["name"], "role": existing["role"]},
        }
    return {"verified": True}


async def register(data: dict) -> dict:
    phone = data["phone"]
    name = data["name"]
    email = (data.get("email") or "").strip() or None
    password = data["password"]
    role = data["role"]

    existing = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if existing is not None:
        raise AppError("Phone number already registered", 409)
    if email:
        existing_email = await db.fetchrow('SELECT * FROM "User" WHERE email=$1', email)
        if existing_email is not None:
            raise AppError("Email already registered", 409)

    password_hash = hash_password(password)
    user_id = str(uuid.uuid4())
    now = now_utc()
    await db.execute(
        """
        INSERT INTO "User" (id, phone, email, name, role, "passwordHash", locale, "isActive", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,'en',true,$7,$8)
        """,
        user_id, phone, email, name, role, password_hash, now, now,
    )

    if role == "CONSUMER":
        aadhaar_num = data.get("aadhaarNumber")
        aadhaar_name = data.get("aadhaarName") or name
        aadhaar_dob = data.get("aadhaarDob")
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        default_address = data.get("defaultAddress")
        profile_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO "ConsumerProfile" (
                id, "userId", "aadhaarNumber", "aadhaarVerified", "aadhaarName",
                "aadhaarDob", "digilockerRef", "kycStatus", "phoneVerified",
                latitude, longitude, "defaultAddress", "createdAt", "updatedAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $12)
            """,
            profile_id,
            user_id,
            aadhaar_num,
            bool(aadhaar_num),
            aadhaar_name,
            aadhaar_dob,
            f"DL-{int(time.time() * 1000)}" if aadhaar_num else None,
            "VERIFIED" if aadhaar_num else "PENDING",
            latitude,
            longitude,
            default_address,
            now,
        )
    elif role == "WORKER":
        coop = await db.fetchrow('SELECT id FROM "CoOp" LIMIT 1')
        coop_id = coop["id"] if coop else None
        skill_tags = data.get("skillTags") or ["electrical", "plumbing"]
        profile_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO "WorkerProfile" (
                id, "userId", "coopId", "skillTags", bio, "experienceYears",
                latitude, longitude, "workAddress", "kycStatus",
                "aadhaarNumber", "aadhaarVerified", "aadhaarName",
                "phoneVerified", status, "isAvailable", "isOnDuty",
                "avgRating", "totalJobs", "totalEarnings", "walletBalance",
                "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, true, $12,
                true, 'VERIFIED', true, true,
                4.8, 15, 0, 0,
                $13, $13
            )
            """,
            profile_id,
            user_id,
            coop_id,
            skill_tags,
            f"{name} is a verified professional technician.",
            5,
            28.6145,
            77.2095,
            "Connaught Place, New Delhi",
            "VERIFIED",
            f"1234{phone[-8:]}",
            name,
            now,
        )

    token = generate_jwt({"id": user_id, "phone": phone, "role": role})
    return {"token": token, "user": {"id": user_id, "phone": phone, "name": name,
                                     "email": email, "role": role}}


async def login_init(phone: str, password: str) -> dict:
    user = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if user is None:
        raise AppError("Invalid mobile number or password", 401)
    if not user["isActive"]:
        raise AppError("Account is deactivated", 403)
    if not verify_password(password, user["passwordHash"]):
        raise AppError("Invalid mobile number or password", 401)
    
    otp_data = await generate_otp(phone)
    return {
        "requiresOtp": True,
        "phone": phone,
        "expiresAt": otp_data["expiresAt"],
        "otp": otp_data["otp"],
        "user": {
            "id": user["id"],
            "name": user["name"],
            "role": user["role"],
        },
    }


async def login(phone: str, password: str) -> dict:
    user = await db.fetchrow('SELECT * FROM "User" WHERE phone=$1', phone)
    if user is None:
        raise AppError("Invalid mobile number or password", 401)
    if not user["isActive"]:
        raise AppError("Account is deactivated", 403)
    if not verify_password(password, user["passwordHash"]):
        raise AppError("Invalid mobile number or password", 401)
    token = generate_jwt({"id": user["id"], "phone": user["phone"], "role": user["role"]})
    return {"token": token, "user": {"id": user["id"], "phone": user["phone"],
                                     "name": user["name"], "email": user["email"],
                                     "role": user["role"]}}


async def refresh(token: str) -> dict:
    import jwt as pyjwt
    try:
        payload = pyjwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
        user = await db.fetchrow('SELECT * FROM "User" WHERE id=$1', payload["id"])
    except Exception:
        raise AppError("Invalid token", 401)
    if user is None:
        raise AppError("User not found", 404)
    if not user["isActive"]:
        raise AppError("Account is deactivated", 403)
    new_token = generate_jwt({"id": user["id"], "phone": user["phone"], "role": user["role"]})
    return {"token": new_token, "user": {"id": user["id"], "phone": user["phone"],
                                         "name": user["name"], "email": user["email"],
                                         "role": user["role"]}}


async def get_profile(user_id: str) -> dict:
    user = await db.fetchrow('SELECT * FROM "User" WHERE id=$1', user_id)
    if user is None:
        raise AppError("User not found", 404)
    consumer = await db.fetchrow('SELECT * FROM "ConsumerProfile" WHERE "userId"=$1', user_id)
    worker = await db.fetchrow('SELECT * FROM "WorkerProfile" WHERE "userId"=$1', user_id)
    coop_admin = await db.fetchrow('SELECT * FROM "CoopAdminProfile" WHERE "userId"=$1', user_id)

    worker_profile = None
    if worker is not None:
        worker_profile = dict(worker)
        worker_profile["totalEarnings"] = _to_float(worker["totalEarnings"])
        worker_profile["walletBalance"] = _to_float(worker["walletBalance"])

    return {
        "id": user["id"], "phone": user["phone"], "name": user["name"],
        "email": user["email"], "role": user["role"], "avatarUrl": user["avatarUrl"],
        "locale": user["locale"], "isActive": user["isActive"], "createdAt": user["createdAt"],
        "consumerProfile": dict(consumer) if consumer else None,
        "workerProfile": worker_profile,
        "coopAdminProfile": dict(coop_admin) if coop_admin else None,
    }

def _to_float(v):
    return float(v) if v is not None else None


def _rand_int() -> int:
    import random
    return random.randint(0, 999999)
