from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MinIO Settings
    minio_endpoint: str
    minio_root_user: str
    minio_root_password: str
    storage_bucket_name: str
    
    # Supabase Settings
    supabase_jwt_secret: str
    supabase_project_id: str
    supabase_url: str
    supabase_service_role_key: str
    # Upstash Redis Settings (Add these two lines)
    upstash_redis_rest_url: str
    upstash_redis_rest_token: str
    razorpay_key_id: str
    razorpay_key_secret: str
    razorpay_test_sub_id: str
    # Pydantic v2 Config
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()