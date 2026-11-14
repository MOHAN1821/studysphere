from fastapi import APIRouter

from app import crud, schemas

router = APIRouter()


@router.get("", response_model=schemas.AnalyticsOut)
def get_analytics():
    return crud.get_extended_analytics()