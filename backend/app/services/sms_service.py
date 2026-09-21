import os

import requests

from .. import config


async def send_otp_sms(phone: str, otp: str) -> bool:
    print(f"[SHRAMIK ZERO-COST SERVER OTP] Phone: {phone} | OTP: {otp}")
    return True
