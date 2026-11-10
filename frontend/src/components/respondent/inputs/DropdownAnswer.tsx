"use client";

// Searchable dropdown: type to filter, arrow keys to move, Enter to pick.

import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EditableText } from "@/components/common/EditableText";

import type { AnswerProps } from "../types";

export function DropdownAnswer({ question, value, onPick, onChange, active, editor }: AnswerProps) {
  const selectedId = Array.isArray(value) ? value[0] : undefined;
  const selected = question.choices.find((c) => c.id === selectedId);

  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selected?.label.toLowerCase()) return question.choices;
    return question.choices.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, question.choices, selected]);

  useEffect(() => {
    if (!active || editor) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, [active, editor]);

  if (editor) {
    return (
      <div className="flex max-w-md flex-col gap-1">
        <div className="mb-2 flex items-center border-b border-[var(--q-accent-30)] pb-2 text-[22px] text-[var(--q-accent-30)] md:text-[30px]">
          <span className="flex-1">{question.properties.placeholder ?? "Type or select an option"}</span>
          <ChevronDown />
        </div>
        {question.choices.map((c, i) => (
          <div key={c.id} className="group flex items-center gap-2 rounded px-2 py-1 text-[var(--q-accent)] hover:bg-[var(--q-accent-10)]">
            <EditableText
              value={c.label}
              placeholder={`Option ${i + 1}`}
              onChange={(label) => editor.onChoiceLabel(c.id, label)}
              ariaLabel={`Option ${i + 1} label`}
            />
            <button
              type="button"
              aria-label="Remove option"
              onClick={() => editor.onRemoveChoice(c.id)}
              className="opacity-0 group-hover:opacity-70"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={editor.onAddChoice}
          className="mt-1 flex w-fit items-center gap-1 text-sm text-[var(--q-accent)] hover:underline"
        >
          <Plus size={14} /> Add option
        </button>
      </div>
    );
  }

  const pick = (id: number) => {
    const choice = question.choices.find((c) => c.id === id);
    setQuery(choice?.label ?? "");
    setOpen(false);
    onPick([id]);
  };

  return (
    <div className="relative max-w-md">
      <div className="flex items-center border-b border-[var(--q-accent-30)] focus-within:border-[var(--q-accent)]">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={`dropdown-${question.id}`}
          aria-label={question.title || "Select an option"}
          value={query}
          placeholder={question.properties.placeholder ?? "Type or select an option"}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (selected) onChange(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault(); // keep the runner from changing question
              setOpen(true);
              const step = e.key === "ArrowDown" ? 1 : -1;
              setHighlight((h) => Math.max(0, Math.min(filtered.length - 1, h + step)));
            } else if (e.key === "Enter" && open && filtered[highlight]) {
              e.preventDefault();
              pick(filtered[highlight].id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full bg-transparent pb-2 text-[22px] text-[var(--q-accent)] outline-none placeholder:text-[var(--q-accent-30)] md:text-[30px]"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setQuery("");
              onChange(null);
              inputRef.current?.focus();
            }}
            className="text-[var(--q-accent)]"
          >
            <X />
          </button>
        ) : (
          <ChevronDown className="text-[var(--q-accent)]" />
        )}
      </div>
      {open && (
        <ul
          id={`dropdown-${question.id}`}
          role="listbox"
          className="mt-2 max-h-60 overflow-y-auto"
        >
          {filtered.length === 0 && <li className="px-2 py-2 text-[var(--q-text)] opacity-60">No suggestions found</li>}
          {filtered.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={c.id === selectedId}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c.id)}
              onMouseEnter={() => setHighlight(i)}
              className={`mb-1 cursor-pointer rounded border px-3 py-2 text-lg text-[var(--q-accent)]
                ${i === highlight ? "border-[var(--q-accent)] bg-[var(--q-accent-20)]" : "border-[var(--q-accent-30)] bg-[var(--q-accent-10)]"}`}
            >
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
