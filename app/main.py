import razorpay
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.auth import get_current_user
from app.storage import get_minio_client, generate_presigned_post_url
from app.schemas import PresignedPostRequest, PresignedPostResponse
from app.metering import log_usage_event
from app.config import settings
from supabase import create_client, Client

app = FastAPI(title="Nexus - Multi-Tenant Cloud Storage Engine", version="1.0.0")

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
razorpay_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

# --- PHASE 1 & 2: UPLOAD & METERING ---

@app.post("/upload-url", response_model=PresignedPostResponse)
async def get_upload_url(request: PresignedPostRequest, user_id: str = Depends(get_current_user)):
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

# --- PHASE 4: BILLING & PAYMENTS ---

@app.get("/billing/usage")
async def get_user_billing(user_id: str = Depends(get_current_user)):
    try:
        result = supabase.table("user_usage").select("total_storage_used_bytes").eq("user_id", user_id).execute()
        bytes_used = result.data[0]['total_storage_used_bytes'] if result.data else 0
        gb_used = bytes_used / (1024**3)
        
        # Consistent pricing: ₹5 per GB, minimum ₹1 if any data exists
        estimated_inr = round(max(1 if bytes_used > 0 else 0, gb_used) * 5, 2) 
        
        return {
            "user_id": user_id,
            "gb_formatted": f"{gb_used:.4f} GB",
            "estimated_bill_inr": estimated_inr,
            "currency": "INR"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not retrieve billing data")

@app.post("/billing/pay")
async def create_payment_order(user_id: str = Depends(get_current_user)):
    """
    Step 1: Create a real Razorpay Order based on Supabase usage data.
    """
    try:
        # 1. Get actual usage from DB
        result = supabase.table("user_usage").select("total_storage_used_bytes").eq("user_id", user_id).execute()
        bytes_used = result.data[0]['total_storage_used_bytes'] if result.data else 0
        
        if bytes_used <= 0:
            raise HTTPException(status_code=400, detail="No pending balance to pay.")

        # 2. Calculate amount in Paise (Razorpay requirement: ₹1 = 100 paise)
        gb_used = bytes_used / (1024**3)
        amount_inr = max(1, gb_used) * 5
        amount_paise = int(amount_inr * 100)

        # 3. Create Razorpay Order
        order_params = {
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': f"receipt_user_{user_id[:8]}",
            'notes': {
                'user_id': user_id,
                'type': 'storage_billing'
            }
        }
        order = razorpay_client.order.create(data=order_params)
        
        return {
            "order_id": order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "key": settings.razorpay_key_id  # Frontend needs this to open the modal
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment initialization failed: {str(e)}")

@app.post("/billing/verify")
async def verify_payment(
    user_id: str = Depends(get_current_user),
    payload: dict = Body(...)
):
    """
    Step 2: Verify the signature sent by Razorpay to ensure payment was legitimate.
    """
    try:
        # Verify the signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payload.get('razorpay_order_id'),
            'razorpay_payment_id': payload.get('razorpay_payment_id'),
            'razorpay_signature': payload.get('razorpay_signature')
        })

        # Logic: Reset the user's usage in Supabase after successful payment
        supabase.table("user_usage").update({"total_storage_used_bytes": 0}).eq("user_id", user_id).execute()
        
        return {"status": "success", "message": "Payment verified and balance reset."}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payment signature. Fraud detected.")

# --- PHASE 5: ACCESS & MANAGEMENT ---

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
        raise HTTPException(status_code=500, detail=f"Listing failed: {str(e)}")

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