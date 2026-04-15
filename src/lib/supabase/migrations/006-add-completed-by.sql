-- Migration 006: Add completed_by field to orders
-- Stores which tailor completed the order (required when status = 'completed')

ALTER TABLE orders
  ADD COLUMN completed_by text
  CHECK (completed_by IN ('Mumtaz', 'Shan'));

-- Existing completed orders: completed_by stays NULL (shows "—" in UI)
