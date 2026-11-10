"use client";

// Center panel: a live preview of the selected question in the form's theme,
// edited in place (title, description, choice labels). Uses the exact same
// QuestionView the respondent sees, so the preview can't drift from reality.

import { Monitor, Play, Smartphone } from "lucide-react";
import { useState } from "react";

import { EditableText } from "@/components/common/EditableText";
import { QuestionView } from "@/components/respondent/QuestionView";
import type { EditorHandlers } from "@/components/respondent/types";
import { Button } from "@/components/ui/Button";
import { useFormStore } from "@/lib/formStore";
import { getTheme, themeVars } from "@/lib/themes";

import { ENDING_ID } from "./QuestionList";

export function Canvas({ onPreview, onAdd }: { onPreview: () => void; onAdd: () => void }) {
  const form = useFormStore((s) => s.form)!;
  const selectedId = useFormStore((s) => s.selectedId);
  const updateQuestion = useFormStore((s) => s.updateQuestion);
  const setChoiceLabel = useFormStore((s) => s.setChoiceLabel);
  const addChoice = useFormStore((s) => s.addChoice);
  const removeChoice = useFormStore((s) => s.removeChoice);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const theme = getTheme(form.settings.theme?.preset);
  const index = form.questions.findIndex((q) => q.id === selectedId);
  const question = form.questions[index];

  const editor: EditorHandlers | undefined = question && {
    onTitle: (title) => updateQuestion(question.id, { title }),
    onDescription: (description) => updateQuestion(question.id, { description: description || null }),
    onChoiceLabel: (choiceId, label) => setChoiceLabel(question.id, choiceId, label),
    onAddChoice: () => addChoice(question.id),
    onRemoveChoice: (choiceId) => removeChoice(question.id, choiceId),
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-canvas">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Preview size">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              aria-label={`${d} view`}
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={`rounded p-1 ${device === d ? "bg-hover text-ink" : "text-ink-muted"}`}
            >
              {d === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={onPreview} disabled={form.questions.length === 0}>
          <Play size={14} /> Preview
        </Button>
      </div>

      <div className="flex flex-1 justify-center overflow-hidden px-4 pb-4">
        <div
          style={themeVars(theme)}
          className={`relative flex h-full max-h-[720px] min-h-[420px] w-full flex-col overflow-y-auto rounded-xl bg-[var(--q-bg)] shadow-sm ring-1 ring-black/5 transition-[max-width] duration-300 ${
            device === "mobile" ? "max-w-[390px] [&_h1]:text-xl" : "max-w-5xl"
          }`}
        >
          <div className="m-auto flex w-full justify-center py-12">
            {selectedId === ENDING_ID ? (
              <EndingEditor />
            ) : question ? (
              <QuestionView
                key={question.id}
                question={question}
                number={index + 1}
                value={undefined}
                isLast={index === form.questions.length - 1}
                active={false}
                onChange={() => {}}
                onPick={() => {}}
                onNext={() => {}}
                editor={editor}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center text-[var(--q-text)]">
                <p className="text-lg opacity-70">Your form is empty.</p>
                <Button onClick={onAdd}>Add your first question</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The thank-you screen, edited in place on the canvas. */
function EndingEditor() {
  const settings = useFormStore((s) => s.form!.settings);
  const updateSettings = useFormStore((s) => s.updateSettings);
  const thankYou = settings.thank_you ?? {};

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3 px-8 text-center">
      <EditableText
        value={thankYou.title ?? ""}
        placeholder="Thanks for completing this typeform"
        onChange={(title) => updateSettings({ thank_you: { ...thankYou, title } })}
        className="text-center text-3xl leading-snug text-[var(--q-text)]"
        ariaLabel="Thank you title"
      />
      <EditableText
        value={thankYou.description ?? ""}
        placeholder="Description (optional)"
        singleLine={false}
        onChange={(description) => updateSettings({ thank_you: { ...thankYou, description } })}
        className="text-center text-lg text-[var(--q-text)] opacity-70"
        ariaLabel="Thank you description"
      />
    </div>
  );
}
