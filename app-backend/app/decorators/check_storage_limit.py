import inspect
import math
from datetime import datetime
from functools import wraps
import httpx
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.usage_stat import UsageStats


def _get_active_plan(db: Session, user_id: int):
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.is_active == True)
        .order_by(Subscription.start_date.desc())
        .first()
    )
    if not sub or sub.current_period_end < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active subscription.")
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Subscription plan not found.")
    return plan


def _get_latest_usage(db: Session, user_id: int) -> UsageStats | None:
    return (
        db.query(UsageStats)
        .filter(UsageStats.user_id == user_id)
        .order_by(UsageStats.period_start.desc())
        .first()
    )


def check_storage_limit(
        *,
        file_param: str | None = None,
        size_param: str | None = None,
        size_is_bytes: bool = True,
        inject_param: str | None = "upload_size_bytes",
):
    """
    Blokuje upload, gdy (usage.total_file_mb + nowy_plik_MB) >= plan.max_total_file_mb.
    - file_param: nazwa parametru UploadFile w endpointzie (np. 'upload_file')
    - size_param: alternatywnie nazwa parametru z rozmiarem
    - size_is_bytes: gdy size_param jest w MB ustaw False
    - inject_param: jeśli podane, dekorator przekaże policzony 'size_bytes' do endpointu
    """
    if not file_param and not size_param:
        raise RuntimeError("check_storage_limit: specify file_param or size_param")

    def decorator(endpoint_func):
        @wraps(endpoint_func)
        async def wrapper(*args, **kwargs):
            db: Session = kwargs.get("db")
            current_user = kwargs.get("current_user")
            if db is None or current_user is None:
                raise HTTPException(status_code=500, detail="Missing db/current_user in endpoint")

            size_bytes: int | None = None

            if file_param and file_param in kwargs:
                upload: UploadFile = kwargs[file_param]
                size_bytes = getattr(upload, "size", None)
                if size_bytes is None:
                    try:
                        f = upload.file
                        cur = f.tell()
                        f.seek(0, 2)
                        size_bytes = f.tell()
                        f.seek(cur, 0)
                    except Exception:
                        size_bytes = None

                if size_bytes is None:
                    data = await upload.read()
                    size_bytes = len(data)
                    await upload.seek(0)

            elif size_param and size_param in kwargs:
                val = kwargs[size_param]
                if val is None:
                    raise HTTPException(status_code=400, detail=f"Missing size in '{size_param}'")
                size_bytes = int(val) if size_is_bytes else int(math.ceil(float(val) * 1024 * 1024))
            else:
                raise HTTPException(status_code=400, detail="File/size parameter not found")

            if size_bytes is None:
                raise HTTPException(status_code=400, detail="Cannot determine upload size")

            new_mb = max(1, math.ceil(size_bytes / (1024 * 1024)))

            plan = _get_active_plan(db, current_user.id)
            max_allowed_mb = getattr(plan, "max_total_file_mb", None)
            if max_allowed_mb is None:
                if inject_param:
                    kwargs[inject_param] = size_bytes
                result = endpoint_func(*args, **kwargs)
                if inspect.isawaitable(result):
                    return await result
                return result

            usage = _get_latest_usage(db, current_user.id)
            current_mb = int(getattr(usage, "total_file_mb", 0) or 0)

            if (current_mb + new_mb) >= int(max_allowed_mb):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Storage limit exceeded: {current_mb} MB (used) + {new_mb} MB (upload) >= {max_allowed_mb} MB (limit)"
                )

            if inject_param:
                kwargs[inject_param] = size_bytes

            result = endpoint_func(*args, **kwargs)
            if inspect.isawaitable(result):
                return await result
            return result

        return wrapper

    return decorator


def check_storage_limit_for_url(
        url_param: str,
        *,
        inject_param: str = "url_size_bytes",
        timeout: float = 10.0
):
    """
    Sprawdza limit storage dla zasobu pod URL:
      - najpierw HEAD(Content-Length),
      - jeśli brak → GET stream i licz bajty (przerwij przy >= pozostały limit bajtów).
    Blokuje, gdy (current_total_mb + new_url_mb) >= max_total_file_mb.
    """

    def decorator(endpoint_func):
        @wraps(endpoint_func)
        async def wrapper(*args, **kwargs):
            db: Session = kwargs.get("db")
            current_user = kwargs.get("current_user")
            if db is None or current_user is None:
                raise HTTPException(status_code=500, detail="Missing db/current_user in endpoint")

            url = kwargs.get(url_param)
            if not url:
                raise HTTPException(status_code=400, detail=f"Missing '{url_param}' parameter")

            plan = _get_active_plan(db, current_user.id)
            max_allowed_mb = getattr(plan, "max_total_file_mb", None)
            if max_allowed_mb is None:
                result = endpoint_func(*args, **kwargs)
                if inspect.isawaitable(result):
                    return await result
                return result

            usage = _get_latest_usage(db, current_user.id)
            current_mb = int(getattr(usage, "total_file_mb", 0) or 0)
            remaining_mb = int(max_allowed_mb) - current_mb
            if remaining_mb <= 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Storage limit reached: {current_mb} MB used / {max_allowed_mb} MB limit."
                )

            size_bytes: int | None = None
            byte_limit = max(1, remaining_mb) * 1024 * 1024

            try:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    try:
                        head = await client.head(url)
                        cl = head.headers.get("Content-Length")
                        if cl and cl.isdigit():
                            size_bytes = int(cl)
                    except httpx.HTTPError:
                        pass

                    if size_bytes is None:
                        downloaded = 0
                        async with client.stream("GET", url) as resp:
                            resp.raise_for_status()
                            async for chunk in resp.aiter_bytes():
                                if not chunk:
                                    continue
                                downloaded += len(chunk)
                                if downloaded >= byte_limit:
                                    raise HTTPException(
                                        status_code=status.HTTP_403_FORBIDDEN,
                                        detail=f"File too large: exceeds remaining {remaining_mb} MB of storage."
                                    )
                        size_bytes = downloaded
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to probe url size: {e}")

            if size_bytes is None:
                raise HTTPException(status_code=400, detail="Could not determine URL file size.")

            new_mb = max(1, math.ceil(size_bytes / (1024 * 1024)))
            if (current_mb + new_mb) >= int(max_allowed_mb):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Storage limit exceeded: {current_mb} MB (used) + {new_mb} MB (url) >= {max_allowed_mb} MB (limit)"
                )

            kwargs[inject_param] = size_bytes

            result = endpoint_func(*args, **kwargs)
            if inspect.isawaitable(result):
                return await result
            return result

        return wrapper

    return decorator
