from pydantic import BaseModel
from typing import List, Optional

# --- User ---
class UserBase(BaseModel):
    id: str
    name: str
    role: str
    country: str

    class Config:
        from_attributes = True


# --- Menu Item ---
class MenuItemBase(BaseModel):
    id: int
    restaurant_id: int
    name: str
    price: float
    currency: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# --- Restaurant ---
class RestaurantBase(BaseModel):
    id: int
    name: str
    cuisine: str
    country: str
    image_url: Optional[str] = None
    menu_items: List[MenuItemBase] = []

    class Config:
        from_attributes = True


# --- Payment Method ---
class PaymentMethodBase(BaseModel):
    id: int
    country: str
    method_type: str
    details: str

    class Config:
        from_attributes = True


class PaymentMethodUpdate(BaseModel):
    method_type: str
    details: str


# --- Order ---
class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    country: str  # Must match the user's country or "Global" admin choice


class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    quantity: int
    price: float
    menu_item: MenuItemBase

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    user_id: str
    country: str
    status: str
    total_amount: float
    currency: str
    created_at: str
    payment_method_id: Optional[int] = None
    payment_method: Optional[PaymentMethodBase] = None
    items: List[OrderItemResponse] = []
    user: UserBase

    class Config:
        from_attributes = True
