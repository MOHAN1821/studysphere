from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.GoalOut])
def get_goals():
    return crud.list_goals()


@router.post("", response_model=schemas.GoalOut, status_code=201)
def add_goal(goal: schemas.GoalCreate):
    return crud.create_goal(goal)


@router.put("/{goal_id}", response_model=schemas.GoalOut)
def edit_goal(goal_id: int, goal: schemas.GoalUpdate):
    updated = crud.update_goal(goal_id, goal)
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated


@router.delete("/{goal_id}", status_code=204)
def remove_goal(goal_id: int):
    ok = crud.delete_goal(goal_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None
