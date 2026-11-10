"use client";

// Short text, long text, email and number: the big underlined input.

import { useEffect, useLayoutEffect, useRef } from "react";

import type { AnswerProps } from "../types";

const FIELD =
  "w-full border-b bg-transparent pb-2 text-[22px] leading-snug text-[var(--q-accent)] outline-none transition-colors md:text-[30px] " +
  "border-[var(--q-accent-30)] placeholder:text-[var(--q-accent-30)] focus:border-[var(--q-accent)]";

export function TextAnswer({ question, value, onChange, active, editor }: AnswerProps) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const { type, properties } = question;
  const text = value == null ? "" : String(value);

  // Focus after the slide-in so the page doesn't jump mid-animation.
  useEffect(() => {
    if (!active || editor) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, [active, editor]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (type !== "long_text" || !el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, type]);

  if (type === "long_text") {
    return (
      <textarea
        ref={inputRef}
        rows={1}
        value={text}
        readOnly={!!editor}
        tabIndex={editor ? -1 : 0}
        aria-label={question.title || "Your answer"}
        placeholder={properties.placeholder ?? "Type your answer here..."}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} resize-none overflow-hidden`}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type={type === "email" ? "email" : "text"}
      inputMode={type === "number" ? "decimal" : type === "email" ? "email" : "text"}
      autoComplete={type === "email" ? "email" : "off"}
      value={text}
      readOnly={!!editor}
      tabIndex={editor ? -1 : 0}
      aria-label={question.title || "Your answer"}
      placeholder={properties.placeholder ?? "Type your answer here..."}
      onChange={(e) => {
        const next = e.target.value;
        // Numbers: keep it a string while typing ("4." is valid mid-edit),
        // the runner converts it before validating and submitting.
        if (type === "number" && next !== "" && !/^-?\d*\.?\d*$/.test(next)) return;
        onChange(next);
      }}
      className={FIELD}
    />
  );
}
