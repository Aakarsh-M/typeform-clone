// Mirrors backend/app/schemas.py. Keep the two in sync.

export type FormStatus = "draft" | "published";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface Choice {
  id: number;
  label: string;
  position: number;
}

export interface QuestionProperties {
  placeholder?: string;
  max_length?: number | null;
  min?: number | null;
  max?: number | null;
  allow_multiple?: boolean;
  randomize?: boolean;
  steps?: number;
  shape?: "star" | "number";
}

export interface Question {
  id: number;
  position: number;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  properties: QuestionProperties;
  choices: Choice[];
}

export interface FormSettings {
  theme?: { preset?: string };
  thank_you?: { title?: string; description?: string };
  [key: string]: unknown;
}

export interface FormListItem {
  id: number;
  public_id: string;
  title: string;
  status: FormStatus;
  question_count: number;
  response_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface FormDetail extends FormListItem {
  settings: FormSettings;
  questions: Question[];
}

export interface PublicForm {
  public_id: string;
  title: string;
  settings: FormSettings;
  questions: Question[];
}

/** What a respondent's answer can be before it is sent. */
export type AnswerValue = string | number | boolean | number[] | null;

export interface AnswerIn {
  question_id: number;
  value: AnswerValue;
}

export interface QuestionCreate {
  type: QuestionType;
  title?: string;
  description?: string | null;
  required?: boolean;
  properties?: QuestionProperties;
  choices?: { id?: number; label: string }[];
  position?: number;
}

export type QuestionUpdate = Partial<Omit<QuestionCreate, "position">>;

export interface AnswerOut {
  question_id: number;
  value: AnswerValue;
  display: string;
}

export interface ResponseOut {
  id: string;
  status: "in_progress" | "completed";
  started_at: string;
  submitted_at: string | null;
  answers: AnswerOut[];
}

export interface ResponsePage {
  items: ResponseOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface ChoiceStat {
  id: number;
  label: string;
  count: number;
  percentage: number;
}

export interface QuestionSummary {
  question_id: number;
  type: QuestionType;
  title: string;
  answered: number;
  skipped: number;
  choices?: ChoiceStat[] | null;
  average?: number | null;
  min?: number | null;
  max?: number | null;
  distribution?: Record<string, number> | null;
  latest?: string[] | null;
}

export interface FormSummary {
  form_id: number;
  started: number;
  completed: number;
  completion_rate: number | null;
  questions: QuestionSummary[];
}
