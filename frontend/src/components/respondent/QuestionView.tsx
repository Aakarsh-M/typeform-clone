"use client";

// One question as Typeform renders it: number + arrow, title, description,
// the answer input, then either an error or the OK / Submit button.
// Used by the live form, the full-screen preview and the builder canvas.

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { EditableText } from "@/components/common/EditableText";
import type { AnswerValue, Question, QuestionType } from "@/lib/types";

import { ChoiceAnswer } from "./inputs/ChoiceAnswer";
import { DropdownAnswer } from "./inputs/DropdownAnswer";
import { RatingAnswer } from "./inputs/RatingAnswer";
import { TextAnswer } from "./inputs/TextAnswer";
import { YesNoAnswer } from "./inputs/YesNoAnswer";
import type { AnswerProps, EditorHandlers } from "./types";

const INPUTS: Record<QuestionType, React.ComponentType<AnswerProps>> = {
  short_text: TextAnswer,
  long_text: TextAnswer,
  email: TextAnswer,
  number: TextAnswer,
  multiple_choice: ChoiceAnswer,
  dropdown: DropdownAnswer,
  yes_no: YesNoAnswer,
  rating: RatingAnswer,
};

/** Types that advance on pick, so they show no OK button unless multi-select. */
function advancesOnPick(q: Question) {
  return (
    q.type === "yes_no" ||
    q.type === "rating" ||
    q.type === "dropdown" ||
    (q.type === "multiple_choice" && !q.properties.allow_multiple)
  );
}

interface QuestionViewProps {
  question: Question;
  number: number;
  value: AnswerValue | undefined;
  error?: string | null;
  isLast: boolean;
  active: boolean;
  onChange: (value: AnswerValue) => void;
  onPick: (value: AnswerValue) => void;
  onNext: () => void;
  submitting?: boolean;
  editor?: EditorHandlers;
}

export function QuestionView({
  question,
  number,
  value,
  error,
  isLast,
  active,
  onChange,
  onPick,
  onNext,
  submitting,
  editor,
}: QuestionViewProps) {
  const Input = INPUTS[question.type];
  const showButton = isLast || !advancesOnPick(question) || value != null;

  return (
    <div className="flex w-full max-w-3xl gap-2 px-6 md:px-10">
      <div className="flex h-8 shrink-0 items-center gap-1 pt-0.5 text-base text-[var(--q-accent)] md:-ml-12">
        {number}
        <ArrowRight size={14} strokeWidth={2.5} />
      </div>

      <div className="min-w-0 flex-1">
        {editor ? (
          <>
            <EditableText
              value={question.title}
              onChange={editor.onTitle}
              placeholder="Your question here. Recall information with @"
              className="text-2xl leading-snug text-[var(--q-text)]"
              ariaLabel="Question title"
            />
            <EditableText
              value={question.description ?? ""}
              onChange={editor.onDescription}
              placeholder="Description (optional)"
              className="mt-2 text-lg leading-snug text-[var(--q-text)] opacity-70"
              singleLine={false}
              ariaLabel="Question description"
            />
          </>
        ) : (
          <>
            <h1 className="text-xl leading-snug text-[var(--q-text)] md:text-2xl">
              {question.title || "..."}
              {question.required && <span aria-hidden> *</span>}
            </h1>
            {question.description && (
              <p className="mt-2 whitespace-pre-line text-base leading-snug text-[var(--q-text)] opacity-70 md:text-lg">
                {question.description}
              </p>
            )}
          </>
        )}

        <div className="mt-6 md:mt-8">
          <Input
            question={question}
            value={value}
            onChange={onChange}
            onPick={onPick}
            active={active}
            editor={editor}
          />
        </div>

        <div className="mt-4 min-h-12">
          {error ? (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded bg-[#F7E6E6] px-3 py-1.5 text-sm text-[#AF0404]"
            >
              <AlertTriangle size={14} /> {error}
            </motion.div>
          ) : (
            showButton && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={editor ? undefined : onNext}
                  disabled={submitting}
                  className="flex h-11 items-center gap-1.5 rounded bg-[var(--q-btn)] px-4 text-lg font-bold text-[var(--q-btn-text)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isLast ? (submitting ? "Submitting..." : "Submit") : "OK"}
                  {!isLast && <Check size={18} strokeWidth={3} />}
                </button>
                <span className="hidden text-xs text-[var(--q-text)] opacity-70 md:inline">
                  {question.type === "long_text" ? (
                    <>
                      <b>Shift ⇧</b> + <b>Enter ↵</b> to make a line break
                    </>
                  ) : (
                    <>
                      press <b>Enter ↵</b>
                    </>
                  )}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
