import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 rounded-2xl accent-gradient opacity-20 blur-lg" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl accent-gradient text-white">
          <Spinner className="h-5 w-5" />
        </span>
      </div>
      <p className="text-sm font-medium text-[rgb(var(--text-muted))]">{label}</p>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline shrink-0 px-3 py-1.5 text-xs">
          Try again
        </button>
      )}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  neutral: "border-[rgb(var(--border))] bg-[rgba(148,163,184,0.1)] text-[rgb(var(--text-muted))]",
  accent: "border-[rgba(var(--accent),0.22)] bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))]",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  purple: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof badgeStyles;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const variant =
    priority === "high" ? "danger" : priority === "medium" ? "warning" : "success";
  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed"
      ? "success"
      : status === "overdue"
        ? "danger"
        : status === "pending"
          ? "info"
          : "neutral";
  return <Badge variant={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

const statGradients: Record<string, string> = {
  violet: "from-violet-500/15 via-indigo-500/10 to-cyan-500/10 border-violet-500/20",
  blue: "from-blue-500/15 via-indigo-500/10 to-cyan-500/10 border-blue-500/20",
  cyan: "from-cyan-500/15 via-sky-500/10 to-blue-500/10 border-cyan-500/20",
  emerald: "from-emerald-500/15 via-teal-500/10 to-cyan-500/10 border-emerald-500/20",
  amber: "from-amber-500/15 via-orange-500/10 to-pink-500/10 border-amber-500/20",
  rose: "from-rose-500/15 via-pink-500/10 to-orange-500/10 border-rose-500/20",
};

const statIcons: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "violet",
  trend,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  variant?: keyof typeof statGradients;
  trend?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 ${statGradients[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[rgb(var(--text-main))]">{value}</p>
          {subtitle && (
            <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{subtitle}</p>
          )}
          {trend && <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{trend}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${statIcons[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 accent-gradient p-6 text-white shadow-accent-lg sm:p-7">
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-white/75">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight text-[rgb(var(--text-main))] sm:text-lg">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))] sm:text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgba(148,163,184,0.04)] px-6 py-14 text-center">
      {icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl accent-soft accent-text">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[rgb(var(--text-main))]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-[rgb(var(--text-muted))]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)] ${className}`}>
      <div
        className="h-full rounded-full accent-gradient transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? "accent-bg" : "bg-[rgba(148,163,184,0.3)]"
      }`}
    >
      <span
        className="inline-block transform rounded-full bg-white shadow transition-transform duration-200"
        style={{
          height: 18,
          width: 18,
          transform: checked ? "translateX(22px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--text-faint))]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

export function Avatar({
  name,
  size = "md",
  accent = "violet",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  accent?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 font-bold text-white shadow-soft ${sizes[size]}`}
      title={name}
      data-accent={accent}
    >
      {initials}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => panelRef.current?.focus(), 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[92dvh] w-full ${widths[size]} overflow-y-auto rounded-t-3xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-card))] p-5 shadow-soft-lg outline-none animate-slide-up sm:rounded-3xl sm:p-6`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[rgb(var(--text-main))]">{title}</h2>
            {description && <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-1 -mt-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-[rgb(var(--text-muted))]">{message}</p>
    </Modal>
  );
}

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void } | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      counter.current += 1;
      const id = counter.current;
      setItems((previous) => [...previous, { id, message, type }]);
      window.setTimeout(() => remove(id), 3600);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
          {items.map((item) => {
            const Icon = item.type === "success" ? Check : item.type === "error" ? XCircle : Info;
            return (
              <div
                key={item.id}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-soft-lg backdrop-blur animate-slide-up ${
                  item.type === "success"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : item.type === "error"
                      ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
                      : "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 text-sm font-medium">{item.message}</p>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="rounded-md p-0.5 opacity-70 hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}