"use client";

// Top bar for one form: breadcrumb with inline-editable title,
// Create / Connect / Share / Results tabs, save status and Publish.
// Reads the URL, so it must render inside a <Suspense> boundary.
// It is also what loads the form into the shared store for every tab.

import { ChevronDown, ExternalLink, Link2, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, Wordmark } from "@/components/common/AppHeader";
import { ShareLink } from "@/components/common/ShareLink";
import { Button } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { useFormStore } from "@/lib/formStore";
import { copyToClipboard, publicUrl } from "@/lib/format";

const TABS = [
  { slug: "create", label: "Create" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
];

export function FormTopBar() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const form = useFormStore((s) => s.form);
  const saving = useFormStore((s) => s.saving);
  const load = useFormStore((s) => s.load);
  const setPublished = useFormStore((s) => s.setPublished);
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    void load(Number(id));
  }, [id, load]);

  const current = form?.id === Number(id) ? form : null;

  const publish = async () => {
    if (await setPublished(true)) setJustPublished(true);
  };

  return (
    <header className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Wordmark />
        <span className="text-ink-muted">/</span>
        <Link href="/" className="hidden shrink-0 text-ink-muted hover:text-ink lg:inline">
          My workspace
        </Link>
        <span className="hidden text-ink-muted lg:inline">/</span>
        {current && <TitleInput key={current.id} />}
      </div>

      <nav className="flex gap-5 self-stretch" aria-label="Form sections">
        {TABS.map((tab) => {
          const href = `/forms/${id}/${tab.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center border-b-2 text-sm ${
                active ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-end gap-3">
        <span className="hidden items-center gap-1 text-xs text-ink-muted sm:flex" aria-live="polite">
          {saving > 0 ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Saving
            </>
          ) : (
            current && "Saved"
          )}
        </span>
        {current?.status === "published" ? (
          <Menu
            items={[
              {
                label: "Copy link",
                icon: <Link2 size={15} />,
                onSelect: async () => {
                  if (await copyToClipboard(publicUrl(current.public_id))) toast.success("Link copied to clipboard");
                },
              },
              {
                label: "View live form",
                icon: <ExternalLink size={15} />,
                onSelect: () => window.open(publicUrl(current.public_id), "_blank"),
              },
              {
                label: "Unpublish",
                icon: <Undo2 size={15} />,
                danger: true,
                onSelect: async () => {
                  if (await setPublished(false)) toast.success("Form unpublished. The link no longer accepts responses.");
                },
              },
            ]}
            trigger={({ toggle }) => (
              <Button size="sm" variant="secondary" onClick={toggle}>
                <span className="h-2 w-2 rounded-full bg-success" /> Published <ChevronDown size={14} />
              </Button>
            )}
          />
        ) : (
          <Button size="sm" onClick={publish} disabled={!current}>
            Publish
          </Button>
        )}
        <span className="hidden md:block">
          <Avatar />
        </span>
      </div>

      <Modal open={justPublished && !!current} onClose={() => setJustPublished(false)} title="Your form is live! 🎉">
        <p className="mb-4 text-sm text-ink-muted">Anyone with this link can fill it in, no login required.</p>
        {current && <ShareLink publicId={current.public_id} />}
      </Modal>
    </header>
  );
}

/** Form title, editable in place; saves on blur or Enter. */
function TitleInput() {
  const title = useFormStore((s) => s.form?.title ?? "");
  const rename = useFormStore((s) => s.rename);
  const [draft, setDraft] = useState(title);

  return (
    <input
      value={draft}
      aria-label="Form title"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!draft.trim()) setDraft(title);
        else void rename(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(title);
          e.currentTarget.blur();
        }
      }}
      className="min-w-0 flex-1 truncate rounded px-1.5 py-1 font-medium outline-none hover:bg-hover focus:bg-hover"
    />
  );
}
