# Nexus Storage: Multi-Tenant Cloud Storage Billing Engine

A production-ready, event-driven cloud storage platform with integrated billing, built with FastAPI, React, and modern cloud services.

## Key Technical Highlights

### Decoupled Architecture
Frontend uploads directly to S3/MinIO via Pre-signed POST, bypassing the API bottleneck for optimal performance and scalability.

### Event-Driven Metering
Uses a Redis-backed worker to process storage metrics asynchronously, ensuring accurate billing based on actual file sizes rather than client-reported data.

### Multi-Tenant Isolation
Strict path-based separation ensuring users can never access each other's objects, with JWT-based authentication and authorization.

## Overview

Nexus Storage provides a complete cloud storage solution featuring:

- **Direct S3 Uploads**: Pre-signed URLs for efficient, serverless file uploads
- **Real-Time Metering**: Event-driven usage tracking with Redis and background workers
- **Secure Multi-Tenancy**: Isolated user storage with Supabase authentication
- **Integrated Billing**: Razorpay-powered payment processing with usage-based pricing
- **Modern Frontend**: React TypeScript dashboard with real-time updates
- **RESTful API**: FastAPI backend with comprehensive documentation

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React         │    │   FastAPI       │    │   MinIO         │
│   Frontend      │◄──►│   Backend       │◄──►│   (S3-Compat)   │
│   (Vite)        │    │   (Python)      │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Redis         │    │   Razorpay      │
│   Auth & DB     │    │   Metering      │    │   Payments      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Tech Stack

### Backend
- **FastAPI** - High-performance async web framework
- **Supabase** - Authentication, database, and real-time subscriptions
- **MinIO** - S3-compatible object storage
- **Redis** - Event-driven metering and background processing
- **Razorpay** - Payment processing and billing
- **Pydantic** - Data validation and settings management

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Query** - Powerful data fetching and caching
- **Supabase JS** - Client-side authentication

## Core Components

### Backend Services
- `app/main.py` - FastAPI application with REST endpoints
- `app/auth.py` - JWT validation using Supabase JWKs
- `app/storage.py` - MinIO client and presigned URL generation
- `app/metering.py` - Redis event logging for upload tracking
- `app/worker.py` - Background worker for usage calculation
- `app/billing_sync.py` - Razorpay billing synchronization
- `app/config.py` - Environment configuration management

### Frontend Components
- `src/components/files/` - File upload and management UI
- `src/components/billing/` - Billing dashboard and payment flow
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/api.ts` - Axios client with JWT interceptors
- `src/hooks/useAuth.ts` - Authentication state management

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for local services)
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
# Edit .env with your service credentials
```

### 2. Start Services

```bash
# MinIO (Storage)
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Redis (Metering)
docker run -d -p 6379:6379 redis/redis-stack

# FastAPI Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Background Worker
python app/worker.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

## Configuration

### Backend (.env)
```env
# MinIO Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
STORAGE_BUCKET_NAME=nexus-storage

# Supabase Configuration
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis Configuration
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
2. **Backend** generates MinIO presigned POST URL with user isolation
3. **Frontend** uploads directly to MinIO (bypassing API)
4. **Backend** logs upload event to Redis queue
5. **Worker** processes event, gets actual file size from MinIO
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

- **Direct S3 Uploads** - No API bottleneck for file transfers
- **Async Metering** - Background processing for usage calculations
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

### Production Checklist
- [ ] Configure production Supabase project
- [ ] Set up production MinIO/S3 bucket
- [ ] Configure production Redis instance
- [ ] Set up Razorpay production credentials
- [ ] Update CORS origins for production domain
- [ ] Enable HTTPS and security headers
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## icense

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - The modern Python web framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [MinIO](https://min.io/) - High performance object storage
- [Razorpay](https://razorpay.com/) - Payment gateway for India
- [React](https://reactjs.org/) - UI library for the web
