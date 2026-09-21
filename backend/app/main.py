from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from . import config
from .db import db
from .errors import AppError
from .routers import (
    admin,
    ai,
    auth,
    booking,
    coop,
    dispute,
    payment,
    routes,
    skills,
    social_security,
    upload,
    verification,
    worker,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(
    title="Shramik Co API",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
]
if config.CORS_ORIGIN and config.CORS_ORIGIN != "*":
    cors_origins.append(config.CORS_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    details = {}
    for err in exc.errors():
        path = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "path", "query"))
        details.setdefault(path or "body", []).append(err.get("msg"))
    return JSONResponse(status_code=400, content={"success": False, "error": "Validation failed", "details": details})


@app.exception_handler(ValidationError)
async def pydantic_handler(request: Request, exc: ValidationError):
    details = {}
    for err in exc.errors():
        path = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "path", "query"))
        details.setdefault(path or "body", []).append(err.get("msg"))
    return JSONResponse(status_code=400, content={"success": False, "error": "Validation failed", "details": details})


@app.get("/api/v1/health")
async def health():
    return {
        "success": True,
        "status": "ok",
        "message": "Shramik Co API is running",
        "version": "1.0.0",
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }


API_V1 = "/api/v1"

app.include_router(auth.router, prefix=f"{API_V1}/auth")
app.include_router(worker.router, prefix=f"{API_V1}/workers")
app.include_router(verification.router, prefix=f"{API_V1}/verification")
app.include_router(coop.router, prefix=f"{API_V1}/coops")
app.include_router(booking.router, prefix=f"{API_V1}/bookings")
app.include_router(payment.router, prefix=f"{API_V1}/payments")
app.include_router(social_security.router, prefix=f"{API_V1}/social-security")
app.include_router(dispute.router, prefix=f"{API_V1}/disputes")
app.include_router(upload.router, prefix=f"{API_V1}/uploads")
app.include_router(admin.router, prefix=f"{API_V1}/admin")
app.include_router(skills.router, prefix=f"{API_V1}/skills")
app.include_router(ai.router, prefix=f"{API_V1}/ai")
app.include_router(routes.router, prefix=f"{API_V1}/routes")


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"success": False, "error": "Endpoint not found"})


from pathlib import Path

_uploads_root = Path(__file__).resolve().parent.parent / "public" / "uploads"
_uploads_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_root)), name="uploads")
