"use client";

// The creator's home: forms in "My workspace", list or grid, with
// create / rename / duplicate / delete / copy link.

import { LayoutGrid, List, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/common/AppHeader";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { TextPromptModal } from "@/components/common/TextPromptModal";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { copyToClipboard, publicUrl, swatch, timeAgo } from "@/lib/format";
import type { FormListItem } from "@/lib/types";

import { type FormAction, FormActionsMenu } from "./FormActionsMenu";

type Sort = "updated" | "created" | "name";
type View = "list" | "grid";

const SORTS: Record<Sort, (a: FormListItem, b: FormListItem) => number> = {
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
  created: (a, b) => b.created_at.localeCompare(a.created_at),
  name: (a, b) => a.title.localeCompare(b.title),
};

export function Workspace() {
  const router = useRouter();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<Sort>("updated");
  const [view, setView] = useState<View>("list");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<FormListItem | null>(null);
  const [deleting, setDeleting] = useState<FormListItem | null>(null);

  const refresh = useCallback(() => {
    api
      .listForms()
      .then((f) => {
        setForms(f);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(refresh, [refresh]);

  const sorted = useMemo(() => (forms ? [...forms].sort(SORTS[sort]) : null), [forms, sort]);

  const handle = async (form: FormListItem, action: FormAction) => {
    switch (action) {
      case "open":
        return router.push(`/forms/${form.id}/create`);
      case "view":
        return window.open(publicUrl(form.public_id), "_blank");
      case "copy-link":
        return (await copyToClipboard(publicUrl(form.public_id)))
          ? toast.success("Link copied to clipboard")
          : toast.error("Couldn't copy the link");
      case "rename":
        return setRenaming(form);
      case "delete":
        return setDeleting(form);
      case "duplicate":
        try {
          const copy = await api.duplicateForm(form.id);
          toast.success(`"${copy.title}" created`);
          refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't duplicate");
        }
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-line bg-surface p-4 md:block">
          <Button className="w-full" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create a new form
          </Button>
          <p className="mt-6 mb-2 px-2 text-xs font-medium tracking-wide text-ink-muted uppercase">Workspaces</p>
          <div className="flex items-center justify-between rounded-md bg-hover px-2 py-1.5 text-sm font-medium">
            <span>My workspace</span>
            <span className="text-ink-muted">{forms?.length ?? ""}</span>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-6 md:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-medium">My workspace</h1>
            <div className="flex items-center gap-2">
              <select
                aria-label="Sort forms"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-8 rounded-md border border-line bg-surface px-2 text-sm"
              >
                <option value="updated">Last updated</option>
                <option value="created">Date created</option>
                <option value="name">Alphabetical</option>
              </select>
              <div className="flex rounded-md border border-line bg-surface p-0.5">
                {(["list", "grid"] as View[]).map((v) => (
                  <button
                    key={v}
                    aria-label={`${v} view`}
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`rounded p-1 ${view === v ? "bg-hover text-ink" : "text-ink-muted"}`}
                  >
                    {v === "list" ? <List size={16} /> : <LayoutGrid size={16} />}
                  </button>
                ))}
              </div>
              <Button size="sm" className="md:hidden" onClick={() => setCreating(true)}>
                <Plus size={14} /> New
              </Button>
            </div>
          </div>

          {failed && (
            <div className="rounded-lg border border-line bg-surface p-6 text-center">
              <p className="mb-3">Can&apos;t reach the server.</p>
              <Button variant="secondary" onClick={refresh}>
                Try again
              </Button>
            </div>
          )}
          {!sorted && !failed && <PageSpinner />}
          {sorted?.length === 0 && <EmptyState onCreate={() => setCreating(true)} />}
          {sorted && sorted.length > 0 && view === "list" && <FormTable forms={sorted} onAction={handle} />}
          {sorted && sorted.length > 0 && view === "grid" && <FormGrid forms={sorted} onAction={handle} />}
        </main>
      </div>

      <TextPromptModal
        open={creating}
        title="Create a new form"
        label="Give your form a name"
        initialValue="My new form"
        confirmLabel="Create"
        onClose={() => setCreating(false)}
        onConfirm={async (title) => {
          try {
            const form = await api.createForm(title);
            router.push(`/forms/${form.id}/create`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't create the form");
          }
        }}
      />
      <TextPromptModal
        open={!!renaming}
        title="Rename form"
        label="Form name"
        initialValue={renaming?.title}
        confirmLabel="Save"
        onClose={() => setRenaming(null)}
        onConfirm={async (title) => {
          if (!renaming) return;
          try {
            await api.updateForm(renaming.id, { title });
            toast.success("Form renamed");
            setRenaming(null);
            refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't rename");
          }
        }}
      />
      <ConfirmModal
        open={!!deleting}
        title="Delete this form?"
        confirmLabel="Delete"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.deleteForm(deleting.id);
            toast.success(`"${deleting.title}" deleted`);
            setDeleting(null);
            refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't delete");
          }
        }}
      >
        <b className="text-ink">{deleting?.title}</b> and its{" "}
        {deleting?.response_count === 1 ? "1 response" : `${deleting?.response_count ?? 0} responses`} will be
        permanently deleted. This can&apos;t be undone.
      </ConfirmModal>
    </div>
  );
}

function StatusBadge({ status }: { status: FormListItem["status"] }) {
  return status === "published" ? (
    <span className="rounded-full bg-[#DFF3E8] px-2 py-0.5 text-xs font-medium text-success">Published</span>
  ) : (
    <span className="rounded-full bg-hover px-2 py-0.5 text-xs font-medium text-ink-muted">Draft</span>
  );
}

function Thumb({ form, large }: { form: FormListItem; large?: boolean }) {
  return (
    <span
      style={{ background: swatch(form.id) }}
      className={`flex shrink-0 items-center justify-center rounded-md font-semibold text-ink/70 ${
        large ? "h-32 w-full rounded-b-none text-3xl" : "h-10 w-10 text-sm"
      }`}
    >
      {form.title.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

interface ListProps {
  forms: FormListItem[];
  onAction: (form: FormListItem, action: FormAction) => void;
}

function FormTable({ forms, onAction }: ListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="px-4 py-2.5 font-normal">Name</th>
            <th className="w-28 px-4 py-2.5 font-normal">Status</th>
            <th className="w-24 px-4 py-2.5 text-right font-normal">Questions</th>
            <th className="w-24 px-4 py-2.5 text-right font-normal">Responses</th>
            <th className="w-36 px-4 py-2.5 font-normal">Updated</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {forms.map((f) => (
            <tr key={f.id} className="group border-b border-line last:border-0 hover:bg-canvas">
              <td className="px-4 py-3">
                <Link href={`/forms/${f.id}/create`} className="flex items-center gap-3 font-medium">
                  <Thumb form={f} />
                  <span className="truncate group-hover:underline">{f.title}</span>
                </Link>
              </td>
              <td className="px-4">
                <StatusBadge status={f.status} />
              </td>
              <td className="px-4 text-right text-ink-muted">{f.question_count}</td>
              <td className="px-4 text-right">
                <Link href={`/forms/${f.id}/results`} className="hover:underline">
                  {f.response_count}
                </Link>
              </td>
              <td className="px-4 text-ink-muted">{timeAgo(f.updated_at)}</td>
              <td className="pr-2">
                <FormActionsMenu form={f} onAction={(a) => onAction(f, a)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormGrid({ forms, onAction }: ListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {forms.map((f) => (
        <div key={f.id} className="rounded-lg border border-line bg-surface transition-shadow hover:shadow-md">
          <Link href={`/forms/${f.id}/create`}>
            <Thumb form={f} large />
          </Link>
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <Link href={`/forms/${f.id}/create`} className="block truncate font-medium hover:underline">
                {f.title}
              </Link>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                <StatusBadge status={f.status} />
                {f.response_count} responses
              </p>
            </div>
            <FormActionsMenu form={f} onAction={(a) => onAction(f, a)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-medium">Make your first form</h2>
      <p className="max-w-sm text-sm text-ink-muted">
        Ask one question at a time and collect responses people actually enjoy giving.
      </p>
      <Button onClick={onCreate}>
        <Plus size={16} /> Create a new form
      </Button>
    </div>
  );
}
