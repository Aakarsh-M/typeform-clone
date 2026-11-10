"use client";

// Per-question summary cards: choice counts, rating distribution, yes/no,
// number stats, and the latest text answers.

import { Star } from "lucide-react";

import { TypeChip } from "@/components/builder/TypeChip";
import type { FormSummary, Question, QuestionSummary } from "@/lib/types";

export function SummaryView({ summary, questions }: { summary: FormSummary; questions: Question[] }) {
  const byId = new Map(summary.questions.map((s) => [s.question_id, s]));

  if (summary.completed === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <h2 className="text-lg font-medium">No responses yet</h2>
        <p className="mt-1 text-sm text-ink-muted">Share your form and results will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => {
        const s = byId.get(q.id);
        return s ? <QuestionCard key={q.id} number={i + 1} question={q} stats={s} /> : null;
      })}
    </div>
  );
}

function QuestionCard({ number, question, stats }: { number: number; question: Question; stats: QuestionSummary }) {
  const total = stats.answered + stats.skipped;
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <header className="mb-4 flex items-start gap-3">
        <TypeChip type={question.type} number={number} />
        <div className="min-w-0">
          <h3 className="font-medium">{question.title || "Untitled question"}</h3>
          <p className="text-xs text-ink-muted">
            {stats.answered} out of {total} people answered this question
          </p>
        </div>
      </header>
      <Body question={question} stats={stats} />
    </article>
  );
}

function Body({ question, stats }: { question: Question; stats: QuestionSummary }) {
  if (stats.choices) {
    return (
      <Bars
        rows={stats.choices.map((c) => ({ label: c.label, count: c.count, pct: c.percentage }))}
        note={question.properties.allow_multiple ? "Respondents could pick more than one option" : undefined}
      />
    );
  }

  if (question.type === "rating" && stats.distribution) {
    const total = Object.values(stats.distribution).reduce((a, b) => a + b, 0);
    return (
      <div className="grid gap-6 md:grid-cols-[160px_1fr]">
        <div>
          <p className="flex items-center gap-1 text-3xl font-medium">
            {stats.average?.toFixed(1) ?? "—"} <Star size={22} className="fill-[#F5B400] text-[#F5B400]" />
          </p>
          <p className="text-xs text-ink-muted">Average rating</p>
        </div>
        <Bars
          rows={Object.entries(stats.distribution)
            .reverse()
            .map(([value, count]) => ({
              label: `${value} ${question.properties.shape === "number" ? "" : "★"}`.trim(),
              count,
              pct: total ? Math.round((1000 * count) / total) / 10 : 0,
            }))}
        />
      </div>
    );
  }

  if (question.type === "yes_no" && stats.distribution) {
    const total = (stats.distribution.Yes ?? 0) + (stats.distribution.No ?? 0);
    return (
      <Bars
        rows={["Yes", "No"].map((label) => {
          const count = stats.distribution?.[label] ?? 0;
          return { label, count, pct: total ? Math.round((1000 * count) / total) / 10 : 0 };
        })}
      />
    );
  }

  if (question.type === "number") {
    return (
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Average", stats.average],
          ["Lowest", stats.min],
          ["Highest", stats.max],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg bg-canvas px-4 py-3">
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="text-2xl font-medium">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (stats.latest?.length) {
    return (
      <div>
        <p className="mb-2 text-xs text-ink-muted">Latest responses</p>
        <ul className="flex flex-col gap-2">
          {stats.latest.map((text, i) => (
            <li key={i} className="rounded-lg bg-canvas px-4 py-2.5 text-sm whitespace-pre-line">
              {text}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <p className="text-sm text-ink-muted">No answers yet.</p>;
}

function Bars({ rows, note }: { rows: { label: string; count: number; pct: number }[]; note?: string }) {
  const max = Math.max(...rows.map((r) => r.pct), 1);
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[minmax(80px,180px)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate" title={r.label}>
              {r.label}
            </span>
            <span className="h-7 overflow-hidden rounded bg-canvas" aria-hidden>
              <span
                className="block h-full rounded bg-[#C9DDF5] transition-[width] duration-500"
                style={{ width: `${(r.pct / max) * 100}%` }}
              />
            </span>
            <span className="w-24 text-right tabular-nums">
              <b>{r.pct}%</b> <span className="text-ink-muted">· {r.count}</span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}
