-- Migration 005: Simplify order status to 4 values
-- Maps removed statuses: pending/ready_for_fitting/fitting_done -> in_progress

-- Step 1: Remap any orders using removed statuses
UPDATE orders
SET status = 'in_progress'
WHERE status::text IN ('pending', 'ready_for_fitting', 'fitting_done');

-- Step 2: Recreate the enum with only the 4 allowed values
-- (Postgres cannot remove values from an existing enum, so we rename and recreate)
ALTER TYPE order_status RENAME TO order_status_old;

CREATE TYPE order_status AS ENUM ('in_progress', 'completed', 'delivered', 'cancelled');

ALTER TABLE orders
  ALTER COLUMN status TYPE order_status
  USING status::text::order_status;

DROP TYPE order_status_old;

-- Step 3: Update the column default
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'in_progress';
