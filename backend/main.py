from contextlib import asynccontextmanager
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
import strawberry
from strawberry.fastapi import BaseContext, GraphQLRouter
from sqlalchemy.orm import Session

from backend.database import SessionLocal, init_db, get_db
from backend.models import User
from backend.graphql_schema import Query, Mutation

# Context class to hold DB session and active user credentials
class GraphQLContext(BaseContext):
    def __init__(self, db: Session, current_user: User | None):
        super().__init__()
        self.db = db
        self.current_user = current_user

# Context getter to populate GraphQL resolvers with DB connection and session headers
async def get_context(
    x_user_id: str | None = Header(None, alias="X-User-Id")
) -> GraphQLContext:
    db = SessionLocal()
    current_user = None
    try:
        if x_user_id:
            current_user = db.query(User).filter(User.id == x_user_id).first()
        yield GraphQLContext(db=db, current_user=current_user)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and seed database
    init_db()
    yield

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema, context_getter=get_context)

app = FastAPI(
    title="Slooze GraphQL RBAC API",
    description="Backend GraphQL API using Strawberry, FastAPI and SQLAlchemy",
    lifespan=lifespan
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Strawberry GraphQL Router
app.include_router(graphql_app, prefix="/graphql")
