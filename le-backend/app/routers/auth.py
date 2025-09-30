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
from app.models import User, Position
from app.schemas import TokenResponse, UserResponse, UserLogin, UserCreate
from app.core.config import settings
from typing import Optional as TypingOptional

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate password to 72 bytes to comply with bcrypt limitation
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        truncated_password = password_bytes[:72].decode('utf-8', errors='ignore')
    else:
        truncated_password = plain_password
    return pwd_context.verify(truncated_password, hashed_password)

def get_password_hash(password: str) -> str:
    # Truncate password to 72 bytes to comply with bcrypt limitation
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        truncated_password = password_bytes[:72].decode('utf-8', errors='ignore')
    else:
        truncated_password = password
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

def create_safe_user_response(user: User, max_depth: int = 2, visited_users: Optional[set] = None) -> UserResponse:
    """
    Safely create UserResponse from User model, avoiding circular references
    and infinite recursion through proper depth limiting and visited user tracking.

    Args:
        user: The User model instance to convert
        max_depth: Maximum depth for nested relationships (default: 2)
        visited_users: Set of user IDs already processed to detect circular references

    Returns:
        UserResponse with properly handled relationships
    """
    # Initialize visited_users set if not provided
    if visited_users is None:
        visited_users = set()

    # Check for circular reference - if we've already processed this user, return basic info
    if user.id in visited_users:
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            employee_id=user.employee_id,
            role=user.role,
            status=user.status,
            status_reason=user.status_reason,
            status_changed_at=user.status_changed_at,
            status_changed_by=user.status_changed_by,
            last_activity_at=user.last_activity_at,
            login_count=user.login_count,
            failed_login_attempts=user.failed_login_attempts,
            onboarding_completed=user.onboarding_completed,
            onboarding_completed_at=user.onboarding_completed_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login_at=user.last_login_at,
            department=None,
            branch=None,
            position=None,
            portfolio=None,
            line_manager=None,
            status_changed_by_user=None,
        )

    # Add current user to visited set
    visited_users.add(user.id)

    # Check depth limit
    if max_depth <= 0:
        # Return basic user info without relationships to break recursion
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            employee_id=user.employee_id,
            role=user.role,
            status=user.status,
            status_reason=user.status_reason,
            status_changed_at=user.status_changed_at,
            status_changed_by=user.status_changed_by,
            last_activity_at=user.last_activity_at,
            login_count=user.login_count,
            failed_login_attempts=user.failed_login_attempts,
            onboarding_completed=user.onboarding_completed,
            onboarding_completed_at=user.onboarding_completed_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login_at=user.last_login_at,
            department=None,
            branch=None,
            position=None,
            portfolio=None,
            line_manager=None,
            status_changed_by_user=None,
        )

    try:
        # Convert to dictionary to avoid lazy loading issues
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "role": user.role,
            "status": user.status,
            "status_reason": user.status_reason,
            "status_changed_at": user.status_changed_at,
            "status_changed_by": user.status_changed_by,
            "last_activity_at": user.last_activity_at,
            "login_count": user.login_count,
            "failed_login_attempts": user.failed_login_attempts,
            "onboarding_completed": user.onboarding_completed,
            "onboarding_completed_at": user.onboarding_completed_at,
            "department_id": user.department_id,
            "branch_id": user.branch_id,
            "position_id": user.position_id,
            "portfolio_id": user.portfolio_id,
            "line_manager_id": user.line_manager_id,
            "profile_image_url": user.profile_image_url,
            "employee_id": user.employee_id,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "last_login_at": user.last_login_at,
            "department": user.department,
            "branch": user.branch,
            "position": user.position,
            "portfolio": user.portfolio,
            "line_manager": user.line_manager,
            "status_changed_by_user": user.status_changed_by_user,
        }

        # Convert nested SQLAlchemy objects to dictionaries
        if user_data.get("department"):
            user_data["department"] = {
                "id": user_data["department"].id,
                "name": user_data["department"].name,
                "code": user_data["department"].code,
                "description": user_data["department"].description,
                "is_active": user_data["department"].is_active,
                "created_at": user_data["department"].created_at,
                "updated_at": user_data["department"].updated_at,
            } if hasattr(user_data["department"], 'id') else None

        if user_data.get("branch"):
            user_data["branch"] = {
                "id": user_data["branch"].id,
                "name": user_data["branch"].name,
                "code": user_data["branch"].code,
                "address": user_data["branch"].address,
                "phone_number": user_data["branch"].phone_number,
                "email": user_data["branch"].email,
                "is_active": user_data["branch"].is_active,
                "created_at": user_data["branch"].created_at,
                "updated_at": user_data["branch"].updated_at,
            } if hasattr(user_data["branch"], 'id') else None

        if user_data.get("position"):
            user_data["position"] = {
                "id": user_data["position"].id,
                "name": user_data["position"].name,
                "description": user_data["position"].description,
                "is_active": user_data["position"].is_active,
                "created_at": user_data["position"].created_at,
                "updated_at": user_data["position"].updated_at,
            } if hasattr(user_data["position"], 'id') else None

        # Handle portfolio and line_manager relationships
        if user_data.get("portfolio"):
            user_data["portfolio"] = {
                "id": user_data["portfolio"].id,
                "username": user_data["portfolio"].username,
                "email": user_data["portfolio"].email,
                "first_name": user_data["portfolio"].first_name,
                "last_name": user_data["portfolio"].last_name,
                "phone_number": user_data["portfolio"].phone_number,
                "role": user_data["portfolio"].role,
                "status": user_data["portfolio"].status,
                "status_reason": user_data["portfolio"].status_reason,
                "status_changed_at": user_data["portfolio"].status_changed_at,
                "status_changed_by": user_data["portfolio"].status_changed_by,
                "last_activity_at": user_data["portfolio"].last_activity_at,
                "login_count": user_data["portfolio"].login_count,
                "failed_login_attempts": user_data["portfolio"].failed_login_attempts,
                "onboarding_completed": user_data["portfolio"].onboarding_completed,
                "onboarding_completed_at": user_data["portfolio"].onboarding_completed_at,
                "department_id": user_data["portfolio"].department_id,
                "branch_id": user_data["portfolio"].branch_id,
                "position_id": user_data["portfolio"].position_id,
                "portfolio_id": user_data["portfolio"].portfolio_id,
                "line_manager_id": user_data["portfolio"].line_manager_id,
                "profile_image_url": user_data["portfolio"].profile_image_url,
                "employee_id": user_data["portfolio"].employee_id,
                "created_at": user_data["portfolio"].created_at,
                "updated_at": user_data["portfolio"].updated_at,
                "last_login_at": user_data["portfolio"].last_login_at,
                "department": None,  # Avoid infinite nesting
                "branch": None,      # Avoid infinite nesting
                "position": None,    # Avoid infinite nesting
                "portfolio": None,   # Avoid infinite nesting
                "line_manager": None, # Avoid infinite nesting
                "status_changed_by_user": None
            } if hasattr(user_data["portfolio"], 'id') else None

        if user_data.get("line_manager"):
            user_data["line_manager"] = {
                "id": user_data["line_manager"].id,
                "username": user_data["line_manager"].username,
                "email": user_data["line_manager"].email,
                "first_name": user_data["line_manager"].first_name,
                "last_name": user_data["line_manager"].last_name,
                "phone_number": user_data["line_manager"].phone_number,
                "role": user_data["line_manager"].role,
                "status": user_data["line_manager"].status,
                "status_reason": user_data["line_manager"].status_reason,
                "status_changed_at": user_data["line_manager"].status_changed_at,
                "status_changed_by": user_data["line_manager"].status_changed_by,
                "last_activity_at": user_data["line_manager"].last_activity_at,
                "login_count": user_data["line_manager"].login_count,
                "failed_login_attempts": user_data["line_manager"].failed_login_attempts,
                "onboarding_completed": user_data["line_manager"].onboarding_completed,
                "onboarding_completed_at": user_data["line_manager"].onboarding_completed_at,
                "department_id": user_data["line_manager"].department_id,
                "branch_id": user_data["line_manager"].branch_id,
                "position_id": user_data["line_manager"].position_id,
                "portfolio_id": user_data["line_manager"].portfolio_id,
                "line_manager_id": user_data["line_manager"].line_manager_id,
                "profile_image_url": user_data["line_manager"].profile_image_url,
                "employee_id": user_data["line_manager"].employee_id,
                "created_at": user_data["line_manager"].created_at,
                "updated_at": user_data["line_manager"].updated_at,
                "last_login_at": user_data["line_manager"].last_login_at,
                "department": None,  # Avoid infinite nesting
                "branch": None,      # Avoid infinite nesting
                "position": None,    # Avoid infinite nesting
                "portfolio": None,   # Avoid infinite nesting
                "line_manager": None, # Avoid infinite nesting
                "status_changed_by_user": None
            } if hasattr(user_data["line_manager"], 'id') else None

        return UserResponse.model_validate(user_data)
    except Exception as e:
        # Fallback to manual construction with proper circular reference handling
        print(f"Warning: model_validate failed, using manual construction with depth {max_depth}: {e}")

        try:
            # Safely get relationships, handling lazy loading issues
            department = getattr(user, 'department', None)
            branch = getattr(user, 'branch', None)
            position = getattr(user, 'position', None)
            portfolio = getattr(user, 'portfolio', None)
            line_manager = getattr(user, 'line_manager', None)
            status_changed_by_user = getattr(user, 'status_changed_by_user', None)

            # Recursively create nested relationships with reduced depth and visited set
            portfolio_response = None
            if portfolio and portfolio.id != user.id:  # Avoid self-reference
                try:
                    portfolio_response = create_safe_user_response(
                        portfolio,
                        max_depth - 1,
                        visited_users.copy()
                    )
                except Exception as portfolio_error:
                    print(f"Warning: Failed to process portfolio relationship: {portfolio_error}")
                    portfolio_response = None

            line_manager_response = None
            if line_manager and line_manager.id != user.id:  # Avoid self-reference
                try:
                    line_manager_response = create_safe_user_response(
                        line_manager,
                        max_depth - 1,
                        visited_users.copy()
                    )
                except Exception as line_manager_error:
                    print(f"Warning: Failed to process line_manager relationship: {line_manager_error}")
                    line_manager_response = None

            status_changed_by_user_response = None
            if status_changed_by_user and status_changed_by_user.id != user.id:  # Avoid self-reference
                try:
                    status_changed_by_user_response = create_safe_user_response(
                        status_changed_by_user,
                        max_depth - 1,
                        visited_users.copy()
                    )
                except Exception as status_error:
                    print(f"Warning: Failed to process status_changed_by_user relationship: {status_error}")
                    status_changed_by_user_response = None

            return UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                phone_number=user.phone_number,
                employee_id=user.employee_id,
                role=user.role,
                status=user.status,
                status_reason=user.status_reason,
                status_changed_at=user.status_changed_at,
                status_changed_by=user.status_changed_by,
                last_activity_at=user.last_activity_at,
                login_count=user.login_count,
                failed_login_attempts=user.failed_login_attempts,
                onboarding_completed=user.onboarding_completed,
                onboarding_completed_at=user.onboarding_completed_at,
                created_at=user.created_at,
                updated_at=user.updated_at,
                last_login_at=user.last_login_at,
                department=department,
                branch=branch,
                position=position,
                portfolio=portfolio_response,
                line_manager=line_manager_response,
                status_changed_by_user=status_changed_by_user_response,
            )

        except Exception as construction_error:
            # Final fallback - return basic user info if all else fails
            print(f"Error: Manual construction failed, returning basic user info: {construction_error}")
            return UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                phone_number=user.phone_number,
                employee_id=user.employee_id,
                role=user.role,
                status=user.status,
                status_reason=user.status_reason,
                status_changed_at=user.status_changed_at,
                status_changed_by=user.status_changed_by,
                last_activity_at=user.last_activity_at,
                login_count=user.login_count,
                failed_login_attempts=user.failed_login_attempts,
                onboarding_completed=user.onboarding_completed,
                onboarding_completed_at=user.onboarding_completed_at,
                created_at=user.created_at,
                updated_at=user.updated_at,
                last_login_at=user.last_login_at,
                department=None,
                branch=None,
                position=None,
                portfolio=None,
                line_manager=None,
                status_changed_by_user=None,
            )

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    # Eager-load relationships to avoid lazy IO during Pydantic validation
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position).options(
                selectinload(Position.users)
            ),
            selectinload(User.portfolio).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.line_manager).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.status_changed_by_user).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
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

    # Enhanced token debugging
    print("🔐 [DEBUG get_current_user] Token validation started:", {
        "token_length": len(token) if token else 0,
        "token_prefix": token[:20] + "..." if token and len(token) > 20 else token,
        "secret_key_length": len(settings.SECRET_KEY),
        "algorithm": settings.ALGORITHM,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        # Debug payload contents
        print("🔐 [DEBUG get_current_user] Token decoded successfully:", {
            "payload_keys": list(payload.keys()),
            "subject": payload.get("sub"),
            "exp": payload.get("exp"),
            "iat": payload.get("iat"),
            "exp_datetime": datetime.fromtimestamp(payload.get("exp", 0), timezone.utc).isoformat() if payload.get("exp") else None,
            "current_time": datetime.now(timezone.utc).isoformat(),
            "is_expired": payload.get("exp", 0) < datetime.now(timezone.utc).timestamp() if payload.get("exp") else False,
        })

        username_val = payload.get("sub")
        if not isinstance(username_val, str) or not username_val:
            print("🚨 [DEBUG get_current_user] Invalid subject in token:", {
                "username_val": username_val,
                "type": type(username_val),
            })
            raise credentials_exception
        username: str = username_val

        print("🔐 [DEBUG get_current_user] Username extracted:", {
            "username": username,
        })

    except JWTError as e:
        print("🚨 [DEBUG get_current_user] JWT decode failed:", {
            "error": str(e),
            "error_type": type(e).__name__,
            "token_length": len(token) if token else 0,
            "secret_key_length": len(settings.SECRET_KEY),
            "algorithm": settings.ALGORITHM,
        })
        raise credentials_exception
    
    # Eager-load relationships for current user with nested relationships
    print("🔐 [DEBUG get_current_user] Looking up user in database:", {
        "username": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position).options(
                selectinload(Position.users)
            ),
            selectinload(User.portfolio).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.line_manager).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.status_changed_by_user).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
            ),
        )
        .where(User.username == username)
    )

    try:
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None:
            print("🚨 [DEBUG get_current_user] User not found in database:", {
                "username": username,
                "searched_at": datetime.now(timezone.utc).isoformat(),
            })
            raise credentials_exception
        else:
            print("✅ [DEBUG get_current_user] User found in database:", {
                "user_id": user.id,
                "username": user.username,
                "role": user.role,
                "status": user.status,
                "found_at": datetime.now(timezone.utc).isoformat(),
            })

        return user

    except Exception as e:
        print("🚨 [DEBUG get_current_user] Database error during user lookup:", {
            "username": username,
            "error": str(e),
            "error_type": type(e).__name__,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        raise credentials_exception

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
            selectinload(User.position).options(
                selectinload(Position.users)
            ),
            selectinload(User.portfolio).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.line_manager).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
                selectinload(User.portfolio),
                selectinload(User.line_manager),
                selectinload(User.status_changed_by_user),
            ),
            selectinload(User.status_changed_by_user).options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position).options(
                    selectinload(Position.users)
                ),
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
    
    # Use the safe helper function to create UserResponse with proper circular reference handling
    user_response = create_safe_user_response(user_with_rels, max_depth=2)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=user_response
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
            selectinload(User.position).options(
                selectinload(Position.users)
            ),
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
    
    # Use the safe helper function to create UserResponse with proper circular reference handling
    user_response = create_safe_user_response(user, max_depth=2)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    # Use the safe helper function to create UserResponse with proper circular reference handling
    return create_safe_user_response(current_user, max_depth=2)

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

    await db.flush()

    await db.refresh(db_user)  # Use flush instead of commit for async compatibility
    await db.refresh(db_user)  # Ensure the object is properly loaded
    # Re-fetch with relationships (even if None) to satisfy response model safely
    stmt = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position).options(
                selectinload(Position.users)
            ),
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
    
    # Use the safe helper function to create UserResponse with proper circular reference handling
    return create_safe_user_response(db_user_loaded, max_depth=2)