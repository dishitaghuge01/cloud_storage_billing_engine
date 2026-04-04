# Cloud Storage Billing Engine

A FastAPI-based multi-tenant cloud storage billing engine using MinIO for file storage, Supabase for usage state, and Razorpay for billing sync.

## Project Overview

This project provides a backend engine to:

- Create presigned upload URLs for direct MinIO uploads
- Meter uploads via Redis events and compute actual file sizes
- Track storage usage in Supabase
- Expose file management endpoints for list, download, and delete
- Serve billing dashboard data
- Sync usage into Razorpay add-ons for billing

## Core Components

- `app/main.py` - FastAPI application exposing the public API
- `app/auth.py` - JWT bearer verification using Supabase auth JWKs
- `app/storage.py` - MinIO / S3-compatible presigned upload and client helpers
- `app/metering.py` - Redis event logging for upload metering
- `app/worker.py` - Worker that consumes Redis billing events and updates Supabase with actual file sizes
- `app/billing_sync.py` - Razorpay sync script that bills Supabase usage and resets usage counts
- `app/schemas.py` - Pydantic request/response models
- `app/config.py` - Environment configuration via `pydantic-settings`
- `get_token.py` - Demo helper for obtaining a Supabase access token

## Requirements

- Python 3.11+ (or compatible)
- `pip install -r requirements.txt`
- MinIO or any S3-compatible object store
- Supabase project with service role key and auth enabled
- Upstash Redis account
- Razorpay account and subscription for billing add-ons

## Installation

```bash
python -m venv venv
source venv/Scripts/activate   # Windows
# or
source venv/bin/activate      # macOS / Linux
pip install -r requirements.txt
```

## Configuration

Create a `.env` file in the repo root with the following variables:

```env
MINIO_ENDPOINT=
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
STORAGE_BUCKET_NAME=
SUPABASE_JWT_SECRET=
SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_TEST_SUB_ID=
```

### Notes

- `MINIO_ENDPOINT` should be the full MinIO URL (including protocol).
- `STORAGE_BUCKET_NAME` is the MinIO bucket used for uploads.
- `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are used for admin Supabase operations.
- `RAZORPAY_TEST_SUB_ID` should refer to a valid Razorpay subscription ID for test billing.

## Supabase Requirements

The app expects a Supabase table / function setup similar to:

- `user_usage` table with columns:
  - `user_id`
  - `total_storage_used_bytes`
- A Postgres RPC function named `increment_user_storage` with parameters `u_id` and `bytes_to_add`

These are used by `app/worker.py` to increment usage after upload completion.

## Running the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API endpoints:

- `POST /upload-url` - request a presigned upload URL
- `GET /billing/usage` - get current usage and estimated bill
- `GET /files` - list a user's files
- `GET /download/{filename}` - get a presigned download URL
- `DELETE /files/{filename}` - delete a user file
- `GET /health` - health check

## Running the Worker

The worker processes Redis billing events and updates Supabase with the actual uploaded file size.

```bash
python app/worker.py
```

## Running Billing Sync

Use this script to bill pending storage usage through Razorpay and reset usage counters.

```bash
python app/billing_sync.py
```

## Authentication

The API uses HTTP Bearer tokens validated against Supabase JWT keys. The `get_current_user` dependency extracts the authenticated `user_id` from the token's `sub` claim.

### Example

```http
Authorization: Bearer <access_token>
```

## Upload Flow

1. Client requests `POST /upload-url` with `file_name` and `content_type`
2. Server returns a presigned POST URL to MinIO
3. Client uploads directly to MinIO
4. The app logs a Redis event via `app/metering.py`
5. `app/worker.py` consumes the event, reads the actual object size from MinIO, and updates Supabase

## Important Notes

- `get_token.py` is a demo helper and contains hard-coded test credentials. Only use it for local testing and remove or rotate secrets before deployment.
- `allow_origins` in `app/main.py` is currently set to `*`; lock this down for production use.
- The current billing logic charges a minimum of 1 GB at ₹5 per GB.

## Useful Commands

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
python app/worker.py
python app/billing_sync.py
```

## License

This repository does not include a license file. Add a license if you want to publish or share it publicly.
