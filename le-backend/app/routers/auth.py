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
    # Truncate password to 72 bytes to comply with bcrypt limitation
    truncated_password = plain_password[:72] if len(plain_password.encode('utf-8')) > 72 else plain_password
    return pwd_context.verify(truncated_password, hashed_password)

def get_password_hash(password: str) -> str:
    # Truncate password to 72 bytes to comply with bcrypt limitation
    truncated_password = password[:72] if len(password.encode('utf-8')) > 72 else password
    return pwd_context.hash(truncated_password)

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
            selectinload(User.portfolio).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.line_manager).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.status_changed_by_user).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
            ),
        )
        .where(User.username == username)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
    """Authenticate user with enhanced security including failed attempt tracking"""
    user = await get_user_by_username(db, username)
    if not user:
        return None
    
    # Check if account is locked due to too many failed attempts
    max_failed_attempts = 5  # Maximum failed attempts before lockout
    lockout_duration_minutes = 30  # Account lockout duration
    
    if user.failed_login_attempts >= max_failed_attempts:
        # Check if lockout period has expired
        if user.last_activity_at:
            lockout_expiry = user.last_activity_at + timedelta(minutes=lockout_duration_minutes)
            if datetime.now(timezone.utc) < lockout_expiry:
                # Account is still locked
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Account locked due to {max_failed_attempts} failed login attempts. Try again after {lockout_duration_minutes} minutes."
                )
        # Reset failed attempts if lockout period has expired
        user.failed_login_attempts = 0
        await db.commit()
    
    hashed: str = str(user.password_hash)  # narrow for type checker; runtime value is str
    
    # Verify password
    if not verify_password(password, hashed):
        # Increment failed login attempts
        user.failed_login_attempts += 1
        user.last_activity_at = datetime.now(timezone.utc)
        
        # Check if this attempt triggers account lockout
        if user.failed_login_attempts >= max_failed_attempts:
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked due to {max_failed_attempts} failed login attempts. Try again after {lockout_duration_minutes} minutes."
            )
        
        await db.commit()
        return None
    
    # Successful login - reset failed attempts and update login tracking
    user.failed_login_attempts = 0
    user.login_count = (user.login_count or 0) + 1
    user.last_activity_at = datetime.now(timezone.utc)
    await db.commit()
    
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
    
    # Eager-load relationships for current user with nested relationships
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.line_manager).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.status_changed_by_user).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
            ),
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
            selectinload(User.portfolio).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.line_manager).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.status_changed_by_user).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
            ),
        )
        .where(User.id == user.id)
    )
    result = await db.execute(stmt)
    user_with_rels = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user_with_rels.department
    _ = user_with_rels.branch
    _ = user_with_rels.position
    _ = user_with_rels.portfolio
    _ = user_with_rels.line_manager
    _ = user_with_rels.status_changed_by_user
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse(
            id=user_with_rels.id,
            username=user_with_rels.username,
            email=user_with_rels.email,
            first_name=user_with_rels.first_name,
            last_name=user_with_rels.last_name,
            phone_number=user_with_rels.phone_number,
            employee_id=user_with_rels.employee_id,
            role=user_with_rels.role,
            status=user_with_rels.status,
            status_reason=user_with_rels.status_reason,
            status_changed_at=user_with_rels.status_changed_at,
            status_changed_by=user_with_rels.status_changed_by,
            last_activity_at=user_with_rels.last_activity_at,
            login_count=user_with_rels.login_count,
            failed_login_attempts=user_with_rels.failed_login_attempts,
            onboarding_completed=user_with_rels.onboarding_completed,
            onboarding_completed_at=user_with_rels.onboarding_completed_at,
            created_at=user_with_rels.created_at,
            updated_at=user_with_rels.updated_at,
            last_login_at=user_with_rels.last_login_at,
            department=user_with_rels.department,
            branch=user_with_rels.branch,
            position=user_with_rels.position,
            # Manually construct portfolio to avoid deep nested loading issues
            portfolio=UserResponse(
                id=user_with_rels.portfolio.id,
                username=user_with_rels.portfolio.username,
                email=user_with_rels.portfolio.email,
                first_name=user_with_rels.portfolio.first_name,
                last_name=user_with_rels.portfolio.last_name,
                phone_number=user_with_rels.portfolio.phone_number,
                employee_id=user_with_rels.portfolio.employee_id,
                role=user_with_rels.portfolio.role,
                status=user_with_rels.portfolio.status,
                status_reason=user_with_rels.portfolio.status_reason,
                status_changed_at=user_with_rels.portfolio.status_changed_at,
                status_changed_by=user_with_rels.portfolio.status_changed_by,
                last_activity_at=user_with_rels.portfolio.last_activity_at,
                login_count=user_with_rels.portfolio.login_count,
                failed_login_attempts=user_with_rels.portfolio.failed_login_attempts,
                onboarding_completed=user_with_rels.portfolio.onboarding_completed,
                onboarding_completed_at=user_with_rels.portfolio.onboarding_completed_at,
                created_at=user_with_rels.portfolio.created_at,
                updated_at=user_with_rels.portfolio.updated_at,
                last_login_at=user_with_rels.portfolio.last_login_at,
                department=user_with_rels.portfolio.department,
                branch=user_with_rels.portfolio.branch,
                position=user_with_rels.portfolio.position,
                # Stop nested relationships to avoid infinite recursion
                portfolio=None,
                line_manager=None,
                status_changed_by_user=None,
            ) if user_with_rels.portfolio else None,
            # Manually construct line_manager to avoid deep nested loading issues
            line_manager=UserResponse(
                id=user_with_rels.line_manager.id,
                username=user_with_rels.line_manager.username,
                email=user_with_rels.line_manager.email,
                first_name=user_with_rels.line_manager.first_name,
                last_name=user_with_rels.line_manager.last_name,
                phone_number=user_with_rels.line_manager.phone_number,
                employee_id=user_with_rels.line_manager.employee_id,
                role=user_with_rels.line_manager.role,
                status=user_with_rels.line_manager.status,
                status_reason=user_with_rels.line_manager.status_reason,
                status_changed_at=user_with_rels.line_manager.status_changed_at,
                status_changed_by=user_with_rels.line_manager.status_changed_by,
                last_activity_at=user_with_rels.line_manager.last_activity_at,
                login_count=user_with_rels.line_manager.login_count,
                failed_login_attempts=user_with_rels.line_manager.failed_login_attempts,
                onboarding_completed=user_with_rels.line_manager.onboarding_completed,
                onboarding_completed_at=user_with_rels.line_manager.onboarding_completed_at,
                created_at=user_with_rels.line_manager.created_at,
                updated_at=user_with_rels.line_manager.updated_at,
                last_login_at=user_with_rels.line_manager.last_login_at,
                department=user_with_rels.line_manager.department,
                branch=user_with_rels.line_manager.branch,
                position=user_with_rels.line_manager.position,
                # Stop nested relationships to avoid infinite recursion
                portfolio=None,
                line_manager=None,
                status_changed_by_user=None,
            ) if user_with_rels.line_manager else None,
            # Manually construct status_changed_by_user to avoid deep nested loading issues
            status_changed_by_user=UserResponse(
                id=user_with_rels.status_changed_by_user.id,
                username=user_with_rels.status_changed_by_user.username,
                email=user_with_rels.status_changed_by_user.email,
                first_name=user_with_rels.status_changed_by_user.first_name,
                last_name=user_with_rels.status_changed_by_user.last_name,
                phone_number=user_with_rels.status_changed_by_user.phone_number,
                employee_id=user_with_rels.status_changed_by_user.employee_id,
                role=user_with_rels.status_changed_by_user.role,
                status=user_with_rels.status_changed_by_user.status,
                status_reason=user_with_rels.status_changed_by_user.status_reason,
                status_changed_at=user_with_rels.status_changed_by_user.status_changed_at,
                status_changed_by=user_with_rels.status_changed_by_user.status_changed_by,
                last_activity_at=user_with_rels.status_changed_by_user.last_activity_at,
                login_count=user_with_rels.status_changed_by_user.login_count,
                failed_login_attempts=user_with_rels.status_changed_by_user.failed_login_attempts,
                onboarding_completed=user_with_rels.status_changed_by_user.onboarding_completed,
                onboarding_completed_at=user_with_rels.status_changed_by_user.onboarding_completed_at,
                created_at=user_with_rels.status_changed_by_user.created_at,
                updated_at=user_with_rels.status_changed_by_user.updated_at,
                last_login_at=user_with_rels.status_changed_by_user.last_login_at,
                department=user_with_rels.status_changed_by_user.department,
                branch=user_with_rels.status_changed_by_user.branch,
                position=user_with_rels.status_changed_by_user.position,
                # Stop nested relationships to avoid infinite recursion
                portfolio=None,
                line_manager=None,
                status_changed_by_user=None,
            ) if user_with_rels.status_changed_by_user else None,
        )
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
            selectinload(User.portfolio),
            selectinload(User.line_manager),
            selectinload(User.status_changed_by_user),
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
    _ = user.portfolio
    _ = user.line_manager
    _ = user.status_changed_by_user
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    # current_user already has all relationships eagerly loaded
    # Manually construct response to avoid infinite recursion in nested relationships
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone_number=current_user.phone_number,
        employee_id=current_user.employee_id,
        role=current_user.role,
        status=current_user.status,
        status_reason=current_user.status_reason,
        status_changed_at=current_user.status_changed_at,
        status_changed_by=current_user.status_changed_by,
        last_activity_at=current_user.last_activity_at,
        login_count=current_user.login_count,
        failed_login_attempts=current_user.failed_login_attempts,
        onboarding_completed=current_user.onboarding_completed,
        onboarding_completed_at=current_user.onboarding_completed_at,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login_at=current_user.last_login_at,
        department=current_user.department,
        branch=current_user.branch,
        position=current_user.position,
        # Manually construct nested relationships to avoid deep recursion
        portfolio=UserResponse(
            id=current_user.portfolio.id,
            username=current_user.portfolio.username,
            email=current_user.portfolio.email,
            first_name=current_user.portfolio.first_name,
            last_name=current_user.portfolio.last_name,
            phone_number=current_user.portfolio.phone_number,
            employee_id=current_user.portfolio.employee_id,
            role=current_user.portfolio.role,
            status=current_user.portfolio.status,
            status_reason=current_user.portfolio.status_reason,
            status_changed_at=current_user.portfolio.status_changed_at,
            status_changed_by=current_user.portfolio.status_changed_by,
            last_activity_at=current_user.portfolio.last_activity_at,
            login_count=current_user.portfolio.login_count,
            failed_login_attempts=current_user.portfolio.failed_login_attempts,
            onboarding_completed=current_user.portfolio.onboarding_completed,
            onboarding_completed_at=current_user.portfolio.onboarding_completed_at,
            created_at=current_user.portfolio.created_at,
            updated_at=current_user.portfolio.updated_at,
            last_login_at=current_user.portfolio.last_login_at,
            department=current_user.portfolio.department,
            branch=current_user.portfolio.branch,
            position=current_user.portfolio.position,
            # Stop nested relationships to avoid infinite recursion
            portfolio=None,
            line_manager=None,
            status_changed_by_user=None,
        ) if current_user.portfolio else None,
        line_manager=UserResponse(
            id=current_user.line_manager.id,
            username=current_user.line_manager.username,
            email=current_user.line_manager.email,
            first_name=current_user.line_manager.first_name,
            last_name=current_user.line_manager.last_name,
            phone_number=current_user.line_manager.phone_number,
            employee_id=current_user.line_manager.employee_id,
            role=current_user.line_manager.role,
            status=current_user.line_manager.status,
            status_reason=current_user.line_manager.status_reason,
            status_changed_at=current_user.line_manager.status_changed_at,
            status_changed_by=current_user.line_manager.status_changed_by,
            last_activity_at=current_user.line_manager.last_activity_at,
            login_count=current_user.line_manager.login_count,
            failed_login_attempts=current_user.line_manager.failed_login_attempts,
            onboarding_completed=current_user.line_manager.onboarding_completed,
            onboarding_completed_at=current_user.line_manager.onboarding_completed_at,
            created_at=current_user.line_manager.created_at,
            updated_at=current_user.line_manager.updated_at,
            last_login_at=current_user.line_manager.last_login_at,
            department=current_user.line_manager.department,
            branch=current_user.line_manager.branch,
            position=current_user.line_manager.position,
            # Stop nested relationships to avoid infinite recursion
            portfolio=None,
            line_manager=None,
            status_changed_by_user=None,
        ) if current_user.line_manager else None,
        status_changed_by_user=UserResponse(
            id=current_user.status_changed_by_user.id,
            username=current_user.status_changed_by_user.username,
            email=current_user.status_changed_by_user.email,
            first_name=current_user.status_changed_by_user.first_name,
            last_name=current_user.status_changed_by_user.last_name,
            phone_number=current_user.status_changed_by_user.phone_number,
            employee_id=current_user.status_changed_by_user.employee_id,
            role=current_user.status_changed_by_user.role,
            status=current_user.status_changed_by_user.status,
            status_reason=current_user.status_changed_by_user.status_reason,
            status_changed_at=current_user.status_changed_by_user.status_changed_at,
            status_changed_by=current_user.status_changed_by_user.status_changed_by,
            last_activity_at=current_user.status_changed_by_user.last_activity_at,
            login_count=current_user.status_changed_by_user.login_count,
            failed_login_attempts=current_user.status_changed_by_user.failed_login_attempts,
            onboarding_completed=current_user.status_changed_by_user.onboarding_completed,
            onboarding_completed_at=current_user.status_changed_by_user.onboarding_completed_at,
            created_at=current_user.status_changed_by_user.created_at,
            updated_at=current_user.status_changed_by_user.updated_at,
            last_login_at=current_user.status_changed_by_user.last_login_at,
            department=current_user.status_changed_by_user.department,
            branch=current_user.status_changed_by_user.branch,
            position=current_user.status_changed_by_user.position,
            # Stop nested relationships to avoid infinite recursion
            portfolio=None,
            line_manager=None,
            status_changed_by_user=None,
        ) if current_user.status_changed_by_user else None,
    )

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
            selectinload(User.portfolio),
            selectinload(User.line_manager),
            selectinload(User.status_changed_by_user),
        )
        .where(User.id == db_user.id)
    )
    result = await db.execute(stmt)
    db_user_loaded = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = db_user_loaded.department
    _ = db_user_loaded.branch
    _ = db_user_loaded.position
    _ = db_user_loaded.portfolio
    _ = db_user_loaded.line_manager
    _ = db_user_loaded.status_changed_by_user
    
    return UserResponse.model_validate(db_user_loaded)