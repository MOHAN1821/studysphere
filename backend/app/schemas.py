from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ---------- Tasks ----------

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    deadline: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    status: str = Field(default="pending", pattern="^(pending|completed|overdue)$")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(None, pattern="^(pending|completed|overdue)$")


class TaskOut(TaskBase):
    id: int
    created_at: str
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Analytics ----------

class AnalyticsOut(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float
    study_hours: float
    focus_sessions: int
    focus_minutes: int
    notes_count: int
    resources_total: int
    resources_completed: int
    events_count: int
    streak_days: int
    weekly_productivity: List[dict]
    priority_breakdown: List[dict]
    subject_progress: List[dict]
    upcoming_deadlines: List[dict]


# ---------- AI ----------

class Attachment(BaseModel):
    name: str
    size: int = 0
    type: str = ""
    content: str = ""


class AIChatRequest(BaseModel):
    message: str = Field(default="", min_length=0, max_length=12000)
    conversation_id: Optional[int] = None
    mode: str = Field(default="chat", pattern="^(chat|study)$")
    attachments: List[Attachment] = Field(default_factory=list)
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    system_prompt: Optional[str] = Field(default=None, max_length=4000)
    save_history: bool = True


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    attachments: List[Attachment] = Field(default_factory=list)
    created_at: str


class AIChatResponse(BaseModel):
    conversation_id: Optional[int]
    title: Optional[str]
    response: str
    demo_mode: bool = False
    provider: str
    model: str
    messages: List[ChatMessageOut] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    id: int
    title: str
    mode: str
    preview: str
    message_count: int
    created_at: str
    updated_at: str


class ConversationRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class AIStatus(BaseModel):
    configured: bool
    provider: str
    model: str
    demo_mode: bool


# ---------- Planner ----------

class ScheduleOut(BaseModel):
    start: str
    end: str
    tasks: List[dict]


class StudySessionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=120)
    study_date: str
    start_time: str
    end_time: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class StudySessionCreate(StudySessionBase):
    pass


class StudySessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=120)
    study_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class StudySessionOut(StudySessionBase):
    id: int
    created_at: str

    class Config:
        from_attributes = True


# ---------- Notes ----------

class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = ""
    subject: Optional[str] = None
    pinned: Optional[bool] = False


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    subject: Optional[str] = None
    pinned: Optional[bool] = None


class NoteOut(NoteBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ---------- Learning Resources ----------

class LearningResourceBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    url: Optional[str] = None
    resource_type: Optional[str] = "article"
    completed: Optional[bool] = False
    bookmarked: Optional[bool] = False


class LearningResourceCreate(LearningResourceBase):
    pass


class LearningResourceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = None
    resource_type: Optional[str] = None
    completed: Optional[bool] = None
    bookmarked: Optional[bool] = None


class LearningResourceOut(LearningResourceBase):
    id: int
    created_at: str

    class Config:
        from_attributes = True


class LearningProgressUpdate(BaseModel):
    resource_id: int
    completed: bool


# ---------- Calendar Events ----------

class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    category: Optional[str] = "study"
    color: Optional[str] = "#0078D4"


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None


class CalendarEventOut(CalendarEventBase):
    id: int
    created_at: str

    class Config:
        from_attributes = True


# ---------- Goals ----------

class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    target_date: Optional[str] = None
    category: Optional[str] = "daily"
    target_value: Optional[int] = 1


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    target_date: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|completed|paused)$")
    current_value: Optional[int] = None
    target_value: Optional[int] = None


class GoalOut(GoalBase):
    id: int
    status: str
    current_value: int
    created_at: str
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Achievements ----------

class AchievementOut(BaseModel):
    id: int
    title: str
    description: str
    badge_type: str
    earned: bool
    earned_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


# ---------- Notifications ----------

class NotificationBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: Optional[str] = None
    type: Optional[str] = "info"
    read: Optional[bool] = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    message: Optional[str] = None
    type: Optional[str] = None
    read: Optional[bool] = None


class NotificationOut(NotificationBase):
    id: int
    created_at: str

    class Config:
        from_attributes = True


# ---------- Focus Sessions ----------

class FocusSessionBase(BaseModel):
    duration: Optional[int] = 25
    completed: Optional[bool] = True


class FocusSessionOut(FocusSessionBase):
    id: int
    created_at: str

    class Config:
        from_attributes = True


# ---------- Settings ----------

class SettingsUpdate(BaseModel):
    data: Dict[str, Any]