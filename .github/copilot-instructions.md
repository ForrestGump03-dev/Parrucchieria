# Copilot Instructions

## Project Context
- **Name**: Root Salon Manager (v2)
- **Stack**: React 19, Electron 40, Supabase, Tailwind CSS 4.
- **Language**: TypeScript (Strict).
- **Architecture**: Electron-wrapped SPA with Supabase backend.
- **State**: Context API (`AuthContext`, `NotificationContext`) + Custom Hooks (`useAppointments`, `useClients`).

## Architecture & Data Flow
- **Supabase & RLS (Critical)**: 
  - All tables have Row Level Security enabled.
  - **Reads**: Automatically filtered by the authenticated user's token.
  - **Writes**: You **MUST** manually inject `user_id: user.id` in every `insert` payload.
  - **Access**: Use `useAuth()` to retrieve the current session/user.
- **Data Fetching Patterns**: 
  - Encapsulate Supabase logic in specific hooks (e.g., `src/hooks/useAppointments.ts`).
  - Use `select('*, related_table(*)')` for joins (e.g., fetching `clients` with `appointments`).

## Business Logic Rules
- **Appointment Lifecycle**:
  - **Booking**: `price` is usually `null`. Displayed in Agenda.
  - **Completed/Paid**: `price` is set (not null). Moves to "History/Storico" and may be hidden from the main Agenda view depending on filters.
- **Backup System**:
  - Located in Security settings.
  - Expects **RLS-compliant** CSV exports (only download current user's data).
  - Includes a "Smart Snooze" notification system (14-day cycle) via `NotificationContext`.
- **Agenda Visualization**:
  - Uses `react-big-calendar`.
  - **Clustering**: Overlapping appointments are visually grouped to prevent clutter.

## Developer Standards
- **Styling**: Tailwind CSS v4. Use direct utility classes. Avoid `.css` files unless for global overrides.
- **Dates**: Strict usage of `date-fns` with `it` locale. No moment.js.
- **Forms**: `react-hook-form` + `zod` schema validation.
- **Electron IPC**:
  - Main process: `electron/main.cjs`.
  - Renderer interactions should respect the secure isolation.

## Common Workflows
- **Start Dev**: `npm run electron:dev` (runs Vite server + Electron window concurrently).
- **Build Prod**: `npm run electron:pack` (TypeScript build + Vite build + Electron Builder).
- **Database Types**: Maintain definitions in `src/types/index.ts`. Update this file immediately when Supabase schema changes.

## Language and tone
- **Language**: Italian (Italiano) for all UI text, comments, and commit messages.
- **Tone**: Professional, concise.
- **Documentation**: Update `README.md` when features are completed.