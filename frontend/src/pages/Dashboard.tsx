import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  GraduationCap,
  ListChecks,
  MessageSquare,
  Plus,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  PageHeader,
  SectionTitle,
  StatCard,
  EmptyState,
  PriorityBadge,
  ProgressBar,
  LoadingBlock,
  ErrorBanner,
  useToast,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { useTasks } from "@/hooks/useTasks";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCalendar, useFocus, useNotes, useStudyPlanner } from "@/hooks/useFeatures";

const QUICK_ACTIONS = [
  {
    title: "Ask StudySphere",
    description: "Get unstuck with an AI tutor",
    to: "/study-assistant",
    icon: Sparkles,
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "Plan my study",
    description: "Build a weekly study schedule",
    to: "/planner",
    icon: CalendarDays,
    color: "from-teal-500 to-cyan-500",
  },
  {
    title: "Capture a note",
    description: "Save ideas and lecture notes",
    to: "/notes",
    icon: FileText,
    color: "from-indigo-500 to-blue-500",
  },
  {
    title: "Start focusing",
    description: "Run a distraction-free Pomodoro",
    to: "/focus",
    icon: Timer,
    color: "from-emerald-500 to-teal-500",
  },
];

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { allTasks, loading: tasksLoading, update } = useTasks();
  const { data: analytics, loading: analyticsLoading, error: analyticsError, refresh } = useAnalytics();
  const { sessions } = useStudyPlanner();
  const { notes } = useNotes();
  const { events } = useCalendar();
  const { sessions: focusSessions } = useFocus();

  const today = todayIso();
  const todaySessions = useMemo(
    () =>
      sessions
        .filter((session) => session.study_date === today)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [sessions, today]
  );

  const todaysTasks = useMemo(
    () =>
      allTasks
        .filter((task) => task.status !== "completed" && task.deadline && task.deadline <= today)
        .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
        .slice(0, 5),
    [allTasks, today]
  );

  const todayEvents = useMemo(
    () => events.filter((event) => event.start_date === today).slice(0, 4),
    [events, today]
  );

  const firstName = settings.profile.name.split(/\s+/)[0] || "there";
  const completion = analytics?.completion_rate ?? 0;

  const toggleTask = async (id: number, completed: boolean) => {
    try {
      await update(id, { status: completed ? "pending" : "completed" });
      toast(completed ? "Task reopened" : "Task completed");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update task", "error");
    }
  };

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is the latest snapshot of your coursework, focus time, and study rhythm."
        icon={<GraduationCap className="h-6 w-6" />}
        actions={
          <>
            <Link to="/tasks" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> New task
            </Link>
            <Link to="/study-assistant" className="btn bg-white text-slate-900 hover:bg-white/90">
              <Sparkles className="h-4 w-4" /> Ask AI
            </Link>
          </>
        }
      />

      {analyticsError && <ErrorBanner message={analyticsError} onRetry={() => void refresh()} />}

      {analyticsLoading ? (
        <LoadingBlock label="Loading your dashboard..." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              title="Total tasks"
              value={analytics?.total_tasks ?? 0}
              subtitle={`${analytics?.pending_tasks ?? 0} still open`}
              icon={<ListChecks className="h-5 w-5" />}
              variant="violet"
            />
            <StatCard
              title="Completed"
              value={analytics?.completed_tasks ?? 0}
              subtitle={`${completion}% completion rate`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              variant="emerald"
            />
            <StatCard
              title="Focus time"
              value={`${analytics?.focus_minutes ?? 0}m`}
              subtitle={`${analytics?.focus_sessions ?? 0} Pomodoro sessions`}
              icon={<Timer className="h-5 w-5" />}
              variant="cyan"
            />
            <StatCard
              title="Study streak"
              value={`${analytics?.streak_days ?? 0}d`}
              subtitle={analytics?.streak_days ? "Keep the momentum" : "Complete a session today"}
              icon={<Flame className="h-5 w-5" />}
              variant="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="surface p-5">
                <SectionTitle
                  title="Weekly productivity"
                  description="Tasks created each day over the last seven days."
                  action={
                    <Link to="/analytics" className="text-xs font-semibold accent-text hover:underline">
                      Full analytics
                    </Link>
                  }
                />
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.weekly_productivity || []} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashboardBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip
                        cursor={{ fill: "rgba(139,92,246,0.08)" }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.25)",
                          background: "rgba(15,23,42,0.94)",
                          color: "#e2e8f0",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="completed" name="Completed" fill="url(#dashboardBar)" radius={[6, 6, 0, 0]} maxBarSize={34} />
                      <Bar dataKey="pending" name="Open" fill="rgba(148,163,184,0.28)" radius={[6, 6, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="surface p-5">
                <SectionTitle title="Today's focus" description="Your schedule and nearest deadlines." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                        Study sessions
                      </p>
                      <Link to="/planner" className="text-[11px] font-semibold accent-text hover:underline">
                        Planner
                      </Link>
                    </div>
                    {todaySessions.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--text-muted))]">
                        No sessions scheduled today.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {todaySessions.map((session) => (
                          <div key={session.id} className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.04)] p-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-300">
                              <Clock className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[rgb(var(--text-main))]">{session.title}</p>
                              <p className="text-[10px] text-[rgb(var(--text-muted))]">
                                {session.start_time}
                                {session.end_time ? ` – ${session.end_time}` : ""} · {session.subject || "Study"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                        Due soon
                      </p>
                      <Link to="/calendar" className="text-[11px] font-semibold accent-text hover:underline">
                        Calendar
                      </Link>
                    </div>
                    {todaysTasks.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--text-muted))]">
                        Nothing overdue. Nice work.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {todaysTasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => void toggleTask(task.id, task.status === "completed")}
                            className="flex w-full items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.04)] p-2.5 text-left transition hover:border-[rgba(var(--accent),0.3)]"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[rgb(var(--border-strong))]" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-[rgb(var(--text-main))]">{task.title}</p>
                              <p className="text-[10px] text-[rgb(var(--text-muted))]">Due {task.deadline}</p>
                            </div>
                            <PriorityBadge priority={task.priority} />
                          </button>
                        ))}
                      </div>
                    )}
                    {todayEvents.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {todayEvents.map((event) => (
                          <span key={event.id} className="chip">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: event.color }} />
                            {event.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="surface p-5">
                <SectionTitle title="Completion" description="Across all tasks." />
                <div className="flex flex-col items-center py-2">
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="url(#dashRing)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - completion / 100)}
                        className="transition-all duration-700"
                      />
                      <defs>
                        <linearGradient id="dashRing" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-2xl font-extrabold tracking-tight text-[rgb(var(--text-main))]">{completion}%</p>
                      <p className="text-[10px] text-[rgb(var(--text-muted))]">complete</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[rgb(var(--text-muted))]">Completed</span>
                      <span className="font-semibold text-emerald-500">{analytics?.completed_tasks ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[rgb(var(--text-muted))]">Pending</span>
                      <span className="font-semibold text-sky-500">{analytics?.pending_tasks ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[rgb(var(--text-muted))]">Overdue</span>
                      <span className="font-semibold text-red-500">{analytics?.overdue_tasks ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface p-5">
                <SectionTitle title="Learning progress" description="Resources completed." />
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-extrabold tracking-tight text-[rgb(var(--text-main))]">
                    {analytics?.resources_completed ?? 0}
                    <span className="text-sm font-medium text-[rgb(var(--text-muted))]">
                      /{analytics?.resources_total ?? 0}
                    </span>
                  </p>
                  <BookOpen className="h-5 w-5 accent-text" />
                </div>
                <ProgressBar
                  className="mt-3"
                  value={
                    analytics?.resources_total
                      ? ((analytics.resources_completed || 0) / analytics.resources_total) * 100
                      : 0
                  }
                />
                <Link to="/learning" className="mt-4 flex items-center justify-between rounded-xl border border-[rgb(var(--border))] p-2.5 text-xs font-semibold text-[rgb(var(--text-main))] transition hover:border-[rgba(var(--accent),0.3)]">
                  Open Learning Hub <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="surface p-5">
                <SectionTitle title="Focus sessions" description="Most recent sessions." />
                {focusSessions.length === 0 ? (
                  <p className="text-xs text-[rgb(var(--text-muted))]">No focus sessions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {focusSessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="flex items-center justify-between text-xs">
                        <span className="text-[rgb(var(--text-muted))]">{new Date(session.created_at).toLocaleDateString()}</span>
                        <span className="font-semibold text-[rgb(var(--text-main))]">{session.duration} min</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/focus" className="mt-4 flex items-center justify-between rounded-xl border border-[rgb(var(--border))] p-2.5 text-xs font-semibold text-[rgb(var(--text-main))] transition hover:border-[rgba(var(--accent),0.3)]">
                  Start a session <Timer className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle title="Quick actions" description="Jump into the tools you use most." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    to={action.to}
                    className="surface surface-hover group flex items-center gap-3 p-4"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-soft`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[rgb(var(--text-main))]">{action.title}</span>
                      <span className="block truncate text-xs text-[rgb(var(--text-muted))]">{action.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[rgb(var(--text-faint))] transition group-hover:translate-x-0.5 group-hover:accent-text" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-5">
              <SectionTitle
                title="Recent tasks"
                description={tasksLoading ? "Loading tasks..." : "Your latest coursework."}
                action={
                  <Link to="/tasks" className="text-xs font-semibold accent-text hover:underline">
                    View all
                  </Link>
                }
              />
              {allTasks.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="No tasks yet"
                  description="Create your first task to start tracking coursework."
                  action={<Link to="/tasks" className="btn-accent"><Plus className="h-4 w-4" /> Add task</Link>}
                />
              ) : (
                <div className="space-y-2">
                  {allTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] p-2.5">
                      <button
                        type="button"
                        onClick={() => void toggleTask(task.id, task.status === "completed")}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          task.status === "completed"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-[rgb(var(--border-strong))] hover:border-emerald-500"
                        }`}
                        aria-label={task.status === "completed" ? "Reopen task" : "Complete task"}
                      >
                        {task.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs font-semibold ${task.status === "completed" ? "text-[rgb(var(--text-muted))] line-through" : "text-[rgb(var(--text-main))]"}`}>
                          {task.title}
                        </p>
                        {task.deadline && <p className="text-[10px] text-[rgb(var(--text-faint))]">Due {task.deadline}</p>}
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface p-5">
              <SectionTitle
                title="Recent notes"
                description="Your latest study notes."
                action={
                  <Link to="/notes" className="text-xs font-semibold accent-text hover:underline">
                    Open notes
                  </Link>
                }
              />
              {notes.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-6 w-6" />}
                  title="No notes yet"
                  description="Capture lecture notes, summaries, and ideas."
                  action={<Link to="/notes" className="btn-accent"><Plus className="h-4 w-4" /> New note</Link>}
                />
              ) : (
                <div className="space-y-2">
                  {notes.slice(0, 4).map((note) => (
                    <Link key={note.id} to="/notes" className="block rounded-xl border border-[rgb(var(--border))] p-2.5 transition hover:border-[rgba(var(--accent),0.3)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-[rgb(var(--text-main))]">{note.title}</p>
                        {note.subject && <span className="chip shrink-0">{note.subject}</span>}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-[rgb(var(--text-muted))]">{note.content || "Empty note"}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/analytics" className="surface surface-hover flex items-center gap-3 p-4">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-[rgb(var(--text-main))]">View analytics</span>
            </Link>
            <Link to="/chat" className="surface surface-hover flex items-center gap-3 p-4">
              <MessageSquare className="h-5 w-5 text-violet-500" />
              <span className="text-sm font-semibold text-[rgb(var(--text-main))]">Open AI chat</span>
            </Link>
            <Link to="/settings" className="surface surface-hover flex items-center gap-3 p-4">
              <Target className="h-5 w-5 text-rose-500" />
              <span className="text-sm font-semibold text-[rgb(var(--text-main))]">Tune preferences</span>
            </Link>
          </div>
        </>
      )}

      {analytics && (
        <div className="flex items-center gap-2 text-[11px] text-[rgb(var(--text-faint))]">
          <TrendingUp className="h-3.5 w-3.5" />
          {analytics.total_tasks} tasks · {analytics.notes_count} notes · {analytics.events_count} calendar events
        </div>
      )}
    </PageContainer>
  );
}