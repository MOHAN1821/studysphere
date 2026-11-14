from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.AchievementOut])
def get_achievements():
    return crud.list_achievements()
