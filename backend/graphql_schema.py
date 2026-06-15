import datetime
import strawberry
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.models import User, Restaurant, MenuItem, PaymentMethod, Order, OrderItem

# --- GraphQL Types ---

@strawberry.type
class UserType:
    id: str
    name: str
    role: str
    country: str


@strawberry.type
class MenuItemType:
    id: int
    restaurant_id: int
    name: str
    price: float
    currency: str
    description: Optional[str]


@strawberry.type
class RestaurantType:
    id: int
    name: str
    cuisine: str
    country: str
    image_url: Optional[str]

    @strawberry.field
    def menu_items(self, info: strawberry.Info) -> List[MenuItemType]:
        db: Session = info.context.db
        return db.query(MenuItem).filter(MenuItem.restaurant_id == self.id).all()


@strawberry.type
class PaymentMethodType:
    id: int
    country: str
    method_type: str
    details: str


@strawberry.type
class OrderItemType:
    id: int
    menu_item_id: int
    quantity: int
    price: float

    @strawberry.field
    def menu_item(self, info: strawberry.Info) -> MenuItemType:
        db: Session = info.context.db
        return db.query(MenuItem).filter(MenuItem.id == self.menu_item_id).first()


@strawberry.type
class OrderType:
    id: int
    user_id: str
    country: str
    status: str
    total_amount: float
    currency: str
    created_at: str
    payment_method_id: Optional[int]

    @strawberry.field
    def user(self, info: strawberry.Info) -> UserType:
        db: Session = info.context.db
        return db.query(User).filter(User.id == self.user_id).first()

    @strawberry.field
    def payment_method(self, info: strawberry.Info) -> Optional[PaymentMethodType]:
        if not self.payment_method_id:
            return None
        db: Session = info.context.db
        return db.query(PaymentMethod).filter(PaymentMethod.id == self.payment_method_id).first()

    @strawberry.field
    def items(self, info: strawberry.Info) -> List[OrderItemType]:
        db: Session = info.context.db
        return db.query(OrderItem).filter(OrderItem.order_id == self.id).all()


# --- Input Types ---

@strawberry.input
class OrderItemInput:
    menu_item_id: int
    quantity: int


# --- Query Resolver ---

@strawberry.type
class Query:
    @strawberry.field
    def me(self, info: strawberry.Info) -> UserType:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated. Please send the X-User-Id session header.")
        return user

    @strawberry.field
    def users(self, info: strawberry.Info) -> List[UserType]:
        db: Session = info.context.db
        return db.query(User).all()

    @strawberry.field
    def restaurants(self, info: strawberry.Info) -> List[RestaurantType]:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        db: Session = info.context.db
        query = db.query(Restaurant)
        if user.role != "ADMIN":
            query = query.filter(Restaurant.country == user.country)
        return query.all()

    @strawberry.field
    def restaurant(self, info: strawberry.Info, id: int) -> RestaurantType:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        db: Session = info.context.db
        restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
        if not restaurant:
            raise Exception("Restaurant not found.")
        
        # Re-BAC validation
        if user.role != "ADMIN" and user.country.lower() != restaurant.country.lower():
            raise Exception(f"Relational Access Denied (Re-BAC). India and America accounts are restricted to their own country's resources. Your country: {user.country}, Targeted resource country: {restaurant.country}")
            
        return restaurant

    @strawberry.field
    def orders(self, info: strawberry.Info) -> List[OrderType]:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        db: Session = info.context.db
        query = db.query(Order)
        if user.role != "ADMIN":
            query = query.filter(Order.country == user.country)
        return query.order_by(Order.created_at.desc()).all()

    @strawberry.field
    def payment_methods(self, info: strawberry.Info) -> List[PaymentMethodType]:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        db: Session = info.context.db
        query = db.query(PaymentMethod)
        if user.role != "ADMIN":
            query = query.filter(PaymentMethod.country == user.country)
        return query.all()


# --- Mutation Resolver ---

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_order(self, info: strawberry.Info, country: str, items: List[OrderItemInput]) -> OrderType:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        
        # Re-BAC: user must place orders in their country
        if user.role != "ADMIN" and user.country.lower() != country.lower():
            raise Exception(f"Relational Access Denied (Re-BAC). Cannot create order for country: {country}. Your country: {user.country}")

        if not items:
            raise Exception("Order must contain at least one item.")

        db: Session = info.context.db
        total_amount = 0.0
        currency = None
        order_items_to_create = []

        for item_input in items:
            menu_item = db.query(MenuItem).filter(MenuItem.id == item_input.menu_item_id).first()
            if not menu_item:
                raise Exception(f"Menu item with ID {item_input.menu_item_id} not found.")
            
            # Check restaurant country matches
            restaurant = db.query(Restaurant).filter(Restaurant.id == menu_item.restaurant_id).first()
            if not restaurant or restaurant.country != country:
                raise Exception(f"Menu item '{menu_item.name}' does not belong to a restaurant in {country}.")

            if currency is None:
                currency = menu_item.currency
            elif currency != menu_item.currency:
                raise Exception("Mixed currencies are not allowed in a single order.")

            item_total = menu_item.price * item_input.quantity
            total_amount += item_total

            order_items_to_create.append(
                OrderItem(
                    menu_item_id=menu_item.id,
                    quantity=item_input.quantity,
                    price=menu_item.price
                )
            )

        order = Order(
            user_id=user.id,
            country=country,
            status="PENDING_PAYMENT",
            total_amount=total_amount,
            currency=currency,
            created_at=datetime.datetime.utcnow().isoformat(),
            items=order_items_to_create
        )

        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    @strawberry.mutation
    def pay_order(self, info: strawberry.Info, order_id: int) -> OrderType:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        
        # RBAC Check
        if user.role not in ["ADMIN", "MANAGER"]:
            raise Exception("Access denied. Only Admins and Managers can checkout and pay for orders.")

        db: Session = info.context.db
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise Exception("Order not found.")

        # Re-BAC Check
        if user.role != "ADMIN" and user.country.lower() != order.country.lower():
            raise Exception(f"Relational Access Denied (Re-BAC). Order country: {order.country}, Your country: {user.country}")

        if order.status != "PENDING_PAYMENT":
            raise Exception(f"Cannot pay for an order in status: {order.status}.")

        pay_method = db.query(PaymentMethod).filter(PaymentMethod.country == order.country).first()
        if not pay_method:
            raise Exception(f"No payment method configured for {order.country}. Ask the Admin.")

        order.status = "PAID"
        order.payment_method_id = pay_method.id
        db.commit()
        db.refresh(order)
        return order

    @strawberry.mutation
    def cancel_order(self, info: strawberry.Info, order_id: int) -> OrderType:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        
        # RBAC Check
        if user.role not in ["ADMIN", "MANAGER"]:
            raise Exception("Access denied. Only Admins and Managers can cancel orders.")

        db: Session = info.context.db
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise Exception("Order not found.")

        # Re-BAC Check
        if user.role != "ADMIN" and user.country.lower() != order.country.lower():
            raise Exception(f"Relational Access Denied (Re-BAC). Order country: {order.country}, Your country: {user.country}")

        if order.status == "CANCELLED":
            raise Exception("Order is already cancelled.")

        order.status = "CANCELLED"
        db.commit()
        db.refresh(order)
        return order

    @strawberry.mutation
    def update_payment_method(self, info: strawberry.Info, id: int, method_type: str, details: str) -> PaymentMethodType:
        user = info.context.current_user
        if not user:
            raise Exception("Not authenticated.")
        
        # RBAC Check
        if user.role != "ADMIN":
            raise Exception("Access denied. Only Admins can modify payment methods.")

        db: Session = info.context.db
        pm = db.query(PaymentMethod).filter(PaymentMethod.id == id).first()
        if not pm:
            raise Exception("Payment method not found.")

        pm.method_type = method_type
        pm.details = details
        db.commit()
        db.refresh(pm)
        return pm
