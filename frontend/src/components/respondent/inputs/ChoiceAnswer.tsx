"use client";

// Multiple choice: single-select (picks and advances) or multi-select (toggle,
// then press OK). Letter keys A, B, C ... select options.

import { Plus } from "lucide-react";
import { useState } from "react";

import { EditableText } from "@/components/common/EditableText";
import { choiceKey } from "@/lib/questionTypes";
import type { Choice } from "@/lib/types";

import { isTypingTarget, useHotkeys } from "../hotkeys";
import type { AnswerProps } from "../types";
import { ChoiceButton } from "./ChoiceButton";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ChoiceAnswer({ question, value, onChange, onPick, active, editor }: AnswerProps) {
  const multi = !!question.properties.allow_multiple;
  const selected = Array.isArray(value) ? value : [];

  // Randomize once per respondent, never on the builder canvas.
  const [order] = useState<Choice[] | null>(() =>
    question.properties.randomize && !editor ? shuffle(question.choices) : null,
  );
  const choices = editor || !order ? question.choices : order;

  const toggle = (id: number) => {
    if (multi) {
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    } else {
      onPick([id]);
    }
  };

  useHotkeys(active && !editor, (e) => {
    if (isTypingTarget(e.target) || e.key.length !== 1) return;
    const index = e.key.toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < choices.length) {
      e.preventDefault();
      toggle(choices[index].id);
    }
  });

  return (
    <div className="flex flex-col gap-2">
      {multi && !editor && <p className="mb-1 text-sm text-[var(--q-text)] opacity-70">Choose as many as you like</p>}
      {choices.map((choice, i) =>
        editor ? (
          <ChoiceButton
            key={choice.id}
            letter={choiceKey(i)}
            selected={false}
            disabled
            onRemove={() => editor.onRemoveChoice(choice.id)}
          >
            <EditableText
              value={choice.label}
              placeholder={`Choice ${choiceKey(i)}`}
              onChange={(label) => editor.onChoiceLabel(choice.id, label)}
              ariaLabel={`Choice ${choiceKey(i)} label`}
            />
          </ChoiceButton>
        ) : (
          <ChoiceButton
            key={choice.id}
            letter={choiceKey(i)}
            selected={selected.includes(choice.id)}
            onClick={() => toggle(choice.id)}
          >
            {choice.label}
          </ChoiceButton>
        ),
      )}
      {editor && (
        <button
          type="button"
          onClick={editor.onAddChoice}
          className="mt-1 flex w-fit items-center gap-1 text-sm text-[var(--q-accent)] underline-offset-4 hover:underline"
        >
          <Plus size={14} /> Add choice
        </button>
      )}
    </div>
  );
}
