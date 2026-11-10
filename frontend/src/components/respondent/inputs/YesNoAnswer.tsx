"use client";

import { isTypingTarget, useHotkeys } from "../hotkeys";
import type { AnswerProps } from "../types";
import { ChoiceButton } from "./ChoiceButton";

export function YesNoAnswer({ value, onPick, active, editor }: AnswerProps) {
  useHotkeys(active && !editor, (e) => {
    if (isTypingTarget(e.target)) return;
    const key = e.key.toLowerCase();
    if (key === "y" || key === "n") {
      e.preventDefault();
      onPick(key === "y");
    }
  });

  return (
    <div className="flex flex-col gap-2">
      <ChoiceButton letter="Y" selected={value === true} onClick={() => onPick(true)} disabled={!!editor}>
        Yes
      </ChoiceButton>
      <ChoiceButton letter="N" selected={value === false} onClick={() => onPick(false)} disabled={!!editor}>
        No
      </ChoiceButton>
    </div>
  );
}
