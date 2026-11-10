"use client";

// Rating as a row of stars (or numbered boxes). Number keys pick a value;
// 0 means 10 on a 10-step scale.

import { Star } from "lucide-react";
import { useState } from "react";

import { isTypingTarget, useHotkeys } from "../hotkeys";
import type { AnswerProps } from "../types";

export function RatingAnswer({ question, value, onPick, active, editor }: AnswerProps) {
  const steps = question.properties.steps ?? 5;
  const shape = question.properties.shape ?? "star";
  const current = typeof value === "number" ? value : 0;
  const [hover, setHover] = useState(0);
  const lit = hover || current;

  useHotkeys(active && !editor, (e) => {
    if (isTypingTarget(e.target) || !/^\d$/.test(e.key)) return;
    const n = e.key === "0" ? 10 : Number(e.key);
    if (n >= 1 && n <= steps) {
      e.preventDefault();
      onPick(n);
    }
  });

  const values = Array.from({ length: steps }, (_, i) => i + 1);

  if (shape === "number") {
    return (
      <div className="flex max-w-2xl gap-1.5" role="radiogroup" aria-label={question.title || "Rating"}>
        {values.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            disabled={!!editor}
            onClick={() => onPick(n)}
            className={`h-14 flex-1 rounded border text-lg text-[var(--q-accent)] transition-colors
              ${current === n ? "border-2 border-[var(--q-accent)] bg-[var(--q-accent)] !text-[var(--q-bg)]" : "border-[var(--q-accent-60)] bg-[var(--q-accent-10)] enabled:hover:bg-[var(--q-accent-20)]"}`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex max-w-xl gap-1 md:gap-3"
      role="radiogroup"
      aria-label={question.title || "Rating"}
      onMouseLeave={() => setHover(0)}
    >
      {values.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={current === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={!!editor}
          onMouseEnter={() => !editor && setHover(n)}
          onClick={() => onPick(n)}
          className="flex flex-1 flex-col items-center gap-2 text-[var(--q-accent)]"
        >
          <Star
            strokeWidth={1}
            className="h-10 w-10 transition-transform enabled:hover:scale-105 md:h-14 md:w-14"
            fill={n <= lit ? "var(--q-accent)" : "var(--q-accent-10)"}
          />
          <span className="text-sm">{n}</span>
        </button>
      ))}
    </div>
  );
}
