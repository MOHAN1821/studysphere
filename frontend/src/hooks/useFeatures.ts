import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type CalendarEvent,
  type FocusSession,
  type LearningResource,
  type Note,
  type StudySession,
} from "@/services/api";

function useCollection<T>(loader: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loaderRef.current();
      setItems(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, setItems, loading, error, refresh };
}

export function useNotes() {
  const collection = useCollection<Note>(api.getNotes);
  const { setItems, refresh } = collection;

  const create = useCallback(
    async (body: Partial<Note>) => {
      const created = await api.createNote(body);
      setItems((previous) => [created, ...previous]);
      return created;
    },
    [setItems]
  );

  const update = useCallback(
    async (id: number, body: Partial<Note>) => {
      const updated = await api.updateNote(id, body);
      setItems((previous) => previous.map((note) => (note.id === id ? updated : note)));
      return updated;
    },
    [setItems]
  );

  const remove = useCallback(
    async (id: number) => {
      await api.deleteNote(id);
      setItems((previous) => previous.filter((note) => note.id !== id));
    },
    [setItems]
  );

  return { notes: collection.items, ...collection, create, update, remove, refresh };
}

export function useLearning() {
  const collection = useCollection<LearningResource>(api.getLearningResources);
  const { setItems } = collection;

  const create = useCallback(
    async (body: Partial<LearningResource>) => {
      const created = await api.createLearningResource(body);
      setItems((previous) => [created, ...previous]);
      return created;
    },
    [setItems]
  );

  const update = useCallback(
    async (id: number, body: Partial<LearningResource>) => {
      const updated = await api.updateLearningResource(id, body);
      setItems((previous) => previous.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    [setItems]
  );

  const remove = useCallback(
    async (id: number) => {
      await api.deleteLearningResource(id);
      setItems((previous) => previous.filter((item) => item.id !== id));
    },
    [setItems]
  );

  const toggleProgress = useCallback(
    async (id: number, completed: boolean) => {
      await api.updateLearningProgress(id, completed);
      setItems((previous) =>
        previous.map((item) => (item.id === id ? { ...item, completed } : item))
      );
    },
    [setItems]
  );

  return { resources: collection.items, ...collection, create, update, remove, toggleProgress };
}

export function useCalendar() {
  const collection = useCollection<CalendarEvent>(api.getCalendarEvents);
  const { setItems } = collection;

  const create = useCallback(
    async (body: Partial<CalendarEvent>) => {
      const created = await api.createCalendarEvent(body);
      setItems((previous) => [...previous, created].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      return created;
    },
    [setItems]
  );

  const remove = useCallback(
    async (id: number) => {
      await api.deleteCalendarEvent(id);
      setItems((previous) => previous.filter((event) => event.id !== id));
    },
    [setItems]
  );

  return { events: collection.items, ...collection, create, remove };
}

export function useStudyPlanner() {
  const collection = useCollection<StudySession>(() => api.getStudySessions());
  const { setItems } = collection;

  const create = useCallback(
    async (body: Partial<StudySession>) => {
      const created = await api.createStudySession(body);
      setItems((previous) => [...previous, created]);
      return created;
    },
    [setItems]
  );

  const update = useCallback(
    async (id: number, body: Partial<StudySession>) => {
      const updated = await api.updateStudySession(id, body);
      setItems((previous) => previous.map((session) => (session.id === id ? updated : session)));
      return updated;
    },
    [setItems]
  );

  const remove = useCallback(
    async (id: number) => {
      await api.deleteStudySession(id);
      setItems((previous) => previous.filter((session) => session.id !== id));
    },
    [setItems]
  );

  return { sessions: collection.items, ...collection, create, update, remove };
}

export function useFocus() {
  const collection = useCollection<FocusSession>(api.getFocusSessions);
  const { setItems } = collection;

  const create = useCallback(
    async (body: { duration: number; completed: boolean }) => {
      const created = await api.createFocusSession(body);
      setItems((previous) => [created, ...previous]);
      return created;
    },
    [setItems]
  );

  return { sessions: collection.items, ...collection, create };
}