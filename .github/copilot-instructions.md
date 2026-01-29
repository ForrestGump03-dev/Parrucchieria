# Copilot Instructions

## Project Overview
- **Stack**: React 19 (Vite), Electron 40, Supabase, Tailwind CSS 4.
- **Language**: TypeScript (Strict).
- **Architecture**: Single-page application wrapped in Electron. Data persistence via Supabase with RLS (Row Level Security).

## Architecture & Data Flow
- **Supabase & RLS**: 
  - Every table has RLS enabled. 
  - **CRITICAL**: All data access requires an authenticated user. Use `useAuth()` (from `src/context/AuthContext.tsx`) to get the current `user`.
  - On `insert`, you MUST include `user_id: user.id` to satisfy RLS policies (see `src/hooks/useClients.ts` for example).
- **Data Fetching**: Custom hooks (e.g., `useClients`, `useAppointments`) manage state and Supabase calls.
- **Electron**:
  - `electron/main.cjs` handles the main process.
  - In `dev`, it loads `http://localhost:5173`. In `prod`, it loads `dist/index.html`.
  - Use `npm run electron:dev` to start both Vite and Electron simultaneously.

## Conventions & Patterns
- **Styling**: Tailwind CSS v4. Use utility classes directly in `className`.
- **Date Management**: Use `date-fns` for all date manipulations.
- **Forms**: React Hook Form + Zod for validation.
- **Components**:
  - Locate in `src/components/`.
  - Reusable UI components in `src/components/ui/` (if any created).
- **Database Types**:
  - Defined in `src/types/index.ts`.
  - `Appointment` joins `Client` (see `clients?: Client`).

## Critical Business Logic
- **Agenda (Dashboard)**:
  - **Clustering**: Appointments within 45 min overlap are visually "clustered" (logic in `Agenda.tsx`).
  - **Visibility**: Completed/paid appointments are often hidden from Agenda view to keep it clean.
  - **Entities**: "Prenotazioni" (Agenda) are distinct from "Storico" (incassati).
- **Reports**:
  - "Visite Uniche": Logic merges multiple treatments for one client in one day.

## Developer Workflows
- **Start Dev**: `npm run electron:dev` (runs concurrent Vite + Electron).
- **Build**: `npm run electron:pack` (builds React + packages Electron).
- **Supabase Config**: Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## General Preferences
- **Language**: Italian (Italiano) for all responses and comments.
- **Documentation**: Automatically update `README.md` when features are completed or on "git push"/"done" requests.
- **Error Handling**: Verify no new lint/type errors are introduced.
