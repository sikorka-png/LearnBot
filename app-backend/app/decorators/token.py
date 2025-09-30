from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.exceptions.token_exception import TokenExpiredException, InvalidTokenException
from app.exceptions.user_exception import UserNotFoundException
from app.services.auth_service import get_current_user


def get_current_user_from_cookie(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        return get_current_user(db, token)
    except TokenExpiredException:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenException:
        raise HTTPException(status_code=401, detail="Invalid token")
    except UserNotFoundException:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Unknown error")
