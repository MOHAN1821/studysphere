import { useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatCard,
  useToast,
} from "@/components/ui";
import { useLearning } from "@/hooks/useFeatures";
import type { LearningResource } from "@/services/api";

const CATEGORY_OPTIONS = [
  "python",
  "cpp",
  "java",
  "dsa",
  "dbms",
  "os",
  "networks",
  "ai",
  "math",
  "other",
];

const TYPE_OPTIONS = ["article", "course", "video", "book", "practice", "other"];

type FormState = {
  title: string;
  description: string;
  category: string;
  url: string;
  resource_type: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  category: "python",
  url: "",
  resource_type: "article",
};

export default function LearningHub() {
  const { resources, loading, error, create, update, remove, toggleProgress, refresh } = useLearning();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "completed" | "open">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningResource | null>(null);
  const [deleting, setDeleting] = useState<LearningResource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const categories = useMemo(
    () => Array.from(new Set(resources.map((resource) => resource.category))),
    [resources]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources
      .filter((resource) => (category === "all" ? true : resource.category === category))
      .filter((resource) =>
        status === "all" ? true : status === "completed" ? resource.completed : !resource.completed
      )
      .filter(
        (resource) =>
          !needle ||
          resource.title.toLowerCase().includes(needle) ||
          (resource.description || "").toLowerCase().includes(needle)
      );
  }, [resources, category, status, query]);

  const completed = resources.filter((resource) => resource.completed).length;
  const bookmarked = resources.filter((resource) => resource.bookmarked).length;
  const progress = resources.length ? Math.round((completed / resources.length) * 100) : 0;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (resource: LearningResource) => {
    setEditing(resource);
    setForm({
      title: resource.title,
      description: resource.description || "",
      category: resource.category,
      url: resource.url || "",
      resource_type: resource.resource_type || "article",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast("A resource title is required", "error");
      return;
    }
    try {
      if (editing) {
        await update(editing.id, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          url: form.url.trim() || null,
          resource_type: form.resource_type,
        });
        toast("Resource updated");
      } else {
        await create({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          url: form.url.trim() || null,
          resource_type: form.resource_type,
          completed: false,
          bookmarked: false,
        });
        toast("Resource added");
      }
      setModalOpen(false);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save resource", "error");
    }
  };

  const complete = async (resource: LearningResource) => {
    try {
      await toggleProgress(resource.id, !resource.completed);
      toast(resource.completed ? "Marked as in progress" : "Resource completed");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update progress", "error");
    }
  };

  const bookmark = async (resource: LearningResource) => {
    try {
      await update(resource.id, { bookmarked: !resource.bookmarked });
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update bookmark", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast("Resource removed");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete resource", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="Learning Hub"
        description="Organize courses, articles, and practice resources across every subject."
        icon={<GraduationCap className="h-6 w-6" />}
        actions={
          <button type="button" onClick={openCreate} className="btn bg-white text-slate-900 hover:bg-white/90">
            <Plus className="h-4 w-4" /> Add resource
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Resources" value={resources.length} subtitle="In your library" icon={<BookOpen className="h-5 w-5" />} variant="violet" />
        <StatCard title="Completed" value={completed} subtitle={`${progress}% complete`} icon={<BookmarkCheck className="h-5 w-5" />} variant="emerald" />
        <StatCard title="Bookmarked" value={bookmarked} subtitle="Saved for later" icon={<Bookmark className="h-5 w-5" />} variant="amber" />
        <StatCard title="Subjects" value={categories.length} subtitle="Learning areas" icon={<GraduationCap className="h-5 w-5" />} variant="cyan" />
      </div>

      <div className="surface p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-[rgb(var(--text-main))]">Overall progress</span>
          <span className="text-[rgb(var(--text-muted))]">{completed}/{resources.length} completed</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              category === "all" ? "accent-bg text-white" : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.1)]"
            }`}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                category === item ? "accent-bg text-white" : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.1)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="select py-2 text-xs sm:w-32"
            aria-label="Filter by status"
          >
            <option value="all">All status</option>
            <option value="open">In progress</option>
            <option value="completed">Completed</option>
          </select>
          <SearchInput value={query} onChange={setQuery} placeholder="Search resources" className="sm:w-56" />
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading learning resources..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No resources found"
          description="Add a course, article, video, or practice set to start tracking your learning."
          action={
            <button type="button" onClick={openCreate} className="btn-accent">
              <Plus className="h-4 w-4" /> Add resource
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((resource) => (
            <div key={resource.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => void complete(resource)}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                  resource.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-[rgb(var(--border-strong))] text-transparent hover:border-emerald-500"
                }`}
                aria-label={resource.completed ? "Mark as in progress" : "Mark as completed"}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => openEdit(resource)} className="truncate text-left text-sm font-semibold text-[rgb(var(--text-main))] hover:opacity-80">
                    {resource.title}
                  </button>
                  <Badge variant="accent">{resource.category}</Badge>
                  <Badge variant="neutral">{resource.resource_type}</Badge>
                  {resource.completed && <Badge variant="success">Completed</Badge>}
                </div>
                {resource.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[rgb(var(--text-muted))]">{resource.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold accent-text hover:underline"
                    >
                      Open resource <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <span className="text-[10px] text-[rgb(var(--text-faint))]">
                    Added {new Date(resource.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void bookmark(resource)}
                  className={`icon-btn h-8 w-8 ${resource.bookmarked ? "accent-text" : ""}`}
                  title={resource.bookmarked ? "Remove bookmark" : "Bookmark resource"}
                  aria-label="Toggle bookmark"
                >
                  {resource.bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => openEdit(resource)} className="icon-btn h-8 w-8" aria-label="Edit resource">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(resource)}
                  className="icon-btn h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                  aria-label="Delete resource"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit learning resource" : "Add learning resource"}
        description="Track a course, article, video, or practice set."
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-accent" onClick={() => void submit()}>
              {editing ? "Save changes" : "Add resource"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="resource-title">Title</label>
            <input
              id="resource-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input"
              placeholder="e.g. Data Structures and Algorithms"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="resource-description">Description</label>
            <textarea
              id="resource-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="textarea"
              rows={2}
              placeholder="What will you learn from this resource?"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="resource-category">Subject</label>
              <select
                id="resource-category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                className="select"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="resource-type">Type</label>
              <select
                id="resource-type"
                value={form.resource_type}
                onChange={(event) => setForm({ ...form, resource_type: event.target.value })}
                className="select"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="resource-url">URL</label>
            <input
              id="resource-url"
              type="url"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              className="input"
              placeholder="https://..."
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete resource?"
        message={`"${deleting?.title || "This resource"}" will be removed from your library.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}