"use client";

// Workspace: the creator's list of forms.
// Scaffold version: lists forms from the API to prove the wiring end to end.
// Phase 2 adds create/rename/duplicate/delete modals and the Typeform layout.

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { FormListItem } from "@/lib/types";

export default function WorkspacePage() {
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listForms()
      .then(setForms)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Can't reach the API. Is the backend running?"));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-medium">My workspace</h1>
      {error && <p className="text-danger">{error}</p>}
      {!forms && !error && <p className="text-ink-muted">Loading…</p>}
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {forms?.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-5 py-4">
            <Link href={`/forms/${f.id}/create`} className="font-medium hover:underline">
              {f.title}
            </Link>
            <span className="text-sm text-ink-muted">
              {f.status} · {f.response_count} responses
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
