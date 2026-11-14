import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { notifyConversationsUpdated, useChats } from "@/context/ChatsContext";
import { api, type ConversationSummary } from "@/services/api";
import {
  Avatar,
  ConfirmDialog,
  Modal,
  useToast,
} from "@/components/ui";

type NavItem = {
  path: string;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  color: string;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard, color: "text-blue-500 bg-blue-500/10" },
  { path: "/chat", label: "AI Chat", shortLabel: "AI Chat", icon: MessageSquare, color: "text-violet-500 bg-violet-500/10" },
  { path: "/study-assistant", label: "AI Study Assistant", shortLabel: "Study AI", icon: GraduationCap, color: "text-fuchsia-500 bg-fuchsia-500/10" },
  { path: "/tasks", label: "My Tasks", shortLabel: "Tasks", icon: CheckSquare, color: "text-sky-500 bg-sky-500/10" },
  { path: "/planner", label: "Study Planner", shortLabel: "Planner", icon: CalendarDays, color: "text-teal-500 bg-teal-500/10" },
  { path: "/notes", label: "Notes & Documents", shortLabel: "Notes", icon: FileText, color: "text-indigo-500 bg-indigo-500/10" },
  { path: "/learning", label: "Learning Hub", shortLabel: "Learning", icon: BookOpen, color: "text-cyan-500 bg-cyan-500/10" },
  { path: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: Calendar, color: "text-orange-500 bg-orange-500/10" },
  { path: "/analytics", label: "Analytics", shortLabel: "Analytics", icon: BarChart3, color: "text-amber-500 bg-amber-500/10" },
  { path: "/focus", label: "Focus Mode", shortLabel: "Focus", icon: Clock, color: "text-emerald-500 bg-emerald-500/10" },
  { path: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings, color: "text-slate-500 bg-slate-500/10" },
];

function isActivePath(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-2xl accent-gradient text-white shadow-accent ${
        small ? "h-9 w-9" : "h-10 w-10"
      }`}
    >
      <GraduationCap className={small ? "h-5 w-5" : "h-5 w-5"} />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[rgb(var(--bg-card))] bg-cyan-400" />
    </div>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, resolvedTheme, updateSettings, save } = useSettings();
  const { conversations, refresh, removeLocal } = useChats();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);

  const activeConversationId = searchParams.get("c");

  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? conversations.filter(
          (conversation) =>
            conversation.title.toLowerCase().includes(needle) ||
            conversation.preview.toLowerCase().includes(needle)
        )
      : conversations;
    return list.slice(0, 10);
  }, [conversations, query]);

  const toggleTheme = () => {
    const next = {
      ...settings,
      appearance: {
        ...settings.appearance,
        theme: resolvedTheme === "dark" ? ("light" as const) : ("dark" as const),
      },
    };
    updateSettings(() => next);
    void save(next);
  };

  const openConversation = (conversation: ConversationSummary) => {
    const base = conversation.mode === "study" ? "/study-assistant" : "/chat";
    navigate(`${base}?c=${conversation.id}`);
  };

  const submitRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    try {
      await api.renameConversation(renaming.id, renameValue.trim());
      notifyConversationsUpdated();
      await refresh();
      toast("Conversation renamed");
      setRenaming(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not rename conversation", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteConversation(deleting.id);
      removeLocal(deleting.id);
      notifyConversationsUpdated();
      if (activeConversationId === String(deleting.id)) {
        navigate(deleting.mode === "study" ? "/study-assistant" : "/chat");
      }
      toast("Conversation deleted");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete conversation", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--bg-card))]/95 backdrop-blur-xl transition-all duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[78px]" : "md:w-[280px]"}`}
        aria-label="Main sidebar"
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[rgb(var(--border))] ${
            collapsed ? "md:justify-center md:px-2" : "px-4"
          }`}
        >
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="StudySphere home">
            <BrandMark small={collapsed} />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold tracking-tight text-[rgb(var(--text-main))]">
                  StudySphere
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--text-faint))]">
                  Student productivity
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="icon-btn md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="icon-btn ml-1 hidden md:inline-flex"
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className={`shrink-0 pt-3 ${collapsed ? "px-2" : "px-3"}`}>
          <button
            type="button"
            onClick={() => {
              navigate("/chat");
              onCloseMobile();
            }}
            className={`btn-accent w-full ${collapsed ? "px-0" : ""}`}
            title="New chat"
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New chat</span>}
          </button>

          {!collapsed && (
            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
              <input
                id="sidebar-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
                className="input py-2 pr-3 text-xs"
                style={{ paddingLeft: 32 }}
                aria-label="Search conversations"
              />
            </div>
          )}
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
          <nav className="space-y-0.5" aria-label="Pages">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-[rgba(var(--accent),0.12)] text-[rgb(var(--accent))]"
                      : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.1)] hover:text-[rgb(var(--text-main))]"
                  } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      active ? "accent-bg text-white" : item.color
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="mt-4">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-faint))]">
                  Recent chats
                </p>
                <span className="rounded-full bg-[rgba(148,163,184,0.12)] px-1.5 py-0.5 text-[9px] font-semibold text-[rgb(var(--text-faint))]">
                  {conversations.length}
                </span>
              </div>
              {filteredConversations.length === 0 ? (
                <p className="px-2 py-2 text-[11px] leading-relaxed text-[rgb(var(--text-faint))]">
                  {query ? "No conversations match your search." : "Your conversations will appear here."}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filteredConversations.map((conversation) => {
                    const base = conversation.mode === "study" ? "/study-assistant" : "/chat";
                    const active =
                      isActivePath(location.pathname, base) &&
                      activeConversationId === String(conversation.id);
                    return (
                      <div
                        key={conversation.id}
                        className={`group relative flex items-center rounded-xl transition ${
                          active
                            ? "bg-[rgba(var(--accent),0.1)]"
                            : "hover:bg-[rgba(148,163,184,0.08)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openConversation(conversation)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                          title={conversation.title}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                              conversation.mode === "study"
                                ? "bg-fuchsia-500/10 text-fuchsia-500"
                                : "bg-violet-500/10 text-violet-500"
                            }`}
                          >
                            {conversation.mode === "study" ? (
                              <GraduationCap className="h-3 w-3" />
                            ) : (
                              <MessageSquare className="h-3 w-3" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-[rgb(var(--text-main))]">
                              {conversation.title}
                            </span>
                            <span className="block truncate text-[10px] text-[rgb(var(--text-faint))]">
                              {conversation.preview || "No messages yet"}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center pr-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setRenaming(conversation);
                              setRenameValue(conversation.title);
                            }}
                            className="rounded-md p-1 text-[rgb(var(--text-faint))] hover:bg-[rgba(148,163,184,0.15)] hover:text-[rgb(var(--text-main))]"
                            title="Rename conversation"
                            aria-label="Rename conversation"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(conversation)}
                            className="rounded-md p-1 text-[rgb(var(--text-faint))] hover:bg-red-500/10 hover:text-red-500"
                            title="Delete conversation"
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[rgb(var(--border))] p-2.5">
          <div
            className={`flex items-center gap-2 rounded-xl p-1.5 ${
              collapsed ? "md:justify-center" : ""
            }`}
          >
            <Link to="/settings" className="flex min-w-0 flex-1 items-center gap-2.5" title="Profile and settings">
              <Avatar name={settings.profile.name} size="sm" />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[rgb(var(--text-main))]">
                    {settings.profile.name}
                  </span>
                  <span className="block truncate text-[10px] text-[rgb(var(--text-faint))]">
                    {settings.profile.major || "Student"}
                  </span>
                </span>
              )}
            </Link>
            {!collapsed && (
              <button
                type="button"
                onClick={toggleTheme}
                className="icon-btn shrink-0"
                title="Toggle theme (Ctrl+Shift+L)"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn mt-1 hidden w-full md:inline-flex"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </aside>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename conversation"
        description="Give this conversation a clear, memorable title."
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setRenaming(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-accent"
              onClick={() => void submitRename()}
              disabled={!renameValue.trim()}
            >
              Save name
            </button>
          </>
        }
      >
        <input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitRename();
          }}
          className="input"
          maxLength={120}
          autoFocus
          aria-label="Conversation title"
        />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete conversation?"
        message={`"${deleting?.title || "This conversation"}" and all of its messages will be permanently deleted.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

export function MobileTopbar({
  onOpenSidebar,
  title,
}: {
  onOpenSidebar: () => void;
  title: string;
}) {
  const { resolvedTheme, updateSettings, save, settings } = useSettings();
  const navigate = useNavigate();

  const toggleTheme = () => {
    const next = {
      ...settings,
      appearance: {
        ...settings.appearance,
        theme: resolvedTheme === "dark" ? ("light" as const) : ("dark" as const),
      },
    };
    updateSettings(() => next);
    void save(next);
  };

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-card))]/85 px-3 backdrop-blur-xl md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onOpenSidebar} className="icon-btn" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <BrandMark small />
          <span className="truncate text-sm font-bold tracking-tight text-[rgb(var(--text-main))]">
            {title}
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={toggleTheme} className="icon-btn" aria-label="Toggle theme">
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => navigate("/settings")} className="icon-btn" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, updateSettings, save, settings } = useSettings();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("studysphere-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("studysphere-sidebar-collapsed", collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (collapsed) setCollapsed(false);
        window.setTimeout(() => document.getElementById("sidebar-search")?.focus(), 60);
      } else if (modifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed((previous) => !previous);
      } else if (modifier && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        const next = {
          ...settings,
          appearance: {
            ...settings.appearance,
            theme: resolvedTheme === "dark" ? ("light" as const) : ("dark" as const),
          },
        };
        updateSettings(() => next);
        void save(next);
      } else if (modifier && event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate("/chat");
      } else if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed, navigate, resolvedTheme, save, settings, updateSettings]);

  const title = useMemo(() => {
    const match = NAV_ITEMS.find((item) => isActivePath(location.pathname, item.path));
    return match?.label || "StudySphere";
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((previous) => !previous)}
      />
      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-300 ${
          collapsed ? "md:pl-[78px]" : "md:pl-[280px]"
        }`}
      >
        <MobileTopbar onOpenSidebar={() => setMobileOpen(true)} title={title} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function BackToChat() {
  return (
    <Link to="/chat" className="btn-soft">
      <Sparkles className="h-4 w-4" /> Open AI chat
    </Link>
  );
}