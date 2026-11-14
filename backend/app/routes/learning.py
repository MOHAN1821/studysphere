from fastapi import APIRouter, HTTPException
from app import schemas, crud

router = APIRouter()


@router.get("", response_model=list[schemas.LearningResourceOut])
def get_learning_resources():
    return crud.list_learning_resources()


@router.post("", response_model=schemas.LearningResourceOut, status_code=201)
def add_learning_resource(resource: schemas.LearningResourceCreate):
    return crud.create_learning_resource(resource)


@router.get("/{resource_id}", response_model=schemas.LearningResourceOut)
def get_learning_resource(resource_id: int):
    resource = crud.get_learning_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Learning resource not found")
    return resource


@router.put("/{resource_id}", response_model=schemas.LearningResourceOut)
def edit_learning_resource(resource_id: int, resource: schemas.LearningResourceUpdate):
    updated = crud.update_learning_resource(resource_id, resource)
    if not updated:
        raise HTTPException(status_code=404, detail="Learning resource not found")
    return updated


@router.delete("/{resource_id}", status_code=204)
def remove_learning_resource(resource_id: int):
    ok = crud.delete_learning_resource(resource_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Learning resource not found")
    return None


@router.post("/progress")
def update_learning_progress(update: schemas.LearningProgressUpdate):
    resource = crud.get_learning_resource(update.resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Learning resource not found")
    updated = crud.update_learning_resource(
        update.resource_id,
        schemas.LearningResourceUpdate(completed=update.completed),
    )
    return {"resource_id": update.resource_id, "completed": update.completed}
