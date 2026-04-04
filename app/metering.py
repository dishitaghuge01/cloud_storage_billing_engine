from upstash_redis import Redis
from app.config import settings
import time

redis = Redis(url=settings.upstash_redis_rest_url, token=settings.upstash_redis_rest_token)

def log_usage_event(user_id: str, file_name: str, expected_size: int = 0):
    """
    Pushes an upload event to a Redis List (the 'inbox').
    """
    event = {
        "user_id": user_id,
        "file_name": file_name,
        "size": expected_size,
        "timestamp": int(time.time()),
        "status": "pending"
    }
    # We use 'rpush' to add this to a list called 'billing_events'
    redis.rpush("billing_events", event)
    print(f"METERING: Logged intent for {user_id}")