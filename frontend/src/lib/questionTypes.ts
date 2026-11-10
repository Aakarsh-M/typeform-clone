// One registry for everything the UI needs to know about a question type:
// label, icon, the colored chip shown in the builder, and its group in the
// "Add content" menu. Mirrors backend/app/question_types.py.

import {
  AlignLeft,
  AtSign,
  ChevronDownCircle,
  CircleCheck,
  Hash,
  type LucideIcon,
  Minus,
  Star,
  ToggleLeft,
} from "lucide-react";

import type { QuestionType } from "./types";

export interface QuestionTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Chip color in the builder sidebar, grouped by category like Typeform. */
  color: string;
  group: "Contact info" | "Text" | "Choice" | "Rating & ranking" | "Other";
}

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeMeta> = {
  email: { label: "Email", icon: AtSign, color: "#F3C6D2", group: "Contact info" },
  short_text: { label: "Short Text", icon: Minus, color: "#C9DDF5", group: "Text" },
  long_text: { label: "Long Text", icon: AlignLeft, color: "#C9DDF5", group: "Text" },
  multiple_choice: { label: "Multiple Choice", icon: CircleCheck, color: "#D9CBF0", group: "Choice" },
  dropdown: { label: "Dropdown", icon: ChevronDownCircle, color: "#D9CBF0", group: "Choice" },
  yes_no: { label: "Yes/No", icon: ToggleLeft, color: "#D9CBF0", group: "Choice" },
  rating: { label: "Rating", icon: Star, color: "#FBE3B2", group: "Rating & ranking" },
  number: { label: "Number", icon: Hash, color: "#CDEBDD", group: "Other" },
};

export const QUESTION_TYPE_ORDER: QuestionType[] = [
  "email",
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "yes_no",
  "rating",
  "number",
];

export const isChoiceType = (t: QuestionType) => t === "multiple_choice" || t === "dropdown";

/** Letter key shown next to each choice (A, B, C ...), as in Typeform. */
export const choiceKey = (index: number) => String.fromCharCode(65 + index);
