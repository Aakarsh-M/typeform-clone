"use client";

// Left panel: drag-and-drop ordered list of questions, then the ending.

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Flag, GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Menu } from "@/components/ui/Menu";
import { useFormStore } from "@/lib/formStore";
import type { Question } from "@/lib/types";

import { TypeChip } from "./TypeChip";

export const ENDING_ID = -1; // selection id for the thank-you screen

interface QuestionListProps {
  onAdd: () => void;
}

export function QuestionList({ onAdd }: QuestionListProps) {
  const questions = useFormStore((s) => s.form?.questions ?? []);
  const selectedId = useFormStore((s) => s.selectedId);
  const select = useFormStore((s) => s.select);
  const reorder = useFormStore((s) => s.reorder);

  const sensors = useSensors(
    // A small distance threshold keeps plain clicks working as "select".
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    void reorder(arrayMove(ids, from, to));
  };

  return (
    <aside className="flex w-full flex-col border-r border-line bg-surface md:w-64 md:shrink-0">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-medium">Content</h2>
        <button
          onClick={onAdd}
          aria-label="Add question"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-white hover:bg-black"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {questions.length === 0 && (
          <button
            onClick={onAdd}
            className="mx-2 mt-2 w-[calc(100%-1rem)] rounded-lg border border-dashed border-line px-3 py-6 text-sm text-ink-muted hover:bg-hover"
          >
            Add your first question
          </button>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-0.5">
              {questions.map((q, i) => (
                <SortableItem
                  key={q.id}
                  question={q}
                  number={i + 1}
                  selected={q.id === selectedId}
                  onSelect={() => select(q.id)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>

        <h3 className="mt-5 mb-1 px-2 text-xs font-medium text-ink-muted">Endings</h3>
        <button
          onClick={() => select(ENDING_ID)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
            selectedId === ENDING_ID ? "bg-hover font-medium" : "hover:bg-hover"
          }`}
        >
          <span className="flex h-6 w-7 items-center justify-center rounded bg-[#E3E0D6]">
            <Flag size={13} />
          </span>
          Thank you screen
        </button>
      </div>
    </aside>
  );
}

function SortableItem({
  question,
  number,
  selected,
  onSelect,
}: {
  question: Question;
  number: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const duplicate = useFormStore((s) => s.duplicateQuestion);
  const remove = useFormStore((s) => s.deleteQuestion);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex items-center rounded-md ${isDragging ? "z-10 bg-surface shadow-lg" : ""} ${
        selected ? "bg-hover" : "hover:bg-hover"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={onSelect}
        aria-label={`Question ${number}: ${question.title || "Untitled"}. Drag to reorder.`}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-2 py-2 text-left text-sm active:cursor-grabbing"
      >
        <GripVertical size={14} className="-ml-1 shrink-0 text-ink-muted opacity-0 group-hover:opacity-100" />
        <TypeChip type={question.type} number={number} />
        <span className={`truncate ${question.title ? "" : "text-ink-muted"} ${selected ? "font-medium" : ""}`}>
          {question.title || "..."}
        </span>
      </button>
      <div className={`pr-1 ${selected ? "" : "opacity-0 group-hover:opacity-100"}`}>
        <Menu
          items={[
            { label: "Duplicate", icon: <Copy size={15} />, onSelect: () => void duplicate(question.id) },
            { label: "Delete", icon: <Trash2 size={15} />, danger: true, onSelect: () => void remove(question.id) },
          ]}
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              aria-label="Question actions"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-line"
            >
              <MoreHorizontal size={15} />
            </button>
          )}
        />
      </div>
    </li>
  );
}
