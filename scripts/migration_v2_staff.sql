-- Migration: Add Staff and Duration support

-- 1. Create staff_members table
create table if not exists public.staff_members (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (), -- RLS ownership
  name text not null,
  color text, -- Optional: for UI coloring
  active boolean default true,
  constraint staff_members_pkey primary key (id),
  constraint staff_members_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Enable RLS
alter table public.staff_members enable row level security;

-- Policies for staff_members
create policy "Users can view their own staff" on public.staff_members
  for select using (auth.uid() = user_id);

create policy "Users can insert their own staff" on public.staff_members
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own staff" on public.staff_members
  for update using (auth.uid() = user_id);

create policy "Users can delete their own staff" on public.staff_members
  for delete using (auth.uid() = user_id);

-- 2. Modify appointments table
alter table public.appointments 
add column if not exists staff_id uuid references public.staff_members(id) on delete set null,
add column if not exists duration integer default 30; -- Duration in minutes

-- Index for performance
create index if not exists appointments_staff_id_idx on public.appointments(staff_id);
