import json
from app.database import get_db
from app import schemas
from datetime import date, datetime, timedelta
from typing import Optional


def _row_to_task(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "deadline": row["deadline"],
        "priority": row["priority"],
        "status": row["status"],
        "created_at": row["created_at"],
        "completed_at": row["completed_at"],
    }


def _compute_overdue(task: dict, today: date) -> str:
    status = task["status"]
    if status == "completed":
        return "completed"
    deadline = task["deadline"]
    if deadline:
        try:
            d = date.fromisoformat(deadline)
            if d < today:
                return "overdue"
        except ValueError:
            pass
    return status


# ---------------- Tasks ----------------

def list_tasks(filter_status: Optional[str] = None):
    with get_db() as conn:
        today = date.today().isoformat()
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC"
        ).fetchall()
        tasks = [_row_to_task(dict(r)) for r in rows]
        for t in tasks:
            t["status"] = _compute_overdue(t, date.today())
            conn.execute(
                "UPDATE tasks SET status = ? WHERE id = ?", (t["status"], t["id"])
            )
        conn.commit()
        if filter_status:
            tasks = [t for t in tasks if t["status"] == filter_status]
        return tasks


def create_task(task: schemas.TaskCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (title, description, deadline, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (task.title, task.description, task.deadline, task.priority, task.status, now),
        )
        conn.commit()
        task_id = cur.lastrowid
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return _row_to_task(dict(row))


def get_task(task_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return None
        return _row_to_task(dict(row))


def update_task(task_id: int, task: schemas.TaskUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return None
        data = task.dict(exclude_unset=True)
        if "status" in data and data["status"] == "completed":
            data["completed_at"] = datetime.utcnow().isoformat()
        elif "status" in data and data["status"] != "completed":
            data["completed_at"] = None
        set_clause = ", ".join(f"{k} = ?" for k in data.keys())
        values = list(data.values()) + [task_id]
        conn.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)
        conn.commit()
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return _row_to_task(dict(row))


def delete_task(task_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        return cur.rowcount > 0


def task_stats():
    with get_db() as conn:
        today = date.today().isoformat()
        rows = conn.execute("SELECT * FROM tasks").fetchall()
        tasks = [_row_to_task(dict(r)) for r in rows]
        total = len(tasks)
        completed = pending = overdue = 0
        for t in tasks:
            s = _compute_overdue(t, date.today())
            if s == "completed":
                completed += 1
            elif s == "overdue":
                overdue += 1
            else:
                pending += 1
        rate = round((completed / total) * 100, 1) if total else 0.0
        return {
            "total_tasks": total,
            "completed_tasks": completed,
            "pending_tasks": pending,
            "overdue_tasks": overdue,
            "completion_rate": rate,
        }


def weekly_productivity():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT created_at, status FROM tasks ORDER BY created_at"
        ).fetchall()
    from collections import defaultdict
    from datetime import timedelta

    today = date.today()
    start = today - timedelta(days=6)
    daily = defaultdict(lambda: {"completed": 0, "pending": 0})
    for r in rows:
        try:
            d = date.fromisoformat(r["created_at"][:10])
        except ValueError:
            continue
        if start <= d <= today:
            key = d.isoformat()
            if r["status"] == "completed":
                daily[key]["completed"] += 1
            else:
                daily[key]["pending"] += 1
    result = []
    for i in range(7):
        d = start + timedelta(days=i)
        key = d.isoformat()
        result.append(
            {
                "day": d.strftime("%a"),
                "date": key,
                "completed": daily[key]["completed"],
                "pending": daily[key]["pending"],
            }
        )
    return result


# ---------------- Notes ----------------

def list_notes():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_note(note_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        return dict(row) if row else None


def create_note(note: schemas.NoteCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO notes (title, content, subject, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (note.title, note.content or "", note.subject, 1 if note.pinned else 0, now, now),
        )
        conn.commit()
        note_id = cur.lastrowid
        return get_note(note_id)


def update_note(note_id: int, note: schemas.NoteUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        if not row:
            return None
        data = note.dict(exclude_unset=True)
        data["updated_at"] = datetime.utcnow().isoformat()
        if "pinned" in data and isinstance(data["pinned"], bool):
            data["pinned"] = 1 if data["pinned"] else 0
        set_clause = ", ".join(f"{k} = ?" for k in data.keys())
        values = list(data.values()) + [note_id]
        conn.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", values)
        conn.commit()
        return get_note(note_id)


def delete_note(note_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        return cur.rowcount > 0


# ---------------- Learning Resources ----------------

def list_learning_resources():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM learning_resources ORDER BY category, title"
        ).fetchall()
        return [dict(r) for r in rows]


def get_learning_resource(resource_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM learning_resources WHERE id = ?", (resource_id,)
        ).fetchone()
        return dict(row) if row else None


def create_learning_resource(resource: schemas.LearningResourceCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO learning_resources (title, description, category, url, resource_type, completed, bookmarked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (resource.title, resource.description, resource.category, resource.url, resource.resource_type, 1 if resource.completed else 0, 1 if resource.bookmarked else 0, now),
        )
        conn.commit()
        resource_id = cur.lastrowid
        return get_learning_resource(resource_id)


def update_learning_resource(resource_id: int, resource: schemas.LearningResourceUpdate):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM learning_resources WHERE id = ?", (resource_id,)
        ).fetchone()
        if not row:
            return None
        data = resource.dict(exclude_unset=True)
        for b in ("completed", "bookmarked"):
            if b in data and isinstance(data[b], bool):
                data[b] = 1 if data[b] else 0
        set_clause = ", ".join(f"{k} = ?" for k in data.keys())
        values = list(data.values()) + [resource_id]
        conn.execute(f"UPDATE learning_resources SET {set_clause} WHERE id = ?", values)
        conn.commit()
        return get_learning_resource(resource_id)


def delete_learning_resource(resource_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute(
            "DELETE FROM learning_resources WHERE id = ?", (resource_id,)
        )
        conn.commit()
        return cur.rowcount > 0


# ---------------- Calendar Events ----------------

def list_calendar_events():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM calendar_events ORDER BY start_date ASC"
        ).fetchall()
        return [dict(r) for r in rows]


def create_calendar_event(event: schemas.CalendarEventCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO calendar_events (title, description, start_date, end_date, category, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event.title, event.description, event.start_date, event.end_date, event.category, event.color, now),
        )
        conn.commit()
        event_id = cur.lastrowid
        row = conn.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,)).fetchone()
        return dict(row)


def delete_calendar_event(event_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
        conn.commit()
        return cur.rowcount > 0


# ---------------- Goals ----------------

def list_goals():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM goals ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def create_goal(goal: schemas.GoalCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO goals (title, description, target_date, category, status, current_value, target_value, created_at) VALUES (?, ?, ?, ?, 'active', 0, ?, ?)",
            (goal.title, goal.description, goal.target_date, goal.category, goal.target_value or 1, now),
        )
        conn.commit()
        goal_id = cur.lastrowid
        row = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return dict(row)


def update_goal(goal_id: int, goal: schemas.GoalUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        if not row:
            return None
        data = goal.dict(exclude_unset=True)
        if "status" in data and data["status"] == "completed":
            data["completed_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in data.keys())
        values = list(data.values()) + [goal_id]
        conn.execute(f"UPDATE goals SET {set_clause} WHERE id = ?", values)
        conn.commit()
        row = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return dict(row)


def delete_goal(goal_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
        conn.commit()
        return cur.rowcount > 0


# ---------------- Achievements ----------------

def list_achievements():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM achievements ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------- Notifications ----------------

def list_notifications():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM notifications ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def create_notification(notif: schemas.NotificationCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO notifications (title, message, type, read, created_at) VALUES (?, ?, ?, ?, ?)",
            (notif.title, notif.message, notif.type, 1 if notif.read else 0, now),
        )
        conn.commit()
        notif_id = cur.lastrowid
        row = conn.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,)).fetchone()
        return dict(row)


def mark_notification_read(notif_id: int, read: bool = True):
    with get_db() as conn:
        conn.execute(
            "UPDATE notifications SET read = ? WHERE id = ?", (1 if read else 0, notif_id)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,)).fetchone()
        return dict(row) if row else None


def delete_notification(notif_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
        conn.commit()
        return cur.rowcount > 0


# ---------------- AI Conversations ----------------

def save_ai_conversation(message: str, response: str, demo_mode: bool = True):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO ai_conversations (message, response, demo_mode, created_at) VALUES (?, ?, ?, ?)",
            (message, response, 1 if demo_mode else 0, now),
        )
        conn.commit()
        return cur.lastrowid


def list_ai_conversations(limit: int = 50):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def delete_ai_conversation(conversation_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute(
            "DELETE FROM ai_conversations WHERE id = ?", (conversation_id,)
        )
        conn.commit()
        return cur.rowcount > 0


# ---------------- Focus Sessions ----------------

def list_focus_sessions():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM focus_sessions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def create_focus_session(session: schemas.FocusSessionBase):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO focus_sessions (duration, completed, created_at) VALUES (?, ?, ?)",
            (session.duration, 1 if session.completed else 0, now),
        )
        conn.commit()
        session_id = cur.lastrowid
        row = conn.execute("SELECT * FROM focus_sessions WHERE id = ?", (session_id,)).fetchone()
        return dict(row)


# ---------------- Extended Analytics ----------------

def get_extended_analytics():
    with get_db() as conn:
        task_rows = conn.execute("SELECT * FROM tasks").fetchall()
        focus_rows = conn.execute("SELECT * FROM focus_sessions WHERE completed = 1").fetchall()
        note_count = conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
        resources = conn.execute("SELECT * FROM learning_resources").fetchall()
        event_count = conn.execute("SELECT COUNT(*) FROM calendar_events").fetchone()[0]
        study_rows = conn.execute("SELECT * FROM study_sessions").fetchall()

    tasks = [_row_to_task(dict(r)) for r in task_rows]
    total = len(tasks)
    completed = pending = overdue = 0
    completed_dates = []
    for t in tasks:
        status = _compute_overdue(t, date.today())
        if status == "completed":
            completed += 1
            if t.get("completed_at"):
                try:
                    completed_dates.append(date.fromisoformat(t["completed_at"][:10]))
                except ValueError:
                    pass
        elif status == "overdue":
            overdue += 1
        else:
            pending += 1
    completion_rate = round((completed / total) * 100, 1) if total else 0.0

    focus_minutes = sum(int(r["duration"]) for r in focus_rows)
    study_hours = round(focus_minutes / 60, 1)
    resources_completed = sum(1 for r in resources if r["completed"])

    # Streak based on focus sessions or completed tasks.
    active_dates = set(completed_dates)
    for r in focus_rows:
        try:
            active_dates.add(date.fromisoformat(r["created_at"][:10]))
        except (ValueError, TypeError):
            pass
    streak = 0
    cursor = date.today()
    if cursor not in active_dates:
        cursor = cursor - timedelta(days=1)
    while cursor in active_dates:
        streak += 1
        cursor = cursor - timedelta(days=1)

    priority_breakdown = []
    for p in ("high", "medium", "low"):
        priority_breakdown.append(
            {"priority": p, "count": sum(1 for t in tasks if t["priority"] == p)}
        )

    subjects = {}
    for r in resources:
        subjects.setdefault(r["category"], {"total": 0, "completed": 0})
        subjects[r["category"]]["total"] += 1
        if r["completed"]:
            subjects[r["category"]]["completed"] += 1
    subject_progress = [
        {"subject": k, "total": v["total"], "completed": v["completed"]}
        for k, v in sorted(subjects.items())
    ]

    upcoming = []
    today_iso = date.today().isoformat()
    for t in tasks:
        if t["status"] == "completed" or not t["deadline"]:
            continue
        try:
            d = date.fromisoformat(t["deadline"])
        except ValueError:
            continue
        delta = (d - date.today()).days
        if -30 <= delta <= 60:
            upcoming.append(
                {
                    "id": t["id"],
                    "title": t["title"],
                    "deadline": t["deadline"],
                    "priority": t["priority"],
                    "days_left": delta,
                    "status": t["status"],
                }
            )
    upcoming.sort(key=lambda x: x["deadline"])

    weekly = weekly_productivity()
    return {
        **task_stats(),
        "completion_rate": completion_rate,
        "study_hours": study_hours,
        "focus_sessions": len(focus_rows),
        "focus_minutes": focus_minutes,
        "notes_count": note_count,
        "resources_total": len(resources),
        "resources_completed": resources_completed,
        "events_count": event_count,
        "streak_days": streak,
        "weekly_productivity": weekly,
        "priority_breakdown": priority_breakdown,
        "subject_progress": subject_progress,
        "upcoming_deadlines": upcoming[:8],
        "study_sessions_count": len(study_rows),
    }


# ---------------- Chat Conversations ----------------

def _row_to_message(row) -> dict:
    attachments = []
    if row["attachments"]:
        try:
            attachments = json.loads(row["attachments"])
        except json.JSONDecodeError:
            attachments = []
    return {
        "id": row["id"],
        "role": row["role"],
        "content": row["content"],
        "attachments": attachments,
        "created_at": row["created_at"],
    }


def create_chat_conversation(title: str, mode: str = "chat") -> int:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO chat_conversations (title, mode, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (title, mode, now, now),
        )
        conn.commit()
        return cur.lastrowid


def list_chat_conversations(mode: Optional[str] = None, limit: int = 100):
    with get_db() as conn:
        if mode and mode != "all":
            rows = conn.execute(
                """
                SELECT c.*, 
                       (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS message_count,
                       (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message
                FROM chat_conversations c
                WHERE c.mode = ?
                ORDER BY c.updated_at DESC
                LIMIT ?
                """,
                (mode, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT c.*, 
                       (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS message_count,
                       (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message
                FROM chat_conversations c
                ORDER BY c.updated_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        preview = (d.get("last_message") or "").replace("\n", " ").strip()
        result.append(
            {
                "id": d["id"],
                "title": d["title"],
                "mode": d["mode"],
                "preview": preview[:100],
                "message_count": d["message_count"],
                "created_at": d["created_at"],
                "updated_at": d["updated_at"],
            }
        )
    return result


def get_chat_conversation(conversation_id: int):
    with get_db() as conn:
        conv = conn.execute(
            "SELECT * FROM chat_conversations WHERE id = ?", (conversation_id,)
        ).fetchone()
        if not conv:
            return None
        msgs = conn.execute(
            "SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
        return {
            "conversation": dict(conv),
            "messages": [_row_to_message(m) for m in msgs],
        }


def add_chat_message(conversation_id: int, role: str, content: str, attachments=None) -> dict:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO chat_messages (conversation_id, role, content, attachments, created_at) VALUES (?, ?, ?, ?, ?)",
            (
                conversation_id,
                role,
                content,
                json.dumps([a.model_dump() if hasattr(a, "model_dump") else a for a in (attachments or [])]),
                now,
            ),
        )
        conn.execute(
            "UPDATE chat_conversations SET updated_at = ? WHERE id = ?", (now, conversation_id)
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM chat_messages WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return _row_to_message(row)


def rename_chat_conversation(conversation_id: int, title: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM chat_conversations WHERE id = ?", (conversation_id,)
        ).fetchone()
        if not row:
            return None
        conn.execute(
            "UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?",
            (title, datetime.utcnow().isoformat(), conversation_id),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM chat_conversations WHERE id = ?", (conversation_id,)).fetchone())


def delete_chat_conversation(conversation_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM chat_conversations WHERE id = ?", (conversation_id,))
        conn.commit()
        return cur.rowcount > 0


def delete_all_chat_conversations(mode: Optional[str] = None) -> int:
    with get_db() as conn:
        if mode and mode != "all":
            cur = conn.execute("DELETE FROM chat_conversations WHERE mode = ?", (mode,))
        else:
            cur = conn.execute("DELETE FROM chat_conversations")
        conn.commit()
        return cur.rowcount


def delete_last_assistant_message(conversation_id: int) -> bool:
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT id FROM chat_messages
            WHERE conversation_id = ? AND role = 'assistant'
            ORDER BY id DESC LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM chat_messages WHERE id = ?", (row["id"],))
        conn.commit()
        return True


# ---------------- Study Sessions ----------------

def list_study_sessions(start: Optional[str] = None, end: Optional[str] = None):
    with get_db() as conn:
        if start and end:
            rows = conn.execute(
                "SELECT * FROM study_sessions WHERE study_date BETWEEN ? AND ? ORDER BY study_date, start_time",
                (start, end),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM study_sessions ORDER BY study_date, start_time"
            ).fetchall()
        return [dict(r) for r in rows]


def create_study_session(session: schemas.StudySessionCreate):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO study_sessions (title, subject, study_date, start_time, end_time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (session.title, session.subject, session.study_date, session.start_time, session.end_time, session.notes, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM study_sessions WHERE id = ?", (cur.lastrowid,)).fetchone()
        return dict(row)


def update_study_session(session_id: int, session: schemas.StudySessionUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM study_sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            return None
        data = session.dict(exclude_unset=True)
        set_clause = ", ".join(f"{k} = ?" for k in data.keys())
        values = list(data.values()) + [session_id]
        conn.execute(f"UPDATE study_sessions SET {set_clause} WHERE id = ?", values)
        conn.commit()
        return dict(conn.execute("SELECT * FROM study_sessions WHERE id = ?", (session_id,)).fetchone())


def delete_study_session(session_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM study_sessions WHERE id = ?", (session_id,))
        conn.commit()
        return cur.rowcount > 0


# ---------------- Settings ----------------

def get_app_settings() -> dict:
    with get_db() as conn:
        row = conn.execute("SELECT data FROM app_settings WHERE id = 1").fetchone()
    if not row:
        return {}
    try:
        return json.loads(row["data"])
    except json.JSONDecodeError:
        return {}


def save_app_settings(data: dict) -> dict:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO app_settings (id, data, updated_at) VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
            """,
            (json.dumps(data), now),
        )
        conn.commit()
    return data
