from fastapi import APIRouter, HTTPException, Query
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.TaskOut])
def get_tasks(filter: str = Query(None, alias="filter")):
    return crud.list_tasks(filter_status=filter)


@router.post("", response_model=schemas.TaskOut, status_code=201)
def add_task(task: schemas.TaskCreate):
    return crud.create_task(task)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int):
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=schemas.TaskOut)
def edit_task(task_id: int, task: schemas.TaskUpdate):
    updated = crud.update_task(task_id, task)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.delete("/{task_id}", status_code=204)
def remove_task(task_id: int):
    ok = crud.delete_task(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return None
