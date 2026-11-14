import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/services/api";

export type ThemeMode = "light" | "dark" | "system";
export type AccentName = "violet" | "blue" | "cyan" | "emerald" | "rose" | "amber";

export type Settings = {
  profile: {
    name: string;
    email: string;
    university: string;
    major: string;
    avatarColor: AccentName;
  };
  general: {
    language: string;
    timezone: string;
    weekStart: "monday" | "sunday";
    dateFormat: string;
  };
  appearance: {
    theme: ThemeMode;
    accent: AccentName;
    compact: boolean;
    animations: boolean;
  };
  chat: {
    sendOnEnter: boolean;
    showTimestamps: boolean;
    fontSize: "small" | "medium" | "large";
    codeWrap: boolean;
  };
  ai: {
    temperature: number;
    responseStyle: "concise" | "balanced" | "detailed";
    customInstructions: string;
  };
  notifications: {
    deadlines: boolean;
    studyReminders: boolean;
    achievements: boolean;
    weeklyDigest: boolean;
    email: boolean;
    push: boolean;
  };
  privacy: {
    saveHistory: boolean;
    usageAnalytics: boolean;
    crashReports: boolean;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    name: "Student User",
    email: "student@university.edu",
    university: "University",
    major: "Computer Science",
    avatarColor: "violet",
  },
  general: {
    language: "en",
    timezone: "local",
    weekStart: "monday",
    dateFormat: "MMM d, yyyy",
  },
  appearance: {
    theme: "system",
    accent: "violet",
    compact: false,
    animations: true,
  },
  chat: {
    sendOnEnter: true,
    showTimestamps: true,
    fontSize: "medium",
    codeWrap: false,
  },
  ai: {
    temperature: 0.7,
    responseStyle: "balanced",
    customInstructions: "",
  },
  notifications: {
    deadlines: true,
    studyReminders: true,
    achievements: true,
    weeklyDigest: false,
    email: false,
    push: false,
  },
  privacy: {
    saveHistory: true,
    usageAnalytics: false,
    crashReports: false,
  },
};

const STORAGE_KEY = "studysphere-settings-v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isObject(patch)) return base;
  const output: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (isObject(value) && isObject(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else if (value !== undefined) {
      output[key] = value;
    }
  }
  return output as T;
}

function readStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return deepMerge(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type SettingsContextValue = {
  settings: Settings;
  resolvedTheme: "light" | "dark";
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
  updateSettings: (updater: (previous: Settings) => Settings) => void;
  save: (next?: Settings) => Promise<boolean>;
  reset: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readStoredSettings());
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const resolvedTheme: "light" | "dark" =
    settings.appearance.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : settings.appearance.theme;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.dataset.accent = settings.appearance.accent;
    document.documentElement.classList.toggle("reduce-motion", !settings.appearance.animations);
    document.documentElement.classList.toggle("compact", settings.appearance.compact);
    document.documentElement.lang = settings.general.language || "en";
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, [settings, resolvedTheme]);

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((remote) => {
        if (cancelled) return;
        if (remote && Object.keys(remote).length > 0) {
          setSettings((previous) => deepMerge(previous, remote));
        }
      })
      .catch(() => {
        /* local-first: keep the stored settings when the API is unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((updater: (previous: Settings) => Settings) => {
    setSettings((previous) => updater(previous));
    setSaveError(null);
  }, []);

  const save = useCallback(
    async (next?: Settings) => {
      const value = next ?? settings;
      setSaving(true);
      setSaveError(null);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* ignore storage errors */
      }
      try {
        await api.saveSettings(value as unknown as Record<string, unknown>);
        setLastSavedAt(new Date().toISOString());
        setSaving(false);
        return true;
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not save settings");
        setSaving(false);
        return false;
      }
    },
    [settings]
  );

  const reset = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await save(DEFAULT_SETTINGS);
  }, [save]);

  const value = useMemo(
    () => ({
      settings,
      resolvedTheme,
      saving,
      saveError,
      lastSavedAt,
      updateSettings,
      save,
      reset,
    }),
    [settings, resolvedTheme, saving, saveError, lastSavedAt, updateSettings, save, reset]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}