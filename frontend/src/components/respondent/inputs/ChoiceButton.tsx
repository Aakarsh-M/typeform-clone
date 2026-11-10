"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface ChoiceButtonProps {
  letter: string;
  selected: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  /** Builder canvas: render the label as an editable field plus a remove button. */
  onRemove?: () => void;
  disabled?: boolean;
}

/** One answer option: key badge, label, check mark. Blinks when picked, like Typeform. */
export function ChoiceButton({ letter, selected, onClick, children, onRemove, disabled }: ChoiceButtonProps) {
  return (
    <motion.div
      role={disabled ? undefined : "checkbox"}
      aria-checked={disabled ? undefined : selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      animate={selected ? { opacity: [1, 0.4, 1, 0.4, 1] } : { opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`group flex min-h-10 w-full max-w-full items-center gap-3 rounded border px-2 py-1.5 text-left text-lg text-[var(--q-accent)] transition-colors md:min-w-56 md:w-fit
        ${disabled ? "" : "cursor-pointer"}
        ${selected ? "border-2 border-[var(--q-accent)] bg-[var(--q-accent-30)]" : "border-[var(--q-accent-60)] bg-[var(--q-accent-10)] hover:bg-[var(--q-accent-20)]"}`}
    >
      <span
        className={`flex h-6 min-w-6 items-center justify-center rounded-sm border text-xs font-semibold
          ${selected ? "border-[var(--q-accent)] bg-[var(--q-accent)] text-[var(--q-bg)]" : "border-[var(--q-accent-60)] bg-[var(--q-bg)]"}`}
      >
        {letter}
      </span>
      <span className="flex-1 break-words">{children}</span>
      {selected && !onRemove && <Check size={18} className="shrink-0" />}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove choice"
          className="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}
