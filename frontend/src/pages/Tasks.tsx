import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Modal,
  PageHeader,
  PriorityBadge,
  StatCard,
  useToast,
} from "@/components/ui";
import { useTasks, type TaskFilter } from "@/hooks/useTasks";
import type { Task } from "@/services/api";

type FormState = {
  title: string;
  description: string;
  deadline: string;
  priority: "low" | "medium" | "high";
};

const EMPTY_FORM: FormState = { title: "", description: "", deadline: "", priority: "medium" };

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "overdue", label: "Overdue" },
];

export default function TasksPage() {
  const { tasks, filter, setFilter, loading, error, create, update, remove, stats, refresh } = useTasks();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tasks;
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(needle) ||
        (task.description || "").toLowerCase().includes(needle)
    );
  }, [tasks, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      deadline: task.deadline || "",
      priority: task.priority,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setFormError("A task title is required.");
      return;
    }
    try {
      if (editing) {
        await update(editing.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          deadline: form.deadline || null,
          priority: form.priority,
        });
        toast("Task updated");
      } else {
        await create({
          title: form.title.trim(),
          description: form.description.trim(),
          deadline: form.deadline || null,
          priority: form.priority,
          status: "pending",
        });
        toast("Task created");
      }
      setModalOpen(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save task");
    }
  };

  const toggle = async (task: Task) => {
    try {
      await update(task.id, { status: task.status === "completed" ? "pending" : "completed" });
      toast(task.status === "completed" ? "Task reopened" : "Task completed");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update task", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast("Task deleted");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete task", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="My Tasks"
        description="Create, prioritize, and complete every assignment in one place."
        icon={<ListChecks className="h-6 w-6" />}
        actions={
          <button type="button" onClick={openCreate} className="btn bg-white text-slate-900 hover:bg-white/90">
            <Plus className="h-4 w-4" /> New task
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="All tasks" value={stats.total} subtitle="Across every list" icon={<ListChecks className="h-5 w-5" />} variant="violet" />
        <StatCard title="Pending" value={stats.pending} subtitle="Still to do" icon={<Circle className="h-5 w-5" />} variant="blue" />
        <StatCard title="Completed" value={stats.completed} subtitle={`${stats.completion}% completion`} icon={<CheckCircle2 className="h-5 w-5" />} variant="emerald" />
        <StatCard title="Overdue" value={stats.overdue} subtitle="Needs attention" icon={<CalendarDays className="h-5 w-5" />} variant="rose" />
      </div>

      <div className="surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item.id
                    ? "accent-bg text-white shadow-soft"
                    : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.1)]"
                }`}
              >
                {item.label}
                {item.id !== "all" && (
                  <span className="ml-1.5 opacity-70">
                    {item.id === "pending" ? stats.pending : item.id === "completed" ? stats.completed : stats.overdue}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks"
              className="input py-2 pl-8 text-xs"
              aria-label="Search tasks"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading tasks..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title={query ? "No matching tasks" : "No tasks here"}
          description={
            query
              ? "Try a different search term or filter."
              : "Create a task to start tracking your coursework and deadlines."
          }
          action={
            <button type="button" onClick={openCreate} className="btn-accent">
              <Plus className="h-4 w-4" /> Add a task
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`surface flex items-start gap-3 p-3.5 transition hover:border-[rgba(var(--accent),0.25)] ${
                task.status === "completed" ? "opacity-75" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => void toggle(task)}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                  task.status === "completed"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-[rgb(var(--border-strong))] text-transparent hover:border-emerald-500 hover:text-emerald-500"
                }`}
                aria-label={task.status === "completed" ? "Reopen task" : "Complete task"}
              >
                <Check className="h-3.5 w-3.5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-semibold ${task.status === "completed" ? "text-[rgb(var(--text-muted))] line-through" : "text-[rgb(var(--text-main))]"}`}>
                    {task.title}
                  </h3>
                  <PriorityBadge priority={task.priority} />
                  {task.status !== "pending" && (
                    <Badge variant={task.status === "completed" ? "success" : "danger"}>{task.status}</Badge>
                  )}
                </div>
                {task.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[rgb(var(--text-muted))]">{task.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[rgb(var(--text-faint))]">
                  {task.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Due {task.deadline}
                    </span>
                  )}
                  <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" onClick={() => openEdit(task)} className="icon-btn h-8 w-8" title="Edit task" aria-label="Edit task">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(task)}
                  className="icon-btn h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit task" : "New task"}
        description={editing ? "Update the details of this task." : "Capture an assignment, deadline, and priority."}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={() => void submit()}>
              {editing ? "Save changes" : "Create task"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <p className="rounded-lg bg-red-500/10 p-2.5 text-xs text-red-500">{formError}</p>}
          <div>
            <label className="label" htmlFor="task-title">Title</label>
            <input
              id="task-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input"
              placeholder="e.g. Complete Operating Systems assignment"
              maxLength={200}
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="textarea"
              rows={3}
              placeholder="Add details, chapters, or submission notes..."
              maxLength={1000}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="task-deadline">Deadline</label>
              <input
                id="task-deadline"
                type="date"
                value={form.deadline}
                onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value as FormState["priority"] })}
                className="select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete task?"
        message={`"${deleting?.title || "This task"}" will be permanently removed.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}