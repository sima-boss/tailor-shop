-- ============================================================
-- Migration 001: Fix RLS policies so the app works before auth
--
-- Problem: All policies were granted to `authenticated` only.
--          Without a login system, the Supabase client operates
--          as `anon`, so every query was silently blocked.
--
-- Fix:     Drop the role restriction on SELECT / INSERT / UPDATE
--          for the four operational tables. Omitting the `TO`
--          clause defaults to `public` (= anon + authenticated).
--          Admin-only DELETE policies stay `authenticated`.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- =====================
-- customers
-- =====================
drop policy if exists "customers: authenticated read"   on customers;
drop policy if exists "customers: authenticated insert" on customers;
drop policy if exists "customers: authenticated update" on customers;

create policy "customers: allow read"
  on customers for select
  using (deleted_at is null);

create policy "customers: allow insert"
  on customers for insert
  with check (true);

create policy "customers: allow update"
  on customers for update
  using (deleted_at is null);

-- =====================
-- orders
-- =====================
drop policy if exists "orders: authenticated read"   on orders;
drop policy if exists "orders: authenticated insert" on orders;
drop policy if exists "orders: authenticated update" on orders;

create policy "orders: allow read"
  on orders for select
  using (deleted_at is null);

create policy "orders: allow insert"
  on orders for insert
  with check (true);

create policy "orders: allow update"
  on orders for update
  using (deleted_at is null);

-- =====================
-- alteration_details
-- =====================
drop policy if exists "alteration_details: authenticated read"   on alteration_details;
drop policy if exists "alteration_details: authenticated insert" on alteration_details;
drop policy if exists "alteration_details: authenticated update" on alteration_details;

create policy "alteration_details: allow read"
  on alteration_details for select
  using (true);

create policy "alteration_details: allow insert"
  on alteration_details for insert
  with check (true);

create policy "alteration_details: allow update"
  on alteration_details for update
  using (true);

-- =====================
-- tailoring_details
-- =====================
drop policy if exists "tailoring_details: authenticated read"   on tailoring_details;
drop policy if exists "tailoring_details: authenticated insert" on tailoring_details;
drop policy if exists "tailoring_details: authenticated update" on tailoring_details;

create policy "tailoring_details: allow read"
  on tailoring_details for select
  using (true);

create policy "tailoring_details: allow insert"
  on tailoring_details for insert
  with check (true);

create policy "tailoring_details: allow update"
  on tailoring_details for update
  using (true);
