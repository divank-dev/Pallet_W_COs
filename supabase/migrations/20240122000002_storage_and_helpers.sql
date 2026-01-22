-- ================================================
-- STORAGE BUCKET POLICIES & ADDITIONAL HELPERS
-- ================================================

-- Create storage bucket for art files (if not exists via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('art-files', 'art-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for art-files bucket
CREATE POLICY "Art files: Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'art-files');

CREATE POLICY "Art files: Authenticated users can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'art-files');

CREATE POLICY "Art files: Non-ReadOnly users can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'art-files')
  WITH CHECK (bucket_id = 'art-files');

CREATE POLICY "Art files: Non-ReadOnly users can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'art-files');

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to update customer statistics after order changes
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
DECLARE
  cust_id UUID;
BEGIN
  -- Get customer ID from new or old record
  IF TG_OP = 'DELETE' THEN
    cust_id := OLD.customer_id;
  ELSE
    cust_id := NEW.customer_id;
  END IF;

  -- Update customer statistics
  UPDATE customers
  SET
    total_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = cust_id AND status != 'Closed' AND NOT is_archived
    ),
    total_revenue = (
      SELECT COALESCE(SUM(li.price * li.qty), 0)
      FROM orders o
      JOIN line_items li ON li.order_id = o.id
      WHERE o.customer_id = cust_id AND o.status = 'Closed' AND NOT o.is_archived
    ),
    last_order_at = (
      SELECT MAX(created_at)
      FROM orders
      WHERE customer_id = cust_id
    )
  WHERE id = cust_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to automatically create customer if not exists
CREATE OR REPLACE FUNCTION ensure_customer_exists()
RETURNS TRIGGER AS $$
DECLARE
  cust_id UUID;
BEGIN
  -- If customer_id is provided, use it
  IF NEW.customer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check if customer exists by name
  SELECT id INTO cust_id
  FROM customers
  WHERE LOWER(name) = LOWER(NEW.customer_name)
  LIMIT 1;

  -- If not found, create new customer
  IF cust_id IS NULL THEN
    INSERT INTO customers (name, email, phone)
    VALUES (NEW.customer_name, NEW.customer_email, NEW.customer_phone)
    RETURNING id INTO cust_id;
  END IF;

  NEW.customer_id := cust_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_customer_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION ensure_customer_exists();

-- Function to log status changes automatically
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_change_logs (
      order_id,
      user_id,
      action,
      previous_value,
      new_value,
      notes
    ) VALUES (
      NEW.id,
      auth.uid(),
      'Status changed',
      to_jsonb(OLD.status),
      to_jsonb(NEW.status),
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_order_status_change();

-- ================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ================================================

-- Customer lifetime value
CREATE MATERIALIZED VIEW customer_lifetime_value AS
SELECT
  c.id,
  c.name,
  c.email,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(li.price * li.qty), 0) as lifetime_revenue,
  COALESCE(SUM((li.price - li.cost) * li.qty), 0) as lifetime_profit,
  MAX(o.created_at) as last_order_date,
  MIN(o.created_at) as first_order_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND NOT o.is_archived
LEFT JOIN line_items li ON li.order_id = o.id
GROUP BY c.id, c.name, c.email;

CREATE INDEX idx_clv_revenue ON customer_lifetime_value(lifetime_revenue DESC);
CREATE INDEX idx_clv_orders ON customer_lifetime_value(total_orders DESC);

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY customer_lifetime_value;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- DATABASE METADATA
-- ================================================

CREATE TABLE database_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row table
  version TEXT NOT NULL DEFAULT '2.0.0',
  schema_version TEXT NOT NULL DEFAULT '1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  last_backup_at TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0
);

-- Insert initial metadata
INSERT INTO database_metadata (version, schema_version)
VALUES ('2.0.0', '1')
ON CONFLICT (id) DO NOTHING;

-- Function to update metadata counts
CREATE OR REPLACE FUNCTION update_metadata_counts()
RETURNS void AS $$
BEGIN
  UPDATE database_metadata
  SET
    total_orders = (SELECT COUNT(*) FROM orders WHERE NOT is_archived),
    total_customers = (SELECT COUNT(*) FROM customers),
    total_products = (SELECT COUNT(*) FROM products WHERE is_active),
    last_modified_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- SEARCH FUNCTIONS
-- ================================================

-- Full-text search for orders
CREATE OR REPLACE FUNCTION search_orders(search_query TEXT)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  customer_name TEXT,
  project_name TEXT,
  status order_status,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.customer_name,
    o.project_name,
    o.status,
    ts_rank(o.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM orders o
  WHERE
    o.search_vector @@ plainto_tsquery('english', search_query)
    AND NOT o.is_archived
  ORDER BY rank DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- VALIDATION FUNCTIONS
-- ================================================

-- Validate stage transition
CREATE OR REPLACE FUNCTION validate_stage_transition(
  current_status order_status,
  new_status order_status
)
RETURNS BOOLEAN AS $$
DECLARE
  stage_map JSONB := '{
    "Lead": 0,
    "Quote": 1,
    "Approval": 2,
    "Art Confirmation": 3,
    "Inventory Order": 4,
    "Production Prep": 5,
    "Inventory Received": 6,
    "Production": 7,
    "Fulfillment": 8,
    "Invoice": 9,
    "Closeout": 10,
    "Closed": 11
  }'::JSONB;
  current_num INTEGER;
  new_num INTEGER;
BEGIN
  current_num := (stage_map->>current_status::TEXT)::INTEGER;
  new_num := (stage_map->>new_status::TEXT)::INTEGER;

  -- Can always move to Closed from any stage
  IF new_status = 'Closed' THEN
    RETURN TRUE;
  END IF;

  -- Can reopen from Closed to any stage
  IF current_status = 'Closed' THEN
    RETURN TRUE;
  END IF;

  -- Must move forward one stage at a time
  RETURN new_num = current_num + 1;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to orders table
ALTER TABLE orders
ADD CONSTRAINT check_valid_status_transition
CHECK (
  status = status OR
  validate_stage_transition(status, status)
);

COMMENT ON FUNCTION validate_stage_transition IS 'Validates that order status transitions follow the correct workflow';
COMMENT ON FUNCTION generate_order_number IS 'Generates sequential order numbers (e.g., TBD-2024-0001)';
COMMENT ON FUNCTION update_customer_stats IS 'Automatically updates customer statistics when orders change';
COMMENT ON FUNCTION search_orders IS 'Full-text search across orders using PostgreSQL tsvector';
