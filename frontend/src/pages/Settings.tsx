import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  Check,
  ChevronRight,
  Database,
  Download,
  Globe2,
  Keyboard,
  Laptop,
  MessageSquare,
  Moon,
  Palette,
  Save,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  Avatar,
  Badge,
  ConfirmDialog,
  ErrorBanner,
  PageHeader,
  SectionTitle,
  Toggle,
  useToast,
} from "@/components/ui";
import {
  useSettings,
  type AccentName,
  type Settings,
  type ThemeMode,
} from "@/context/SettingsContext";
import { notifyConversationsUpdated } from "@/context/ChatsContext";
import { api, downloadJson, type AIStatus } from "@/services/api";

type TabId =
  | "profile"
  | "general"
  | "appearance"
  | "chat"
  | "ai"
  | "notifications"
  | "privacy"
  | "shortcuts"
  | "about";

const TABS: { id: TabId; label: string; icon: typeof User; color: string }[] = [
  { id: "profile", label: "Profile", icon: User, color: "text-violet-500 bg-violet-500/10" },
  { id: "general", label: "General", icon: Globe2, color: "text-sky-500 bg-sky-500/10" },
  { id: "appearance", label: "Appearance", icon: Palette, color: "text-fuchsia-500 bg-fuchsia-500/10" },
  { id: "chat", label: "Chat", icon: MessageSquare, color: "text-indigo-500 bg-indigo-500/10" },
  { id: "ai", label: "AI", icon: Bot, color: "text-cyan-500 bg-cyan-500/10" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "text-amber-500 bg-amber-500/10" },
  { id: "privacy", label: "Privacy & data", icon: Shield, color: "text-emerald-500 bg-emerald-500/10" },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, color: "text-orange-500 bg-orange-500/10" },
  { id: "about", label: "About", icon: Sparkles, color: "text-rose-500 bg-rose-500/10" },
];

const ACCENTS: { id: AccentName; label: string; color: string }[] = [
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "cyan", label: "Cyan", color: "#06b6d4" },
  { id: "emerald", label: "Emerald", color: "#10b981" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "amber", label: "Amber", color: "#d97706" },
];

const THEMES: { id: ThemeMode; label: string; description: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", description: "Bright and crisp", icon: Sun },
  { id: "dark", label: "Dark", description: "Easy on the eyes", icon: Moon },
  { id: "system", label: "System", description: "Follow your device", icon: Laptop },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "hi", label: "हिन्दी" },
  { id: "pt", label: "Português" },
  { id: "ar", label: "العربية" },
  { id: "zh", label: "中文" },
];

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], label: "Search conversations" },
  { keys: ["Ctrl", "B"], label: "Collapse or expand the sidebar" },
  { keys: ["Ctrl", "Shift", "L"], label: "Toggle light and dark mode" },
  { keys: ["Ctrl", "Alt", "N"], label: "Start a new AI chat" },
  { keys: ["Enter"], label: "Send a chat message" },
  { keys: ["Shift", "Enter"], label: "Insert a new line in chat" },
  { keys: ["Ctrl", "Enter"], label: "Send a chat message when Enter is set to newline" },
  { keys: ["Esc"], label: "Close a dialog or the mobile sidebar" },
];

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[rgb(var(--border))] p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[rgb(var(--text-main))]">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-[rgb(var(--text-muted))]">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    save,
    reset,
    saving,
    saveError,
    lastSavedAt,
    resolvedTheme,
  } = useSettings();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api
      .getAIStatus()
      .then(setAiStatus)
      .catch((caught) => setAiError(caught instanceof Error ? caught.message : "Could not load AI status"));
  }, []);

  const setSection = <K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) => {
    updateSettings((previous) => ({
      ...previous,
      [section]: { ...previous[section], ...patch } as Settings[K],
    }));
  };

  const saveNow = async () => {
    const ok = await save();
    if (ok) {
      toast("Settings saved");
    } else {
      toast("Settings saved locally, but syncing to the server failed", "error");
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      toast("This browser does not support notifications", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setSection("notifications", { push: true });
      toast("Browser notifications enabled");
    } else {
      toast("Notification permission was not granted", "error");
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const [tasks, notes, resources, events, focus, analytics] = await Promise.all([
        api.getTasks(),
        api.getNotes(),
        api.getLearningResources(),
        api.getCalendarEvents(),
        api.getFocusSessions(),
        api.getAnalytics(),
      ]);
      downloadJson(`studysphere-export-${new Date().toISOString().slice(0, 10)}.json`, {
        exported_at: new Date().toISOString(),
        application: "StudySphere",
        profile: settings.profile,
        settings,
        tasks,
        notes,
        learning_resources: resources,
        calendar_events: events,
        focus_sessions: focus,
        analytics,
      });
      toast("Data export downloaded");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not export data", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearChats = async () => {
    try {
      await api.clearConversations("all");
      notifyConversationsUpdated();
      toast("All AI conversations cleared");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not clear conversations", "error");
    } finally {
      setConfirmClear(false);
    }
  };

  const resetAll = async () => {
    await reset();
    setConfirmReset(false);
    toast("Settings reset to defaults");
  };

  const active = useMemo(() => TABS.find((tab) => tab.id === activeTab) || TABS[0], [activeTab]);
  const ActiveIcon = active.icon;
  const completion = settings.profile.name.trim() ? 100 : 50;

  return (
    <PageContainer className="space-y-5 pb-24">
      <PageHeader
        title="Settings"
        description="Tune StudySphere for the way you study. Preferences apply instantly and sync to your workspace."
        icon={<ActiveIcon className="h-6 w-6" />}
        actions={
          <>
            <button type="button" onClick={() => setConfirmReset(true)} className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25">
              Reset
            </button>
            <button type="button" onClick={() => void saveNow()} disabled={saving} className="btn bg-white text-slate-900 hover:bg-white/90">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      />

      {saveError && <ErrorBanner message={saveError} />}

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <div className="surface h-fit p-2 lg:sticky lg:top-4">
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition lg:w-full ${
                    isActive
                      ? "bg-[rgba(var(--accent),0.12)] text-[rgb(var(--accent))]"
                      : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.08)] hover:text-[rgb(var(--text-main))]"
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${tab.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {isActive && <ChevronRight className="ml-auto hidden h-3.5 w-3.5 lg:block" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 hidden rounded-xl border border-[rgb(var(--border))] p-3 lg:block">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-faint))]">
              <span>Profile</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)]">
              <div className="h-full rounded-full accent-gradient" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[rgb(var(--text-faint))]">
              {lastSavedAt
                ? `Synced ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Changes save locally instantly."}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {activeTab === "profile" && (
            <>
              <div className="surface p-5">
                <SectionTitle title="Profile" description="How you appear across StudySphere." />
                <div className="mb-5 flex items-center gap-4">
                  <Avatar name={settings.profile.name || "Student"} size="lg" />
                  <div className="min-w-0">
                    <p className="text-base font-bold text-[rgb(var(--text-main))]">{settings.profile.name || "Student User"}</p>
                    <p className="truncate text-xs text-[rgb(var(--text-muted))]">{settings.profile.email || "Add an email address"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {settings.profile.major && <Badge variant="accent">{settings.profile.major}</Badge>}
                      {settings.profile.university && <Badge variant="neutral">{settings.profile.university}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="profile-name">Full name</label>
                    <input
                      id="profile-name"
                      value={settings.profile.name}
                      onChange={(event) => setSection("profile", { name: event.target.value })}
                      className="input"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-email">Email</label>
                    <input
                      id="profile-email"
                      type="email"
                      value={settings.profile.email}
                      onChange={(event) => setSection("profile", { email: event.target.value })}
                      className="input"
                      placeholder="you@university.edu"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-university">University</label>
                    <input
                      id="profile-university"
                      value={settings.profile.university}
                      onChange={(event) => setSection("profile", { university: event.target.value })}
                      className="input"
                      placeholder="University name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-major">Major</label>
                    <input
                      id="profile-major"
                      value={settings.profile.major}
                      onChange={(event) => setSection("profile", { major: event.target.value })}
                      className="input"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="label">Avatar accent</p>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((accent) => (
                      <button
                        key={accent.id}
                        type="button"
                        onClick={() => setSection("profile", { avatarColor: accent.id })}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                          settings.profile.avatarColor === accent.id
                            ? "border-[rgba(var(--accent),0.45)] bg-[rgba(var(--accent),0.08)] text-[rgb(var(--text-main))]"
                            : "border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--accent),0.3)]"
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent.color }} />
                        {accent.label}
                        {settings.profile.avatarColor === accent.id && <Check className="h-3 w-3 accent-text" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="surface p-5">
                <SectionTitle title="Profile completeness" description="A complete profile makes the workspace feel personal." />
                <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)]">
                  <div className="h-full rounded-full accent-gradient transition-all duration-500" style={{ width: `${completion}%` }} />
                </div>
                <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{completion}% complete</p>
              </div>
            </>
          )}

          {activeTab === "general" && (
            <div className="surface p-5">
              <SectionTitle title="General" description="Language, calendar, and regional preferences." />
              <div className="space-y-3">
                <SettingRow title="Language" description="The interface language tag applied to the app.">
                  <select
                    value={settings.general.language}
                    onChange={(event) => setSection("general", { language: event.target.value })}
                    className="select py-2 text-xs sm:w-44"
                    aria-label="Language"
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.id} value={language.id}>{language.label}</option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow title="Time zone" description="Used for deadlines and scheduling context.">
                  <select
                    value={settings.general.timezone}
                    onChange={(event) => setSection("general", { timezone: event.target.value })}
                    className="select py-2 text-xs sm:w-44"
                    aria-label="Time zone"
                  >
                    <option value="local">Device time zone</option>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </SettingRow>
                <SettingRow title="Week starts on" description="Choose the first day of your planner week.">
                  <div className="flex rounded-lg border border-[rgb(var(--border))] p-0.5">
                    {(["monday", "sunday"] as const).map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSection("general", { weekStart: day })}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                          settings.general.weekStart === day ? "accent-bg text-white" : "text-[rgb(var(--text-muted))]"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow title="Date format" description="How dates are displayed across the app.">
                  <select
                    value={settings.general.dateFormat}
                    onChange={(event) => setSection("general", { dateFormat: event.target.value })}
                    className="select py-2 text-xs sm:w-44"
                    aria-label="Date format"
                  >
                    <option value="MMM d, yyyy">MMM d, yyyy</option>
                    <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                    <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                    <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                  </select>
                </SettingRow>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <>
              <div className="surface p-5">
                <SectionTitle title="Theme" description="Choose how StudySphere looks on this device." />
                <div className="grid gap-3 sm:grid-cols-3">
                  {THEMES.map((theme) => {
                    const Icon = theme.icon;
                    const selected = settings.appearance.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSection("appearance", { theme: theme.id })}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[rgba(var(--accent),0.5)] bg-[rgba(var(--accent),0.06)] shadow-soft"
                            : "border-[rgb(var(--border))] hover:border-[rgba(var(--accent),0.3)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? "accent-bg text-white" : "bg-[rgba(148,163,184,0.12)] text-[rgb(var(--text-muted))]"}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {selected && <Check className="h-4 w-4 accent-text" />}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[rgb(var(--text-main))]">{theme.label}</p>
                        <p className="text-[11px] text-[rgb(var(--text-muted))]">{theme.description}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-[rgb(var(--text-muted))]">
                  Active theme: <span className="font-semibold text-[rgb(var(--text-main))]">{resolvedTheme === "dark" ? "Dark" : "Light"}</span>
                </p>
              </div>

              <div className="surface p-5">
                <SectionTitle title="Accent color" description="Used for buttons, highlights, and gradients." />
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => setSection("appearance", { accent: accent.id })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        settings.appearance.accent === accent.id
                          ? "border-[rgba(var(--accent),0.5)] bg-[rgba(var(--accent),0.08)] text-[rgb(var(--text-main))]"
                          : "border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--accent),0.3)]"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: accent.color }} />
                      {accent.label}
                      {settings.appearance.accent === accent.id && <Check className="h-3 w-3 accent-text" />}
                    </button>
                  ))}
                </div>
                <div className="mt-4 h-16 rounded-xl accent-gradient" />
              </div>

              <div className="surface p-5">
                <SectionTitle title="Experience" description="Fine-tune density and motion." />
                <div className="space-y-3">
                  <SettingRow title="Compact mode" description="Reduce spacing for more content on screen.">
                    <Toggle
                      checked={settings.appearance.compact}
                      onChange={(checked) => setSection("appearance", { compact: checked })}
                      label="Compact mode"
                    />
                  </SettingRow>
                  <SettingRow title="Animations" description="Enable smooth transitions and motion.">
                    <Toggle
                      checked={settings.appearance.animations}
                      onChange={(checked) => setSection("appearance", { animations: checked })}
                      label="Animations"
                    />
                  </SettingRow>
                </div>
              </div>
            </>
          )}

          {activeTab === "chat" && (
            <div className="surface p-5">
              <SectionTitle title="Chat preferences" description="Control how the AI workspace behaves." />
              <div className="space-y-3">
                <SettingRow title="Send with Enter" description="When off, Enter adds a new line and Ctrl+Enter sends.">
                  <Toggle
                    checked={settings.chat.sendOnEnter}
                    onChange={(checked) => setSection("chat", { sendOnEnter: checked })}
                    label="Send with Enter"
                  />
                </SettingRow>
                <SettingRow title="Show timestamps" description="Display the time next to each message.">
                  <Toggle
                    checked={settings.chat.showTimestamps}
                    onChange={(checked) => setSection("chat", { showTimestamps: checked })}
                    label="Show timestamps"
                  />
                </SettingRow>
                <SettingRow title="Message text size" description="Adjust the reading size of chat messages.">
                  <select
                    value={settings.chat.fontSize}
                    onChange={(event) => setSection("chat", { fontSize: event.target.value as Settings["chat"]["fontSize"] })}
                    className="select py-2 text-xs sm:w-36"
                    aria-label="Message text size"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </SettingRow>
                <SettingRow title="Wrap long code lines" description="Keep code blocks within the message width.">
                  <Toggle
                    checked={settings.chat.codeWrap}
                    onChange={(checked) => setSection("chat", { codeWrap: checked })}
                    label="Wrap long code lines"
                  />
                </SettingRow>
              </div>
              <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.04)] p-3">
                <p className="text-[11px] leading-relaxed text-[rgb(var(--text-muted))]">
                  Chat history is saved to your workspace database when privacy settings allow it. Use the AI Chat page to start a conversation.
                </p>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <>
              <div className="surface p-5">
                <SectionTitle
                  title="AI provider"
                  description="The provider is configured securely on the backend. API keys never reach the browser."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setAiError(null);
                        api.getAIStatus().then(setAiStatus).catch((caught) => setAiError(caught instanceof Error ? caught.message : "Could not load status"));
                      }}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      Refresh
                    </button>
                  }
                />
                {aiError && <ErrorBanner message={aiError} />}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-faint))]">Status</p>
                    <div className="mt-1.5">
                      {aiStatus?.configured ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Not configured</Badge>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-faint))]">Provider</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[rgb(var(--text-main))]">{aiStatus?.provider || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-faint))]">Model</p>
                    <p className="mt-1 truncate text-sm font-semibold text-[rgb(var(--text-main))]">{aiStatus?.model || "—"}</p>
                  </div>
                </div>
                {!aiStatus?.configured && (
                  <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                    Add <code className="font-mono">AI_PROVIDER</code> and <code className="font-mono">AI_API_KEY</code> to{" "}
                    <code className="font-mono">backend/.env</code>, then restart the FastAPI server. StudySphere will not return fake AI answers.
                  </div>
                )}
              </div>

              <div className="surface p-5">
                <SectionTitle title="Response preferences" description="Applied to every AI request." />
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="temperature" className="text-xs font-semibold text-[rgb(var(--text-main))]">Creativity</label>
                      <span className="chip">{settings.ai.temperature.toFixed(1)}</span>
                    </div>
                    <input
                      id="temperature"
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.1}
                      value={settings.ai.temperature}
                      onChange={(event) => setSection("ai", { temperature: Number(event.target.value) })}
                      className="w-full accent-[rgb(var(--accent))]"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-[rgb(var(--text-faint))]">
                      <span>Focused and precise</span>
                      <span>Creative and exploratory</span>
                    </div>
                  </div>
                  <SettingRow title="Response style" description="How detailed the assistant should be.">
                    <select
                      value={settings.ai.responseStyle}
                      onChange={(event) => setSection("ai", { responseStyle: event.target.value as Settings["ai"]["responseStyle"] })}
                      className="select py-2 text-xs sm:w-36"
                      aria-label="Response style"
                    >
                      <option value="concise">Concise</option>
                      <option value="balanced">Balanced</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </SettingRow>
                  <div>
                    <label className="label" htmlFor="custom-instructions">Custom instructions</label>
                    <textarea
                      id="custom-instructions"
                      value={settings.ai.customInstructions}
                      onChange={(event) => setSection("ai", { customInstructions: event.target.value })}
                      className="textarea"
                      rows={4}
                      maxLength={2000}
                      placeholder="e.g. I am a second-year computer science student. Explain concepts with diagrams in text and include practice questions."
                    />
                    <p className="mt-1 text-[10px] text-[rgb(var(--text-faint))]">{settings.ai.customInstructions.length}/2000</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "notifications" && (
            <div className="surface p-5">
              <SectionTitle title="Notifications" description="Choose what StudySphere should remind you about." />
              <div className="space-y-3">
                <SettingRow title="Deadline reminders" description="Alert me when assignments are due soon.">
                  <Toggle checked={settings.notifications.deadlines} onChange={(checked) => setSection("notifications", { deadlines: checked })} label="Deadline reminders" />
                </SettingRow>
                <SettingRow title="Study session reminders" description="Remind me before scheduled study blocks.">
                  <Toggle checked={settings.notifications.studyReminders} onChange={(checked) => setSection("notifications", { studyReminders: checked })} label="Study reminders" />
                </SettingRow>
                <SettingRow title="Achievement updates" description="Celebrate completed goals and milestones.">
                  <Toggle checked={settings.notifications.achievements} onChange={(checked) => setSection("notifications", { achievements: checked })} label="Achievement updates" />
                </SettingRow>
                <SettingRow title="Weekly digest" description="A summary of your productivity every week.">
                  <Toggle checked={settings.notifications.weeklyDigest} onChange={(checked) => setSection("notifications", { weeklyDigest: checked })} label="Weekly digest" />
                </SettingRow>
                <SettingRow title="Email notifications" description="Send reminders to your email address.">
                  <Toggle checked={settings.notifications.email} onChange={(checked) => setSection("notifications", { email: checked })} label="Email notifications" />
                </SettingRow>
                <SettingRow title="Browser notifications" description="Show native notifications while StudySphere is open.">
                  <button type="button" onClick={() => void enableNotifications()} className="btn-outline px-3 py-1.5 text-xs">
                    Enable browser notifications
                  </button>
                </SettingRow>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <>
              <div className="surface p-5">
                <SectionTitle title="Privacy & data" description="You control what is stored and shared." />
                <div className="space-y-3">
                  <SettingRow title="Save chat history" description="Store AI conversations in your workspace.">
                    <Toggle checked={settings.privacy.saveHistory} onChange={(checked) => setSection("privacy", { saveHistory: checked })} label="Save chat history" />
                  </SettingRow>
                  <SettingRow title="Usage analytics" description="Share anonymous product usage data.">
                    <Toggle checked={settings.privacy.usageAnalytics} onChange={(checked) => setSection("privacy", { usageAnalytics: checked })} label="Usage analytics" />
                  </SettingRow>
                  <SettingRow title="Crash reports" description="Help improve reliability by sharing error reports.">
                    <Toggle checked={settings.privacy.crashReports} onChange={(checked) => setSection("privacy", { crashReports: checked })} label="Crash reports" />
                  </SettingRow>
                </div>
              </div>
              <div className="surface p-5">
                <SectionTitle title="Your data" description="Export a copy or clear AI conversations." />
                <div className="space-y-3">
                  <SettingRow title="Export workspace data" description="Download tasks, notes, resources, events, and settings as JSON.">
                    <button type="button" onClick={() => void exportData()} disabled={exporting} className="btn-outline px-3 py-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Export JSON"}
                    </button>
                  </SettingRow>
                  <SettingRow title="Clear AI conversations" description="Permanently delete all AI chat and study conversations.">
                    <button type="button" onClick={() => setConfirmClear(true)} className="btn-danger px-3 py-1.5 text-xs">
                      <Trash2 className="h-3.5 w-3.5" /> Clear chats
                    </button>
                  </SettingRow>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.04)] p-3 text-[11px] leading-relaxed text-[rgb(var(--text-muted))]">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Your existing database is preserved. Settings and conversations are stored in the local SQLite workspace database.
                </div>
              </div>
            </>
          )}

          {activeTab === "shortcuts" && (
            <div className="surface p-5">
              <SectionTitle title="Keyboard shortcuts" description="Move faster with these built-in shortcuts." />
              <div className="space-y-2">
                {SHORTCUTS.map((shortcut) => (
                  <div key={shortcut.label} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                    <span className="text-xs text-[rgb(var(--text-muted))]">{shortcut.label}</span>
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded-md border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.08)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[rgb(var(--text-main))]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgba(148,163,184,0.04)] p-3 text-[11px] leading-relaxed text-[rgb(var(--text-muted))]">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                On macOS, use the Command key instead of Ctrl where shown.
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <>
              <div className="surface p-5">
                <SectionTitle title="About StudySphere" description="Smart Student Productivity Assistant." />
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl accent-gradient text-white shadow-accent-lg">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-[rgb(var(--text-main))]">StudySphere</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Version 1.0.0</p>
                    <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--text-muted))]">
                      A ChatGPT-inspired productivity workspace for students. Manage tasks, plan study sessions, capture notes,
                      track learning resources, and get academic help from a configured AI provider.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    ["Frontend", "React 18, TypeScript, Vite, Tailwind CSS"],
                    ["Backend", "Python FastAPI, SQLite, Uvicorn"],
                    ["AI", "OpenAI, Anthropic, Gemini, Groq, OpenRouter"],
                    ["Charts", "Recharts"],
                    ["Routing", "React Router"],
                    ["Storage", "Local SQLite database"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[rgb(var(--border))] p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-faint))]">{label}</p>
                      <p className="mt-0.5 text-xs text-[rgb(var(--text-main))]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface p-5">
                <SectionTitle title="AI configuration" description="Provider status and configuration guidance." />
                <div className="space-y-2">
                  <SettingRow title="Configured provider" description="Read from the backend environment.">
                    <Badge variant={aiStatus?.configured ? "success" : "warning"}>
                      {aiStatus?.configured ? aiStatus.provider : "Not configured"}
                    </Badge>
                  </SettingRow>
                  <SettingRow title="Model" description="Active model for the configured provider.">
                    <span className="text-xs font-semibold text-[rgb(var(--text-main))]">{aiStatus?.model || "—"}</span>
                  </SettingRow>
                  <SettingRow title="API keys" description="Stored only in backend/.env and never exposed to the frontend.">
                    <Badge variant="success">Secure</Badge>
                  </SettingRow>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-2 z-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))]/90 px-4 py-3 shadow-soft backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="hidden text-[11px] text-[rgb(var(--text-muted))] sm:block">
            {saveError ? saveError : lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Preferences apply instantly in this browser."}
          </p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button type="button" onClick={() => setConfirmReset(true)} className="btn-outline px-3 py-2 text-xs">
              Reset defaults
            </button>
            <button type="button" onClick={() => void saveNow()} disabled={saving} className="btn-accent px-4 py-2 text-xs">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset settings?"
        message="This restores every preference to its default value. Your tasks, notes, and conversations are not affected."
        confirmLabel="Reset settings"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => void resetAll()}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear all AI conversations?"
        message="Every AI chat and study conversation will be permanently deleted. This cannot be undone."
        confirmLabel="Clear conversations"
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void clearChats()}
      />
    </PageContainer>
  );
}