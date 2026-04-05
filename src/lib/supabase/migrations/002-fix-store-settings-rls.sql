-- ============================================================
-- Migration 002: Allow anon users to read store_settings
--
-- Problem: The SELECT policy was `to authenticated` only.
--          Without auth, getStoreSettings() returns zero rows
--          and the app falls back to hardcoded defaults.
--
-- Fix:     Drop the old SELECT policy and recreate it without
--          a role restriction (defaults to `public` = anon + authenticated).
--          Write policies stay admin-only.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

drop policy if exists "store_settings: authenticated read" on store_settings;

create policy "store_settings: allow read"
  on store_settings for select
  using (true);
