# Copilot Instructions

## Project Overview
- **Application**: "Root Salon Manager" - A desktop-based salon management software.
- **Stack**: React 19 (Vite), Electron 40, Supabase, Tailwind CSS 4.
- **Language**: TypeScript (Strict).
- **Localization**: UI and Comments in **Italian** (Italiano).
- **Architecture**: Single-page application wrapped in Electron. Data persistence via Supabase with RLS.
- **State Management**: Context API (`AuthContext`, `NotificationContext`) + Custom Hooks (`useAppointments`, `useClients`).

## Architecture & Data Flow
- **Supabase & RLS (CRITICAL)**: 
  - Row Level Security (RLS) is enabled on ALL tables.
  - **Read**: Authenticated user session handles RLS automatically.
  - **Write (Insert)**: You **MUST** manually inject `user_id: user.id` into the payload for every INSERT operation (e.g. `src/hooks/useAppointments.ts`).
  - **Access**: Use `useAuth()` (from `src/context/AuthContext.tsx`) to get the current `user`.
- **Data Fetching**: Custom hooks in `src/hooks/` manage state and Supabase calls. Use `select('*, related_table(*)')` for joins.
- **Electron**:
  - Main process: [`electron/main.cjs`](electron/main.cjs).
  - Dev: Loads `http://localhost:5173`. Prod: Loads `dist/index.html`.
  - Routing: `react-router-dom` handles client-side navigation.

## Conventions & Patterns
- **Styling**: Tailwind CSS v4. Use utility classes directly in `className`. Use `clsx`/`tailwind-merge`.
- **Date Management**: `date-fns` for all manipulations. Format: `YYYY-MM-DD` (date), `HH:mm` (time). Use `it` locale.
- **Forms**: `react-hook-form` + `zod` schema validation.
- **Types**: defined in `src/types/index.ts`. `Appointment` joins `Client` (`clients?: Client`).

## Critical Business Logic
- **Agenda vs History**:
  - **Agenda**: Appointments with `price: null` (or pending status).
  - **History/Paid**: Appointments with `price` set (not null). Logic in `getClientHistory` (`useAppointments.ts`).
  - **Clustering**: Overlapping appointments (within 45m) are visually clustered in Agenda to prevent clutter.
- **Reports**:
  - "Visite Uniche": Merges multiple treatments for one client in one day into a single visit count.
- **Backup System**:
  - Located in Security settings.
  - Expects **RLS-compliant** CSV exports (only download current user's data).
  - Includes a "Smart Snooze" notification system (14-day cycle) via `NotificationContext`.

## Developer Workflows
- **Start Dev**: `npm run electron:dev` (runs concurrent Vite + Electron).
- **Build**: `npm run electron:pack` (Builds React + packages Electron).
- **Env**: `.env` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## General Preferences
- **Language**: Italian (Italiano) for all responses and comments.
- **Documentation**: Update `README.md` when features are completed.
- **Error Handling**: Verify no new lint/type errors are introduced.
