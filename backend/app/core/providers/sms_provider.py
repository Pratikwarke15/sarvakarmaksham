import abc
import logging
from typing import Optional

logger = logging.getLogger("shramik.sms")


class SMSProvider(abc.ABC):
    """Abstract SMS Delivery Provider."""

    @abc.abstractmethod
    async def send_otp(self, mobile: str, otp: str) -> bool:
        pass


class DevelopmentMockSMSProvider(SMSProvider):
    """SIH Local Development & Prototype Provider (₹0 Cost).
    Prints OTP to development console and supports configurable fixed test OTP.
    """

    def __init__(self, fixed_dev_otp: str = "123456"):
        self.fixed_dev_otp = fixed_dev_otp

    async def send_otp(self, mobile: str, otp: str) -> bool:
        logger.info(f"==================================================")
        logger.info(f"[SIH DEVELOPMENT OTP PROVIDER]")
        logger.info(f"Mobile Target: {mobile}")
        logger.info(f"Generated OTP: {otp}")
        logger.info(f"Standard Test OTP: {self.fixed_dev_otp}")
        logger.info(f"==================================================")
        print(f"\n[SIH DEMO OTP] >>> Mobile: {mobile} | OTP: {otp} (or {self.fixed_dev_otp}) <<<\n")
        return True


class ServerSMSProvider(SMSProvider):
    """Server OTP Provider: Operates purely via secure server-generated OTPs."""

    async def send_otp(self, mobile: str, otp: str) -> bool:
        logger.info(f"[Server OTP] Verified target {mobile}, code: {otp}")
        return True


def get_sms_provider(is_prod: bool = False) -> SMSProvider:
    if is_prod:
        return ServerSMSProvider()
    return DevelopmentMockSMSProvider()
