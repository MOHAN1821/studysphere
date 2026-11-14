import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

# Where data is stored. In production point DATA_DIR at a PERSISTENT disk/volume
# (e.g. /var/data on Render, /data in Docker) or every redeploy wipes all users.
# DATABASE_PATH overrides the full file path if you need it.
DATA_DIR = os.getenv("DATA_DIR") or os.path.join(os.path.dirname(__file__), "..")
DB_PATH = os.getenv("DATABASE_PATH") or os.path.join(DATA_DIR, "campus_copilot.db")
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)


@contextmanager
def get_db():
    # timeout + WAL let several gunicorn workers share one SQLite file safely.
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
    except sqlite3.DatabaseError:
        pass
    try:
        yield conn
    finally:
        conn.close()


def _ensure_column(conn, table: str, column: str, coldef: str):
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coldef}")


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                name TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                deadline TEXT,
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                completed_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
            CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                content TEXT DEFAULT '',
                subject TEXT,
                pinned INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);
            CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
            CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);

            CREATE TABLE IF NOT EXISTS learning_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                url TEXT,
                resource_type TEXT DEFAULT 'article',
                completed INTEGER DEFAULT 0,
                bookmarked INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_learning_category ON learning_resources(category);
            CREATE INDEX IF NOT EXISTS idx_learning_user ON learning_resources(user_id);

            CREATE TABLE IF NOT EXISTS learning_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_id INTEGER NOT NULL,
                completed INTEGER DEFAULT 0,
                completed_at TEXT,
                FOREIGN KEY (resource_id) REFERENCES learning_resources(id)
            );

            CREATE TABLE IF NOT EXISTS calendar_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                start_date TEXT NOT NULL,
                end_date TEXT,
                category TEXT DEFAULT 'study',
                color TEXT DEFAULT '#0078D4',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start_date);
            CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id);

            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                target_date TEXT,
                category TEXT DEFAULT 'daily',
                status TEXT DEFAULT 'active',
                current_value INTEGER DEFAULT 0,
                target_value INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                completed_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);
            CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
            CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                badge_type TEXT DEFAULT 'bronze',
                earned INTEGER DEFAULT 0,
                earned_at TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT,
                type TEXT DEFAULT 'info',
                read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

            CREATE TABLE IF NOT EXISTS ai_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                demo_mode INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);

            CREATE TABLE IF NOT EXISTS focus_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                duration INTEGER DEFAULT 25,
                completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_focus_user ON focus_sessions(user_id);

            CREATE TABLE IF NOT EXISTS chat_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'chat',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_chat_conv_mode ON chat_conversations(mode);
            CREATE INDEX IF NOT EXISTS idx_chat_conv_updated ON chat_conversations(updated_at);
            CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_id);

            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                attachments TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id);

            CREATE TABLE IF NOT EXISTS study_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                subject TEXT,
                study_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_study_date ON study_sessions(study_date);
            CREATE INDEX IF NOT EXISTS idx_study_user ON study_sessions(user_id);

            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        # Backward-compatible migrations for existing DBs
        for tbl in (
            "tasks",
            "notes",
            "learning_resources",
            "calendar_events",
            "goals",
            "achievements",
            "notifications",
            "ai_conversations",
            "focus_sessions",
            "chat_conversations",
            "study_sessions",
        ):
            try:
                _ensure_column(conn, tbl, "user_id", "INTEGER")
            except Exception:
                pass
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_learning_user ON learning_resources(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_focus_user ON focus_sessions(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_study_user ON study_sessions(user_id)")
        except Exception:
            pass
        # Migrate legacy global app_settings (id=1) into a default user if present
        try:
            legacy = conn.execute("SELECT data FROM app_settings WHERE id = 1").fetchone()
        except Exception:
            legacy = None
        if legacy:
            now = datetime.utcnow().isoformat()
            row = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
            if not row:
                # create a local placeholder owner only to preserve legacy settings; not a fake login credential
                # (no password usable for login) - actual users must register
                try:
                    cur = conn.execute(
                        "INSERT INTO users (email, password_hash, name, created_at, updated_at) VALUES (?,?,?,?,?)",
                        ("legacy@local.invalid", "!", "Legacy Data", now, now),
                    )
                    uid = cur.lastrowid
                except Exception:
                    uid = None
            else:
                uid = row["id"]
            if uid:
                try:
                    conn.execute(
                        "INSERT OR REPLACE INTO user_settings (user_id, data, updated_at) VALUES (?,?,?)",
                        (uid, legacy["data"], now),
                    )
                except Exception:
                    pass
        conn.commit()



def seed_data():
    from datetime import date, timedelta

    today = date.today()

    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        if count == 0:
            sample = [
                ("Complete Operating Systems assignment", "Finish chapters 5-7 and submit via LMS", (today + timedelta(days=2)).isoformat(), "high", "pending"),
                ("Review Linear Algebra notes", "Go over eigenvalues and eigenvectors", (today + timedelta(days=1)).isoformat(), "medium", "pending"),
                ("Attend AI club meeting", "Weekly sync with the Microsoft Learn Student Ambassadors", (today + timedelta(days=3)).isoformat(), "low", "pending"),
                ("Submit project proposal", "Final draft for the capstone project", (today - timedelta(days=1)).isoformat(), "high", "pending"),
                ("Read distributed systems paper", "Paper discussion group preparation", (today - timedelta(days=2)).isoformat(), "medium", "completed"),
                ("Update LinkedIn profile", "Add new internship experience", (today + timedelta(days=7)).isoformat(), "low", "pending"),
                ("Practice DSA problems", "LeetCode medium problems - 3 questions", today.isoformat(), "medium", "completed"),
            ]
            conn.executemany(
                "INSERT INTO tasks (title, description, deadline, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                [(*row, date.today().isoformat()) for row in sample],
            )

        count = conn.execute("SELECT COUNT(*) FROM learning_resources").fetchone()[0]
        if count == 0:
            resources = [
                ("Python Basics", "Introduction to Python programming language", "python", "article", "https://docs.python.org/3/tutorial/", 0, 1),
                ("C++ Fundamentals", "Object-oriented programming with C++", "cpp", "article", "https://en.cppreference.com/w/", 0, 1),
                ("Java Programming", "Java language fundamentals", "java", "article", "https://docs.oracle.com/javase/tutorial/", 0, 0),
                ("Data Structures and Algorithms", "Arrays, linked lists, trees, graphs", "dsa", "course", None, 0, 1),
                ("Database Management Systems", "SQL, normalization, transactions", "dbms", "course", None, 0, 0),
                ("Operating Systems", "Processes, memory management, concurrency", "os", "course", None, 0, 0),
                ("Computer Networks", "TCP/IP, HTTP, DNS, routing", "networks", "article", None, 0, 0),
                ("Artificial Intelligence", "Machine learning, neural networks, AI", "ai", "course", None, 0, 0),
            ]
            conn.executemany(
                "INSERT INTO learning_resources (title, description, category, resource_type, url, completed, bookmarked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [(r[0], r[1], r[2], r[3], r[4], r[5], r[6], date.today().isoformat()) for r in resources],
            )

        count = conn.execute("SELECT COUNT(*) FROM achievements").fetchone()[0]
        if count == 0:
            achievements = [
                ("First Task", "Complete your first task", "bronze", 1),
                ("Task Master", "Complete 10 tasks", "silver", 0),
                ("Focused", "Complete 5 Pomodoro sessions", "bronze", 0),
                ("Consistent", "Study 7 days in a row", "gold", 0),
                ("Early Bird", "Complete a task before deadline", "bronze", 0),
            ]
            conn.executemany(
                "INSERT INTO achievements (title, description, badge_type, earned, earned_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                [(a[0], a[1], a[2], a[3], date.today().isoformat() if a[3] else None, date.today().isoformat()) for a in achievements],
            )

        count = conn.execute("SELECT COUNT(*) FROM notifications").fetchone()[0]
        if count == 0:
            notifications = [
                ("Assignment Due", "Operating Systems assignment due in 2 days", "deadline", 0),
                ("Study Reminder", "Time for your weekly study session", "reminder", 0),
                ("Goal Achieved", "You completed your daily goal", "goal", 1),
            ]
            conn.executemany(
                "INSERT INTO notifications (title, message, type, read, created_at) VALUES (?, ?, ?, ?, ?)",
                [(n[0], n[1], n[2], n[3], date.today().isoformat()) for n in notifications],
            )

        count = conn.execute("SELECT COUNT(*) FROM focus_sessions").fetchone()[0]
        if count == 0:
            conn.executemany(
                "INSERT INTO focus_sessions (duration, completed, created_at) VALUES (?, ?, ?)",
                [(25, 1, (today - timedelta(days=1)).isoformat()), (25, 1, today.isoformat())],
            )

        count = conn.execute("SELECT COUNT(*) FROM study_sessions").fetchone()[0]
        if count == 0:
            sessions = [
                ("Linear Algebra revision", "Mathematics", today.isoformat(), "09:00", "10:30", "Eigenvalues and eigenvectors"),
                ("Operating Systems lab", "Computer Science", (today + timedelta(days=1)).isoformat(), "14:00", "16:00", "Process scheduling"),
                ("DSA practice", "Computer Science", (today + timedelta(days=2)).isoformat(), "18:00", "19:30", "Graph traversal problems"),
            ]
            conn.executemany(
                "INSERT INTO study_sessions (title, subject, study_date, start_time, end_time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [(*s, today.isoformat()) for s in sessions],
            )

        conn.commit()