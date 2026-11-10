"use client";

import { Copy, ExternalLink, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Menu, type MenuItem } from "@/components/ui/Menu";
import type { FormListItem } from "@/lib/types";

export type FormAction = "open" | "view" | "copy-link" | "rename" | "duplicate" | "delete";

export function FormActionsMenu({ form, onAction }: { form: FormListItem; onAction: (a: FormAction) => void }) {
  const items: MenuItem[] = [
    { label: "Open", icon: <Pencil size={15} />, onSelect: () => onAction("open") },
    ...(form.status === "published"
      ? [
          { label: "View live form", icon: <ExternalLink size={15} />, onSelect: () => onAction("view") },
          { label: "Copy link", icon: <Link2 size={15} />, onSelect: () => onAction("copy-link") },
        ]
      : []),
    { label: "Rename", icon: <Pencil size={15} />, onSelect: () => onAction("rename") },
    { label: "Duplicate", icon: <Copy size={15} />, onSelect: () => onAction("duplicate") },
    { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => onAction("delete"), danger: true },
  ];

  return (
    <Menu
      items={items}
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          aria-label={`Actions for ${form.title}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink"
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    />
  );
}
