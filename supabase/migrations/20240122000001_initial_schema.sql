-- ================================================
-- PALLET DATABASE SCHEMA FOR SUPABASE
-- Custom Apparel Order Management System
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- ENUMS
-- ================================================

CREATE TYPE order_status AS ENUM (
  'Lead',
  'Quote',
  'Approval',
  'Art Confirmation',
  'Inventory Order',
  'Production Prep',
  'Inventory Received',
  'Production',
  'Fulfillment',
  'Invoice',
  'Closeout',
  'Closed'
);

CREATE TYPE production_method AS ENUM (
  'ScreenPrint',
  'Embroidery',
  'DTF',
  'Other'
);

CREATE TYPE art_status AS ENUM (
  'Not Started',
  'In Progress',
  'Sent to Customer',
  'Revision Requested',
  'Approved'
);

CREATE TYPE lead_source AS ENUM (
  'Website',
  'Referral',
  'Social Media',
  'Cold Call',
  'Trade Show',
  'Email Campaign',
  'Other'
);

CREATE TYPE lead_temperature AS ENUM (
  'Hot',
  'Warm',
  'Cold'
);

CREATE TYPE fulfillment_method AS ENUM (
  'Shipped',
  'PickedUp'
);

CREATE TYPE user_role AS ENUM (
  'Admin',
  'Manager',
  'Sales',
  'Production',
  'Fulfillment',
  'ReadOnly'
);

CREATE TYPE payment_method AS ENUM (
  'Cash',
  'Check',
  'Credit Card',
  'ACH',
  'Other'
);

CREATE TYPE art_file_type AS ENUM (
  'original',
  'proof',
  'markup',
  'reference',
  'final'
);

CREATE TYPE art_file_source AS ENUM (
  'client',
  'designer',
  'system'
);

CREATE TYPE proof_status AS ENUM (
  'Draft',
  'Sent',
  'Approved',
  'Revision Needed'
);

-- ================================================
-- USERS & AUTHENTICATION
-- ================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Link to Supabase auth.users
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'ReadOnly',
  department TEXT,
  reports_to UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CUSTOMERS
-- ================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB, -- { street, city, state, zip, country }
  notes TEXT,
  tags TEXT[],
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PRODUCTS
-- ================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_cost DECIMAL(10, 2) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  available_sizes TEXT[],
  available_colors TEXT[],
  supplier TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ORDERS
-- ================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,

  -- Customer Info
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL, -- Denormalized for quick access
  customer_email TEXT,
  customer_phone TEXT,

  -- Order Details
  project_name TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'Lead',
  art_status art_status NOT NULL DEFAULT 'Not Started',

  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  closed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Flags
  rush_order BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_change_order BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,
  closed_reason TEXT,
  reopened_from order_status,

  -- Relationships
  parent_order_id UUID REFERENCES orders(id),

  -- Purchase Orders
  po_numbers JSONB, -- { primary, secondary, tertiary }
  selected_vendor_id UUID,

  -- Lead Info (JSONB for flexibility)
  lead_info JSONB, -- Complete LeadInfo object

  -- Art Confirmation (JSONB for complex nested structure)
  art_confirmation JSONB, -- ArtConfirmation object with placements, files, etc.

  -- Stage-specific Status (JSONB)
  prep_status JSONB, -- { gangSheetCreated, artworkDigitized, screensBurned }
  fulfillment_status JSONB, -- FulfillmentStatus object
  invoice_status JSONB, -- InvoiceStatus object
  closeout_checklist JSONB, -- CloseoutChecklist object

  -- Versioning
  version INTEGER DEFAULT 1,

  -- Indexes for search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(order_number, '') || ' ' ||
      COALESCE(customer_name, '') || ' ' ||
      COALESCE(project_name, '') || ' ' ||
      COALESCE(customer_email, '')
    )
  ) STORED
);

-- ================================================
-- LINE ITEMS
-- ================================================

CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product Info
  product_id UUID REFERENCES products(id),
  item_number TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Garment Details
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),

  -- Decoration
  decoration_type production_method NOT NULL,
  decoration_placements INTEGER NOT NULL DEFAULT 1,
  decoration_description TEXT,

  -- Pricing
  cost DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,

  -- Stage Tracking Flags
  ordered BOOLEAN DEFAULT false,
  received BOOLEAN DEFAULT false,
  decorated BOOLEAN DEFAULT false,
  packed BOOLEAN DEFAULT false,

  -- Timestamps
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  decorated_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Method-specific pricing fields
  screen_print_colors INTEGER,
  is_plus_size BOOLEAN DEFAULT false,
  stitch_count_tier TEXT,
  dtf_size TEXT
);

-- ================================================
-- STATUS CHANGE LOG (Audit Trail)
-- ================================================

CREATE TABLE status_change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  notes TEXT
);

-- ================================================
-- PRODUCTIVITY ENTRIES
-- ================================================

CREATE TABLE productivity_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  operator_name TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  order_number TEXT NOT NULL,
  decoration_type production_method NOT NULL,
  items_decorated INTEGER DEFAULT 0,
  items_packed INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate entries for same hour/operator/order
  UNIQUE(date, hour, operator_name, order_id)
);

-- ================================================
-- ART FILES (for Supabase Storage references)
-- ================================================

CREATE TABLE art_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  placement_id UUID, -- Reference to art_placements if applicable
  proof_id UUID, -- Reference to art_proofs if applicable

  file_name TEXT NOT NULL,
  file_type art_file_type NOT NULL,
  file_source art_file_source NOT NULL,

  -- Supabase Storage path
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'art-files',

  -- File metadata
  file_size BIGINT,
  mime_type TEXT,
  thumbnail_path TEXT,

  -- Info
  notes TEXT,
  is_markup BOOLEAN DEFAULT false,
  parent_file_id UUID REFERENCES art_files(id),

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);

-- ================================================
-- INDEXES
-- ================================================

-- Orders
CREATE INDEX idx_orders_status ON orders(status) WHERE NOT is_archived;
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_due_date ON orders(due_date);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_parent ON orders(parent_order_id);
CREATE INDEX idx_orders_search ON orders USING GIN(search_vector);

-- Line Items
CREATE INDEX idx_line_items_order ON line_items(order_id);
CREATE INDEX idx_line_items_product ON line_items(product_id);
CREATE INDEX idx_line_items_decoration ON line_items(decoration_type);

-- Status Change Logs
CREATE INDEX idx_logs_order ON status_change_logs(order_id);
CREATE INDEX idx_logs_timestamp ON status_change_logs(timestamp DESC);
CREATE INDEX idx_logs_user ON status_change_logs(user_id);

-- Productivity
CREATE INDEX idx_productivity_date ON productivity_entries(date DESC);
CREATE INDEX idx_productivity_order ON productivity_entries(order_id);
CREATE INDEX idx_productivity_operator ON productivity_entries(operator_name);

-- Art Files
CREATE INDEX idx_art_files_order ON art_files(order_id);
CREATE INDEX idx_art_files_placement ON art_files(placement_id);
CREATE INDEX idx_art_files_proof ON art_files(proof_id);

-- Customers
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);

-- Products
CREATE INDEX idx_products_item_number ON products(item_number);
CREATE INDEX idx_products_active ON products(is_active);

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER line_items_updated_at
  BEFORE UPDATE ON line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE art_files ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Users: Admins can do everything, others can read all and update themselves
CREATE POLICY "Users: Admins full access"
  ON users FOR ALL
  TO authenticated
  USING (get_user_role() = 'Admin');

CREATE POLICY "Users: Read all"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users: Update self"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Customers: All authenticated users can read, Sales/Admin can modify
CREATE POLICY "Customers: Read all"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers: Sales/Admin modify"
  ON customers FOR ALL
  TO authenticated
  USING (get_user_role() IN ('Admin', 'Manager', 'Sales'));

-- Products: All can read, Admin/Manager can modify
CREATE POLICY "Products: Read all"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Products: Admin/Manager modify"
  ON products FOR ALL
  TO authenticated
  USING (get_user_role() IN ('Admin', 'Manager'));

-- Orders: All can read, ReadOnly can only read
CREATE POLICY "Orders: Read all"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Orders: Non-ReadOnly modify"
  ON orders FOR ALL
  TO authenticated
  USING (get_user_role() != 'ReadOnly');

-- Line Items: Follow order permissions
CREATE POLICY "Line Items: Read all"
  ON line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Line Items: Non-ReadOnly modify"
  ON line_items FOR ALL
  TO authenticated
  USING (get_user_role() != 'ReadOnly');

-- Status Change Logs: All can read, all can insert (audit trail)
CREATE POLICY "Logs: Read all"
  ON status_change_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Logs: Insert all"
  ON status_change_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Productivity Entries: Production/Admin can modify
CREATE POLICY "Productivity: Read all"
  ON productivity_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Productivity: Production/Admin modify"
  ON productivity_entries FOR ALL
  TO authenticated
  USING (get_user_role() IN ('Admin', 'Manager', 'Production'));

-- Art Files: All can read, non-ReadOnly can modify
CREATE POLICY "Art Files: Read all"
  ON art_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Art Files: Non-ReadOnly modify"
  ON art_files FOR ALL
  TO authenticated
  USING (get_user_role() != 'ReadOnly');

-- ================================================
-- FUNCTIONS & VIEWS
-- ================================================

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number(prefix TEXT DEFAULT 'TBD')
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Get the highest order number for this year and prefix
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE prefix || '-' || year || '-%';

  result := prefix || '-' || year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- View: Order summary with customer and line item counts
CREATE VIEW order_summary AS
SELECT
  o.id,
  o.order_number,
  o.customer_name,
  o.project_name,
  o.status,
  o.art_status,
  o.due_date,
  o.rush_order,
  o.created_at,
  o.updated_at,
  COUNT(DISTINCT li.id) as line_item_count,
  SUM(li.qty) as total_quantity,
  SUM(li.price * li.qty) as total_revenue,
  SUM(li.cost * li.qty) as total_cost,
  SUM((li.price - li.cost) * li.qty) as total_profit
FROM orders o
LEFT JOIN line_items li ON li.order_id = o.id
WHERE NOT o.is_archived
GROUP BY o.id;

-- View: Daily productivity summary
CREATE VIEW daily_productivity_summary AS
SELECT
  date,
  SUM(items_decorated) as total_decorated,
  SUM(items_packed) as total_packed,
  COUNT(DISTINCT operator_name) as operator_count,
  COUNT(*) as entry_count
FROM productivity_entries
GROUP BY date
ORDER BY date DESC;

-- ================================================
-- STORAGE BUCKETS (to be created via Supabase Dashboard or API)
-- ================================================

-- Art files bucket
-- CREATE STORAGE BUCKET art-files
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: image/*, application/pdf, application/illustrator, application/postscript

-- ================================================
-- INITIAL DATA
-- ================================================

-- Create default admin user (to be updated with real Supabase auth user ID)
INSERT INTO users (username, display_name, email, role, is_active)
VALUES ('admin', 'System Administrator', 'admin@geministudio.com', 'Admin', true)
ON CONFLICT (username) DO NOTHING;

COMMENT ON TABLE orders IS 'Primary order/job tracking - 11-stage workflow from Lead to Closed';
COMMENT ON TABLE line_items IS 'Individual product lines within orders';
COMMENT ON TABLE customers IS 'Customer database for CRM';
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE status_change_logs IS 'Complete audit trail of all order changes';
COMMENT ON TABLE productivity_entries IS 'Hourly production floor productivity tracking';
COMMENT ON TABLE art_files IS 'References to art files stored in Supabase Storage';
