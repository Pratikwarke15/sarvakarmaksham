import os
from pathlib import Path

from dotenv import load_dotenv

# Load root .env (mirrors apps/api/src/config/env.ts)
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")


def _optional(name: str, fallback: str) -> str:
    return os.environ.get(name) or fallback


def _ensure_ssl_mode(url: str) -> str:
    if "sslmode=" in url or "localhost" in url or "127.0.0.1" in url:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}sslmode=require"


DATABASE_URL = _ensure_ssl_mode(os.environ["DATABASE_URL"])
JWT_SECRET = _optional("JWT_SECRET", "sih26089-dev-secret-key-change-in-production")
JWT_EXPIRES_IN = _optional("JWT_EXPIRES_IN", "7d")
API_PORT = int(_optional("API_PORT", "4000"))
CORS_ORIGIN = _optional("CORS_ORIGIN", "*")
# Public base URL used to build absolute upload URLs. Falls back to Render's
# auto-injected external URL, then to localhost API_PORT for local dev.
PUBLIC_BASE_URL = _optional(
    "PUBLIC_BASE_URL",
    _optional("RENDER_EXTERNAL_URL", f"http://localhost:{API_PORT}"),
).rstrip("/")
NODE_ENV = _optional("NODE_ENV", "development")
DIGILOCKER_MOCK = _optional("DIGILOCKER_MOCK", "true")
MAX_COMMISSION_RATE = float(_optional("MAX_COMMISSION_RATE", "5"))
OTP_EXPIRY_MINUTES = int(_optional("OTP_EXPIRY_MINUTES", "5"))
SOCIAL_SECURITY_RATE = float(_optional("SOCIAL_SECURITY_RATE", "0.01"))

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")
SMS_API_KEY = os.environ.get("SMS_API_KEY")

IS_PROD = NODE_ENV == "production"
