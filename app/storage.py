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

def generate_presigned_put_url(user_id: str, file_name: str, content_type: str) -> dict:
    s3_client = get_minio_client()
    bucket_name = settings.storage_bucket_name
    key = f"{user_id}/{file_name}"

    presigned_url = s3_client.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            'Bucket': bucket_name,
            'Key': key,
            'ContentType': content_type,
        },
        ExpiresIn=3600
    )

    return {
        "url": presigned_url,
        "content_type": content_type
    }
def get_minio_client():
    return boto3.client(
        's3',
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_root_user,
        aws_secret_access_key=settings.minio_root_password,
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
        region_name='us-east-1'
    )