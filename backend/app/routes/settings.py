from fastapi import APIRouter

from app import crud, schemas

router = APIRouter()


@router.get("")
def get_settings():
    return crud.get_app_settings()


@router.put("")
def save_settings(payload: schemas.SettingsUpdate):
    return crud.save_app_settings(payload.data)