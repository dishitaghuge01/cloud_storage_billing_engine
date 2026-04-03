from pydantic import BaseModel
# Import the central settings we already fixed in config.py
from app.config import settings 

# Pydantic models for API requests and responses
class PresignedPostRequest(BaseModel):
    file_name: str
    content_type: str

class PresignedPostResponse(BaseModel):
    url: str
    fields: dict