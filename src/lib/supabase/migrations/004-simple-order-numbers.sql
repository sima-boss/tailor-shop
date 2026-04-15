-- ============================================================
-- Migration 004: Simple numeric order numbers
--
-- Replaces ORD-YYYYMMDD-XXXXX with auto-increment starting at 1001.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Step 1: Renumber existing orders sequentially (1001, 1002, ...)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) + 1000 AS new_num
  FROM orders
)
UPDATE orders
SET order_number = numbered.new_num::text
FROM numbered
WHERE orders.id = numbered.id;

-- Step 2: Create a sequence starting after the last used number
DO $$
DECLARE
  max_num bigint;
BEGIN
  SELECT COALESCE(MAX(order_number::bigint), 1000) INTO max_num FROM orders;
  EXECUTE format('CREATE SEQUENCE order_number_seq START WITH %s', max_num + 1);
END $$;

-- Step 3: Set the sequence as the default for new orders
ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('order_number_seq')::text;
