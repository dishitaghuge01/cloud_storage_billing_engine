from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    minio_endpoint: str
    minio_root_user: str
    minio_root_password: str
    storage_bucket_name: str
    supabase_jwt_secret: str
    supabase_project_id: str

    # This is the ONLY one you need for Pydantic v2
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()