from typing import Generator
import time

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import SessionLocal

security = HTTPBearer()


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    t0 = time.time()
    print(f"[AUTH] ===== get_current_user START =====")

    token = credentials.credentials
    print(f"[AUTH] Received token: {token[:20]}..." if token else "[AUTH] No token received")
    print(f"[AUTH] After token extract: {time.time()-t0:.3f}s")

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        print(f"[AUTH] After JWT decode: {time.time()-t0:.3f}s")

        user_id_str = payload.get("sub")
        if user_id_str is None:
            print(f"[AUTH] FAILED: Token payload missing 'sub' field")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = int(user_id_str)
        print(f"[AUTH] Token decoded successfully. User ID: {user_id}")
        print(f"[AUTH] After user_id parse: {time.time()-t0:.3f}s")
    except jwt.ExpiredSignatureError:
        print(f"[AUTH] FAILED: Token expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except (jwt.PyJWTError, ValueError) as e:
        print(f"[AUTH] FAILED: JWT decode error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    print(f"[AUTH] BEFORE DB QUERY: {time.time()-t0:.3f}s")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    print(f"[AUTH] AFTER DB QUERY: {time.time()-t0:.3f}s")

    if user is None:
        print(f"[AUTH] FAILED: User ID {user_id} not found in database")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        print(f"[AUTH] FAILED: User {user.email} is inactive")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    print(f"[AUTH] SUCCESS: Authenticated as {user.email}")
    print(f"[AUTH] ===== get_current_user COMPLETE: {time.time()-t0:.3f}s =====")
    return user
