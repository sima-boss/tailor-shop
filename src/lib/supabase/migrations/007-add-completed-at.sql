-- Migration 007: Add completed_at timestamp to orders
-- Records the exact moment an order is marked as Completed.
-- Used for tailor commission reporting (filter earnings by completion date,
-- not by order creation date — so April commissions are correct even if
-- the order was placed in March).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Notify PostgREST to reload its schema cache so the column is immediately queryable.
NOTIFY pgrst, 'reload schema';
