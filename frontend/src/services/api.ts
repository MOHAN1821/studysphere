export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
  try {
    if (token) sessionStorage.setItem("ssp_token", token);
    else sessionStorage.removeItem("ssp_token");
  } catch {
    /* ignore */
  }
}

export function getAuthToken(): string | null {
  if (_authToken) return _authToken;
  try {
    _authToken = sessionStorage.getItem("ssp_token");
  } catch {
    /* ignore */
  }
  return _authToken;
}

export type User = { id: number; email: string; name: string; created_at?: string };
export type AuthResponse = { ok: boolean; user: User; token: string };

export type Task = {
  id: number;
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "overdue";
  created_at: string;
  completed_at?: string | null;
};

export type Note = {
  id: number;
  title: string;
  content: string;
  subject?: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type LearningResource = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  url?: string | null;
  resource_type: string;
  completed: boolean;
  bookmarked: boolean;
  created_at: string;
};

export type CalendarEvent = {
  id: number;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  category: string;
  color: string;
  created_at: string;
};

export type StudySession = {
  id: number;
  title: string;
  subject?: string | null;
  study_date: string;
  start_time: string;
  end_time?: string | null;
  notes?: string | null;
  created_at: string;
};

export type FocusSession = {
  id: number;
  duration: number;
  completed: boolean;
  created_at: string;
};

export type Attachment = {
  name: string;
  size: number;
  type: string;
  content: string;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  attachments: Attachment[];
  created_at: string;
};

export type ConversationSummary = {
  id: number;
  title: string;
  mode: "chat" | "study";
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type ChatResponse = {
  conversation_id: number | null;
  title: string | null;
  response: string;
  demo_mode: boolean;
  provider: string;
  model: string;
  messages: ChatMessage[];
};

export type AIStatus = {
  configured: boolean;
  provider: string;
  model: string;
  demo_mode: boolean;
};

export type Analytics = {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  study_hours: number;
  focus_sessions: number;
  focus_minutes: number;
  notes_count: number;
  resources_total: number;
  resources_completed: number;
  events_count: number;
  streak_days: number;
  weekly_productivity: { day: string; date: string; completed: number; pending: number }[];
  priority_breakdown: { priority: string; count: number }[];
  subject_progress: { subject: string; total: number; completed: number }[];
  upcoming_deadlines: {
    id: number;
    title: string;
    deadline: string;
    priority: string;
    days_left: number;
    status: string;
  }[];
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* non-JSON error */
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  health: () => request<{ status: string; frontend_served: boolean }>("/api/health"),

  register: (body: { email: string; password: string; name?: string }) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: json(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: json(body) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/api/auth/me"),

  getTasks: (filter?: string) =>
    request<Task[]>(`/api/tasks${filter && filter !== "all" ? `?filter=${filter}` : ""}`),
  createTask: (body: Partial<Task>) => request<Task>("/api/tasks", { method: "POST", body: json(body) }),
  updateTask: (id: number, body: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, { method: "PUT", body: json(body) }),
  deleteTask: (id: number) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  getAnalytics: () => request<Analytics>("/api/analytics"),

  getNotes: () => request<Note[]>("/api/notes"),
  createNote: (body: Partial<Note>) => request<Note>("/api/notes", { method: "POST", body: json(body) }),
  updateNote: (id: number, body: Partial<Note>) =>
    request<Note>(`/api/notes/${id}`, { method: "PUT", body: json(body) }),
  deleteNote: (id: number) => request<void>(`/api/notes/${id}`, { method: "DELETE" }),

  getLearningResources: () => request<LearningResource[]>("/api/learning"),
  createLearningResource: (body: Partial<LearningResource>) =>
    request<LearningResource>("/api/learning", { method: "POST", body: json(body) }),
  updateLearningResource: (id: number, body: Partial<LearningResource>) =>
    request<LearningResource>(`/api/learning/${id}`, { method: "PUT", body: json(body) }),
  deleteLearningResource: (id: number) => request<void>(`/api/learning/${id}`, { method: "DELETE" }),
  updateLearningProgress: (resourceId: number, completed: boolean) =>
    request<{ resource_id: number; completed: boolean }>("/api/learning/progress", {
      method: "POST",
      body: json({ resource_id: resourceId, completed }),
    }),

  getCalendarEvents: () => request<CalendarEvent[]>("/api/calendar"),
  createCalendarEvent: (body: Partial<CalendarEvent>) =>
    request<CalendarEvent>("/api/calendar", { method: "POST", body: json(body) }),
  deleteCalendarEvent: (id: number) => request<void>(`/api/calendar/${id}`, { method: "DELETE" }),

  getStudySessions: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const query = params.toString();
    return request<StudySession[]>(`/api/planner/sessions${query ? `?${query}` : ""}`);
  },
  createStudySession: (body: Partial<StudySession>) =>
    request<StudySession>("/api/planner/sessions", { method: "POST", body: json(body) }),
  updateStudySession: (id: number, body: Partial<StudySession>) =>
    request<StudySession>(`/api/planner/sessions/${id}`, { method: "PUT", body: json(body) }),
  deleteStudySession: (id: number) =>
    request<void>(`/api/planner/sessions/${id}`, { method: "DELETE" }),

  getSchedule: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return request<{ start: string; end: string; tasks: Task[] }>(
      `/api/planner/schedule?${params.toString()}`
    );
  },
  getReminders: () =>
    request<{
      reminders: {
        id: number;
        title: string;
        deadline: string;
        priority: string;
        urgent: boolean;
        days_left: number;
      }[];
    }>("/api/planner/reminders"),

  getFocusSessions: () => request<FocusSession[]>("/api/focus"),
  createFocusSession: (body: { duration: number; completed: boolean }) =>
    request<FocusSession>("/api/focus", { method: "POST", body: json(body) }),

  getAIStatus: () => request<AIStatus>("/api/ai/status"),
  getConversations: (mode: "all" | "chat" | "study" = "all") =>
    request<ConversationSummary[]>(`/api/ai/conversations?mode=${mode}`),
  getConversation: (id: number) =>
    request<{ conversation: ConversationSummary; messages: ChatMessage[] }>(
      `/api/ai/conversations/${id}`
    ),
  sendChat: (body: {
    message: string;
    conversation_id?: number | null;
    mode: "chat" | "study";
    attachments?: Attachment[];
    temperature?: number;
    system_prompt?: string;
    save_history?: boolean;
  }) => request<ChatResponse>("/api/ai/chat", { method: "POST", body: json(body) }),
  regenerate: (id: number, body: { temperature?: number; system_prompt?: string }) =>
    request<ChatResponse>(`/api/ai/conversations/${id}/regenerate`, {
      method: "POST",
      body: json(body),
    }),
  renameConversation: (id: number, title: string) =>
    request<ConversationSummary>(`/api/ai/conversations/${id}`, {
      method: "PATCH",
      body: json({ title }),
    }),
  deleteConversation: (id: number) =>
    request<{ ok: boolean }>(`/api/ai/conversations/${id}`, { method: "DELETE" }),
  clearConversations: (mode: "all" | "chat" | "study" = "all") =>
    request<{ ok: boolean; deleted: number }>(`/api/ai/conversations?mode=${mode}`, {
      method: "DELETE",
    }),

  getSettings: () => request<Record<string, unknown>>("/api/settings"),
  saveSettings: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings", { method: "PUT", body: json({ data }) }),
};

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}