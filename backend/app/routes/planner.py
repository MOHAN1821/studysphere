from fastapi import APIRouter, HTTPException, Query

from app import crud, schemas
from datetime import date, timedelta

router = APIRouter()


@router.get("/schedule")
def get_schedule(start: str = Query(None), end: str = Query(None)):
    today = date.today()
    start_date = date.fromisoformat(start) if start else today
    end_date = date.fromisoformat(end) if end else today + timedelta(days=6)

    tasks = crud.list_tasks()
    schedule = []
    for task in tasks:
        if task["deadline"]:
            try:
                deadline = date.fromisoformat(task["deadline"])
                if start_date <= deadline <= end_date:
                    schedule.append(task)
            except ValueError:
                continue
    schedule.sort(key=lambda item: item["deadline"] or "")
    return {"start": start_date.isoformat(), "end": end_date.isoformat(), "tasks": schedule}


@router.get("/reminders")
def get_reminders():
    today = date.today()
    tasks = crud.list_tasks()
    reminders = []
    for task in tasks:
        if task["status"] == "completed" or not task["deadline"]:
            continue
        try:
            deadline = date.fromisoformat(task["deadline"])
        except ValueError:
            continue
        delta = (deadline - today).days
        if delta <= 2:
            reminders.append(
                {
                    "id": task["id"],
                    "title": task["title"],
                    "deadline": task["deadline"],
                    "priority": task["priority"],
                    "urgent": delta <= 0,
                    "days_left": delta,
                }
            )
    reminders.sort(key=lambda item: (not item["urgent"], item["deadline"] or ""))
    return {"reminders": reminders}


@router.get("/sessions", response_model=list[schemas.StudySessionOut])
def get_study_sessions(
    start: str = Query(None),
    end: str = Query(None),
):
    return crud.list_study_sessions(start, end)


@router.post("/sessions", response_model=schemas.StudySessionOut, status_code=201)
def create_study_session(payload: schemas.StudySessionCreate):
    try:
        date.fromisoformat(payload.study_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="study_date must be YYYY-MM-DD")
    return crud.create_study_session(payload)


@router.put("/sessions/{session_id}", response_model=schemas.StudySessionOut)
def update_study_session(session_id: int, payload: schemas.StudySessionUpdate):
    updated = crud.update_study_session(session_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Study session not found")
    return updated


@router.delete("/sessions/{session_id}")
def delete_study_session(session_id: int):
    if not crud.delete_study_session(session_id):
        raise HTTPException(status_code=404, detail="Study session not found")
    return {"ok": True}