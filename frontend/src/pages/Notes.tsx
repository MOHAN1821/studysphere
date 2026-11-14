import { useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Pencil,
  Pin,
  PinOff,
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
  SearchInput,
  useToast,
} from "@/components/ui";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { useNotes } from "@/hooks/useFeatures";
import type { Note } from "@/services/api";

type FormState = {
  title: string;
  subject: string;
  content: string;
  pinned: boolean;
};

const EMPTY_FORM: FormState = { title: "", subject: "", content: "", pinned: false };

export default function NotesPage() {
  const { notes, loading, error, create, update, remove, refresh } = useNotes();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [preview, setPreview] = useState(false);

  const subjects = useMemo(
    () => Array.from(new Set(notes.map((note) => note.subject).filter(Boolean))) as string[],
    [notes]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes
      .filter((note) => (subjectFilter === "all" ? true : note.subject === subjectFilter))
      .filter(
        (note) =>
          !needle ||
          note.title.toLowerCase().includes(needle) ||
          note.content.toLowerCase().includes(needle) ||
          (note.subject || "").toLowerCase().includes(needle)
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
  }, [notes, query, subjectFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview(false);
    setModalOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setForm({
      title: note.title,
      subject: note.subject || "",
      content: note.content || "",
      pinned: Boolean(note.pinned),
    });
    setPreview(false);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast("A note title is required", "error");
      return;
    }
    try {
      if (editing) {
        await update(editing.id, {
          title: form.title.trim(),
          subject: form.subject.trim() || null,
          content: form.content,
          pinned: form.pinned,
        });
        toast("Note updated");
      } else {
        await create({
          title: form.title.trim(),
          subject: form.subject.trim() || null,
          content: form.content,
          pinned: form.pinned,
        });
        toast("Note created");
      }
      setModalOpen(false);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save note", "error");
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await update(note.id, { pinned: !note.pinned });
      toast(note.pinned ? "Note unpinned" : "Note pinned");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update note", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast("Note deleted");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete note", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PageContainer className="space-y-5 pb-10">
      <PageHeader
        title="Notes & Documents"
        description="Capture lecture notes, summaries, and ideas with Markdown support."
        icon={<FileText className="h-6 w-6" />}
        actions={
          <button type="button" onClick={openCreate} className="btn bg-white text-slate-900 hover:bg-white/90">
            <Plus className="h-4 w-4" /> New note
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      <div className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSubjectFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              subjectFilter === "all" ? "accent-bg text-white" : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.1)]"
            }`}
          >
            All notes
            <span className="ml-1.5 opacity-70">{notes.length}</span>
          </button>
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSubjectFilter(subject)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subjectFilter === subject
                  ? "accent-bg text-white"
                  : "text-[rgb(var(--text-muted))] hover:bg-[rgba(148,163,184,0.1)]"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search notes" className="sm:w-64" />
      </div>

      {loading ? (
        <LoadingBlock label="Loading notes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={query || subjectFilter !== "all" ? "No matching notes" : "No notes yet"}
          description={
            query || subjectFilter !== "all"
              ? "Try another search or subject filter."
              : "Create a note to capture lecture material, summaries, and study ideas."
          }
          action={
            <button type="button" onClick={openCreate} className="btn-accent">
              <Plus className="h-4 w-4" /> Create a note
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <div key={note.id} className="surface surface-hover group flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <button type="button" onClick={() => openEdit(note)} className="min-w-0 flex-1 text-left">
                  <h3 className="truncate text-sm font-bold text-[rgb(var(--text-main))]">{note.title}</h3>
                  <p className="mt-0.5 text-[10px] text-[rgb(var(--text-faint))]">
                    Updated {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => void togglePin(note)}
                    className={`icon-btn h-7 w-7 ${note.pinned ? "accent-text" : ""}`}
                    title={note.pinned ? "Unpin note" : "Pin note"}
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                  >
                    {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(note)}
                    className="icon-btn h-7 w-7 hover:bg-red-500/10 hover:text-red-500"
                    title="Delete note"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {note.subject && (
                <div className="mb-2 flex items-center gap-1.5">
                  <Badge variant="accent">{note.subject}</Badge>
                  {note.pinned && <Badge variant="warning">Pinned</Badge>}
                </div>
              )}

              <button type="button" onClick={() => openEdit(note)} className="flex-1 text-left">
                <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-[rgb(var(--text-muted))]">
                  {note.content || "This note is empty. Click to start writing."}
                </p>
              </button>

              <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--border))] pt-2.5">
                <span className="text-[10px] text-[rgb(var(--text-faint))]">{note.content.length} characters</span>
                <button
                  type="button"
                  onClick={() => openEdit(note)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold accent-text hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit note" : "New note"}
        description="Write in Markdown. Use headings, lists, and code blocks."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-accent" onClick={() => void submit()}>
              {editing ? "Save changes" : "Create note"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <label className="label" htmlFor="note-title">Title</label>
              <input
                id="note-title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="input"
                placeholder="e.g. Operating Systems - Chapter 5"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="note-subject">Subject</label>
              <input
                id="note-subject"
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                className="input"
                placeholder="e.g. Computer Science"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
                className="h-4 w-4 rounded accent-[rgb(var(--accent))]"
              />
              Pin this note
            </label>
            <button
              type="button"
              onClick={() => setPreview((previous) => !previous)}
              className="btn-ghost px-2.5 py-1.5 text-xs"
            >
              <Eye className="h-3.5 w-3.5" /> {preview ? "Write" : "Preview"}
            </button>
          </div>

          {preview ? (
            <div className="min-h-[220px] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-subtle))] p-4">
              {form.content.trim() ? (
                <MarkdownRenderer content={form.content} />
              ) : (
                <p className="text-xs text-[rgb(var(--text-faint))]">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              className="textarea min-h-[220px] font-mono text-xs"
              placeholder={"# Lecture notes\n\n- Key idea one\n- Key idea two\n\n```python\nprint('hello')\n```"}
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete note?"
        message={`"${deleting?.title || "This note"}" will be permanently deleted.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}