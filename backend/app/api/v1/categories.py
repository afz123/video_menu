from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryReorderItem

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    restaurant_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Category).order_by(Category.display_order)
    if restaurant_id:
        query = query.where(Category.restaurant_id == restaurant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    category = Category(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int, 
    data: CategoryUpdate, 
    db: AsyncSession = Depends(get_db)
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    await db.delete(category)
    await db.commit()
    return {"status": "deleted", "id": category_id}

@router.post("/reorder")
async def reorder_categories(
    items: List[CategoryReorderItem] = Body(...),
    db: AsyncSession = Depends(get_db)
):
    for item in items:
        cat = await db.get(Category, item.id)
        if cat:
            cat.display_order = item.display_order
    await db.commit()
    return {"status": "reordered"}
