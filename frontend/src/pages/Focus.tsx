import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Coffee,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Timer,
} from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  SectionTitle,
  StatCard,
  Toggle,
  useToast,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { useFocus } from "@/hooks/useFeatures";

type Mode = "work" | "short" | "long";

const MODE_META: Record<Mode, { label: string; short: string; color: string; ring: string; icon: typeof Timer }> = {
  work: { label: "Focus session", short: "Focus", color: "#8b5cf6", ring: "#8b5cf6", icon: Timer },
  short: { label: "Short break", short: "Short break", color: "#22c55e", ring: "#22c55e", icon: Coffee },
  long: { label: "Long break", short: "Long break", color: "#06b6d4", ring: "#06b6d4", icon: Coffee },
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function FocusPage() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { sessions, loading, error, create, refresh } = useFocus();
  const [mode, setMode] = useState<Mode>("work");
  const [durations, setDurations] = useState({ work: 25, short: 5, long: 15 });
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const completedRef = useRef(false);

  const totalForMode = durations[mode] * 60;
  const meta = MODE_META[mode];

  const switchMode = useCallback(
    (next: Mode, autoStart = false) => {
      setMode(next);
      setSecondsLeft(durations[next] * 60);
      setRunning(autoStart);
      completedRef.current = false;
    },
    [durations]
  );

  const reset = useCallback(() => {
    setRunning(false);
    setSecondsLeft(durations[mode] * 60);
    completedRef.current = false;
  }, [durations, mode]);

  const completeSession = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (mode === "work") {
      try {
        await create({ duration: durations.work, completed: true });
        await refresh();
        toast("Focus session complete. Great work!");
      } catch (caught) {
        toast(caught instanceof Error ? caught.message : "Could not save focus session", "error");
      }
      if (settings.notifications.push && "Notification" in window && Notification.permission === "granted") {
        new Notification("Focus session complete", { body: "Time for a short break." });
      }
      if (autoStartBreak) {
        switchMode("short", true);
      } else {
        switchMode("short", false);
      }
    } else {
      toast("Break finished. Ready to focus again?");
      switchMode("work", false);
    }
  }, [autoStartBreak, create, durations.work, mode, refresh, settings.notifications.push, switchMode, toast]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          void completeSession();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, completeSession]);

  useEffect(() => {
    if (running) {
      document.title = `${formatTime(secondsLeft)} · ${meta.label} | StudySphere`;
    } else {
      document.title = "StudySphere | Smart Student Productivity Assistant";
    }
    return () => {
      document.title = "StudySphere | Smart Student Productivity Assistant";
    };
  }, [running, secondsLeft, meta.label]);

  const stats = useMemo(() => {
    const completed = sessions.filter((session) => session.completed);
    const totalMinutes = completed.reduce((sum, session) => sum + session.duration, 0);
    const today = dateKey(new Date());
    const todayMinutes = completed
      .filter((session) => session.created_at.slice(0, 10) === today)
      .reduce((sum, session) => sum + session.duration, 0);
    const days = new Set(completed.map((session) => session.created_at.slice(0, 10)));
    return {
      completed: completed.length,
      totalMinutes,
      todayMinutes,
      days: days.size,
    };
  }, [sessions]);

  const progress = totalForMode > 0 ? ((totalForMode - secondsLeft) / totalForMode) * 100 : 0;
  const circumference = 2 * Math.PI * 86;

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="Focus Mode"
        description="A Pomodoro timer that protects deep work and tracks your focus sessions."
        icon={<Timer className="h-6 w-6" />}
        actions={
          <button type="button" onClick={() => setShowSettings((previous) => !previous)} className="btn bg-white text-slate-900 hover:bg-white/90">
            <Settings2 className="h-4 w-4" /> Timer settings
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Sessions" value={stats.completed} subtitle="Completed focus blocks" icon={<CheckCircle2 className="h-5 w-5" />} variant="violet" />
        <StatCard title="Focus time" value={`${stats.totalMinutes}m`} subtitle="All time" icon={<Timer className="h-5 w-5" />} variant="cyan" />
        <StatCard title="Today" value={`${stats.todayMinutes}m`} subtitle="Focused today" icon={<Activity className="h-5 w-5" />} variant="emerald" />
        <StatCard title="Active days" value={stats.days} subtitle="Days with focus" icon={<Flame className="h-5 w-5" />} variant="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="surface relative overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 20%, ${meta.color}22, transparent 55%)` }} />
          <div className="relative flex flex-col items-center">
            <div className="mb-4 flex flex-wrap justify-center gap-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.05)] p-1">
              {(Object.keys(MODE_META) as Mode[]).map((item) => {
                const Icon = MODE_META[item].icon;
                const active = mode === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => switchMode(item)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "text-white shadow-soft" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-main))]"
                    }`}
                    style={active ? { backgroundColor: MODE_META[item].color } : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" /> {MODE_META[item].short}
                  </button>
                );
              })}
            </div>

            <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="10" />
                <circle
                  cx="100"
                  cy="100"
                  r="86"
                  fill="none"
                  stroke={meta.ring}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-extrabold tabular-nums tracking-tight text-[rgb(var(--text-main))] sm:text-6xl">
                  {formatTime(secondsLeft)}
                </span>
                <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  {meta.label}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button type="button" onClick={reset} className="icon-btn h-11 w-11 border border-[rgb(var(--border))]" title="Reset timer" aria-label="Reset timer">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRunning((previous) => !previous);
                  completedRef.current = false;
                }}
                className="btn-accent px-7 py-3.5 text-sm"
                style={{ backgroundImage: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? "Pause" : secondsLeft === totalForMode ? "Start focus" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => switchMode(mode === "work" ? "short" : "work")}
                className="icon-btn h-11 w-11 border border-[rgb(var(--border))]"
                title="Skip to next interval"
                aria-label="Skip interval"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] text-[rgb(var(--text-muted))]">
              {running ? "Stay with it. The timer keeps running while you navigate." : "Press start when you are ready to focus."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {showSettings && (
            <div className="surface p-4">
              <SectionTitle title="Timer settings" description="Tune the Pomodoro intervals." />
              <div className="space-y-3">
                {(["work", "short", "long"] as Mode[]).map((item) => (
                  <div key={item} className="flex items-center justify-between gap-3">
                    <label htmlFor={`duration-${item}`} className="text-xs font-medium text-[rgb(var(--text-muted))]">
                      {MODE_META[item].label} (minutes)
                    </label>
                    <input
                      id={`duration-${item}`}
                      type="number"
                      min={1}
                      max={120}
                      value={durations[item]}
                      onChange={(event) => {
                        const value = Math.max(1, Math.min(120, Number(event.target.value) || 1));
                        const next = { ...durations, [item]: value };
                        setDurations(next);
                        if (!running && mode === item) setSecondsLeft(value * 60);
                      }}
                      className="input w-20 py-1.5 text-center text-xs"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-3">
                  <div>
                    <p className="text-xs font-medium text-[rgb(var(--text-main))]">Auto-start breaks</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))]">Begin the break when focus ends.</p>
                  </div>
                  <Toggle checked={autoStartBreak} onChange={setAutoStartBreak} label="Auto-start breaks" />
                </div>
              </div>
            </div>
          )}

          <div className="surface p-4">
            <SectionTitle title="Session history" description="Recently completed focus blocks." />
            {loading ? (
              <LoadingBlock label="Loading sessions..." />
            ) : sessions.length === 0 ? (
              <EmptyState icon={<Timer className="h-5 w-5" />} title="No sessions yet" description="Complete your first focus block to build a streak." />
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {sessions.slice(0, 8).map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                        <Timer className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[rgb(var(--text-main))]">{session.duration} min focus</p>
                        <p className="text-[10px] text-[rgb(var(--text-faint))]">
                          {new Date(session.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="surface p-5">
        <SectionTitle title="How Focus Mode works" description="A simple, evidence-backed study rhythm." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: "1. Pick one goal", description: "Choose a single task or topic for the session.", color: "text-violet-500" },
            { title: "2. Work for 25 minutes", description: "Remove distractions and stay with the task.", color: "text-cyan-500" },
            { title: "3. Take a real break", description: "Step away for 5 minutes before the next block.", color: "text-emerald-500" },
          ].map((step) => (
            <div key={step.title} className="rounded-xl border border-[rgb(var(--border))] p-3">
              <p className={`text-xs font-bold ${step.color}`}>{step.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[rgb(var(--text-muted))]">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}