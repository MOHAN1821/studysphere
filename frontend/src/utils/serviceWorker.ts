// Service Worker registration and communication
// Handles PWA installation and offline sync

type MessageData = {
  type: string;
  [key: string]: unknown;
};

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: ((data: MessageData) => void)[] = [];

  async register(): Promise<boolean> {
    if (!("serviceWorker" in navigator)) {
      console.log("[SW] Service Worker not supported");
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });
      console.log("[SW] Registered successfully");

      // Listen for updates
      this.registration.addEventListener("updatefound", () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              this.notifyClients({ type: "UPDATE_AVAILABLE" });
            }
          });
        }
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        this.listeners.forEach((listener) => listener(event.data));
      });

      return true;
    } catch (error) {
      console.error("[SW] Registration failed:", error);
      return false;
    }
  }

  addListener(listener: (data: MessageData) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (data: MessageData) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notifyClients(data: MessageData): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(data);
    }
  }

  async skipWaiting(): Promise<void> {
    this.notifyClients({ type: "SKIP_WAITING" });
  }

  async requestBackgroundSync(): Promise<void> {
    if ("serviceWorker" in navigator && this.registration) {
      try {
        await (this.registration as any).sync?.register("background-sync-studysphere");
      } catch (error) {
        console.error("Background sync registration failed:", error);
      }
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if (this.registration) {
      try {
        await this.registration.update();
        return true;
      } catch (error) {
        console.error("Update check failed:", error);
        return false;
      }
    }
    return false;
  }
}

// Singleton instance
const swManager = new ServiceWorkerManager();

export function registerServiceWorker(): Promise<boolean> {
  // Wait for page load
  if (document.readyState === "complete") {
    return swManager.register();
  } else {
    return new Promise((resolve) => {
      window.addEventListener("load", () => {
        swManager.register().then(resolve);
      });
    });
  }
}

export function useServiceWorker() {
  return {
    register: () => swManager.register(),
    requestBackgroundSync: () => swManager.requestBackgroundSync(),
    checkForUpdates: () => swManager.checkForUpdates(),
    addListener: (listener: (data: MessageData) => void) => swManager.addListener(listener),
    removeListener: (listener: (data: MessageData) => void) => swManager.removeListener(listener),
  };
}

export default swManager;