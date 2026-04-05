# Quick Start: Running Nexus Locally

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- Docker (for MinIO, Supabase, Redis)
- Git

## 1. Backend Setup (FastAPI)

```bash
# Navigate to project root
cd /path/to/Cloud_storage_billing_engine

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env

# Edit .env with your values:
# - SUPABASE_URL
# - SUPABASE_KEY
# - MINIO_ENDPOINT
# - MINIO_ACCESS_KEY
# - MINIO_SECRET_KEY
# - RAZORPAY_KEY_ID
# - RAZORPAY_KEY_SECRET
# - REDIS_URL
```

### Start Backend Services

```bash
# Start MinIO (S3-compatible storage)
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Start Redis (for metering/workers)
docker run -d -p 6379:6379 redis/redis-stack

# Start FastAPI development server
cd /path/to/project
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify Backend**:
- FastAPI docs: http://localhost:8000/docs
- Backend health: http://localhost:8000/health
- MinIO console: http://localhost:9001 (minioadmin:minioadmin)

---

## 2. Frontend Setup (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Start Frontend Dev Server

```bash
npm run dev
```

**Frontend will be available at**: http://localhost:5173

---

## 3. Complete Local Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Browser (http://localhost:5173)                             │
│  ├── React TypeScript Frontend (Vite)                        │
│  └── Uses React Query + Axios with JWT tokens               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                   HTTP (Bearer JWT)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  API Server (http://localhost:8000)                          │
│  ├── FastAPI Application                                    │
│  ├── Auth: Supabase JWT Validation                          │
│  ├── Storage: MinIO S3-Compatible                           │
│  ├── Presigned URLs for Direct Upload                       │
│  ├── Download URL Generation                                 │
│  └── Billing/Usage Endpoints                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
              │                    │                    │
              ▼                    ▼                    ▼
        ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
        │  MinIO           │ │  Supabase    │ │  Database        │
        │  (S3-Compat)     │ │  (Auth)      │ │  Billing/Usage   │
        │  Port 9000       │ │              │ │                  │
        │  Console: 9001   │ │              │ │                  │
        └──────────────────┘ └──────────────┘ └──────────────────┘
```

---

## 4. Testing the Integration

### 4.1 Test Authentication Flow

```typescript
// In browser console:
// When logged in, this should show your JWT token
const session = await supabase.auth.getSession();
console.log(session.data.session.access_token);
```

### 4.2 Test File Upload

1. Navigate to http://localhost:5173/dashboard
2. Go to "The Vault" (Files tab)
3. Click "Browse Files" or drag and drop a file
4. **Verify in Network tab**:
   - `POST /upload-url` - 200 OK with presigned URL
   - `POST {presigned-url}` - 204 No Content
   - `GET /files` - 200 OK with updated file list

### 4.3 Test File Download

1. Uploaded files should appear in "The Vault"
2. Click Download button next to a file
3. **Verify in Network tab**:
   - `GET /download/{filename}` - 200 OK with download_url
   - Browser should open new tab with MinIO download

### 4.4 Test File Deletion

1. Click Delete button next to a file
2. Confirm in dialog
3. **Verify in Network tab**:
   - `DELETE /files/{filename}` - 204 No Content
   - File list should auto-refresh

### 4.5 Test Billing Dashboard

1. Navigate to "The Ledger" (Billing tab)
2. **Verify**:
   - Storage usage shows correctly
   - Current invoice displays billing amount
   - Billing cycle information is correct

---

## 5. Common Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Backend
uvicorn app.main:app --reload              # Dev server
uvicorn app.main:app --host 0.0.0.0        # Prod-like
python app/worker.py                       # Start worker for async tasks
```

---

## 6. Debugging

### Enable Debug Logging in Frontend

```typescript
// In src/lib/api.ts - uncomment for verbose logging
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("[API] Request with Bearer token:", token.substring(0, 20) + "...");
  }
  return config;
});
```

### Check Network Requests

1. Open DevTools (F12)
2. Go to "Network" tab
3. Filter by "Fetch/XHR"
4. Perform action and inspect request/response

### Check Supabase Session

```typescript
// In browser console:
import { supabase } from './src/lib/supabase.ts';
const session = await supabase.auth.getSession();
console.log(session);
```

---

## 7. Troubleshooting

### Frontend won't start
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### CORS error from backend
- Ensure FastAPI has CORS enabled
- Backend must allow `http://localhost:5173`
- Add to `app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 401 errors on every request
- Check Supabase credentials in `.env`
- Verify JWT token is valid: `https://jwt.io/`
- Backend JWT validation should match Supabase key

### MinIO bucket not found
```bash
# Connect to MinIO and create bucket
aws s3 mb s3://storage-bucket \
  --endpoint-url http://localhost:9000 \
  --access-key minioadmin \
  --secret-key minioadmin
```

### Redis connection refused
- Ensure Redis is running: `docker ps | grep redis`
- Check Redis port 6379 is accessible

---

## 8. Architecture Flow Diagram

```
┌─ User Logs In ──────────────────────┐
│                                      │
▼                                      │
[Supabase Auth]                        │
│                                      │
└──> Issue JWT Token ──────────────────┴──→ [Frontend Redux]
                                           │
                                ┌──────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │ API Client (axios)       │
                    │ + Interceptors:          │
                    │  - Request: Inject JWT   │
                    │  - Response: 401 check   │
                    └──────────────┬───────────┘
                                   │
                    ┌──────────────┴──────────┐
                    │                         │
                    ▼                         ▼
         ┌────────────────────┐    ┌──────────────────┐
         │ POST /upload-url    │    │ GET /files       │
         │ (Get presigned URL) │    │ GET /data        │
         └────────┬───────────┘    └──────┬───────────┘
                  │                        │
                  ▼                        ▼
        ┌──────────────────────┐  ┌────────────────┐
        │ FormData Creation     │  │ React Query    │
        │ + File               │  │ Cache/UI Bind  │
        │ + MinIO Fields       │  │                │
        └──────┬──────────────┘  └────────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ POST to MinIO        │
        │ (Presigned URL)      │
        │ [Direct Upload to S3]│
        └──────┬──────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ Invalidate React     │
        │ Query Cache          │
        │ Refetch Files List   │
        └──────────────────────┘
```

---

## 9. Next Steps

1. **Customize branding**: Update colors in `tailwind.config.ts` and component styles
2. **Add payment integration**: Implement Razorpay integration in BillingDashboard
3. **Setup monitoring**: Add Sentry or LogRocket for production error tracking
4. **Deploy frontend**: Deploy to Vercel, Netlify, or your hosting
5. **Deploy backend**: Deploy FastAPI to AWS ECS, Railway, or Heroku

---

**Need Help?**
- Frontend docs: [Vite Docs](https://vitejs.dev)
- Backend docs: [FastAPI Docs](https://fastapi.tiangolo.com)
- Component library: [shadcn/ui](https://ui.shadcn.com)
- State management: [TanStack Query](https://tanstack.com/query)

**Last Updated**: April 5, 2026
