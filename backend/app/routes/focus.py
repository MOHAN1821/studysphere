from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.FocusSessionOut])
def get_focus_sessions():
    return crud.list_focus_sessions()


@router.post("", response_model=schemas.FocusSessionOut, status_code=201)
def add_focus_session(session: schemas.FocusSessionBase):
    return crud.create_focus_session(session)
