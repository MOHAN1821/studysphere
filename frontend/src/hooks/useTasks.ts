import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Task } from "@/services/api";

export type TaskFilter = "all" | "pending" | "completed" | "overdue";

export function useTasks(initialFilter: TaskFilter = "all") {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTasks();
      setAllTasks(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (body: Partial<Task>) => {
      try {
        const created = await api.createTask(body);
        setAllTasks((previous) => [created, ...previous]);
        return created;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to create task";
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  const update = useCallback(async (id: number, body: Partial<Task>) => {
    try {
      const updated = await api.updateTask(id, body);
      setAllTasks((previous) => previous.map((task) => (task.id === id ? updated : task)));
      return updated;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to update task";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    try {
      await api.deleteTask(id);
      setAllTasks((previous) => previous.filter((task) => task.id !== id));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to delete task";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const stats = useMemo(() => {
    const completed = allTasks.filter((task) => task.status === "completed").length;
    const overdue = allTasks.filter((task) => task.status === "overdue").length;
    const pending = allTasks.filter((task) => task.status === "pending").length;
    return {
      total: allTasks.length,
      completed,
      pending,
      overdue,
      completion: allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0,
    };
  }, [allTasks]);

  const tasks = useMemo(() => {
    if (filter === "all") return allTasks;
    return allTasks.filter((task) => task.status === filter);
  }, [allTasks, filter]);

  return {
    tasks,
    allTasks,
    filter,
    setFilter,
    loading,
    error,
    create,
    update,
    remove,
    refresh: load,
    stats,
  };
}