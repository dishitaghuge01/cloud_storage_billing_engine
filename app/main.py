from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.auth import get_current_user
from app.storage import get_minio_client, generate_presigned_post_url
from app.schemas import PresignedPostRequest, PresignedPostResponse
from app.metering import log_usage_event
from app.config import settings
from supabase import create_client, Client

app = FastAPI(title="Multi-Tenant Cloud Storage Engine", version="1.0.0")

# --- CORS SETTINGS (Required for Lovable/Frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client for usage queries
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

# --- PHASE 1 & 2: UPLOAD & METERING ---

@app.post("/upload-url", response_model=PresignedPostResponse)
async def get_upload_url(
    request: PresignedPostRequest, 
    user_id: str = Depends(get_current_user)
):
    try:
        url_data = generate_presigned_post_url(
            user_id=user_id,
            file_name=request.file_name,
            content_type=request.content_type
        )
        log_usage_event(user_id=user_id, file_name=request.file_name)
        return PresignedPostResponse(**url_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# --- PHASE 4: BILLING DASHBOARD ---

@app.get("/billing/usage")
async def get_user_billing(user_id: str = Depends(get_current_user)):
    """
    Returns the current pending storage bill and usage for the dashboard.
    """
    try:
        # Fetch data from the Supabase user_usage table
        result = supabase.table("user_usage").select("total_storage_used_bytes").eq("user_id", user_id).execute()
        
        # If no record exists, they have 0 usage
        bytes_used = result.data[0]['total_storage_used_bytes'] if result.data else 0
        
        # Calculate stats
        gb_used = bytes_used / (1024**3)
        # Assuming ₹5 per GB logic (matches your billing_sync.py)
        estimated_inr = round(max(1 if bytes_used > 0 else 0, gb_used) * 5, 2) 
        
        return {
            "user_id": user_id,
            "total_bytes": bytes_used,
            "gb_formatted": f"{gb_used:.4f} GB",
            "estimated_bill_inr": estimated_inr,
            "currency": "INR"
        }
    except Exception as e:
        print(f"Billing fetch error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve billing data")

# --- PHASE 5: ACCESS & MANAGEMENT (VAULT OPERATIONS) ---

@app.get("/files")
async def list_files(user_id: str = Depends(get_current_user)):
    s3 = get_minio_client()
    prefix = f"{user_id}/"
    try:
        response = s3.list_objects_v2(Bucket=settings.storage_bucket_name, Prefix=prefix)
        file_list = []
        if 'Contents' in response:
            for obj in response['Contents']:
                clean_name = obj['Key'].replace(prefix, "")
                if clean_name:
                    file_list.append({
                        "name": clean_name,
                        "size_bytes": obj['Size'],
                        "last_modified": obj['LastModified']
                    })
        return {"user_id": user_id, "files": file_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not list files: {str(e)}")

@app.get("/download/{filename}")
async def get_download_link(filename: str, user_id: str = Depends(get_current_user)):
    s3 = get_minio_client()
    object_key = f"{user_id}/{filename}"
    try:
        s3.head_object(Bucket=settings.storage_bucket_name, Key=object_key)
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.storage_bucket_name, 'Key': object_key},
            ExpiresIn=3600
        )
        return {"filename": filename, "download_url": url}
    except Exception:
        raise HTTPException(status_code=404, detail="File not found.")

@app.delete("/files/{filename}")
async def delete_file(filename: str, user_id: str = Depends(get_current_user)):
    s3 = get_minio_client()
    object_key = f"{user_id}/{filename}"
    try:
        s3.delete_object(Bucket=settings.storage_bucket_name, Key=object_key)
        return {"message": f"Successfully deleted {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "active", "version": "1.0.0", "engine": "MinIO+Razorpay"}