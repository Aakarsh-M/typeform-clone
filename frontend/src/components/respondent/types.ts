import type { AnswerValue, Question } from "@/lib/types";

/** Inline-editing callbacks, present only when rendered on the builder canvas. */
export interface EditorHandlers {
  onTitle: (title: string) => void;
  onDescription: (description: string) => void;
  onChoiceLabel: (choiceId: number, label: string) => void;
  onAddChoice: () => void;
  onRemoveChoice: (choiceId: number) => void;
}

/** Props shared by every answer input. */
export interface AnswerProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Set the value and move to the next question (single-select, yes/no, rating). */
  onPick: (value: AnswerValue) => void;
  /** Whether this question is on screen and should own focus and shortcuts. */
  active: boolean;
  editor?: EditorHandlers;
}
