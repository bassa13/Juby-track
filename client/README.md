# Juby Club Modern - Frontend Application

This directory contains the React 19 + Vite frontend application for **Juby Club — Billiard & Snooker Management Application**, configured exclusively with **Supabase**.

---

## Technical Stack

- **Framework**: React 19 + Vite
- **Backend SDK**: `@supabase/supabase-js` (`^2.49.1`)
- **State Management**: Zustand (`useJubyStore.js`)
- **Styling**: Modern Vanilla CSS Design Tokens with Dark Mode

---

## Environment Variables

Copy `.env.example` to `.env`:
```env
VITE_API_BASE_URL=http://localhost:5005
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Available Scripts

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Linting
```bash
npm run lint
```
