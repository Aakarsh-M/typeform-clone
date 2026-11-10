// Thin typed client for the FastAPI backend. Every network call in the app
// goes through here, so components never build URLs or parse errors themselves.

import type {
  AnswerIn,
  FormDetail,
  FormListItem,
  FormSettings,
  FormSummary,
  PublicForm,
  Question,
  QuestionCreate,
  QuestionUpdate,
  ResponseOut,
  ResponsePage,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Per-question messages from a 422 submission, keyed by question id. */
    public fieldErrors: Record<number, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    if (detail && typeof detail === "object" && "errors" in detail) {
      throw new ApiError(res.status, detail.message, detail.errors);
    }
    const message = typeof detail === "string" ? detail : "Something went wrong. Please try again.";
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  // Forms
  listForms: () => request<FormListItem[]>("/api/forms"),
  createForm: (title?: string) => request<FormDetail>("/api/forms", json("POST", { title })),
  getForm: (id: number) => request<FormDetail>(`/api/forms/${id}`),
  updateForm: (id: number, patch: { title?: string; settings?: FormSettings }) =>
    request<FormDetail>(`/api/forms/${id}`, json("PATCH", patch)),
  deleteForm: (id: number) => request<void>(`/api/forms/${id}`, json("DELETE")),
  duplicateForm: (id: number) => request<FormDetail>(`/api/forms/${id}/duplicate`, json("POST")),
  publish: (id: number) => request<FormDetail>(`/api/forms/${id}/publish`, json("POST")),
  unpublish: (id: number) => request<FormDetail>(`/api/forms/${id}/unpublish`, json("POST")),

  // Questions
  addQuestion: (formId: number, body: QuestionCreate) =>
    request<Question>(`/api/forms/${formId}/questions`, json("POST", body)),
  updateQuestion: (id: number, patch: QuestionUpdate) =>
    request<Question>(`/api/questions/${id}`, json("PATCH", patch)),
  deleteQuestion: (id: number) => request<void>(`/api/questions/${id}`, json("DELETE")),
  reorderQuestions: (formId: number, questionIds: number[]) =>
    request<FormDetail>(`/api/forms/${formId}/questions/order`, json("PUT", { question_ids: questionIds })),

  // Results
  listResponses: (formId: number, page = 1, pageSize = 25) =>
    request<ResponsePage>(`/api/forms/${formId}/responses?page=${page}&page_size=${pageSize}`),
  getResponse: (formId: number, responseId: string) =>
    request<ResponseOut>(`/api/forms/${formId}/responses/${responseId}`),
  deleteResponse: (formId: number, responseId: string) =>
    request<void>(`/api/forms/${formId}/responses/${responseId}`, json("DELETE")),
  getSummary: (formId: number) => request<FormSummary>(`/api/forms/${formId}/summary`),
  csvUrl: (formId: number) => `${API_URL}/api/forms/${formId}/responses.csv`,

  // Public (respondent)
  getPublicForm: (publicId: string) => request<PublicForm>(`/api/public/forms/${publicId}`),
  startResponse: (publicId: string) =>
    request<{ response_id: string }>(`/api/public/forms/${publicId}/responses/start`, json("POST")),
  submitResponse: (publicId: string, answers: AnswerIn[], responseId?: string | null) =>
    request<{ response_id: string; submitted_at: string }>(
      `/api/public/forms/${publicId}/responses`,
      json("POST", { answers, response_id: responseId ?? null }),
    ),
};
