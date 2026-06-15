import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, User, Restaurant, MenuItem, PaymentMethod, Order, OrderItem

DATABASE_URL = "sqlite:///./food_ordering.db"

# Create the engine. connect_args={"check_same_thread": False} is required for SQLite in multithreaded environments.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(User).count() == 0:
            print("Seeding database...")
            
            # Seed Predefined Users
            users = [
                User(id="nick_fury", name="Nick Fury", role="ADMIN", country="Global"),
                User(id="captain_marvel", name="Captain Marvel", role="MANAGER", country="India"),
                User(id="captain_america", name="Captain America", role="MANAGER", country="America"),
                User(id="thanos", name="Thanos", role="MEMBER", country="India"),
                User(id="thor", name="Thor", role="MEMBER", country="India"),
                User(id="travis", name="Travis", role="MEMBER", country="America"),
            ]
            for u in users:
                db.add(u)
            
            # Seed Restaurants
            r_india_1 = Restaurant(name="Royal Biryani House", cuisine="Mughlai & North Indian", country="India", image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop")
            r_india_2 = Restaurant(name="Delhi Chaat Corner", cuisine="Street Food & Snacks", country="India", image_url="https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop")
            r_us_1 = Restaurant(name="Burger Empire", cuisine="Burgers & Shakes", country="America", image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop")
            r_us_2 = Restaurant(name="Liberty Pizza", cuisine="Pizza & Pasta", country="America", image_url="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop")
            
            db.add_all([r_india_1, r_india_2, r_us_1, r_us_2])
            db.commit() # Commit to generate IDs

            # Seed Menu Items for Royal Biryani House (India)
            menu_items = [
                MenuItem(restaurant_id=r_india_1.id, name="Chicken Biryani", price=350.0, currency="INR", description="Aromatic basmati rice cooked with succulent chicken and rich spices."),
                MenuItem(restaurant_id=r_india_1.id, name="Paneer Tikka", price=250.0, currency="INR", description="Grilled cottage cheese cubes marinated in spiced yogurt."),
                MenuItem(restaurant_id=r_india_1.id, name="Garlic Naan", price=80.0, currency="INR", description="Soft clay-oven baked flatbread brushed with garlic butter."),
                MenuItem(restaurant_id=r_india_1.id, name="Mango Lassi", price=120.0, currency="INR", description="Creamy yogurt drink blended with fresh sweet mango pulp."),
                
                # Seed Menu Items for Delhi Chaat Corner (India)
                MenuItem(restaurant_id=r_india_2.id, name="Samosa (2 pcs)", price=60.0, currency="INR", description="Crispy pastries stuffed with spiced potatoes and peas."),
                MenuItem(restaurant_id=r_india_2.id, name="Chole Bhature", price=180.0, currency="INR", description="Spicy chickpea curry served with fluffy deep-fried leavened bread."),
                MenuItem(restaurant_id=r_india_2.id, name="Pani Puri", price=100.0, currency="INR", description="Crispy hollow puris filled with spiced mint water and potatoes."),

                # Seed Menu Items for Burger Empire (America)
                MenuItem(restaurant_id=r_us_1.id, name="Classic Cheeseburger", price=12.00, currency="USD", description="Grilled beef patty topped with cheddar cheese, lettuce, and pickles."),
                MenuItem(restaurant_id=r_us_1.id, name="BBQ Bacon Burger", price=15.00, currency="USD", description="Beef patty with crispy bacon, cheddar cheese, and smokey BBQ sauce."),
                MenuItem(restaurant_id=r_us_1.id, name="French Fries", price=4.00, currency="USD", description="Golden, crispy salted potato fries served with ketchup."),
                MenuItem(restaurant_id=r_us_1.id, name="Vanilla Milkshake", price=6.00, currency="USD", description="Thick and creamy classic milkshake made with real vanilla bean."),

                # Seed Menu Items for Liberty Pizza (America)
                MenuItem(restaurant_id=r_us_2.id, name="Pepperoni Pizza", price=18.00, currency="USD", description="Thick crust topped with marinara sauce, mozzarella, and spicy pepperoni slices."),
                MenuItem(restaurant_id=r_us_2.id, name="Margherita Pizza", price=16.00, currency="USD", description="Thin crust topped with fresh mozzarella, tomatoes, and basil leaves."),
                MenuItem(restaurant_id=r_us_2.id, name="Caesar Salad", price=10.00, currency="USD", description="Crisp romaine lettuce tossed in caesar dressing with croutons."),
                MenuItem(restaurant_id=r_us_2.id, name="Garlic Knots (6 pcs)", price=8.00, currency="USD", description="Freshly baked dough knots coated in garlic butter, parsley, and parmesan."),
            ]
            db.add_all(menu_items)

            # Seed Payment Methods
            pm_in = PaymentMethod(country="India", method_type="UPI", details="slooze-corporate@ybl")
            pm_us = PaymentMethod(country="America", method_type="Corporate Card", details="Visa (*4242)")
            db.add_all([pm_in, pm_us])
            db.commit()

            # Seed Initial Orders
            # Order 1: Thanos (India Member) - PENDING_PAYMENT
            # Order items: Chicken Biryani x2, Mango Lassi x2 (Total: 700 + 240 = 940 INR)
            order_in = Order(
                user_id="thanos",
                country="India",
                status="PENDING_PAYMENT",
                total_amount=940.0,
                currency="INR",
                created_at=(datetime.datetime.utcnow() - datetime.timedelta(hours=2)).isoformat()
            )
            db.add(order_in)
            db.commit()

            # Find item IDs
            item_biryani = db.query(MenuItem).filter(MenuItem.name == "Chicken Biryani").first()
            item_lassi = db.query(MenuItem).filter(MenuItem.name == "Mango Lassi").first()

            item_burger = db.query(MenuItem).filter(MenuItem.name == "Classic Cheeseburger").first()
            item_fries = db.query(MenuItem).filter(MenuItem.name == "French Fries").first()

            if item_biryani and item_lassi:
                db.add(OrderItem(order_id=order_in.id, menu_item_id=item_biryani.id, quantity=2, price=350.0))
                db.add(OrderItem(order_id=order_in.id, menu_item_id=item_lassi.id, quantity=2, price=120.0))

            # Order 2: Travis (America Member) - PAID (Paid via Corporate Card)
            # Order items: BBQ Bacon Burger x1, French Fries x2 (Total: 15 + 8 = 23 USD)
            order_us = Order(
                user_id="travis",
                country="America",
                status="PAID",
                total_amount=23.0,
                currency="USD",
                payment_method_id=pm_us.id,
                created_at=(datetime.datetime.utcnow() - datetime.timedelta(hours=1)).isoformat()
            )
            db.add(order_us)
            db.commit()

            if item_burger and item_fries:
                db.add(OrderItem(order_id=order_us.id, menu_item_id=item_burger.id, quantity=1, price=12.0))
                db.add(OrderItem(order_id=order_us.id, menu_item_id=item_fries.id, quantity=2, price=4.0))

            db.commit()
            print("Database seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
