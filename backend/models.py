from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "ADMIN", "MANAGER", "MEMBER"
    country = Column(String, nullable=False)  # "India", "America", "Global"

    orders = relationship("Order", back_populates="user")


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    cuisine = Column(String, nullable=False)
    country = Column(String, nullable=False)  # "India", "America"
    image_url = Column(String, nullable=True)

    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, nullable=False)  # "INR", "USD"
    description = Column(String, nullable=True)

    restaurant = relationship("Restaurant", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    country = Column(String, nullable=False)  # "India", "America"
    method_type = Column(String, nullable=False)  # "UPI", "Credit Card", "Stripe", etc.
    details = Column(String, nullable=False)

    orders = relationship("Order", back_populates="payment_method")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    country = Column(String, nullable=False)  # "India", "America"
    status = Column(String, nullable=False, default="PENDING_PAYMENT")  # "PENDING_PAYMENT", "PAID", "CANCELLED"
    total_amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    created_at = Column(String, nullable=False)  # ISO string representation
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=True)

    user = relationship("User", back_populates="orders")
    payment_method = relationship("PaymentMethod", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)  # Price of item at ordering time

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")
