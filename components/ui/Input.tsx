"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

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
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      <label
        htmlFor={inputId}
        className="
          text-[15px] font-bold leading-none
          text-body-text
          dark:text-ink
          sm:text-[16px]
        "
      >
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>

      {/* Helper */}
      {helperText && (
        <p className="text-[12px] leading-none text-muted">
          {helperText}
        </p>
      )}

      {/* Input Box */}
      <div
        className="
          flex h-14 w-full min-w-0 items-center gap-3
          rounded-2xl
          border
          border-ink
          bg-surface
          px-4
          focus-within:border-ink
          dark:border-muted
          dark:bg-surface
          dark:focus-within:border-muted
        "
      >
        {icon && (
          <span className="shrink-0 text-muted">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          type={resolvedType}
          required={required}
          className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold leading-none text-ink outline-none placeholder:text-muted"
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 text-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  );
}