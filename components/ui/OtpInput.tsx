"use client";

import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

const LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (otp: string) => void;
};

export function OtpInput({ value, onChange }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? "");

  const applyDigits = (raw: string, startIndex: number) => {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;

    const next = [...digits];
    let lastFilledIndex = startIndex - 1;
    for (let i = 0; i < incoming.length && startIndex + i < LENGTH; i++) {
      next[startIndex + i] = incoming[i];
      lastFilledIndex = startIndex + i;
    }
    onChange(next.join(""));
    inputsRef.current[Math.min(lastFilledIndex + 1, LENGTH - 1)]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    // Some mobile keyboards (SMS OTP autofill) deliver the whole code through
    // onChange instead of a paste event, bypassing maxLength.
    if (incoming.length > 1) {
      applyDigits(incoming, index);
      return;
    }
    const next = [...digits];
    next[index] = incoming;
    onChange(next.join(""));
    if (incoming && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) return;
    event.preventDefault();
    applyDigits(pasted, index);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-1 sm:gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onPaste={(event) => handlePaste(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          className="h-12 w-9 rounded-xl border border-brand/15 text-center text-lg font-bold text-ink outline-none focus:border-focus-ring sm:h-14 sm:w-12"
        />
      ))}
    </div>
  );
}
