import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
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
  SectionTitle,
  useToast,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { useCalendar } from "@/hooks/useFeatures";
import type { CalendarEvent } from "@/services/api";

const CATEGORY_COLORS: Record<string, string> = {
  study: "#6366f1",
  exam: "#ef4444",
  assignment: "#8b5cf6",
  class: "#0ea5e9",
  personal: "#10b981",
  other: "#64748b",
};

type FormState = {
  title: string;
  description: string;
  start_date: string;
  category: string;
};

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export default function CalendarPage() {
  const { settings } = useSettings();
  const { events, loading, error, create, remove, refresh } = useCalendar();
  const { toast } = useToast();
  const today = new Date();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    start_date: dateKey(today),
    category: "study",
  });

  const weekStartsOn = settings.general.weekStart === "sunday" ? 0 : 1;

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [month, weekStartsOn]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let index = 0; index < calendarDays.length; index += 7) {
      result.push(calendarDays.slice(index, index + 7));
    }
    return result;
  }, [calendarDays]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.start_date) || [];
      list.push(event);
      map.set(event.start_date, list);
    });
    return map;
  }, [events]);

  const selectedEvents = (eventsByDay.get(selectedDate) || []).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const openCreate = (date?: string) => {
    setForm({
      title: "",
      description: "",
      start_date: date || selectedDate,
      category: "study",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.start_date) {
      toast("A title and date are required", "error");
      return;
    }
    try {
      await create({
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date,
        category: form.category,
        color: CATEGORY_COLORS[form.category] || CATEGORY_COLORS.other,
      });
      toast("Event added to your calendar");
      setModalOpen(false);
      setSelectedDate(form.start_date);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not create event", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast("Event deleted");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete event", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="Calendar"
        description="See deadlines, exams, classes, and study sessions in one monthly view."
        icon={<CalendarDays className="h-6 w-6" />}
        actions={
          <button type="button" onClick={() => openCreate()} className="btn bg-white text-slate-900 hover:bg-white/90">
            <Plus className="h-4 w-4" /> New event
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      <div className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="icon-btn border border-[rgb(var(--border))]" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="icon-btn border border-[rgb(var(--border))]" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 text-base font-bold text-[rgb(var(--text-main))]">{format(month, "MMMM yyyy")}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setMonth(startOfMonth(new Date()));
            setSelectedDate(dateKey(new Date()));
          }}
          className="btn-outline px-3 py-1.5 text-xs"
        >
          Today
        </button>
      </div>

      {loading ? (
        <LoadingBlock label="Loading calendar..." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="surface overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[rgb(var(--border))] bg-[rgba(148,163,184,0.05)]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--text-faint))]">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
            </div>
            <div>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 border-b border-[rgb(var(--border))] last:border-b-0">
                  {week.map((day) => {
                    const key = dateKey(day);
                    const dayEvents = eventsByDay.get(key) || [];
                    const inMonth = isSameMonth(day, month);
                    const isToday = isSameDay(day, today);
                    const selected = selectedDate === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(key)}
                        onDoubleClick={() => openCreate(key)}
                        className={`min-h-[74px] border-r border-[rgb(var(--border))] p-1.5 text-left align-top transition last:border-r-0 sm:min-h-[96px] ${
                          selected
                            ? "bg-[rgba(var(--accent),0.08)]"
                            : "hover:bg-[rgba(148,163,184,0.05)]"
                        } ${inMonth ? "" : "opacity-45"}`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold sm:h-6 sm:w-6 sm:text-xs ${
                              isToday ? "accent-bg text-white" : "text-[rgb(var(--text-muted))]"
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          {dayEvents.length > 2 && (
                            <span className="hidden text-[9px] text-[rgb(var(--text-faint))] sm:inline">
                              +{dayEvents.length - 2}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((event) => (
                            <span
                              key={event.id}
                              className="block truncate rounded px-1 py-0.5 text-[9px] font-medium text-white"
                              style={{ backgroundColor: event.color || CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other }}
                              title={event.title}
                            >
                              {event.title}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface p-4">
              <SectionTitle
                title={format(parseISO(selectedDate), "EEEE, MMM d")}
                description={`${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
                action={
                  <button type="button" onClick={() => openCreate(selectedDate)} className="icon-btn accent-text" aria-label="Add event">
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
              {selectedEvents.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Nothing scheduled"
                  description="Add an exam, deadline, class, or personal event."
                  action={
                    <button type="button" onClick={() => openCreate(selectedDate)} className="btn-soft px-3 py-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add event
                    </button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[rgb(var(--text-main))]">{event.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant="accent">{event.category}</Badge>
                              <span className="text-[10px] text-[rgb(var(--text-faint))]">{event.start_date}</span>
                            </div>
                            {event.description && (
                              <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-[rgb(var(--text-muted))]">{event.description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleting(event)}
                          className="icon-btn h-7 w-7 hover:bg-red-500/10 hover:text-red-500"
                          aria-label="Delete event"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface p-4">
              <SectionTitle title="Legend" description="Event categories." />
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2 text-[11px] text-[rgb(var(--text-muted))]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="capitalize">{category}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.05)] p-2.5 text-[10px] text-[rgb(var(--text-muted))]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Double-click a day to quickly add an event.
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New calendar event"
        description="Add an exam, deadline, class, or personal commitment."
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-accent" onClick={() => void submit()}>Add event</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="event-title">Title</label>
            <input
              id="event-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input"
              placeholder="e.g. Operating Systems midterm"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="event-description">Description</label>
            <textarea
              id="event-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="textarea"
              rows={2}
              placeholder="Location, topics, or notes..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="event-date">Date</label>
              <input
                id="event-date"
                type="date"
                value={form.start_date}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="event-category">Category</label>
              <select
                id="event-category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                className="select"
              >
                {Object.keys(CATEGORY_COLORS).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete event?"
        message={`"${deleting?.title || "This event"}" will be removed from your calendar.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}