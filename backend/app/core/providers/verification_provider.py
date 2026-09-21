import abc
import re
import time
from typing import Any, Dict, Optional


class GovernmentVerificationProvider(abc.ABC):
    """Abstract interface for Government Identity & Credential Verification.
    Allows zero-cost switching between Official Government, Sandbox, and Development Mock.
    """

    @abc.abstractmethod
    async def verify_identity(self, identifier: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Verifies citizen/worker identity."""
        pass

    @abc.abstractmethod
    async def verify_document(self, doc_type: str, doc_payload: Any) -> Dict[str, Any]:
        """Verifies official trade certificate or government credential."""
        pass


class OfficialGovernmentProvider(GovernmentVerificationProvider):
    """Official UIDAI / DigiLocker Production Provider.
    Requires whitelisted IP, Department of Telecom / UIDAI ASA/KSA partner license.
    """

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id
        self.client_secret = client_secret

    async def verify_identity(self, identifier: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.client_id or not self.client_secret:
            raise NotImplementedError(
                "Official UIDAI e-KYC requires partner license, registered ASA/KSA gateway, and static IP whitelisting. "
                "Use SandboxProvider or DevelopmentMockProvider for testing."
            )
        # Production OAuth / e-KYC implementation hooks
        return {"status": "PENDING_OFFICIAL_GATEWAY", "verified": False}

    async def verify_document(self, doc_type: str, doc_payload: Any) -> Dict[str, Any]:
        if not self.client_id or not self.client_secret:
            raise NotImplementedError(
                "Official DigiLocker integration requires Government Requester approval. "
                "Use SandboxProvider or DevelopmentMockProvider for SIH demo."
            )
        return {"status": "PENDING_DIGILOCKER_CONSENT", "verified": False}


class SandboxProvider(GovernmentVerificationProvider):
    """Official Government Sandbox Provider for staging environments."""

    async def verify_identity(self, identifier: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        clean_id = re.sub(r"\D", "", identifier)
        valid = len(clean_id) == 12
        return {
            "mode": "SANDBOX",
            "provider": "Government Staging Sandbox",
            "verified": valid,
            "badgeLabel": "DEMO / SANDBOX VERIFICATION",
            "referenceId": f"SANDBOX-UID-{int(time.time())}",
            "verifiedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    async def verify_document(self, doc_type: str, doc_payload: Any) -> Dict[str, Any]:
        return {
            "mode": "SANDBOX",
            "provider": "DigiLocker Sandbox Gateway",
            "docType": doc_type,
            "verified": True,
            "badgeLabel": "DEMO / SANDBOX VERIFICATION",
            "referenceId": f"SANDBOX-DL-{int(time.time())}",
            "verifiedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }


class DevelopmentMockProvider(GovernmentVerificationProvider):
    """SIH Local Demo & Development Mock Provider (₹0 External Cost).
    CRITICAL RULE: UI must strictly display 'DEMO / SANDBOX VERIFICATION'.
    Never claim mock verification as genuine government verification.
    """

    AADHAAR_REGEX = re.compile(r"^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$")

    async def verify_identity(self, identifier: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        clean_id = re.sub(r"\D", "", identifier)
        is_valid = bool(self.AADHAAR_REGEX.match(clean_id))

        return {
            "mode": "DEVELOPMENT_MOCK",
            "isDemo": True,
            "badgeLabel": "DEMO / SANDBOX VERIFICATION",
            "disclaimer": "This is an SIH prototype simulation. Not a real UIDAI connection.",
            "verified": is_valid,
            "maskedAadhaar": f"XXXX-XXXX-{clean_id[-4:]}" if len(clean_id) >= 4 else "XXXX",
            "name": metadata.get("name", "Verified Citizen") if metadata else "Verified Citizen",
            "dob": metadata.get("dob", "1990-01-01") if metadata else "1990-01-01",
            "gender": metadata.get("gender", "M") if metadata else "M",
            "referenceId": f"SIH-DEMO-KYC-{int(time.time())}",
            "verifiedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    async def verify_document(self, doc_type: str, doc_payload: Any) -> Dict[str, Any]:
        return {
            "mode": "DEVELOPMENT_MOCK",
            "isDemo": True,
            "badgeLabel": "DEMO / SANDBOX VERIFICATION",
            "disclaimer": "This is an SIH prototype simulation. Not a real DigiLocker connection.",
            "docType": doc_type,
            "verified": True,
            "issuer": "National Council for Vocational Training (NCVT) [Simulated]",
            "referenceId": f"SIH-DEMO-DL-{int(time.time())}",
            "verifiedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }


# Singleton Factory Resolver based on application configuration
def get_verification_provider(mode: str = "demo") -> GovernmentVerificationProvider:
    mode_lower = mode.lower()
    if mode_lower in ("official", "production"):
        return OfficialGovernmentProvider()
    elif mode_lower == "sandbox":
        return SandboxProvider()
    return DevelopmentMockProvider()
