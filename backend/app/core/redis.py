"""Redis Client Configuration and Health Verification."""
import logging
from typing import Optional
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> Optional[redis.Redis]:
    """Retrieve or initialize the Redis client singleton.
    
    Returns:
        redis.Redis | None: Active Redis client instance, or None if unavailable.
    """
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
                decode_responses=True,
            )
        except Exception as exc:
            logger.warning(f"Could not initialize Redis client: {exc}")
            return None
    return _redis_client


def check_redis_connection() -> bool:
    """Verify whether Redis is reachable.
    
    Returns:
        bool: True if Redis responds to PING, False otherwise.
    """
    try:
        client = get_redis_client()
        if client is not None:
            return bool(client.ping())
    except Exception as exc:
        logger.debug(f"Redis ping failed: {exc}")
    return False
