"use client";

import { Code2, ExternalLink, Mail, QrCode } from "lucide-react";

import { ShareLink } from "@/components/common/ShareLink";
import { FormGate } from "@/components/form-shell/FormGate";
import { Button } from "@/components/ui/Button";
import { useFormStore } from "@/lib/formStore";
import { formatDateTime, publicUrl } from "@/lib/format";

const SOON = [
  { label: "Embed in a web page", icon: Code2 },
  { label: "Share by email", icon: Mail },
  { label: "QR code", icon: QrCode },
];

export function SharePanel() {
  const setPublished = useFormStore((s) => s.setPublished);

  return (
    <FormGate>
      {(form) => (
        <div className="mx-auto w-full max-w-2xl px-5 py-10">
          <h1 className="mb-1 text-xl font-medium">Share your form</h1>
          <p className="mb-6 text-sm text-ink-muted">Anyone with the link can respond. No account needed.</p>

          <section className="rounded-xl border border-line bg-surface p-5">
            {form.status === "published" ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-success" /> Live
                  </h2>
                  <span className="text-xs text-ink-muted">Published {formatDateTime(form.published_at)}</span>
                </div>
                <ShareLink publicId={form.public_id} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => window.open(publicUrl(form.public_id), "_blank")}>
                    <ExternalLink size={14} /> Open form
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => void setPublished(false)}>
                    Unpublish
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <h2 className="font-medium">This form is a draft</h2>
                <p className="text-sm text-ink-muted">
                  Publish it to get a shareable link. You can keep editing after publishing; changes go live
                  immediately.
                </p>
                <Button onClick={() => void setPublished(true)} disabled={form.questions.length === 0}>
                  Publish
                </Button>
                {form.questions.length === 0 && (
                  <p className="text-xs text-ink-muted">Add at least one question first.</p>
                )}
              </div>
            )}
          </section>

          <h2 className="mt-8 mb-3 text-sm font-medium">More ways to share</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SOON.map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <Icon size={18} className="mb-2 text-ink-muted" />
                <p className="font-medium">{label}</p>
                <p className="text-xs text-ink-muted">Coming soon</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </FormGate>
  );
}
