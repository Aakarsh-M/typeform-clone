"use client";

// Right panel. "Question" tab: type, required, and type-specific settings for
// the selected question. "Design" tab: theme presets. Logic is a placeholder.

import { Check, GitBranch } from "lucide-react";
import { useState } from "react";

import { Toggle } from "@/components/ui/Toggle";
import { useFormStore } from "@/lib/formStore";
import { QUESTION_TYPE_ORDER, QUESTION_TYPES } from "@/lib/questionTypes";
import { THEMES } from "@/lib/themes";
import type { Question, QuestionProperties, QuestionType } from "@/lib/types";

import { ENDING_ID } from "./QuestionList";

type Tab = "question" | "design" | "logic";

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>("question");
  const selectedId = useFormStore((s) => s.selectedId);
  const question = useFormStore((s) => s.form?.questions.find((q) => q.id === s.selectedId));

  return (
    <aside className="flex w-full flex-col border-l border-line bg-surface md:w-72 md:shrink-0">
      <div className="flex border-b border-line px-2" role="tablist">
        {(["question", "design", "logic"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-3 text-sm capitalize ${
              tab === t ? "border-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "design" && <DesignSettings />}
        {tab === "logic" && <LogicPlaceholder />}
        {tab === "question" &&
          (question ? (
            <QuestionSettings key={question.id} question={question} />
          ) : (
            <p className="text-sm text-ink-muted">
              {selectedId === ENDING_ID
                ? "Edit the thank-you screen's text directly on the canvas."
                : "Select a question to see its settings."}
            </p>
          ))}
      </div>
    </aside>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <label htmlFor={htmlFor} className="text-sm">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="h-8 w-24 rounded-md border border-line px-2 text-sm outline-none focus:border-ink"
    />
  );
}

function QuestionSettings({ question }: { question: Question }) {
  const updateQuestion = useFormStore((s) => s.updateQuestion);
  const changeType = useFormStore((s) => s.changeType);
  const p = question.properties;
  const setProp = (patch: QuestionProperties) => updateQuestion(question.id, { properties: patch });

  return (
    <div className="divide-y divide-line">
      <div className="pb-3">
        <label htmlFor="q-type" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Question type
        </label>
        <select
          id="q-type"
          value={question.type}
          onChange={(e) => void changeType(question.id, e.target.value as QuestionType)}
          className="h-9 w-full rounded-md border border-line bg-surface px-2 text-sm"
        >
          {QUESTION_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPES[t].label}
            </option>
          ))}
        </select>
      </div>

      <div className="py-1">
        <Row label="Required" htmlFor="q-required">
          <Toggle
            id="q-required"
            checked={question.required}
            onChange={(required) => updateQuestion(question.id, { required })}
          />
        </Row>

        {question.type === "multiple_choice" && (
          <Row label="Multiple selection" htmlFor="q-multi">
            <Toggle id="q-multi" checked={!!p.allow_multiple} onChange={(v) => setProp({ allow_multiple: v })} />
          </Row>
        )}
        {(question.type === "multiple_choice" || question.type === "dropdown") && (
          <Row label="Randomize" htmlFor="q-random">
            <Toggle id="q-random" checked={!!p.randomize} onChange={(v) => setProp({ randomize: v })} />
          </Row>
        )}
        {(question.type === "short_text" || question.type === "long_text") && (
          <Row label="Max characters" htmlFor="q-max-len">
            <NumberField
              id="q-max-len"
              value={p.max_length}
              placeholder="None"
              onChange={(v) => setProp({ max_length: v && v > 0 ? v : null })}
            />
          </Row>
        )}
        {question.type === "number" && (
          <>
            <Row label="Min number" htmlFor="q-min">
              <NumberField id="q-min" value={p.min} placeholder="None" onChange={(v) => setProp({ min: v })} />
            </Row>
            <Row label="Max number" htmlFor="q-max">
              <NumberField id="q-max" value={p.max} placeholder="None" onChange={(v) => setProp({ max: v })} />
            </Row>
          </>
        )}
        {question.type === "rating" && (
          <>
            <Row label="Steps" htmlFor="q-steps">
              <select
                id="q-steps"
                value={p.steps ?? 5}
                onChange={(e) => setProp({ steps: Number(e.target.value) })}
                className="h-8 rounded-md border border-line bg-surface px-2 text-sm"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Row>
            <Row label="Shape" htmlFor="q-shape">
              <select
                id="q-shape"
                value={p.shape ?? "star"}
                onChange={(e) => setProp({ shape: e.target.value as "star" | "number" })}
                className="h-8 rounded-md border border-line bg-surface px-2 text-sm"
              >
                <option value="star">Star</option>
                <option value="number">Number</option>
              </select>
            </Row>
          </>
        )}
      </div>

      {"placeholder" in p && (
        <div className="pt-3">
          <label htmlFor="q-placeholder" className="mb-1.5 block text-xs font-medium text-ink-muted">
            Placeholder text
          </label>
          <input
            id="q-placeholder"
            value={p.placeholder ?? ""}
            onChange={(e) => setProp({ placeholder: e.target.value })}
            className="h-9 w-full rounded-md border border-line px-2 text-sm outline-none focus:border-ink"
          />
        </div>
      )}
    </div>
  );
}

function DesignSettings() {
  const preset = useFormStore((s) => s.form?.settings.theme?.preset ?? "default");
  const updateSettings = useFormStore((s) => s.updateSettings);

  return (
    <div>
      <h3 className="mb-3 text-xs font-medium text-ink-muted">Themes</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(THEMES).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => updateSettings({ theme: { preset: key } })}
            aria-pressed={preset === key}
            className={`overflow-hidden rounded-lg border text-left ${preset === key ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/40"}`}
          >
            <div style={{ background: theme.background }} className="flex h-16 flex-col justify-center gap-1 px-3">
              <span style={{ color: theme.question }} className="text-xs">
                Question
              </span>
              <span style={{ background: theme.answer }} className="h-1.5 w-10 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-xs">
              {theme.name}
              {preset === key && <Check size={12} />}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-muted">Custom fonts, logos and background images are coming soon.</p>
    </div>
  );
}

function LogicPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hover">
        <GitBranch size={18} />
      </span>
      <h3 className="font-medium">Logic jumps are coming soon</h3>
      <p className="text-sm text-ink-muted">Send people to different questions based on their answers.</p>
    </div>
  );
}
