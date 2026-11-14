import { useOffline } from "@/context/OfflineContext";

/**
 * Hook for offline-aware API operations
 * Caches data locally and syncs when online
 */
export function useOfflineApi() {
  const { isOnline, getCachedData, cacheData, pendingSyncCount } = useOffline();

  const getWithCache = async <T>(
    key: string,
    fetcher: () => Promise<T>,
    _options: { forceRefresh?: boolean } = {}
  ): Promise<T> => {
    // Try cache first if offline
    if (!isOnline) {
      const cached = getCachedData(key);
      if (cached) {
        return cached as T;
      }
      throw new Error("Offline - no cached data available");
    }

    // If online, try to fetch fresh data
    try {
      const fresh = await fetcher();
      cacheData(key, fresh);
      return fresh;
    } catch (error) {
      // Fallback to cache if fetch fails
      const cached = getCachedData(key);
      if (cached) {
        return cached as T;
      }
      throw error;
    }
  };

  const postWithSync = async <T>(
    url: string,
    body: unknown,
    options: { method?: string; headers?: Record<string, string> } = {}
  ): Promise<T> => {
    if (!isOnline) {
      // Queue for sync when back online
      queueForSync(url, body, options.method || "POST", options.headers);
      throw new Error("Offline - changes queued for sync");
    }

    const response = await fetch(url, {
      method: options.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const queueForSync = (
    url: string,
    body: unknown,
    method: string = "POST",
    headers: Record<string, string> = {}
  ) => {
    try {
      const raw = localStorage.getItem("studysphere-pending-sync-v1");
      const pending = raw ? JSON.parse(raw) : [];
      pending.push({
        id: Date.now() + Math.random(),
        url,
        body,
        method,
        headers,
        timestamp: Date.now(),
      });
      localStorage.setItem("studysphere-pending-sync-v1", JSON.stringify(pending));
    } catch (error) {
      console.error("Failed to queue sync:", error);
    }
  };

  return {
    isOnline,
    pendingSyncCount,
    getWithCache,
    postWithSync,
    queueForSync,
  };
}

export default useOfflineApi;