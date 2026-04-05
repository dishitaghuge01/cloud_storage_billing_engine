# Nexus Storage Frontend

A modern React TypeScript dashboard for the Nexus cloud storage platform, featuring secure file management and integrated billing.

## 🚀 Features

- **Secure Authentication** - Supabase-powered login and session management
- **File Management** - Drag-and-drop uploads with progress tracking
- **Real-time Billing** - Live usage monitoring and payment processing
- **Responsive Design** - Mobile-first UI with Tailwind CSS
- **Type Safety** - Full TypeScript coverage for reliability
- **Performance** - Optimized with React Query and lazy loading

## 🛠️ Tech Stack

- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Powerful data fetching and caching
- **Supabase JS** - Client-side authentication and real-time features
- **Axios** - HTTP client with interceptors
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing

## 📦 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── billing/        # Billing dashboard components
│   │   ├── files/          # File management components
│   │   ├── layout/         # Layout and navigation
│   │   └── ui/             # Base UI components (shadcn/ui)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configurations
│   ├── pages/              # Page components
│   ├── types/              # TypeScript type definitions
│   └── test/               # Test utilities
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see main README)

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run Vitest tests
npm run test:ui      # Run tests with UI
```

## 🔐 Authentication Flow

The frontend integrates with Supabase for authentication:

1. **Login** - Users authenticate via Supabase Auth
2. **Token Management** - JWT tokens are automatically attached to API requests
3. **Session Handling** - Automatic token refresh and logout on expiration
4. **Protected Routes** - Unauthorized users are redirected to login

## 📁 File Management

### Upload Process
1. User selects files via drag-and-drop or file picker
2. Frontend requests presigned upload URL from backend
3. File uploads directly to MinIO/S3 (bypassing API)
4. Upload progress is tracked and displayed
5. File list refreshes automatically after successful upload

### File Operations
- **List Files** - Display user's files with metadata
- **Download** - Generate and use presigned download URLs
- **Delete** - Remove files with confirmation dialog

## 💳 Payment Integration

### Razorpay Integration
1. User clicks "Pay Now" on billing dashboard
2. Frontend requests payment order from backend
3. Razorpay checkout modal opens with order details
4. Payment processing with real-time status updates
5. Server-side verification ensures payment integrity
6. Usage counter resets after successful payment

### Security Features
- HMAC signature verification on backend
- Fraud detection and prevention
- Secure payment flow with no sensitive data exposure

## 🎨 UI Components

The frontend uses a component library built on shadcn/ui:

- **Form Components** - Input, textarea, select with validation
- **Data Display** - Tables, cards, charts, progress bars
- **Feedback** - Toasts, dialogs, loading states
- **Navigation** - Responsive sidebar and breadcrumbs

## 🔄 State Management

- **React Query** - Server state management with caching
- **React Hooks** - Local component state
- **Context API** - Global authentication state

## 📱 Responsive Design

- **Mobile-first** approach with Tailwind CSS
- **Breakpoint-based** layouts (sm, md, lg, xl)
- **Touch-friendly** interactions
- **Optimized** for all screen sizes

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests (Playwright)
```bash
npx playwright test
npx playwright show-report  # View test results
```

## 🚀 Deployment

### Build Configuration

The app is configured for deployment to various platforms:

- **Vercel** - Zero-config deployment
- **Netlify** - Static site hosting
- **Docker** - Containerized deployment

### Environment Variables

Production environment variables:

```env
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new data structures
3. Write tests for new functionality
4. Update documentation for API changes
5. Use conventional commit messages

## 📄 License

This project is part of the Nexus Storage platform. See the main repository for license information.
