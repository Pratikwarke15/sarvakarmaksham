"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend?: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
}

export function OtpInput({ length = 6, onComplete, onResend, loading, disabled, error }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submitIfComplete = useCallback(
    (d: string[]) => {
      if (d.every((digit) => digit !== "")) {
        onComplete(d.join(""));
      }
    },
    [onComplete]
  );

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit) {
      submitIfComplete(updated);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const updated = [...digits];
      updated[index - 1] = "";
      setDigits(updated);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const updated = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setDigits(updated);
    const nextIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
    submitIfComplete(updated);
  };

  const handleResend = () => {
    if (!onResend) return;
    setDigits(Array(length).fill(""));
    setCountdown(30);
    inputRefs.current[0]?.focus();
    onResend();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-gray-500">Enter the 6-digit code sent to your phone</p>

      <div className="flex gap-2.5">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={loading || disabled}
            className="h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 shadow-xs focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition"
          />
        ))}
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

      {onResend && (
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || loading}
          className="text-xs font-semibold text-[#800020] hover:text-[#5a0016] disabled:cursor-not-allowed disabled:text-slate-400 transition"
        >
          {countdown > 0 ? `Resend security code in ${countdown}s` : "Resend security code"}
        </button>
      )}
    </div>
  );
}
