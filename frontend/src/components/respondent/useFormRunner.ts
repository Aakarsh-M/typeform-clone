"use client";

// State machine for filling a form one question at a time:
// current index, answers, per-question errors, direction of travel (for the
// slide animation), submission, and the thank-you state.

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { AnswerIn, AnswerValue, Question } from "@/lib/types";
import { isEmpty, validateAnswer } from "@/lib/validation";

export type RunnerMode = "live" | "preview";

/** Numbers are typed as strings; convert before validating and sending. */
function normalize(question: Question, value: AnswerValue | undefined): AnswerValue {
  if (value === undefined) return null;
  if (question.type === "number" && typeof value === "string") {
    return value.trim() === "" ? null : Number(value);
  }
  if (typeof value === "string" && question.type !== "long_text") return value.trim();
  return value;
}

export function useFormRunner(questions: Question[], mode: RunnerMode, publicId?: string) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // The response row is created on the first answer, for completion tracking.
  const responseId = useRef<Promise<string | null> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((q) => !isEmpty(answers[q.id])).length;

  const ensureStarted = useCallback(() => {
    if (mode !== "live" || !publicId || responseId.current) return;
    responseId.current = api
      .startResponse(publicId)
      .then((r) => r.response_id)
      .catch(() => null); // tracking only; submitting still works without it
  }, [mode, publicId]);

  const setAnswer = useCallback(
    (qid: number, value: AnswerValue) => {
      ensureStarted();
      setAnswers((a) => ({ ...a, [qid]: value }));
      setErrors((e) => {
        if (!(qid in e)) return e;
        const { [qid]: _cleared, ...rest } = e;
        return rest;
      });
    },
    [ensureStarted],
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= questions.length || next === index) return;
      setDirection(next > index ? 1 : -1);
      setIndex(next);
    },
    [index, questions.length],
  );

  const submit = useCallback(
    async (finalAnswers: Record<number, AnswerValue>) => {
      // Re-check every question: one may have been skipped via the arrows.
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const message = validateAnswer(q, normalize(q, finalAnswers[q.id]));
        if (message) {
          setErrors((e) => ({ ...e, [q.id]: message }));
          setDirection(-1);
          setIndex(i);
          return;
        }
      }

      if (mode === "preview" || !publicId) {
        setDone(true);
        return;
      }

      const payload: AnswerIn[] = questions.map((q) => ({
        question_id: q.id,
        value: normalize(q, finalAnswers[q.id]),
      }));

      setSubmitting(true);
      try {
        const rid = responseId.current ? await responseId.current : null;
        await api.submitResponse(publicId, payload, rid);
        setDone(true);
      } catch (err) {
        if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
          // Server disagreed with client validation: jump to the first problem.
          setErrors(err.fieldErrors);
          const first = questions.findIndex((q) => q.id in err.fieldErrors);
          if (first >= 0) {
            setDirection(-1);
            setIndex(first);
          }
        } else {
          toast.error(err instanceof Error ? err.message : "Couldn't submit. Please try again.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [mode, publicId, questions],
  );

  /** Validate the current question and move forward (or submit on the last one). */
  const next = useCallback(
    (override?: { value: AnswerValue }) => {
      if (!current || submitting) return;
      // A pending pick-and-advance would move a second time; cancel it.
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
      const all = override ? { ...answers, [current.id]: override.value } : answers;
      const message = validateAnswer(current, normalize(current, all[current.id]));
      if (message) {
        setErrors((e) => ({ ...e, [current.id]: message }));
        return;
      }
      if (isLast) void submit(all);
      else goTo(index + 1);
    },
    [answers, current, goTo, index, isLast, submit, submitting],
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  /** Pick-and-advance for single choice, yes/no, rating and dropdown. */
  const pick = useCallback(
    (value: AnswerValue) => {
      if (!current) return;
      setAnswer(current.id, value);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      // Short pause so the selection blink is visible before moving on.
      advanceTimer.current = setTimeout(() => next({ value }), 450);
    },
    [current, next, setAnswer],
  );

  const restart = useCallback(() => {
    setAnswers({});
    setErrors({});
    setIndex(0);
    setDirection(-1);
    setDone(false);
    responseId.current = null;
  }, []);

  return {
    index,
    direction,
    current,
    isLast,
    answers,
    errors,
    submitting,
    done,
    answeredCount,
    setAnswer,
    next,
    prev,
    pick,
    goTo,
    restart,
  };
}
