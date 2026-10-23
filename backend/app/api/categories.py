from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.category import Category, DEFAULT_CATEGORIES
from backend.app.schemas.category import CategoryCreate, CategoryResponse
from backend.app.services.auth_service import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch system defaults and custom categories
    custom_cats = db.query(Category).filter(Category.user_id == current_user.id).all()
    default_cats = db.query(Category).filter(Category.user_id.is_(None)).all()
    
    all_cats = list(default_cats) + list(custom_cats)
    return [
        CategoryResponse(
            id=c.id,
            name=c.name,
            icon=c.icon,
            color=c.color,
            is_default=c.is_default
        )
        for c in all_cats
    ]

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_custom_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name = category_in.name.strip()
    existing = db.query(Category).filter(
        (Category.user_id == current_user.id) | (Category.user_id.is_(None)),
        Category.name.ilike(name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists.")

    new_cat = Category(
        user_id=current_user.id,
        name=name,
        icon=category_in.icon or "Tag",
        color=category_in.color or "#E50914",
        is_default=False
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return CategoryResponse.model_validate(new_cat)
