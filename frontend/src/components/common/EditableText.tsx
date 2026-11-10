"use client";

// Borderless auto-growing textarea used for inline editing on the builder
// canvas: question titles, descriptions and choice labels look like the
// rendered form but can be typed into directly.

import { useLayoutEffect, useRef } from "react";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  singleLine?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
}

export function EditableText({
  value,
  onChange,
  placeholder,
  className = "",
  singleLine = true,
  ariaLabel,
  autoFocus,
}: EditableTextProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      autoFocus={autoFocus}
      aria-label={ariaLabel ?? placeholder}
      placeholder={placeholder}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, " ") : e.target.value)}
      onKeyDown={(e) => {
        if (singleLine && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={`block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:opacity-50 ${className}`}
    />
  );
}
