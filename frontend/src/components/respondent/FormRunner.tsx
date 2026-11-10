"use client";

// The full-screen, one-question-at-a-time experience. Used for the public
// link (mode "live", submits to the API) and the builder's full-screen
// preview (mode "preview", nothing is stored).

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

import { getTheme, themeVars } from "@/lib/themes";
import type { FormSettings, Question } from "@/lib/types";

import { useHotkeys } from "./hotkeys";
import { QuestionView } from "./QuestionView";
import { ThankYouScreen } from "./ThankYouScreen";
import { type RunnerMode, useFormRunner } from "./useFormRunner";

interface FormRunnerProps {
  title: string;
  questions: Question[];
  settings: FormSettings;
  mode: RunnerMode;
  publicId?: string;
  /** Fill the parent instead of the viewport (preview inside a modal). */
  contained?: boolean;
}

const slide = {
  enter: (dir: number) => ({ y: dir > 0 ? 120 : -120, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? -120 : 120, opacity: 0 }),
};

export function FormRunner({ title, questions, settings, mode, publicId, contained }: FormRunnerProps) {
  const runner = useFormRunner(questions, mode, publicId);
  const { current, index, direction, done } = runner;
  const theme = getTheme(settings.theme?.preset);
  const progress = questions.length ? runner.answeredCount / questions.length : 0;

  // Enter / arrows navigate. Inputs handle their own keys first and mark them
  // handled with preventDefault (e.g. dropdown arrow keys, letter shortcuts).
  useHotkeys(!done && !!current, (e) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    const inTextarea = target.tagName === "TEXTAREA";

    if (e.key === "Enter" && !(inTextarea && e.shiftKey)) {
      if (target.tagName === "BUTTON") return; // let the focused button click
      e.preventDefault();
      runner.next();
    } else if (!inTextarea && e.key === "ArrowDown") {
      e.preventDefault();
      runner.next();
    } else if (!inTextarea && e.key === "ArrowUp") {
      e.preventDefault();
      runner.prev();
    }
  });

  return (
    <div
      style={themeVars(theme)}
      className={`${contained ? "absolute inset-0" : "fixed inset-0"} flex flex-col overflow-hidden bg-[var(--q-bg)] text-[var(--q-text)]`}
    >
      {/* progress */}
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-[var(--q-accent-20)]">
        <motion.div
          className="h-full bg-[var(--q-accent)]"
          initial={false}
          style={{ width: 0 }}
          animate={{ width: `${(done ? 1 : progress) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <main className="relative flex flex-1 items-center justify-center overflow-y-auto py-16">
        {questions.length === 0 ? (
          <p className="px-6 text-center text-xl opacity-70">This form doesn&apos;t have any questions yet.</p>
        ) : done ? (
          <ThankYouScreen settings={settings} onRestart={mode === "preview" ? runner.restart : undefined} />
        ) : (
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.section
              key={current.id}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full justify-center"
              aria-label={`Question ${index + 1} of ${questions.length}`}
            >
              <QuestionView
                question={current}
                number={index + 1}
                value={runner.answers[current.id]}
                error={runner.errors[current.id]}
                isLast={runner.isLast}
                active
                submitting={runner.submitting}
                onChange={(v) => runner.setAnswer(current.id, v)}
                onPick={runner.pick}
                onNext={() => runner.next()}
              />
            </motion.section>
          </AnimatePresence>
        )}
      </main>

      {!done && questions.length > 0 && (
        <footer className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-3 md:right-6 md:bottom-6">
          <span className="hidden text-sm opacity-70 sm:inline">
            {runner.answeredCount} of {questions.length} answered
          </span>
          <div className="pointer-events-auto flex overflow-hidden rounded shadow-sm">
            <button
              type="button"
              aria-label="Previous question"
              onClick={runner.prev}
              disabled={index === 0}
              className="flex h-9 w-9 items-center justify-center border-r border-black/15 bg-[var(--q-btn)] text-[var(--q-btn-text)] disabled:opacity-50"
            >
              <ChevronUp size={20} />
            </button>
            <button
              type="button"
              aria-label="Next question"
              onClick={() => runner.next()}
              disabled={runner.isLast}
              className="flex h-9 w-9 items-center justify-center bg-[var(--q-btn)] text-[var(--q-btn-text)] disabled:opacity-50"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </footer>
      )}

      <span className="sr-only" aria-live="polite">
        {title}
      </span>
    </div>
  );
}
