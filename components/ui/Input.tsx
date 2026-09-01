"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

type InputProps = {
  label: string;
  helperText?: string;
  icon?: ReactNode;
  labelClassName?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  helperText,
  icon,
  labelClassName = "text-body-lg font-medium leading-none text-body-text dark:text-ink",
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
        className={labelClassName}
      >
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>

      {/* Helper */}
      {helperText && (
        <p className="text-[12px] leading-none text-muteds">
          {helperText}
        </p>
      )}

      {/* Input Box */}
      <div
        className="flex h-12.25 w-full min-w-0 items-center gap-3
    rounded-xl
    border
    border-input-border
    bg-surface
    px-4
    shadow-input
    focus-within:border-input-border
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
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px]"
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 text-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        )}
      </div>
    </div>
  );
}