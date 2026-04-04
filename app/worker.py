import time
import json
from supabase import create_client, Client
from app.metering import redis
from app.config import settings

# Initialize Supabase Admin with Service Role Key
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

import boto3
from app.storage import get_minio_client # Use your existing MinIO client helper



def start_worker():
    s3 = get_minio_client()
    print("Accountant Worker Active. Using Real MinIO Metadata.")
    
    while True:
        raw_event = redis.lpop("billing_events")
        if not raw_event:
            time.sleep(5)
            continue

        try:
            event = json.loads(raw_event)
            user_id = event.get("user_id")
            file_name = event.get("file_name")
            
            # THE REAL PART: Get actual size from MinIO
            object_key = f"{user_id}/{file_name}"
            response = s3.head_object(Bucket=settings.storage_bucket_name, Key=object_key)
            actual_size = response['ContentLength'] # Size in bytes

            print(f"Processing: User {user_id} uploaded {actual_size} bytes.")

            # Update Supabase with the ACTUAL size
            supabase.rpc(
                'increment_user_storage', 
                {'u_id': user_id, 'bytes_to_add': actual_size}
            ).execute()

        except Exception as e:
            # If the file isn't in MinIO yet, we might need to retry later
            print(f"Object not found yet or error: {e}")
if __name__ == "__main__":
    start_worker()