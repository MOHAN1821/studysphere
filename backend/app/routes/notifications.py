from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.NotificationOut])
def get_notifications():
    return crud.list_notifications()


@router.post("", response_model=schemas.NotificationOut, status_code=201)
def add_notification(notif: schemas.NotificationCreate):
    return crud.create_notification(notif)


@router.put("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(notif_id: int, read: bool = True):
    notif = crud.mark_notification_read(notif_id, read)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif


@router.delete("/{notif_id}", status_code=204)
def remove_notification(notif_id: int):
    ok = crud.delete_notification(notif_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return None
