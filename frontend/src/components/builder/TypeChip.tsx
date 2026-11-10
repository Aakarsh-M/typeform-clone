import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

/** Colored icon chip with the question number, as in Typeform's sidebar. */
export function TypeChip({ type, number }: { type: QuestionType; number?: number }) {
  const meta = QUESTION_TYPES[type];
  const Icon = meta.icon;
  return (
    <span
      style={{ background: meta.color }}
      className="flex h-6 shrink-0 items-center gap-1.5 rounded px-1.5 text-xs font-medium text-ink/80"
    >
      <Icon size={13} strokeWidth={2.25} />
      {number !== undefined && <span>{number}</span>}
    </span>
  );
}
