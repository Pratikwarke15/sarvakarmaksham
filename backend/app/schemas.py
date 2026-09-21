import re

from pydantic import BaseModel, Field, field_validator

PHONE_RE = re.compile(r"^\d{10}$")
AADHAAR_RE = re.compile(r"^\d{12}$")
OTP_RE = re.compile(r"^\d{6}$")
PINCODE_RE = re.compile(r"^\d{6}$")


class PhoneModel(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not PHONE_RE.fullmatch(v):
            raise ValueError("Phone number must be exactly 10 digits")
        return v


class SendOtpRequest(PhoneModel):
    pass


class VerifyOtpRequest(PhoneModel):
    otp: str

    @field_validator("otp")
    @classmethod
    def _otp(cls, v: str) -> str:
        if not OTP_RE.fullmatch(v):
            raise ValueError("OTP must be exactly 6 digits")
        return v


class RegisterRequest(BaseModel):
    phone: str
    name: str = Field(min_length=2, max_length=100)
    email: str | None = None
    password: str = Field(min_length=6, max_length=128)
    role: str
    aadhaarNumber: str | None = None
    aadhaarName: str | None = None
    aadhaarDob: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    defaultAddress: str | None = None
    skillTags: list[str] | None = None

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not PHONE_RE.fullmatch(v):
            raise ValueError("Phone number must be exactly 10 digits")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        if v in (None, ""):
            return None
        return v

    @field_validator("role")
    @classmethod
    def _role(cls, v: str) -> str:
        if v not in ("CONSUMER", "WORKER"):
            raise ValueError("Role must be CONSUMER or WORKER")
        return v


class LoginRequest(BaseModel):
    phone: str
    password: str = Field(min_length=1)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not PHONE_RE.fullmatch(v):
            raise ValueError("Phone number must be exactly 10 digits")
        return v


class RefreshRequest(BaseModel):
    token: str


class RegisterWorkerRequest(BaseModel):
    skillTags: list[str] = Field(min_length=1, max_length=20)
    bio: str | None = Field(default=None, max_length=1000)
    experienceYears: int | None = Field(default=None, ge=0, le=50)
    coopId: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    workAddress: str | None = Field(default=None, min_length=5, max_length=500)
    aadhaarNumber: str
    aadhaarName: str | None = Field(default=None, min_length=2, max_length=100)
    aadhaarDob: str | None = Field(default=None, max_length=20)
    kycDocumentUrl: str | None = Field(default=None, max_length=2000)
    digilockerRef: str | None = Field(default=None, max_length=100)

    @field_validator("skillTags")
    @classmethod
    def _skills(cls, v):
        for s in v:
            if not (1 <= len(s) <= 50):
                raise ValueError("Skill tags must be 1-50 characters")
        return v

    @field_validator("aadhaarNumber")
    @classmethod
    def _aadhaar(cls, v: str) -> str:
        if not AADHAAR_RE.fullmatch(v):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v


class UpdateWorkerLocationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class UpdateAvailabilityRequest(BaseModel):
    isAvailable: bool
    isOnDuty: bool


class VerifyDigilockerRequest(BaseModel):
    aadhaarNumber: str

    @field_validator("aadhaarNumber")
    @classmethod
    def _aadhaar(cls, v: str) -> str:
        if not AADHAAR_RE.fullmatch(v):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v


class SendAadhaarOtpRequest(BaseModel):
    aadhaarNumber: str
    mobile: str

    @field_validator("aadhaarNumber")
    @classmethod
    def _aadhaar(cls, v: str) -> str:
        if not AADHAAR_RE.fullmatch(v):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        if not PHONE_RE.fullmatch(v):
            raise ValueError("Mobile number must be exactly 10 digits")
        return v


class VerifyAadhaarOtpRequest(BaseModel):
    aadhaarNumber: str
    mobile: str
    otp: str

    @field_validator("aadhaarNumber")
    @classmethod
    def _aadhaar(cls, v: str) -> str:
        if not AADHAAR_RE.fullmatch(v):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        if not PHONE_RE.fullmatch(v):
            raise ValueError("Mobile number must be exactly 10 digits")
        return v

    @field_validator("otp")
    @classmethod
    def _otp(cls, v: str) -> str:
        if not OTP_RE.fullmatch(v):
            raise ValueError("OTP must be exactly 6 digits")
        return v


class VerifyConsumerRequest(BaseModel):
    aadhaarNumber: str
    aadhaarName: str | None = None
    aadhaarDob: str | None = None
    kycDocumentUrl: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    defaultAddress: str | None = None

    @field_validator("aadhaarNumber")
    @classmethod
    def _aadhaar(cls, v: str) -> str:
        if not AADHAAR_RE.fullmatch(v):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v


class CreateBookingRequest(BaseModel):
    serviceId: str
    workerId: str | None = None
    address: str = Field(min_length=5, max_length=500)
    description: str | None = Field(default=None, max_length=1000)
    scheduledAt: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class UpdateBookingStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        allowed = {"PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"}
        if v not in allowed:
            raise ValueError("Invalid booking status")
        return v


class RateBookingRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class CancelBookingRequest(BaseModel):
    reason: str = Field(min_length=1)


class CreateCoopRequest(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    registrationNo: str = Field(min_length=3, max_length=50)
    description: str | None = Field(default=None, max_length=2000)
    address: str = Field(min_length=5, max_length=500)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radiusKm: float = Field(default=10, ge=1, le=100)
    commissionRate: float = Field(default=5, ge=0, le=5)

    @field_validator("pincode")
    @classmethod
    def _pincode(cls, v: str) -> str:
        if not PINCODE_RE.fullmatch(v):
            raise ValueError("Pincode must be exactly 6 digits")
        return v


class UpdateCoopSettingsRequest(BaseModel):
    radiusKm: float | None = Field(default=None, ge=1, le=100)
    commissionRate: float | None = Field(default=None, ge=0, le=5)
    isActive: bool | None = None


class ApproveWorkerRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class RejectWorkerRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class CreateDisputeRequest(BaseModel):
    bookingId: str
    category: str
    description: str
    priority: str | None = None
    evidence: dict | None = None


class UpdateDisputeStatusRequest(BaseModel):
    status: str
    resolution: str | None = None


class ToggleOptInRequest(BaseModel):
    fundType: str
    optedIn: bool
