import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type ConversationSummary } from "@/services/api";

type ChatsContextValue = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeLocal: (id: number) => void;
};

const ChatsContext = createContext<ChatsContextValue | undefined>(undefined);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getConversations("all");
      setConversations(data);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("studysphere:conversations-updated", handler);
    return () => window.removeEventListener("studysphere:conversations-updated", handler);
  }, [refresh]);

  const removeLocal = useCallback((id: number) => {
    setConversations((previous) => previous.filter((conversation) => conversation.id !== id));
  }, []);

  const value = useMemo(
    () => ({ conversations, loading, error, refresh, removeLocal }),
    [conversations, loading, error, refresh, removeLocal]
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChats() {
  const context = useContext(ChatsContext);
  if (!context) throw new Error("useChats must be used within ChatsProvider");
  return context;
}

export function notifyConversationsUpdated() {
  window.dispatchEvent(new Event("studysphere:conversations-updated"));
}