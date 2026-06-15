from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User

# Get the current logged-in user from the X-User-Id header
def get_current_user(x_user_id: str = Header(..., alias="X-User-Id"), db: Session = Depends(get_db)) -> User:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session header (X-User-Id)"
        )
    
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User session '{x_user_id}' not found. Please log in."
        )
    return user


# Enforce role-based access control (RBAC)
class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(self.allowed_roles)}. Your role: {current_user.role}"
            )
        return current_user


# Helper to check relational access model (Re-BAC)
def verify_country_access(country: str, user: User) -> bool:
    """
    Enforces country boundaries (Re-BAC).
    Admin (Global) can access anything.
    Managers and Members can only access data belonging to their respective country.
    """
    if user.role == "ADMIN":
        return True
    
    # Check if the user's assigned country matches the targeted resource country
    # E.g., user.country is "India", targeted resource country is "India"
    if user.country.lower() == country.lower():
        return True
        
    return False


def require_country_access(country: str, user: User):
    """
    Raises HTTP 403 if the user is not allowed to access the specified country.
    """
    if not verify_country_access(country, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Relational Access Denied (Re-BAC). India and America accounts are restricted to their own country's resources. Your country: {user.country}, Targeted resource country: {country}"
        )
