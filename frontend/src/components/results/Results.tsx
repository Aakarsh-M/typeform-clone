"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormGate } from "@/components/form-shell/FormGate";
import { PageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { FormDetail, FormSummary } from "@/lib/types";

import { ResponsesView } from "./ResponsesView";
import { SummaryView } from "./SummaryView";

type Tab = "summary" | "responses";

export function Results() {
  return <FormGate>{(form) => <ResultsBody form={form} />}</FormGate>;
}

function ResultsBody({ form }: { form: FormDetail }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [summary, setSummary] = useState<FormSummary | null>(null);

  const loadSummary = useCallback(() => {
    api
      .getSummary(form.id)
      .then(setSummary)
      .catch(() => toast.error("Couldn't load results"));
  }, [form.id]);

  useEffect(loadSummary, [loadSummary]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Responses" value={summary?.completed} />
        <Stat label="Started" value={summary?.started} />
        <Stat
          label="Completion rate"
          value={summary ? (summary.completion_rate == null ? "—" : `${summary.completion_rate}%`) : undefined}
        />
      </div>

      <div className="mb-5 flex items-center justify-between border-b border-line">
        <div className="flex gap-5" role="tablist">
          {(["summary", "responses"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 pb-2.5 text-sm capitalize ${
                tab === t ? "border-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <a
          href={api.csvUrl(form.id)}
          download
          className="mb-2 inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium hover:bg-hover"
        >
          <Download size={14} /> Download CSV
        </a>
      </div>

      {tab === "summary" &&
        (summary ? <SummaryView summary={summary} questions={form.questions} /> : <PageSpinner />)}
      {tab === "responses" && (
        <ResponsesView formId={form.id} questions={form.questions} onChanged={loadSummary} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{value ?? "…"}</p>
    </div>
  );
}
