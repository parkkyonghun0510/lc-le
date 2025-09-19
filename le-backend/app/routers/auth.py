from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas import TokenResponse, UserResponse, UserLogin, UserCreate
from app.core.config import settings

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    # Eager-load relationships to avoid lazy IO during Pydantic validation
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
        )
        .where(User.username == username)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
    user = await get_user_by_username(db, username)
    if not user:
        return None
    hashed: str = str(user.password_hash)  # narrow for type checker; runtime value is str
    if not verify_password(password, hashed):
        return None
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username_val = payload.get("sub")
        if not isinstance(username_val, str) or not username_val:
            raise credentials_exception
        username: str = username_val
    except JWTError:
        raise credentials_exception
    
    # Eager-load relationships for current user as well
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
        )
        .where(User.username == username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    # Pylance typing: mapped attribute looks like Column[...] - runtime assignment is valid.
    user.last_login_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    # Re-fetch user with relationships eagerly loaded to prevent MissingGreenlet
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
        )
        .where(User.id == user.id)
    )
    result = await db.execute(stmt)
    user_with_rels = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user_with_rels.department
    _ = user_with_rels.branch
    _ = user_with_rels.position
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user_with_rels)
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username_val = payload.get("sub")
        if not isinstance(username_val, str) or not username_val:
            raise credentials_exception
        username: str = username_val
    except JWTError:
        raise credentials_exception
    
    # Eager-load relationships on refresh as the response model might traverse them
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
        )
        .where(User.username == username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": user.username})
    
    # Ensure all relationships are loaded before validation
    _ = user.department
    _ = user.branch
    _ = user.position
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    # current_user already has department and branch eagerly loaded
    # Ensure all relationships are loaded before validation
    _ = current_user.department
    _ = current_user.branch
    _ = current_user.position
    return UserResponse.model_validate(current_user)

@router.get("/setup-required")
async def check_setup_required(db: AsyncSession = Depends(get_db)) -> dict:
    """Check if initial setup is required (no users in database)"""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return {"setup_required": len(users) == 0}

@router.post("/logout")
async def logout() -> dict:
    """Logout endpoint - clears user session"""
    # In a stateless JWT setup, "logout" is primarily handled client-side
    # by clearing tokens. This endpoint can be used for any server-side
    # cleanup if needed.
    return {"message": "Successfully logged out"}

@router.post("/setup-first-admin", response_model=UserResponse)
async def setup_first_admin(user: UserCreate, db: AsyncSession = Depends(get_db)) -> UserResponse:
    """Create the first admin user when no users exist"""
    # Check if setup is actually required
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    if len(users) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup has already been completed"
        )
    
    # Check if username or email already exists (double-check)
    result = await db.execute(
        select(User).where(
            (User.username == user.username) | (User.email == user.email)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    # Create the first admin user
    db_user = User(
        **user.dict(exclude={"password", "role", "status"}),
        password_hash=get_password_hash(user.password),
        role="admin",  # Force admin role for first user
        status="active"
    )
    db.add(db_user)
    await db.commit()
    # Re-fetch with relationships (even if None) to satisfy response model safely
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
        )
        .where(User.id == db_user.id)
    )
    result = await db.execute(stmt)
    db_user_loaded = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = db_user_loaded.department
    _ = db_user_loaded.branch
    _ = db_user_loaded.position
    
    return UserResponse.model_validate(db_user_loaded)