import { useEffect, useState } from "react";
import { useOffline } from "@/context/OfflineContext";
import { WifiOff, Wifi, RefreshCw, CloudOff } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pendingSyncCount, syncPending } = useOffline();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show banner when status changes
    if (!isOnline && !dismissed) {
      setShowBanner(true);
    } else if (isOnline && showBanner) {
      // Keep visible briefly to show reconnection
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, dismissed, showBanner]);

  // Reset dismissed state when coming back online
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOnline ? "bg-emerald-500" : "bg-amber-500"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-white" />
          ) : (
            <WifiOff className="h-4 w-4 text-white" />
          )}
          <span className="text-xs font-medium text-white sm:text-sm">
            {isOnline ? (
              <>
                Back online
                {pendingSyncCount > 0 && (
                  <span className="ml-1">
                    · {pendingSyncCount} pending sync
                  </span>
                )}
              </>
            ) : (
              "You're offline"
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingSyncCount > 0 && (
            <button
              onClick={() => syncPending()}
              className="flex items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/30"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Sync now</span>
            </button>
          )}
          <button
            onClick={() => {
              setShowBanner(false);
              setDismissed(true);
            }}
            className="rounded-md p-1 text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Offline indicator for specific components
export function OfflineIndicator({ className = "" }: { className?: string }) {
  const { isOnline } = useOffline();

  if (isOnline) return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-amber-600 dark:text-amber-400 ${className}`}
      title="Offline mode - changes will sync when you reconnect"
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">Offline</span>
    </div>
  );
}

// Hook for offline-aware data fetching
export function useOfflineAwareFetch<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  options: { enabled?: boolean } = {}
) {
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      // Try cached data first
      const cached = getCachedData(cacheKey);
      if (cached) {
        setData(cached as T);
        setLoading(false);
      }

      // If online, fetch fresh data
      if (isOnline || options.enabled !== false) {
        try {
          const fresh = await fetcher();
          if (!cancelled) {
            setData(fresh);
            cacheData(cacheKey, fresh);
          }
        } catch (err) {
          if (!cancelled && !cached) {
            setError(err instanceof Error ? err.message : "Failed to load data");
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [fetcher, cacheKey, isOnline, getCachedData, cacheData, options.enabled]);

  return { data, loading, error, isOnline };
}