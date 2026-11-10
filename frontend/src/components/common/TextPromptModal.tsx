"use client";

// Modal with one text field: used to create and rename forms.

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface TextPromptModalProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (value: string) => Promise<void> | void;
}

export function TextPromptModal(props: TextPromptModalProps) {
  // Remount the body each time it opens so the field resets to initialValue.
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title}>
      {props.open && <PromptBody {...props} />}
    </Modal>
  );
}

function PromptBody({ label, initialValue = "", confirmLabel, onClose, onConfirm }: TextPromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      await onConfirm(value.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label className="mb-1.5 block text-sm text-ink-muted" htmlFor="prompt-input">
        {label}
      </label>
      <input
        id="prompt-input"
        autoFocus
        value={value}
        maxLength={255}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-ink"
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!value.trim() || busy}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
