"use client";

// Table of submissions (one column per question) with paging, and a side
// drawer showing one response in full.

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { TypeChip } from "@/components/builder/TypeChip";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Question, ResponseOut, ResponsePage } from "@/lib/types";

const PAGE_SIZE = 20;

interface ResponsesViewProps {
  formId: number;
  questions: Question[];
  onChanged: () => void; // a response was deleted: refresh counts
}

export function ResponsesView({ formId, questions, onChanged }: ResponsesViewProps) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ResponsePage | null>(null);
  const [open, setOpen] = useState<ResponseOut | null>(null);
  const [deleting, setDeleting] = useState<ResponseOut | null>(null);

  const load = useCallback(() => {
    api
      .listResponses(formId, page, PAGE_SIZE)
      .then(setData)
      .catch(() => toast.error("Couldn't load responses"));
  }, [formId, page]);

  useEffect(load, [load]);

  if (!data) return <PageSpinner />;
  if (data.total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <h2 className="text-lg font-medium">No responses yet</h2>
        <p className="mt-1 text-sm text-ink-muted">Submissions will appear here as a table.</p>
      </div>
    );
  }

  const pages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="sticky left-0 z-10 min-w-40 bg-surface px-4 py-2.5 font-normal">Submitted</th>
              {questions.map((q, i) => (
                <th key={q.id} className="max-w-60 min-w-44 px-4 py-2.5 font-normal">
                  <span className="flex items-center gap-2">
                    <TypeChip type={q.type} number={i + 1} />
                    <span className="truncate">{q.title || "Untitled"}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => {
              const answers = new Map(r.answers.map((a) => [a.question_id, a.display]));
              return (
                <tr
                  key={r.id}
                  onClick={() => setOpen(r)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas"
                >
                  <td className="sticky left-0 bg-inherit px-4 py-3 whitespace-nowrap text-ink-muted">
                    {formatDateTime(r.submitted_at)}
                  </td>
                  {questions.map((q) => (
                    <td key={q.id} className="max-w-60 truncate px-4 py-3" title={answers.get(q.id)}>
                      {answers.get(q.id) || <span className="text-ink-muted">—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-ink-muted">
        <span>
          {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <ResponseDrawer response={open} questions={questions} onClose={() => setOpen(null)} onDelete={setDeleting} />

      <ConfirmModal
        open={!!deleting}
        title="Delete this response?"
        confirmLabel="Delete"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.deleteResponse(formId, deleting.id);
            toast.success("Response deleted");
            setDeleting(null);
            setOpen(null);
            if (data.items.length === 1 && page > 1) setPage(page - 1);
            else load();
            onChanged();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't delete");
          }
        }}
      >
        It will be removed from your results and exports. This can&apos;t be undone.
      </ConfirmModal>
    </>
  );
}

function ResponseDrawer({
  response,
  questions,
  onClose,
  onDelete,
}: {
  response: ResponseOut | null;
  questions: Question[];
  onClose: () => void;
  onDelete: (r: ResponseOut) => void;
}) {
  useEffect(() => {
    if (!response) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [response, onClose]);

  const current = new Set(questions.map((q) => q.id));

  return (
    <AnimatePresence>
      {response && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.aside
            role="dialog"
            aria-label="Response details"
            className="absolute top-0 right-0 flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-medium">Response</h2>
                <p className="text-xs text-ink-muted">Submitted {formatDateTime(response.submitted_at)}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onDelete(response)}
                  aria-label="Delete response"
                  className="rounded p-2 text-ink-muted hover:bg-hover hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={onClose} aria-label="Close" className="rounded p-2 text-ink-muted hover:bg-hover">
                  <X size={16} />
                </button>
              </div>
            </header>
            <ol className="flex-1 overflow-y-auto px-5 py-4">
              {questions.map((q, i) => {
                const answer = response.answers.find((a) => a.question_id === q.id);
                return (
                  <li key={q.id} className="border-b border-line py-4 last:border-0">
                    <p className="mb-1.5 flex items-start gap-2 text-sm text-ink-muted">
                      <TypeChip type={q.type} number={i + 1} />
                      <span className="pt-0.5">{q.title || "Untitled"}</span>
                    </p>
                    <p className="whitespace-pre-line">
                      {answer?.display || <span className="text-ink-muted italic">Skipped</span>}
                    </p>
                  </li>
                );
              })}
              {response.answers
                .filter((a) => !current.has(a.question_id))
                .map((a) => (
                  <li key={a.question_id} className="border-b border-line py-4 last:border-0">
                    <p className="mb-1.5 text-sm text-ink-muted">Deleted question</p>
                    <p className="whitespace-pre-line">{a.display}</p>
                  </li>
                ))}
            </ol>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
