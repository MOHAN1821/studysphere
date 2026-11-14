from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.CalendarEventOut])
def get_calendar_events():
    return crud.list_calendar_events()


@router.post("", response_model=schemas.CalendarEventOut, status_code=201)
def add_calendar_event(event: schemas.CalendarEventCreate):
    return crud.create_calendar_event(event)


@router.delete("/{event_id}", status_code=204)
def remove_calendar_event(event_id: int):
    ok = crud.delete_calendar_event(event_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return None
