from pydantic import BaseModel
from typing import Optional

class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = "Tag"
    color: Optional[str] = "#E50914"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    is_default: bool

    class Config:
        from_attributes = True
