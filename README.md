# Nexus Storage: Multi-Tenant Cloud Storage Billing Engine

A production-ready, event-driven cloud storage platform with integrated billing, built with FastAPI, React, and modern cloud services.

**Live demo:** [cloud-storage-billing-engine.vercel.app](https://cloud-storage-billing-engine.vercel.app)

## Key Technical Highlights

### Decoupled Architecture
Frontend uploads directly to object storage via Pre-signed POST, bypassing the API bottleneck for optimal performance and scalability. Uses MinIO locally and Cloudflare R2 in production — both speak the S3 API, so the same client code works against either.

### Event-Driven Metering
Uses a Redis-backed worker to process storage metrics asynchronously, ensuring accurate billing based on actual file sizes rather than client-reported data.

### Multi-Tenant Isolation
Strict path-based separation ensuring users can never access each other's objects, with JWT-based authentication and authorization.

## Overview

Nexus Storage provides a complete cloud storage solution featuring:

- **Direct S3-Compatible Uploads**: Pre-signed URLs for efficient, serverless file uploads
- **Real-Time Metering**: Event-driven usage tracking with Redis and background workers
- **Secure Multi-Tenancy**: Isolated user storage with Supabase authentication
- **Integrated Billing**: Razorpay-powered payment processing with usage-based pricing
- **Modern Frontend**: React TypeScript dashboard with real-time updates
- **RESTful API**: FastAPI backend with comprehensive documentation

## Architecture

### Local Development

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React         │    │   FastAPI       │    │   MinIO         │
│   Frontend      │◄──►│   Backend       │◄──►│   (S3-Compat,   │
│   (Vite)        │    │   + Worker      │    │   local Docker) │
│                 │    │   (Python)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Redis         │
│   Auth & DB     │    │   Metering      │
└─────────────────┘    └─────────────────┘
```

### Production

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React         │    │   FastAPI       │    │   Cloudflare R2 │
│   Frontend      │◄──►│   Backend       │◄──►│   (S3-Compat)   │
│   (Vercel)      │    │   + Worker      │    │   Storage       │
│                 │    │   (Render)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Upstash       │
│   Auth & DB     │    │   Redis         │
└─────────────────┘    └─────────────────┘
```

> **Note on the worker:** the metering worker (`app/worker.py`) was originally deployed as a separate Render Background Worker service. Render's free tier doesn't support that service type, so the worker loop now runs as a daemon thread launched from `app/main.py` on FastAPI startup — it rides along with the web service instead of needing its own (paid) deployment. Locally, you can still run it either way (see below).

## Tech Stack

### Backend
- **FastAPI** - High-performance async web framework
- **Supabase** - Authentication, database, and real-time subscriptions
- **MinIO** (local dev) / **Cloudflare R2** (production) - S3-compatible object storage
- **Redis** - Event-driven metering and background processing (self-hosted locally, Upstash in production)
- **Razorpay** - Payment processing and billing
- **Pydantic** - Data validation and settings management

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Query** - Powerful data fetching and caching
- **Supabase JS** - Client-side authentication

### Deployment
- **Vercel** - Frontend hosting
- **Render** - Backend API + in-process worker
- **Cloudflare R2** - Production object storage
- **Upstash** - Managed Redis for metering
- **Supabase** - Managed Postgres + Auth

## Core Components

### Backend Services
- `app/main.py` - FastAPI application with REST endpoints; also launches the metering worker as a background thread on startup
- `app/auth.py` - JWT validation using Supabase JWKs
- `app/storage.py` - S3-compatible client (MinIO/R2) and presigned URL generation
- `app/metering.py` - Redis event logging for upload tracking
- `app/worker.py` - Worker loop for usage calculation; run standalone locally, or imported and threaded by `main.py` in production
- `app/billing_sync.py` - Razorpay billing synchronization
- `app/config.py` - Environment configuration management

### Frontend Components
- `src/components/files/` - File upload and management UI
- `src/components/billing/` - Billing dashboard and payment flow
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/api.ts` - Axios client with JWT interceptors
- `src/hooks/useAuth.ts` - Authentication state management

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for local MinIO/Redis)
- Git

### 1. Backend Setup

```bash
# Clone and setup
git clone <repository-url>
cd Cloud_storage_billing_engine

# Python environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env with your local service credentials (see Configuration below)
```

### 2. Start Services

```bash
# MinIO (Storage) - local S3-compatible storage for dev
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Redis (Metering)
docker run -d -p 6379:6379 redis/redis-stack

# FastAPI Backend (this also starts the worker thread automatically on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> The worker is started automatically inside the FastAPI process. If you want to run it standalone instead (e.g. to debug it in isolation), you can still do so:
> ```bash
> python app/worker.py
> ```
> Just note that running it both ways at once will double-process events.

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

**Access Points (local):**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

## Configuration

### Backend (.env)

The backend talks to storage over the S3 API via `MINIO_*` settings — locally these point at your MinIO container, in production they point at your Cloudflare R2 bucket.

```env
# Object Storage (MinIO locally, Cloudflare R2 in production)
# Local (MinIO):
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
STORAGE_BUCKET_NAME=nexus-storage

# Production (Cloudflare R2) — set these instead on Render:
# MINIO_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
# MINIO_ROOT_USER=<R2 access key id>
# MINIO_ROOT_PASSWORD=<R2 secret access key>
# STORAGE_BUCKET_NAME=<your R2 bucket name>

# Supabase Configuration
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis Configuration (Upstash in both dev and prod, or local Redis for dev)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_TEST_SUB_ID=your-test-subscription-id
```

### Frontend (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Data Flow

### File Upload Process
1. **Frontend** requests presigned upload URL from `/upload-url`
2. **Backend** generates a presigned POST URL against the configured storage backend (MinIO locally, R2 in production) with user isolation
3. **Frontend** uploads directly to storage (bypassing the API)
4. **Backend** logs upload event to Redis queue
5. **Worker thread** (running inside the backend process) processes the event, gets actual file size from storage
6. **Worker** updates Supabase usage database

### Billing Process
1. **Frontend** displays usage from `/billing/usage` endpoint
2. **User** initiates payment via Razorpay checkout
3. **Backend** creates Razorpay order with calculated amount
4. **Razorpay** processes payment and returns verification data
5. **Backend** verifies payment signature and resets usage

## 📊 API Endpoints

### File Management
- `POST /upload-url` - Get presigned upload URL
- `GET /files` - List user files
- `GET /download/{filename}` - Get download URL
- `DELETE /files/{filename}` - Delete file

### Billing & Payments
- `GET /billing/usage` - Get usage and billing data
- `POST /billing/pay` - Create Razorpay payment order
- `POST /billing/verify` - Verify payment completion

### System
- `GET /health` - Health check endpoint

## Security Features

- **JWT Authentication** - Supabase-based token validation
- **Multi-Tenant Isolation** - Path-based user separation
- **Pre-signed URLs** - Time-limited, secure upload/download access
- **Payment Verification** - HMAC signature validation for Razorpay
- **CORS Protection** - Configurable origin restrictions

## 📈 Performance Optimizations

- **Direct-to-Storage Uploads** - No API bottleneck for file transfers
- **Async Metering** - Background thread processing for usage calculations, no separate paid worker service needed
- **Redis Caching** - Fast event queuing and processing
- **React Query** - Intelligent caching and background refetching
- **Lazy Loading** - Component-based code splitting

## Testing

### Backend Testing
```bash
# Run with test environment
pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm run test
npm run test:e2e  # Playwright end-to-end tests
```

## Deployment

Current live setup:
- **Frontend** → Vercel
- **Backend API + worker thread** → Render (free tier Web Service)
- **Object storage** → Cloudflare R2
- **Redis** → Upstash
- **Auth & DB** → Supabase
- **Payments** → Razorpay

### Production Checklist
- [x] Configure production Supabase project
- [x] Set up Cloudflare R2 bucket for production storage
- [x] Configure production (Upstash) Redis instance
- [x] Set up Razorpay production credentials
- [x] Run metering worker in-process (Render free tier has no separate background worker service)
- [ ] Update CORS origins for production domain (currently `*` — tighten before scaling up)
- [ ] Enable HTTPS and security headers
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

### Notes on the Render + Cloudflare R2 setup
- Point `MINIO_ENDPOINT` at your R2 S3 API endpoint (`https://<account-id>.r2.cloudflarestorage.com`) and set `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` to your R2 access key ID / secret access key. No code changes are needed since R2 is S3-compatible.
- The worker no longer needs its own Render service — it's launched as a daemon thread in `main.py`'s FastAPI startup event, so a single free-tier Web Service handles both API traffic and metering.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - The modern Python web framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [MinIO](https://min.io/) - High performance object storage (local development)
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/) - S3-compatible object storage (production)
- [Razorpay](https://razorpay.com/) - Payment gateway for India
- [React](https://reactjs.org/) - UI library for the web