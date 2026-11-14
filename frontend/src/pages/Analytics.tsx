import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  ListChecks,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import { useAnalytics } from "@/hooks/useAnalytics";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const SUBJECT_COLORS = ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];

export default function AnalyticsPage() {
  const { data, loading, error, refresh } = useAnalytics();

  const priorityData = useMemo(
    () =>
      (data?.priority_breakdown || []).map((item) => ({
        name: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
        value: item.count,
        color: PRIORITY_COLORS[item.priority] || "#94a3b8",
      })),
    [data]
  );

  const completionData = useMemo(
    () => [
      { name: "Completed", value: data?.completed_tasks || 0, color: "#22c55e" },
      { name: "Pending", value: data?.pending_tasks || 0, color: "#38bdf8" },
      { name: "Overdue", value: data?.overdue_tasks || 0, color: "#ef4444" },
    ],
    [data]
  );

  const weeklyData = data?.weekly_productivity || [];
  const maxWeekly = Math.max(1, ...weeklyData.map((day) => day.completed + day.pending));
  const bestDay = weeklyData.reduce(
    (best, day) => (day.completed > best.completed ? day : best),
    { day: "—", completed: 0 }
  );

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="Analytics"
        description="Real productivity data from your tasks, focus sessions, notes, and learning resources."
        icon={<BarChart3 className="h-6 w-6" />}
        actions={
          <Link to="/focus" className="btn bg-white text-slate-900 hover:bg-white/90">
            <Timer className="h-4 w-4" /> Start focusing
          </Link>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      {loading ? (
        <LoadingBlock label="Calculating your productivity..." />
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No analytics yet"
          description="Complete tasks and focus sessions to populate your analytics."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Completion rate" value={`${data.completion_rate}%`} subtitle={`${data.completed_tasks} of ${data.total_tasks} tasks`} icon={<Target className="h-5 w-5" />} variant="violet" />
            <StatCard title="Focus time" value={`${data.focus_minutes}m`} subtitle={`${data.focus_sessions} sessions`} icon={<Timer className="h-5 w-5" />} variant="cyan" />
            <StatCard title="Study streak" value={`${data.streak_days}d`} subtitle={data.streak_days ? "Consecutive active days" : "Start a streak today"} icon={<Flame className="h-5 w-5" />} variant="amber" />
            <StatCard title="Best day" value={bestDay.day} subtitle={`${bestDay.completed} tasks completed`} icon={<TrendingUp className="h-5 w-5" />} variant="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="surface p-5 lg:col-span-2">
              <SectionTitle title="Weekly activity" description="Tasks created and completed over the last seven days." />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} domain={[0, maxWeekly]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(139,92,246,0.07)" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(15,23,42,0.95)", color: "#e2e8f0", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="completed" name="Completed" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="pending" name="Open" fill="#22d3ee" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="surface p-5">
              <SectionTitle title="Task status" description="Distribution across your tasks." />
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                      {completionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(15,23,42,0.95)", color: "#e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {completionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-[rgb(var(--text-muted))]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-[rgb(var(--text-main))]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="surface p-5">
              <SectionTitle title="Priority mix" description="How your tasks are prioritized." />
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={0} outerRadius={70} paddingAngle={2} stroke="none">
                      {priorityData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(15,23,42,0.95)", color: "#e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {priorityData.map((item) => (
                  <span key={item.name} className="chip">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}: {item.value}
                  </span>
                ))}
              </div>
            </div>

            <div className="surface p-5">
              <SectionTitle title="Learning progress" description="Completed resources by subject." />
              {data.subject_progress.length === 0 ? (
                <p className="text-xs text-[rgb(var(--text-muted))]">No learning resources yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.subject_progress.slice(0, 6).map((subject, index) => {
                    const percent = subject.total ? Math.round((subject.completed / subject.total) * 100) : 0;
                    return (
                      <div key={subject.subject}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="font-medium capitalize text-[rgb(var(--text-main))]">{subject.subject}</span>
                          <span className="text-[rgb(var(--text-muted))]">{subject.completed}/{subject.total}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%`, backgroundColor: SUBJECT_COLORS[index % SUBJECT_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="surface p-5">
              <SectionTitle title="Workspace totals" description="Everything in your productivity workspace." />
              <div className="space-y-2.5">
                {[
                  { icon: ListChecks, label: "Tasks", value: data.total_tasks, color: "text-violet-500" },
                  { icon: CheckCircle2, label: "Completed tasks", value: data.completed_tasks, color: "text-emerald-500" },
                  { icon: BookOpen, label: "Learning resources", value: data.resources_total, color: "text-cyan-500" },
                  { icon: CalendarClock, label: "Calendar events", value: data.events_count, color: "text-orange-500" },
                  { icon: Clock, label: "Notes", value: data.notes_count, color: "text-indigo-500" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] p-2.5">
                      <span className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                        <Icon className={`h-4 w-4 ${item.color}`} /> {item.label}
                      </span>
                      <span className="text-sm font-bold text-[rgb(var(--text-main))]">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <SectionTitle
              title="Upcoming deadlines"
              description="The next tasks that need your attention."
              action={
                <Link to="/tasks" className="text-xs font-semibold accent-text hover:underline">
                  Open tasks
                </Link>
              }
            />
            {data.upcoming_deadlines.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No upcoming deadlines" description="You are all caught up." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border))] text-[10px] uppercase tracking-wider text-[rgb(var(--text-faint))]">
                      <th className="pb-2 pr-3 font-semibold">Task</th>
                      <th className="pb-2 pr-3 font-semibold">Deadline</th>
                      <th className="pb-2 pr-3 font-semibold">Priority</th>
                      <th className="pb-2 font-semibold">Timing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcoming_deadlines.map((task) => (
                      <tr key={task.id} className="border-b border-[rgb(var(--border))] last:border-b-0">
                        <td className="py-2.5 pr-3 font-medium text-[rgb(var(--text-main))]">{task.title}</td>
                        <td className="py-2.5 pr-3 text-[rgb(var(--text-muted))]">{task.deadline}</td>
                        <td className="py-2.5 pr-3"><PriorityBadge priority={task.priority} /></td>
                        <td className="py-2.5">
                          <Badge variant={task.days_left < 0 ? "danger" : task.days_left <= 2 ? "warning" : "neutral"}>
                            {task.days_left < 0 ? `${Math.abs(task.days_left)}d overdue` : task.days_left === 0 ? "Due today" : `in ${task.days_left}d`}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="surface p-5">
            <SectionTitle title="Completion overview" description="A quick visual summary." />
            <div className="flex items-center gap-3">
              <ProgressBar value={data.completion_rate} />
              <span className="shrink-0 text-sm font-bold text-[rgb(var(--text-main))]">{data.completion_rate}%</span>
            </div>
            <p className="mt-2 text-[11px] text-[rgb(var(--text-muted))]">
              {data.completed_tasks} completed, {data.pending_tasks} pending, and {data.overdue_tasks} overdue tasks.
            </p>
          </div>
        </>
      )}
    </PageContainer>
  );
}