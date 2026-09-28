"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface OtpInputProps {
  length?: number;
  value?: string;
  onComplete: (otp: string) => void;
  onResend?: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onComplete,
  onResend,
  loading,
  disabled,
  error,
  autoFocus = true,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => {
    if (value) {
      const clean = value.replace(/\D/g, "").slice(0, length);
      const arr = clean.split("");
      while (arr.length < length) arr.push("");
      return arr;
    }
    return Array(length).fill("");
  });
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Sync external controlled value prop
  useEffect(() => {
    if (value !== undefined) {
      const clean = value.replace(/\D/g, "").slice(0, length);
      const updated = Array(length).fill("");
      for (let i = 0; i < clean.length; i++) {
        updated[i] = clean[i];
      }
      setDigits(updated);
      if (clean.length === length) {
        onComplete(clean);
      }
    }
  }, [value, length, onComplete]);

  // Countdown timer
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

  const handleChange = (index: number, rawVal: string) => {
    const clean = rawVal.replace(/\D/g, "");

    // If cleared
    if (!clean) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    // If multi-digit (SMS autofill, password manager, or paste)
    if (clean.length > 1) {
      const chars = clean.slice(0, length);
      const updated = [...digits];
      for (let i = 0; i < chars.length; i++) {
        if (index + i < length) {
          updated[index + i] = chars[i];
        }
      }
      setDigits(updated);
      const nextIndex = Math.min(index + chars.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      submitIfComplete(updated);
      return;
    }

    // Single digit input
    const digit = clean.slice(-1);
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
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const updated = [...digits];
        updated[index - 1] = "";
        setDigits(updated);
        inputRefs.current[index - 1]?.focus();
      } else {
        const updated = [...digits];
        updated[index] = "";
        setDigits(updated);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const updated = Array(length).fill("");
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
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-slate-500 font-medium">
        Enter the 6-digit verification code below
      </p>

      <div className="flex gap-2 sm:gap-2.5">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={loading || disabled}
            className="h-12 w-10 sm:w-11 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 shadow-xs focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition"
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
          {countdown > 0
            ? `Resend security code in ${countdown}s`
            : "Resend security code"}
        </button>
      )}
    </div>
  );
}
