from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.NoteOut])
def get_notes():
    return crud.list_notes()


@router.post("", response_model=schemas.NoteOut, status_code=201)
def add_note(note: schemas.NoteCreate):
    return crud.create_note(note)


@router.get("/{note_id}", response_model=schemas.NoteOut)
def get_note(note_id: int):
    note = crud.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=schemas.NoteOut)
def edit_note(note_id: int, note: schemas.NoteUpdate):
    updated = crud.update_note(note_id, note)
    if not updated:
        raise HTTPException(status_code=404, detail="Note not found")
    return updated


@router.delete("/{note_id}", status_code=204)
def remove_note(note_id: int):
    ok = crud.delete_note(note_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Note not found")
    return None
