-- Migration 003: Set default currency to AED
-- Run this in the Supabase SQL Editor.

UPDATE store_settings SET value = 'AED' WHERE key = 'currency';
