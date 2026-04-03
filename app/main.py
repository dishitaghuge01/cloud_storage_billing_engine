from fastapi import FastAPI, Depends, HTTPException
from app.auth import get_current_user
from app.storage import generate_presigned_post_url
from app.schemas import PresignedPostRequest, PresignedPostResponse

app = FastAPI(title="Multi-Tenant Object Storage & Billing Engine", version="1.0.0")

@app.post("/upload-url", response_model=PresignedPostResponse)
async def get_upload_url(
    request: PresignedPostRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Generate a presigned POST URL for direct upload to MinIO.
    The file path will be prefixed with the user_id for multi-tenancy.
    """
    try:
        url_data = generate_presigned_post_url(
            user_id=user_id,
            file_name=request.file_name,
            content_type=request.content_type
        )
        return PresignedPostResponse(**url_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {str(e)}")