import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type OnlineStatus = "online" | "offline" | "checking";

type OfflineContextValue = {
  isOnline: boolean;
  status: OnlineStatus;
  pendingSyncCount: number;
  setOnline: (online: boolean) => void;
  syncPending: () => Promise<void>;
  cacheData: (key: string, data: unknown) => void;
  getCachedData: (key: string) => unknown | null;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

const STORAGE_KEY = "studysphere-offline-cache-v1";
const PENDING_KEY = "studysphere-pending-sync-v1";

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OnlineStatus>("checking");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const isOnline = status === "online";

  // Load cached data
  const getCachedData = useCallback((key: string): unknown | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      return cache[key] || null;
    } catch {
      return null;
    }
  }, []);

  const cacheData = useCallback((key: string, data: unknown) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      cache[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Failed to cache data:", error);
    }
  }, []);

  // Load pending sync count
  const loadPendingCount = useCallback(() => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      const pending = raw ? JSON.parse(raw) : [];
      setPendingSyncCount(pending.length);
      return pending.length;
    } catch {
      setPendingSyncCount(0);
      return 0;
    }
  }, []);

  const setOnline = useCallback((online: boolean) => {
    setStatus(online ? "online" : "offline");
    if (online) {
      // Trigger sync when coming back online
      syncPending();
    }
  }, []);

  const syncPending = useCallback(async () => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      const pending = raw ? JSON.parse(raw) : [];
      
      if (pending.length === 0) {
        setPendingSyncCount(0);
        return;
      }

      // In a real app, this would send mutations to the server
      // For now, just clear the pending queue
      localStorage.removeItem(PENDING_KEY);
      setPendingSyncCount(0);
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setOnline(online);
    };

    // Initial check
    updateOnlineStatus();
    loadPendingCount();

    // Listen for events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Service worker message handler
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_COMPLETE") {
          loadPendingCount();
        }
      });
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [setOnline, loadPendingCount, syncPending]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      status,
      pendingSyncCount,
      setOnline,
      syncPending,
      cacheData,
      getCachedData,
    }),
    [isOnline, status, pendingSyncCount, setOnline, syncPending, cacheData, getCachedData]
  );

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}

// Export for use in other modules
export { STORAGE_KEY, PENDING_KEY };