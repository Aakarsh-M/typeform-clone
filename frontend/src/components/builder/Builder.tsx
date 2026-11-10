"use client";

// The Create tab: question list · live canvas · settings.

import { useState } from "react";

import { FormGate } from "@/components/form-shell/FormGate";
import { useFormStore } from "@/lib/formStore";
import type { QuestionType } from "@/lib/types";

import { AddQuestionModal } from "./AddQuestionModal";
import { Canvas } from "./Canvas";
import { PreviewModal } from "./PreviewModal";
import { QuestionList } from "./QuestionList";
import { SettingsPanel } from "./SettingsPanel";

export function Builder() {
  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const addQuestion = useFormStore((s) => s.addQuestion);
  const flushAll = useFormStore((s) => s.flushAll);

  const add = (type: QuestionType) => {
    const { form, selectedId } = useFormStore.getState();
    const selected = form?.questions.find((q) => q.id === selectedId);
    // Insert after the selected question, like Typeform; otherwise append.
    void addQuestion(type, selected ? selected.position + 1 : undefined);
  };

  return (
    <FormGate>
      {(form) => (
        <div className="flex flex-1 flex-col md:h-[calc(100vh-3.5rem)] md:flex-row">
          <QuestionList onAdd={() => setAdding(true)} />
          <Canvas
            onAdd={() => setAdding(true)}
            onPreview={() => {
              void flushAll();
              setPreviewing(true);
            }}
          />
          <SettingsPanel />
          <AddQuestionModal open={adding} onClose={() => setAdding(false)} onPick={add} />
          <PreviewModal form={form} open={previewing} onClose={() => setPreviewing(false)} />
        </div>
      )}
    </FormGate>
  );
}
