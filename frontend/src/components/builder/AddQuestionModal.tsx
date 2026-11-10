"use client";

// "Add form elements" picker: question types grouped by category, plus
// placeholder types that are out of scope (file upload, payment, ...).

import { CreditCard, Lock, Upload } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { QUESTION_TYPE_ORDER, QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

import { TypeChip } from "./TypeChip";

const COMING_SOON = [
  { label: "File Upload", icon: Upload },
  { label: "Payment", icon: CreditCard },
];

interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
}

export function AddQuestionModal({ open, onClose, onPick }: AddQuestionModalProps) {
  const groups = QUESTION_TYPE_ORDER.reduce<Record<string, QuestionType[]>>((acc, t) => {
    (acc[QUESTION_TYPES[t].group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <Modal open={open} onClose={onClose} title="Add form elements" width="max-w-2xl">
      <div className="grid gap-x-8 gap-y-5 pb-2 sm:grid-cols-2">
        {Object.entries(groups).map(([group, types]) => (
          <section key={group}>
            <h3 className="mb-1.5 text-xs font-medium text-ink-muted">{group}</h3>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => {
                  onPick(t);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover"
              >
                <TypeChip type={t} />
                {QUESTION_TYPES[t].label}
              </button>
            ))}
          </section>
        ))}
        <section>
          <h3 className="mb-1.5 text-xs font-medium text-ink-muted">Coming soon</h3>
          {COMING_SOON.map(({ label, icon: Icon }) => (
            <div
              key={label}
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-1.5 text-sm text-ink-muted"
            >
              <span className="flex h-6 w-7 items-center justify-center rounded bg-hover">
                <Icon size={13} />
              </span>
              {label}
              <Lock size={12} className="ml-auto" />
            </div>
          ))}
        </section>
      </div>
    </Modal>
  );
}
