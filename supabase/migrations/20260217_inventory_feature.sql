-- Migration: Inventory & WhatsApp Features
-- Date: 2026-02-17

-- 1. Create Products Table
create table if not exists public.products (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) not null,
    name text not null,
    brand text,
    price numeric(10,2) not null default 0, -- Selling Price
    cost_price numeric(10,2) default 0, -- Buying Price
    stock integer not null default 0,
    min_stock integer default 5,
    barcode text
);

-- 2. Add RLS Policies for Products
alter table public.products enable row level security;

create policy "Users can view their own products"
    on public.products for select
    using (auth.uid() = user_id);

create policy "Users can insert their own products"
    on public.products for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own products"
    on public.products for update
    using (auth.uid() = user_id);

create policy "Users can delete their own products"
    on public.products for delete
    using (auth.uid() = user_id);

-- 3. Add products_sold column to appointments
-- This stores a JSON array of sold items: [{ id, name, price, quantity }]
alter table public.appointments 
add column if not exists products_sold jsonb default '[]'::jsonb;

-- 4. Create function to safely decrement stock
create or replace function decrement_stock(p_id uuid, quantity int)
returns void as $$
begin
  update public.products
  set stock = stock - quantity
  where id = p_id;
end;
$$ language plpgsql security definer;
