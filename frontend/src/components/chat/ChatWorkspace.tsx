import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  Check,
  Copy,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api, type AIStatus, type Attachment, type ChatMessage } from "@/services/api";
import { useSettings } from "@/context/SettingsContext";
import { notifyConversationsUpdated } from "@/context/ChatsContext";
import { useToast } from "@/components/ui";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

type Suggestion = { title: string; prompt: string; emoji: string };

type ChatWorkspaceProps = {
  mode: "chat" | "study";
  title: string;
  subtitle: string;
  icon: ReactNode;
  suggestions: Suggestion[];
  emptyTitle: string;
  emptyDescription: string;
};

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|tsv|json|js|jsx|ts|tsx|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|html|css|scss|sql|yml|yaml|xml|ini|env|log)$/i;

async function fileToAttachment(file: File): Promise<Attachment> {
  const isText =
    file.type.startsWith("text/") ||
    TEXT_EXTENSIONS.test(file.name) ||
    file.type === "application/json";
  let content = "";
  if (isText) {
    const text = await file.text();
    content = text.slice(0, 24000);
  } else {
    content = `[${file.type || "document"} attached: ${file.name}. Binary text extraction is not available for this file type.]`;
  }
  return {
    name: file.name,
    size: file.size,
    type: file.type || "file",
    content,
  };
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-blink" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-blink-delay-1" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-blink-delay-2" />
    </span>
  );
}

export function ChatWorkspace({
  mode,
  title,
  subtitle,
  icon,
  suggestions,
  emptyTitle,
  emptyDescription,
}: ChatWorkspaceProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [conversationTitle, setConversationTitle] = useState(title);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    api
      .getAIStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const loadConversation = useCallback(
    async (id: number) => {
      setLoadingConversation(true);
      setError(null);
      try {
        const result = await api.getConversation(id);
        setActiveId(id);
        setMessages(result.messages);
        setConversationTitle(result.conversation.title);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load conversation");
      } finally {
        setLoadingConversation(false);
      }
    },
    []
  );

  useEffect(() => {
    const raw = searchParams.get("c");
    const id = raw ? Number(raw) : null;
    if (id && Number.isFinite(id)) {
      if (id !== activeId && !loadingConversation) {
        void loadConversation(id);
      }
    } else if (!id && activeId !== null) {
      setActiveId(null);
      setMessages([]);
      setConversationTitle(title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }, [input]);

  useEffect(() => {
    if (!settings.appearance.animations) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, sending, settings.appearance.animations]);

  const buildSystemPrompt = useCallback(() => {
    const parts: string[] = [];
    if (settings.ai.customInstructions.trim()) {
      parts.push(settings.ai.customInstructions.trim());
    }
    if (settings.ai.responseStyle === "concise") {
      parts.push("Prefer concise answers. Use short paragraphs and only essential detail.");
    } else if (settings.ai.responseStyle === "detailed") {
      parts.push("Provide thorough explanations with examples, edge cases, and study tips.");
    } else {
      parts.push("Balance clarity and completeness. Use headings and lists when helpful.");
    }
    return parts.join("\n\n") || undefined;
  }, [settings.ai]);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setConversationTitle(title);
    setInput("");
    setAttachments([]);
    setError(null);
    setSearchParams({}, { replace: true });
    window.setTimeout(() => textareaRef.current?.focus(), 30);
  }, [setSearchParams, title]);

  const send = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if ((!text && attachments.length === 0) || sending) return;

      const outgoingAttachments = attachments;
      const tempId = -Date.now();
      const optimistic: ChatMessage = {
        id: tempId,
        role: "user",
        content: text || "Please review the attached document.",
        attachments: outgoingAttachments,
        created_at: new Date().toISOString(),
      };

      setMessages((previous) => [...previous, optimistic]);
      setInput("");
      setAttachments([]);
      setSending(true);
      setError(null);

      try {
        const response = await api.sendChat({
          message: text,
          conversation_id: activeId,
          mode,
          attachments: outgoingAttachments,
          temperature: settings.ai.temperature,
          system_prompt: buildSystemPrompt(),
          save_history: settings.privacy.saveHistory,
        });

        if (response.conversation_id && response.messages.length > 0) {
          setMessages(response.messages);
        } else {
          setMessages((previous) => [
            ...previous.filter((message) => message.id !== tempId),
            optimistic,
            {
              id: Date.now(),
              role: "assistant",
              content: response.response,
              attachments: [],
              created_at: new Date().toISOString(),
            },
          ]);
        }

        if (response.conversation_id) {
          setActiveId(response.conversation_id);
          setConversationTitle(response.title || title);
          setSearchParams({ c: String(response.conversation_id) }, { replace: true });
          notifyConversationsUpdated();
        } else {
          setConversationTitle(response.title || title);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "The AI request failed";
        setError(message);
        setMessages((previous) => previous.filter((item) => item.id !== tempId));
        setInput(text);
        setAttachments(outgoingAttachments);
      } finally {
        setSending(false);
        window.setTimeout(() => textareaRef.current?.focus(), 30);
      }
    },
    [
      activeId,
      attachments,
      buildSystemPrompt,
      input,
      mode,
      sending,
      setSearchParams,
      settings.ai.temperature,
      settings.privacy.saveHistory,
      title,
    ]
  );

  const regenerate = useCallback(async () => {
    if (!activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await api.regenerate(activeId, {
        temperature: settings.ai.temperature,
        system_prompt: buildSystemPrompt(),
      });
      setMessages(response.messages);
      notifyConversationsUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not regenerate the response");
    } finally {
      setSending(false);
    }
  }, [activeId, buildSystemPrompt, sending, settings.ai.temperature]);

  const removeConversation = useCallback(async () => {
    if (!activeId) return;
    try {
      await api.deleteConversation(activeId);
      notifyConversationsUpdated();
      startNewChat();
      toast("Conversation deleted");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete conversation", "error");
    }
  }, [activeId, startNewChat, toast]);

  const copyMessage = useCallback(
    async (message: ChatMessage) => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopiedId(message.id);
        window.setTimeout(() => setCopiedId(null), 1600);
      } catch {
        toast("Clipboard is not available", "error");
      }
    },
    [toast]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const incoming = Array.from(files);
      if (attachments.length + incoming.length > 5) {
        toast("You can attach up to 5 files per message", "error");
      }
      const oversized = incoming.find((file) => file.size > 2 * 1024 * 1024);
      if (oversized) {
        toast(`${oversized.name} is larger than 2 MB`, "error");
        return;
      }
      try {
        const parsed = await Promise.all(incoming.map(fileToAttachment));
        setAttachments((previous) => [...previous, ...parsed].slice(0, 5));
      } catch {
        toast("Could not read one of the selected files", "error");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [attachments.length, toast]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && settings.chat.sendOnEnter) {
      event.preventDefault();
      void send();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  };

  const providerLabel = useMemo(() => {
    if (!status) return "Checking AI...";
    if (!status.configured) return "AI not configured";
    return `${status.provider} · ${status.model}`;
  }, [status]);

  const showWelcome = messages.length === 0 && !sending && !loadingConversation && !error;
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col overflow-hidden md:h-dvh">
      <header className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-card))]/70 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl accent-gradient text-white shadow-accent">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-[rgb(var(--text-main))] sm:text-base">
              {conversationTitle}
            </h1>
            <p className="hidden truncate text-[11px] text-[rgb(var(--text-muted))] sm:block">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
              status?.configured
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
            title={status?.configured ? "Connected AI provider" : "Configure AI_PROVIDER and AI_API_KEY in backend/.env"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status?.configured ? "bg-emerald-500" : "bg-amber-500"}`} />
            {providerLabel}
          </span>
          {activeId && (
            <button
              type="button"
              onClick={removeConversation}
              className="icon-btn"
              title="Delete conversation"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={startNewChat} className="btn-soft px-3 py-2 text-xs">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </div>
      </header>

      {!status?.configured && status && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-[11px] font-medium text-amber-800 dark:text-amber-200 sm:text-xs">
          AI provider is not configured. Add <code className="font-mono">AI_PROVIDER</code> and{" "}
          <code className="font-mono">AI_API_KEY</code> to <code className="font-mono">backend/.env</code> and restart
          the server. The UI is fully functional but will not return placeholder answers.{" "}
          <Link to="/settings" className="underline">
            Open AI settings
          </Link>
          .
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-5 sm:px-6">
          {loadingConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[rgb(var(--text-muted))]">
              <Loader2 className="h-6 w-6 animate-spin accent-text" />
              <p className="text-sm">Loading conversation...</p>
            </div>
          ) : showWelcome ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-3xl accent-gradient opacity-30 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl accent-gradient text-white shadow-accent-lg">
                  {icon}
                </div>
              </div>
              <h2 className="text-balance text-2xl font-bold tracking-tight text-[rgb(var(--text-main))] sm:text-3xl">
                {emptyTitle}
              </h2>
              <p className="mt-2 max-w-lg text-balance text-sm leading-relaxed text-[rgb(var(--text-muted))]">
                {emptyDescription}
              </p>
              <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => void send(suggestion.prompt)}
                    className="group flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))] p-3.5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-[rgba(var(--accent),0.35)] hover:shadow-accent"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl accent-soft text-base">
                      {suggestion.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[rgb(var(--text-main))]">
                        {suggestion.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-muted))]">
                        {suggestion.prompt}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-5 pb-2">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : ""} animate-fade-in`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isUser
                          ? "bg-[rgba(148,163,184,0.16)] text-[rgb(var(--text-muted))]"
                          : "accent-gradient text-white shadow-soft"
                      }`}
                    >
                      {isUser ? "You" : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`min-w-0 max-w-[88%] sm:max-w-[82%] ${isUser ? "items-end" : ""}`}>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 shadow-soft sm:px-4 ${
                          isUser
                            ? "rounded-tr-md accent-gradient text-white"
                            : "rounded-tl-md border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))] text-[rgb(var(--text-main))]"
                        }`}
                      >
                        {message.attachments.length > 0 && (
                          <div className={`mb-2 flex flex-wrap gap-1.5 ${isUser ? "justify-end" : ""}`}>
                            {message.attachments.map((attachment, index) => (
                              <span
                                key={`${attachment.name}-${index}`}
                                className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${
                                  isUser
                                    ? "bg-white/15 text-white"
                                    : "bg-[rgba(148,163,184,0.12)] text-[rgb(var(--text-muted))]"
                                }`}
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{attachment.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {isUser ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            codeWrap={settings.chat.codeWrap}
                          />
                        )}
                      </div>
                      <div
                        className={`mt-1 flex items-center gap-1 px-1 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {settings.chat.showTimestamps && (
                          <span className="text-[10px] text-[rgb(var(--text-faint))]">
                            {formatTime(message.created_at)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void copyMessage(message)}
                          className="rounded-md p-1 text-[rgb(var(--text-faint))] transition hover:bg-[rgba(148,163,184,0.12)] hover:text-[rgb(var(--text-main))]"
                          title="Copy response"
                          aria-label="Copy response"
                        >
                          {copiedId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                        {!isUser && message.id === lastAssistantId && activeId && (
                          <button
                            type="button"
                            onClick={() => void regenerate()}
                            disabled={sending}
                            className="rounded-md p-1 text-[rgb(var(--text-faint))] transition hover:bg-[rgba(148,163,184,0.12)] hover:text-[rgb(var(--text-main))] disabled:opacity-40"
                            title="Regenerate response"
                            aria-label="Regenerate response"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex gap-2.5 sm:gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl accent-gradient text-white shadow-soft">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))] px-4 py-3 text-[rgb(var(--text-muted))] shadow-soft">
                    <div className="flex items-center gap-2">
                      <TypingDots />
                      <span className="text-xs font-medium">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">The request failed</p>
                    <p className="mt-0.5 break-words text-xs leading-relaxed">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="ml-auto rounded-md p-1 hover:bg-red-500/10"
                    aria-label="Dismiss error"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-body))]/85 px-3 pb-3 pt-2.5 backdrop-blur-xl sm:px-6 sm:pb-4">
        <div className="mx-auto w-full max-w-4xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((attachment, index) => (
                <span
                  key={`${attachment.name}-${index}`}
                  className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))] px-2 py-1 text-[11px] text-[rgb(var(--text-muted))]"
                >
                  <FileText className="h-3 w-3 shrink-0 accent-text" />
                  <span className="truncate">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((previous) => previous.filter((_, i) => i !== index))}
                    className="rounded p-0.5 hover:bg-[rgba(148,163,184,0.15)]"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="rounded-[22px] border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))] p-2 shadow-soft transition focus-within:border-[rgba(var(--accent),0.55)] focus-within:shadow-accent">
            <div className="flex items-end gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[rgb(var(--text-muted))] transition hover:bg-[rgba(148,163,184,0.12)] hover:text-[rgb(var(--text-main))]"
                title="Attach files"
                aria-label="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                ref={textareaRef}
                id="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={mode === "study" ? "Ask an academic question..." : "Message StudySphere..."}
                className="max-h-[220px] min-h-[38px] flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-relaxed text-[rgb(var(--text-main))] outline-none placeholder:text-[rgb(var(--text-faint))]"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || (!input.trim() && attachments.length === 0)}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl accent-gradient text-white shadow-soft transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send message"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 px-1">
            <p className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--text-faint))]">
              <Sparkles className="h-3 w-3" />
              {settings.privacy.saveHistory ? "Chats are saved to this workspace." : "History saving is off."}
            </p>
            <p className="hidden text-[10px] text-[rgb(var(--text-faint))] sm:block">
              {settings.chat.sendOnEnter ? "Enter to send · Shift+Enter for a new line" : "Ctrl+Enter to send"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}