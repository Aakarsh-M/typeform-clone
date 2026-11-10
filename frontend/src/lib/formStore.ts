// State for the form currently open in the editor tabs (Create / Share / ...).
//
// Edits are optimistic: the UI updates immediately and the change is sent to
// the API in the background. Text edits are debounced per question so typing
// a title doesn't send a request per keystroke. Per question, requests run one
// at a time so their order on the server matches the order of the edits.

import { toast } from "sonner";
import { create } from "zustand";

import { api } from "./api";
import { isChoiceType } from "./questionTypes";
import type { Choice, FormDetail, FormSettings, Question, QuestionType, QuestionUpdate } from "./types";

const SAVE_DELAY_MS = 400;

type QuestionPatch = Omit<QuestionUpdate, "choices" | "type"> & { choices?: true };

interface FormState {
  form: FormDetail | null;
  loadError: string | null;
  selectedId: number | null;
  saving: number; // requests in flight, drives the "Saving..." indicator

  load: (id: number) => Promise<void>;
  select: (id: number | null) => void;
  rename: (title: string) => Promise<void>;
  updateSettings: (patch: FormSettings) => Promise<void>;
  setPublished: (published: boolean) => Promise<boolean>;

  addQuestion: (type: QuestionType, position?: number) => Promise<void>;
  duplicateQuestion: (id: number) => Promise<void>;
  updateQuestion: (id: number, patch: QuestionUpdate) => void;
  changeType: (id: number, type: QuestionType) => Promise<void>;
  addChoice: (id: number) => void;
  removeChoice: (id: number, choiceId: number) => void;
  setChoiceLabel: (id: number, choiceId: number, label: string) => void;
  deleteQuestion: (id: number) => Promise<void>;
  reorder: (orderedIds: number[]) => Promise<void>;
  flushAll: () => Promise<void>;
}

// Debounce bookkeeping lives outside React state: it never affects rendering.
const pending = new Map<number, QuestionPatch>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const inFlight = new Map<number, Promise<void>>();
let tempChoiceId = -1; // new choices get negative ids until the server assigns real ones
let settingsPatch: FormSettings | null = null;
let settingsTimer: ReturnType<typeof setTimeout> | undefined;

export const useFormStore = create<FormState>((set, get) => {
  const patchQuestion = (id: number, fn: (q: Question) => Question) =>
    set((s) =>
      s.form ? { form: { ...s.form, questions: s.form.questions.map((q) => (q.id === id ? fn(q) : q)) } } : s,
    );

  const track = async <T>(promise: Promise<T>): Promise<T> => {
    set((s) => ({ saving: s.saving + 1 }));
    try {
      return await promise;
    } finally {
      set((s) => ({ saving: s.saving - 1 }));
    }
  };

  const fail = (message: string) => (err: unknown) => {
    toast.error(err instanceof Error ? err.message : message);
    const id = get().form?.id;
    if (id) void get().load(id); // resync with the server's truth
  };

  /** Send the accumulated patch for one question, after any earlier request for it. */
  const flush = async (id: number): Promise<void> => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    await inFlight.get(id);

    const patch = pending.get(id);
    if (!patch) return;
    pending.delete(id);

    const question = get().form?.questions.find((q) => q.id === id);
    if (!question) return;

    const sentChoices = patch.choices ? question.choices : null;
    const body: QuestionUpdate = { ...patch, choices: undefined };
    if (sentChoices) body.choices = sentChoices.map((c) => ({ id: c.id > 0 ? c.id : undefined, label: c.label }));

    const request = track(api.updateQuestion(id, body))
      .then((saved) => {
        if (!sentChoices) return;
        // The server returns choices in the order sent; map temp ids to real ones.
        const idMap = new Map(sentChoices.map((c, i) => [c.id, saved.choices[i]?.id ?? c.id]));
        patchQuestion(id, (q) => ({ ...q, choices: q.choices.map((c) => ({ ...c, id: idMap.get(c.id) ?? c.id })) }));
      })
      .catch(fail("Couldn't save your changes"));

    inFlight.set(id, request);
    await request;
    if (inFlight.get(id) === request) inFlight.delete(id);
  };

  const queue = (id: number, patch: QuestionPatch) => {
    const prev = pending.get(id);
    const merged: QuestionPatch = { ...prev, ...patch };
    // properties is itself a partial patch: merge it, don't let a later key replace an earlier one.
    if (prev?.properties && patch.properties) merged.properties = { ...prev.properties, ...patch.properties };
    pending.set(id, merged);
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => void flush(id), SAVE_DELAY_MS));
  };

  const flushSettings = async () => {
    clearTimeout(settingsTimer);
    const form = get().form;
    if (!form || !settingsPatch) return;
    const patch = settingsPatch;
    settingsPatch = null;
    await track(api.updateForm(form.id, { settings: patch })).catch(fail("Couldn't save settings"));
  };

  const setChoices = (id: number, fn: (choices: Choice[]) => Choice[]) => {
    patchQuestion(id, (q) => ({ ...q, choices: fn(q.choices).map((c, i) => ({ ...c, position: i })) }));
    queue(id, { choices: true });
  };

  return {
    form: null,
    loadError: null,
    selectedId: null,
    saving: 0,

    async load(id) {
      await get().flushAll();
      try {
        const form = await api.getForm(id);
        const selected = get().selectedId;
        const keep = form.questions.some((q) => q.id === selected);
        set({ form, loadError: null, selectedId: keep ? selected : (form.questions[0]?.id ?? null) });
      } catch (err) {
        set({ form: null, loadError: err instanceof Error ? err.message : "Couldn't load this form" });
      }
    },

    select: (id) => set({ selectedId: id }),

    async rename(title) {
      const form = get().form;
      const trimmed = title.trim();
      if (!form || !trimmed || trimmed === form.title) return;
      set({ form: { ...form, title: trimmed } });
      await track(api.updateForm(form.id, { title: trimmed })).catch(fail("Couldn't rename the form"));
    },

    async updateSettings(patch) {
      const form = get().form;
      if (!form) return;
      set({ form: { ...form, settings: { ...form.settings, ...patch } } });
      // Debounced like question edits: the thank-you text is typed on the canvas.
      settingsPatch = { ...settingsPatch, ...patch };
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(() => void flushSettings(), SAVE_DELAY_MS);
    },

    async setPublished(published) {
      const form = get().form;
      if (!form) return false;
      await get().flushAll();
      try {
        const saved = await track(published ? api.publish(form.id) : api.unpublish(form.id));
        set({ form: { ...form, status: saved.status, published_at: saved.published_at } });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
        return false;
      }
    },

    async addQuestion(type, position) {
      const form = get().form;
      if (!form) return;
      // Save pending edits first: the form is re-fetched below, which would
      // otherwise overwrite local changes that haven't reached the server.
      await get().flushAll();
      try {
        await track(api.addQuestion(form.id, { type, position }));
        const fresh = await api.getForm(form.id); // positions of later questions shifted
        const added = fresh.questions.find((q) => !form.questions.some((old) => old.id === q.id));
        set({ form: fresh, selectedId: added?.id ?? get().selectedId });
      } catch (err) {
        fail("Couldn't add the question")(err);
      }
    },

    async duplicateQuestion(id) {
      const form = get().form;
      const q = form?.questions.find((x) => x.id === id);
      if (!form || !q) return;
      await get().flushAll();
      try {
        const copy = await track(
          api.addQuestion(form.id, {
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required,
            properties: q.properties,
            choices: isChoiceType(q.type) ? q.choices.map((c) => ({ label: c.label })) : undefined,
            position: q.position + 1,
          }),
        );
        const fresh = await api.getForm(form.id);
        set({ form: fresh, selectedId: copy.id });
      } catch (err) {
        fail("Couldn't duplicate the question")(err);
      }
    },

    updateQuestion(id, patch) {
      const { choices: _ignored, type: _type, ...rest } = patch;
      patchQuestion(id, (q) => ({
        ...q,
        ...rest,
        properties: rest.properties ? { ...q.properties, ...rest.properties } : q.properties,
      }));
      queue(id, rest);
    },

    async changeType(id, type) {
      await flush(id);
      try {
        const saved = await track(api.updateQuestion(id, { type }));
        patchQuestion(id, () => saved);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't change the question type");
      }
    },

    addChoice(id) {
      setChoices(id, (choices) => [
        ...choices,
        { id: tempChoiceId--, label: `Choice ${String.fromCharCode(65 + choices.length)}`, position: choices.length },
      ]);
    },

    removeChoice(id, choiceId) {
      const q = get().form?.questions.find((x) => x.id === id);
      if (!q || q.choices.length <= 1) return toast.error("Keep at least one choice");
      setChoices(id, (choices) => choices.filter((c) => c.id !== choiceId));
    },

    setChoiceLabel(id, choiceId, label) {
      setChoices(id, (choices) => choices.map((c) => (c.id === choiceId ? { ...c, label } : c)));
    },

    async deleteQuestion(id) {
      const form = get().form;
      if (!form) return;
      clearTimeout(timers.get(id));
      pending.delete(id);

      const index = form.questions.findIndex((q) => q.id === id);
      const remaining = form.questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, position: i }));
      const next = remaining[Math.min(index, remaining.length - 1)]?.id ?? null;
      set({ form: { ...form, questions: remaining }, selectedId: next });

      await inFlight.get(id);
      await track(api.deleteQuestion(id)).catch(fail("Couldn't delete the question"));
    },

    async reorder(orderedIds) {
      const form = get().form;
      if (!form) return;
      const byId = new Map(form.questions.map((q) => [q.id, q]));
      const questions = orderedIds.map((id, i) => ({ ...byId.get(id)!, position: i }));
      set({ form: { ...form, questions } });
      await track(api.reorderQuestions(form.id, orderedIds)).catch(fail("Couldn't reorder questions"));
    },

    async flushAll() {
      await flushSettings();
      await Promise.all([...new Set([...pending.keys(), ...inFlight.keys()])].map((id) => flush(id)));
    },
  };
});
