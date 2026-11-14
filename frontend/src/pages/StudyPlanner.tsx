import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Modal,
  PageHeader,
  SectionTitle,
  useToast,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { useStudyPlanner } from "@/hooks/useFeatures";
import { useTasks } from "@/hooks/useTasks";
import type { StudySession } from "@/services/api";

type FormState = {
  title: string;
  subject: string;
  study_date: string;
  start_time: string;
  end_time: string;
  notes: string;
};

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export default function StudyPlanner() {
  const { settings } = useSettings();
  const { sessions, loading, error, create, update, remove, refresh } = useStudyPlanner();
  const { allTasks } = useTasks();
  const { toast } = useToast();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(
    startOfWeek(today, { weekStartsOn: settings.general.weekStart === "sunday" ? 0 : 1 })
  );
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [deleting, setDeleting] = useState<StudySession | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "",
    subject: "",
    study_date: dateKey(today),
    start_time: "09:00",
    end_time: "10:00",
    notes: "",
  });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const weekSessions = useMemo(() => {
    const keys = new Set(days.map(dateKey));
    return sessions.filter((session) => keys.has(session.study_date));
  }, [sessions, days]);

  const sessionsForDay = (date: Date) =>
    weekSessions
      .filter((session) => session.study_date === dateKey(date))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const selectedSessions = sessionsForDay(parseISO(selectedDate));
  const weekTaskDeadlines = useMemo(() => {
    const keys = new Set(days.map(dateKey));
    return allTasks
      .filter((task) => task.status !== "completed" && task.deadline && keys.has(task.deadline))
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
  }, [allTasks, days]);

  const openCreate = (date?: string) => {
    setEditing(null);
    setForm({
      title: "",
      subject: "",
      study_date: date || selectedDate,
      start_time: "09:00",
      end_time: "10:00",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (session: StudySession) => {
    setEditing(session);
    setForm({
      title: session.title,
      subject: session.subject || "",
      study_date: session.study_date,
      start_time: session.start_time,
      end_time: session.end_time || "",
      notes: session.notes || "",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast("Give the study session a title", "error");
      return;
    }
    if (!form.study_date || !form.start_time) {
      toast("Choose a date and start time", "error");
      return;
    }
    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim() || null,
      study_date: form.study_date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editing) {
        await update(editing.id, payload);
        toast("Study session updated");
      } else {
        await create(payload);
        toast("Study session scheduled");
      }
      setModalOpen(false);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save session", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast("Study session removed");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete session", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="Study Planner"
        description="Design a weekly study rhythm and protect time for deep work."
        icon={<CalendarDays className="h-6 w-6" />}
        actions={
          <button type="button" onClick={() => openCreate()} className="btn bg-white text-slate-900 hover:bg-white/90">
            <Plus className="h-4 w-4" /> New session
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      <div className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekStart(addWeeks(weekStart, -1))} className="icon-btn border border-[rgb(var(--border))]" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="icon-btn border border-[rgb(var(--border))]" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="ml-1">
            <p className="text-sm font-bold text-[rgb(var(--text-main))]">
              {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
            </p>
            <p className="text-[11px] text-[rgb(var(--text-muted))]">
              {weekSessions.length} session{weekSessions.length === 1 ? "" : "s"} this week
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const start = startOfWeek(new Date(), { weekStartsOn: settings.general.weekStart === "sunday" ? 0 : 1 });
            setWeekStart(start);
            setSelectedDate(dateKey(new Date()));
          }}
          className="btn-outline px-3 py-1.5 text-xs"
        >
          This week
        </button>
      </div>

      {loading ? (
        <LoadingBlock label="Loading your study plan..." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((day) => {
              const daySessions = sessionsForDay(day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate === dateKey(day);
              return (
                <div
                  key={dateKey(day)}
                  className={`flex min-h-[150px] flex-col rounded-2xl border p-2 transition ${
                    isSelected
                      ? "border-[rgba(var(--accent),0.45)] bg-[rgba(var(--accent),0.05)]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--bg-card))]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDate(dateKey(day))}
                    className="mb-2 flex items-center justify-between rounded-lg px-1 py-0.5 text-left"
                  >
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--text-faint))]">
                        {format(day, "EEE")}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isToday ? "accent-bg text-white" : "text-[rgb(var(--text-main))]"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </span>
                    <span className="text-[10px] text-[rgb(var(--text-faint))]">{daySessions.length || ""}</span>
                  </button>

                  <div className="flex-1 space-y-1.5">
                    {daySessions.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openCreate(dateKey(day))}
                        className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[rgb(var(--border))] py-3 text-[10px] text-[rgb(var(--text-faint))] transition hover:border-[rgba(var(--accent),0.4)] hover:text-[rgb(var(--accent))]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    ) : (
                      daySessions.map((session) => (
                        <div
                          key={session.id}
                          className="group rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.05)] p-2 transition hover:border-[rgba(var(--accent),0.35)]"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <button type="button" onClick={() => openEdit(session)} className="min-w-0 flex-1 text-left">
                              <p className="truncate text-[11px] font-semibold text-[rgb(var(--text-main))]">{session.title}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-[9px] text-[rgb(var(--text-muted))]">
                                <Clock className="h-2.5 w-2.5" />
                                {session.start_time}
                                {session.end_time ? `–${session.end_time}` : ""}
                              </p>
                              {session.subject && <p className="mt-0.5 truncate text-[9px] accent-text">{session.subject}</p>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(session)}
                              className="rounded p-0.5 text-[rgb(var(--text-faint))] opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                              aria-label="Delete session"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="surface p-4">
              <SectionTitle
                title={format(parseISO(selectedDate), "EEEE, MMM d")}
                description={`${selectedSessions.length} session${selectedSessions.length === 1 ? "" : "s"}`}
                action={
                  <button type="button" onClick={() => openCreate(selectedDate)} className="icon-btn accent-text" aria-label="Add session">
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
              {selectedSessions.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="No sessions"
                  description="Add a focused study block for this day."
                  action={
                    <button type="button" onClick={() => openCreate(selectedDate)} className="btn-soft px-3 py-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add session
                    </button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {selectedSessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[rgb(var(--text-main))]">{session.title}</p>
                          <p className="mt-0.5 text-[10px] text-[rgb(var(--text-muted))]">
                            {session.start_time}
                            {session.end_time ? ` – ${session.end_time}` : ""}
                            {session.subject ? ` · ${session.subject}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0">
                          <button type="button" onClick={() => openEdit(session)} className="icon-btn h-7 w-7" aria-label="Edit session">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => setDeleting(session)} className="icon-btn h-7 w-7 hover:text-red-500" aria-label="Delete session">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {session.notes && <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-[rgb(var(--text-muted))]">{session.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface p-4">
              <SectionTitle title="Deadlines this week" description="Coursework due in the selected week." />
              {weekTaskDeadlines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--text-muted))]">
                  No task deadlines this week.
                </p>
              ) : (
                <div className="space-y-2">
                  {weekTaskDeadlines.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] p-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[rgb(var(--text-main))]">{task.title}</p>
                        <p className="text-[10px] text-[rgb(var(--text-faint))]">Due {task.deadline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit study session" : "Schedule study session"}
        description="Block focused time for a subject or assignment."
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-accent" onClick={() => void submit()}>
              {editing ? "Save changes" : "Schedule session"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="session-title">Title</label>
            <input
              id="session-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input"
              placeholder="e.g. Linear Algebra revision"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="session-subject">Subject</label>
            <input
              id="session-subject"
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              className="input"
              placeholder="e.g. Mathematics"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="session-date">Date</label>
              <input
                id="session-date"
                type="date"
                value={form.study_date}
                onChange={(event) => setForm({ ...form, study_date: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="session-start">Start</label>
              <input
                id="session-start"
                type="time"
                value={form.start_time}
                onChange={(event) => setForm({ ...form, start_time: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="session-end">End</label>
              <input
                id="session-end"
                type="time"
                value={form.end_time}
                onChange={(event) => setForm({ ...form, end_time: event.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="session-notes">Notes</label>
            <textarea
              id="session-notes"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="textarea"
              rows={3}
              placeholder="Topics, chapters, or goals for this session..."
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete study session?"
        message={`"${deleting?.title || "This session"}" will be removed from your planner.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}