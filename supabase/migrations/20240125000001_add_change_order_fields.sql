-- Add change order tracking fields to line_items table
ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS is_change_order boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS change_order_date timestamptz,
  ADD COLUMN IF NOT EXISTS original_quantity integer;
