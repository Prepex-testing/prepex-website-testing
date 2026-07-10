"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

const LENGTH = 6;

export function OtpInput() {
  const [values, setValues] = useState<string[]>(Array(LENGTH).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = digit;
    setValues(next);
    if (digit && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-1 sm:gap-2">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          value={value}
          onChange={(event) => handleChange(index, event.target.value)}
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
