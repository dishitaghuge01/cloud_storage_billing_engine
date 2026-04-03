import boto3
from botocore.client import Config
from app.config import settings

def get_minio_client():
    """
    Create and return a MinIO client configured for S3-compatible operations.
    """
    return boto3.client(
        's3',
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_root_user,
        aws_secret_access_key=settings.minio_root_password,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1'  # MinIO doesn't use regions, but boto3 requires it
    )

def generate_presigned_post_url(user_id: str, file_name: str, content_type: str) -> dict:
    """
    Generate a presigned POST URL for direct upload to MinIO.
    Implements multi-tenancy by prefixing the file key with user_id.
    """
    s3_client = get_minio_client()
    bucket_name = settings.storage_bucket_name
    key = f"{user_id}/{file_name}"

    # Generate presigned POST URL
    presigned_post = s3_client.generate_presigned_post(
        Bucket=bucket_name,
        Key=key,
        Fields={
            'Content-Type': content_type,
        },
        Conditions=[
            {'Content-Type': content_type},
            ['content-length-range', 1, 10485760],  # 1 byte to 10MB
        ],
        ExpiresIn=3600  # 1 hour
    )

    return {
        "url": presigned_post['url'],
        "fields": presigned_post['fields']
    }