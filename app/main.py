from fastapi import FastAPI, Depends, HTTPException
from app.auth import get_current_user
from app.storage import generate_presigned_post_url
from app.schemas import PresignedPostRequest, PresignedPostResponse
from app.metering import log_usage_event

app = FastAPI(title="Multi-Tenant Object Storage & Billing Engine", version="1.0.0")

@app.post("/upload-url", response_model=PresignedPostResponse)
async def get_upload_url(
    request: PresignedPostRequest, 
    user_id: str = Depends(get_current_user)
):
    """
    1. Authenticates User (Gatekeeper)
    2. Generates MinIO Presigned URL (Vault)
    3. Logs intent to Redis (Accountant)
    """
    try:
        # Step 1: Generate the MinIO Presigned POST data
        # Ensure 'generate_presigned_post_url' matches the function name in your storage.py
        url_data = generate_presigned_post_url(
            user_id=user_id,
            file_name=request.file_name,
            content_type=request.content_type
        )
        
        # Step 2: Log the event to Redis for Phase 2 Metering
        # We pass the user_id and filename to keep track of the request
        log_usage_event(user_id=user_id, file_name=request.file_name)
        
        # Step 3: Return the response to the user
        return PresignedPostResponse(**url_data)
        
    except Exception as e:
        # Catching and logging the error helps debug storage/redis connection issues
        print(f"Server Error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate upload URL: {str(e)}"
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "phase": 2}