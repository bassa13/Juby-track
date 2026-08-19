# Juby Club Modernized Architecture (Supabase Backend)

This repository contains the production-ready, modernized architecture for **Juby Club — Billiard & Snooker Management Application**, powered exclusively by **Supabase** for cloud database persistence, authentication, storage, and real-time synchronization.

---

## Architecture Overview

- **Frontend Application**: React 19 + Vite SPA (`client/`)
- **State Management**: Zustand (`useJubyStore.js`) with debounced local storage persistence & live Supabase Realtime synchronization engine (`supabaseSync.js`)
- **Cloud Backend**: Supabase PostgreSQL database + Supabase Realtime subscription stream
- **Backend Gateway**: Node.js + Express API (`server/`) serving API proxies and local storage fallback

---

## Directory Structure

```text
Juby Club Modern/
├── client/                 # Frontend application (React + Vite)
│   ├── src/
│   │   ├── core/           # Store, Supabase client, i18n, shared ledger utilities
│   │   ├── features/       # Modular domain features (tables, sessions, customers, shifts, staff)
│   │   ├── hooks/          # Custom React hooks (useTranslation)
│   │   └── layouts/        # Dashboard layout, header & navigation components
│   ├── .env.example        # Client environment variables template
│   └── package.json
│
├── server/                 # Express API server (Node.js)
│   ├── index.js            # Express API entrypoint (SMS & Telegram proxy handlers)
│   ├── seed-supabase.js    # Database seeding script for initial setup
│   ├── .env.example        # Server environment variables template
│   └── package.json
│
├── supabase/               # Database DDL Schemas & Migrations
│   └── schema.sql          # Supabase SQL schema definitions, indexes, and RLS policies
│
├── package.json            # Root package.json for workspace orchestration
└── README.md               # Getting started & architectural documentation
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18+
- **npm**: v9+
- **Supabase Account**: (Free or Pro tier)

### 1. Database Setup
1. Log into your Supabase Dashboard and create a new project.
2. Open the **SQL Editor** in your Supabase project.
3. Paste and run the contents of [supabase/schema.sql](file:///Users/swayah/Documents/Juby%20Club%20Modern/supabase/schema.sql) to set up all required tables (`staff`, `players`, `tables`, `games`, `payments`, `shifts`, `sms_templates`, `app_state`), indexes, and Row Level Security (RLS) policies.

### 2. Environment Configuration
Copy `.env.example` to `.env` in the `client/` directory:
```bash
cp client/.env.example client/.env
```
Fill in your Supabase project credentials:
```env
VITE_API_BASE_URL=http://localhost:5005
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Installation
From the root workspace directory:
```bash
npm run install:all
```

### 4. Running Development Servers
Start both the React frontend (Vite) and Express backend concurrently:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173/`
- **Backend API Gateway**: `http://localhost:5005/`

---

## Verification & Health Status

| Check | Tool | Result |
| :--- | :--- | :--- |
| **ESLint Check** | `npm run lint` | **0 errors, 0 warnings (100% Clean)** |
| **Production Build** | `npm run build` | **Passed cleanly in 147ms** |
| **Backend Integration** | `@supabase/supabase-js` | **Realtime subscriptions & cloud persistence active** |
| **Firebase References** | Grep Audit | **0 references (100% Purged)** |

---

## License

Private repository for Juby Club.
