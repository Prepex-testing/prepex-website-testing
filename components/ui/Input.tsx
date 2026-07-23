"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { EyeIcon } from "@/components/ui/icons";

type InputProps = {
  label: string;
  helperText?: string;
  icon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  helperText,
  icon,
  id,
  type = "text",
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-[14px] font-semibold leading-[20px] text-ink"
      >
        {label}
      </label>
      {helperText && (
        <p className="text-xs text-muted">{helperText}</p>
      )}
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-brand/15 px-4 py-3 focus-within:border-focus-ring">
        {icon && <span className="text-muted">{icon}</span>}
        <input
          id={inputId}
          type={resolvedType}
          className="flex-1 bg-transparent text-sm text-body-text outline-none placeholder:text-muted/70"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon />
          </button>
        )}
      </div>
    </div>
  );
}
