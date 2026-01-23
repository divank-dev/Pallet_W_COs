# Pallet 2.0 - Complete Data Schema Documentation
**Database Schema & Data Model Reference**
**Version**: 2.0
**Last Updated**: 2026-01-22

---

## Table of Contents

1. [Overview](#overview)
2. [Database Tables](#database-tables)
3. [Enumerations](#enumerations)
4. [TypeScript Interfaces](#typescript-interfaces)
5. [Relationships](#relationships)
6. [Indexes & Performance](#indexes--performance)
7. [Row Level Security](#row-level-security)
8. [Triggers & Functions](#triggers--functions)
9. [Migration Scripts](#migration-scripts)

---

## Overview

### Technology Stack

- **Database**: PostgreSQL 15+ (via Supabase)
- **Type System**: TypeScript 5+
- **ORM**: Supabase Client SDK
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

### Design Principles

1. **Normalized Data**: Minimize redundancy
2. **Type Safety**: Strong typing throughout
3. **Audit Trail**: Track all changes
4. **Soft Deletes**: Preserve historical data
5. **Row Level Security**: Database-level permissions
6. **Change Order Integration**: Flagged line items (not separate entities)

---

## Database Tables

### 1. `users`

User accounts and authentication.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'sales',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);
```

**Columns**:
- `id`: Unique user identifier (UUID)
- `email`: User's email address (unique, validated)
- `display_name`: User's full name for display
- `role`: User role (see user_role enum)
- `is_active`: Whether user account is active
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp
- `last_login`: Last successful login time

**TypeScript Interface**:
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}
```

---

### 2. `customers`

Customer/client information.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  account_number TEXT UNIQUE,
  tax_exempt BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);
```

**Columns**:
- `id`: Unique customer identifier
- `name`: Primary contact name
- `company_name`: Business/organization name
- `email`: Contact email
- `phone`: Contact phone number
- `address`: Street address
- `city`, `state`, `zip_code`, `country`: Location
- `account_number`: Internal account reference
- `tax_exempt`: Tax exemption status
- `notes`: General customer notes
- `created_by`: User who created customer record

**TypeScript Interface**:
```typescript
interface Customer {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  accountNumber?: string;
  taxExempt: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
```

---

### 3. `orders`

Core order/quote information.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),

  -- Order Details
  status order_status NOT NULL DEFAULT 'Lead',
  project_name TEXT,
  event_date DATE,
  in_hands_date DATE NOT NULL,

  -- Change Order Fields (NEW)
  has_change_orders BOOLEAN DEFAULT false,
  last_change_order_date TIMESTAMPTZ,

  -- Tracking
  is_archived BOOLEAN DEFAULT false,
  is_rush BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),

  -- Art Status
  art_status art_status DEFAULT 'Not Started',
  art_notes TEXT,

  -- Fulfillment
  shipping_method TEXT,
  shipping_cost DECIMAL(10,2),
  tracking_number TEXT,
  shipped_date DATE,
  delivered_date DATE,

  -- Financial
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  shipping_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,

  -- Invoice
  invoice_number TEXT,
  invoice_date DATE,
  invoice_sent BOOLEAN DEFAULT false,
  payment_received BOOLEAN DEFAULT false,
  payment_date DATE,

  CONSTRAINT valid_in_hands_date CHECK (in_hands_date >= CURRENT_DATE)
);
```

**Key Fields**:
- `order_number`: Unique order identifier (e.g., TBD-2024-0001)
- `status`: Current workflow stage
- `has_change_orders`: TRUE if order has change order items
- `last_change_order_date`: When most recent change order was added
- `is_archived`: Soft delete flag
- `in_hands_date`: Required delivery date
- `art_status`: Artwork approval status

**TypeScript Interface**:
```typescript
interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  status: OrderStatus;
  projectName?: string;
  eventDate?: Date;
  inHandsDate: Date;

  // Change Orders (NEW)
  hasChangeOrders?: boolean;
  lastChangeOrderDate?: Date;

  // Arrays
  lineItems?: LineItem[];
  artFiles?: ArtFile[];
  history: StatusChangeLog[];

  // Flags
  isArchived: boolean;
  isRush: boolean;
  priority: number;

  // Art
  artStatus: ArtStatus;
  artNotes?: string;

  // Shipping
  shippingMethod?: string;
  shippingCost?: number;
  trackingNumber?: string;
  shippedDate?: Date;
  deliveredDate?: Date;

  // Financial
  subtotal?: number;
  taxAmount?: number;
  shippingAmount?: number;
  totalAmount?: number;
  depositAmount?: number;
  depositPaid: boolean;

  // Invoice
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceSent: boolean;
  paymentReceived: boolean;
  paymentDate?: Date;

  // Metadata
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  assignedTo?: string;
}
```

---

### 4. `line_items`

Individual products/items in orders.

```sql
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product Info
  item_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  size TEXT,
  qty INTEGER NOT NULL,

  -- Change Order Tracking (NEW)
  is_change_order BOOLEAN DEFAULT false,
  change_order_date TIMESTAMPTZ,
  original_quantity INTEGER,

  -- Pricing
  cost DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,

  -- Decoration
  decoration_type production_method NOT NULL,
  decoration_placements INTEGER DEFAULT 1,
  decoration_description TEXT,
  screen_print_colors INTEGER,
  stitch_count_tier stitch_count_tier,
  dtf_size dtf_size,
  is_plus_size BOOLEAN DEFAULT false,

  -- Status Tracking
  ordered BOOLEAN DEFAULT false,
  ordered_date DATE,
  received BOOLEAN DEFAULT false,
  received_date DATE,
  decorated BOOLEAN DEFAULT false,
  decorated_date DATE,
  packed BOOLEAN DEFAULT false,
  packed_date DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_qty CHECK (qty <> 0),
  CONSTRAINT positive_cost CHECK (cost >= 0),
  CONSTRAINT positive_price CHECK (price >= 0),
  CONSTRAINT valid_placements CHECK (decoration_placements BETWEEN 1 AND 8)
);
```

**Key Changes**:
- **NEW**: `is_change_order` - Flags items added via change order
- **NEW**: `change_order_date` - When change order item was added
- **NEW**: `original_quantity` - Original qty before reduction (for negative quantities)
- **ALLOWS NEGATIVE**: `qty` can be negative for change order reductions
- **Status Fields**: Track ordered, received, decorated, packed

**TypeScript Interface**:
```typescript
interface LineItem {
  id: string;
  orderId: string;

  // Product
  itemNumber: string;
  name: string;
  description?: string;
  color?: string;
  size?: string;
  qty: number;  // Can be negative for change orders

  // Change Order (NEW)
  isChangeOrder?: boolean;
  changeOrderDate?: Date;
  originalQuantity?: number;

  // Pricing
  cost: number;
  price: number;

  // Decoration
  decorationType: ProductionMethod;
  decorationPlacements: number;
  decorationDescription?: string;
  screenPrintColors?: number;
  stitchCountTier?: StitchCountTier;
  dtfSize?: DtfSize;
  isPlusSize: boolean;

  // Status
  ordered: boolean;
  orderedDate?: Date;
  received: boolean;
  receivedDate?: Date;
  decorated: boolean;
  decoratedDate?: Date;
  packed: boolean;
  packedDate?: Date;

  // Metadata
  notes?: string;
  createdAt: Date;
}
```

---

### 5. `art_files`

Artwork files and approval tracking.

```sql
CREATE TABLE art_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,

  file_category file_category DEFAULT 'Artwork',

  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  approval_status approval_status DEFAULT 'Pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  revision_number INTEGER DEFAULT 1,
  notes TEXT
);
```

**Columns**:
- `file_path`: Supabase Storage path
- `file_category`: Artwork, Proof, Mockup, Reference
- `approval_status`: Pending, Approved, Rejected, Revision
- `revision_number`: Track versions

**TypeScript Interface**:
```typescript
interface ArtFile {
  id: string;
  orderId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  fileCategory: FileCategory;
  uploadedBy?: string;
  uploadedAt: Date;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  revisionNumber: number;
  notes?: string;
}
```

---

### 6. `status_change_logs`

Audit trail for all order changes.

```sql
CREATE TABLE status_change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  user_id UUID REFERENCES users(id),
  user_name TEXT,

  action TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,

  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Track every change to an order
- Status changes
- Line item additions/deletions
- Art approvals
- Production updates
- Change order creation

**TypeScript Interface**:
```typescript
interface StatusChangeLog {
  id: string;
  orderId: string;
  userId?: string;
  userName?: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
  timestamp: Date;
}
```

---

### 7. `products`

Product catalog (optional, for future use).

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,

  base_cost DECIMAL(10,2),
  base_price DECIMAL(10,2),

  available_colors TEXT[],
  available_sizes TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Centralize product information for quick order entry

---

### 8. `productivity_entries`

Production time tracking (optional).

```sql
CREATE TABLE productivity_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),

  task_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,

  items_completed INTEGER DEFAULT 0,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Track production efficiency and labor costs

---

## Enumerations

### `user_role`

```sql
CREATE TYPE user_role AS ENUM (
  'admin',
  'manager',
  'sales',
  'production',
  'fulfillment',
  'readonly'
);
```

**TypeScript**:
```typescript
type UserRole = 'admin' | 'manager' | 'sales' | 'production' | 'fulfillment' | 'readonly';
```

---

### `order_status`

```sql
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
```

**TypeScript**:
```typescript
type OrderStatus =
  | 'Lead'
  | 'Quote'
  | 'Approval'
  | 'Art Confirmation'
  | 'Inventory Order'
  | 'Production Prep'
  | 'Inventory Received'
  | 'Production'
  | 'Fulfillment'
  | 'Invoice'
  | 'Closeout'
  | 'Closed';
```

---

### `production_method`

```sql
CREATE TYPE production_method AS ENUM (
  'Screen Print',
  'Embroidery',
  'DTF',
  'Heat Transfer',
  'Vinyl',
  'Sublimation',
  'None'
);
```

**TypeScript**:
```typescript
type ProductionMethod =
  | 'Screen Print'
  | 'Embroidery'
  | 'DTF'
  | 'Heat Transfer'
  | 'Vinyl'
  | 'Sublimation'
  | 'None';
```

---

### `art_status`

```sql
CREATE TYPE art_status AS ENUM (
  'Not Started',
  'In Progress',
  'Pending Approval',
  'Approved',
  'Revision Needed'
);
```

---

### `stitch_count_tier`

```sql
CREATE TYPE stitch_count_tier AS ENUM (
  'Simple',
  'Medium',
  'Complex'
);
```

---

### `dtf_size`

```sql
CREATE TYPE dtf_size AS ENUM (
  'Small',
  'Medium',
  'Large'
);
```

---

### `file_category`

```sql
CREATE TYPE file_category AS ENUM (
  'Artwork',
  'Proof',
  'Mockup',
  'Reference'
);
```

---

### `approval_status`

```sql
CREATE TYPE approval_status AS ENUM (
  'Pending',
  'Approved',
  'Rejected',
  'Revision'
);
```

---

## Relationships

### Entity Relationship Diagram

```
users ──┐
        ├──< customers (created_by)
        ├──< orders (created_by, assigned_to)
        ├──< art_files (uploaded_by, approved_by)
        └──< status_change_logs (user_id)

customers ──< orders (customer_id)

orders ──┬──< line_items (order_id) [CASCADE DELETE]
         ├──< art_files (order_id) [CASCADE DELETE]
         └──< status_change_logs (order_id) [CASCADE DELETE]

products (optional reference for line_items)
```

### Cascade Rules

- **DELETE order** → Deletes all line_items, art_files, status_change_logs
- **DELETE customer** → Sets orders.customer_id to NULL
- **DELETE user** → Sets created_by/assigned_to to NULL

---

## Indexes & Performance

### Primary Indexes

```sql
-- Primary Keys (automatically indexed)
CREATE UNIQUE INDEX idx_users_pkey ON users(id);
CREATE UNIQUE INDEX idx_customers_pkey ON customers(id);
CREATE UNIQUE INDEX idx_orders_pkey ON orders(id);
CREATE UNIQUE INDEX idx_line_items_pkey ON line_items(id);
```

### Query Optimization Indexes

```sql
-- Order lookups
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status) WHERE NOT is_archived;
CREATE INDEX idx_orders_customer ON orders(customer_id) WHERE NOT is_archived;
CREATE INDEX idx_orders_in_hands_date ON orders(in_hands_date) WHERE NOT is_archived;

-- Change order queries (NEW)
CREATE INDEX idx_orders_change_orders ON orders(has_change_orders)
  WHERE has_change_orders = true;
CREATE INDEX idx_line_items_change_order ON line_items(is_change_order)
  WHERE is_change_order = true;

-- Line item queries
CREATE INDEX idx_line_items_order ON line_items(order_id);
CREATE INDEX idx_line_items_status ON line_items(ordered, received, decorated, packed);

-- Art file queries
CREATE INDEX idx_art_files_order ON art_files(order_id);
CREATE INDEX idx_art_files_status ON art_files(approval_status);

-- Audit log queries
CREATE INDEX idx_status_logs_order ON status_change_logs(order_id);
CREATE INDEX idx_status_logs_timestamp ON status_change_logs(timestamp DESC);

-- User lookups
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;
```

---

## Row Level Security

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE art_files ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY admin_all ON orders
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Manager: View all, edit all
CREATE POLICY manager_all ON orders
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

-- Sales: Own orders only
CREATE POLICY sales_own ON orders
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'sales'
    AND (
      created_by = auth.uid()
      OR assigned_to = auth.uid()
    )
  );

-- Production: Production stages only
CREATE POLICY production_view ON orders
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'production'
    AND status IN ('Production Prep', 'Inventory Received', 'Production')
  );

-- Fulfillment: Fulfillment stage only
CREATE POLICY fulfillment_view ON orders
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'fulfillment'
    AND status IN ('Fulfillment', 'Invoice')
  );

-- ReadOnly: View all, edit none
CREATE POLICY readonly_view ON orders
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'readonly'
  );
```

---

## Triggers & Functions

### Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Auto-Generate Order Numbers

```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'TBD';
  year TEXT := TO_CHAR(NOW(), 'YYYY');
  next_num INTEGER;
  order_num TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE prefix || '-' || year || '-%';

  order_num := prefix || '-' || year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;
```

### Calculate Order Total

```sql
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  line_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(price * qty), 0)
  INTO line_total
  FROM line_items
  WHERE order_id = order_uuid;

  RETURN line_total;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Scripts

### Initial Schema Migration

```sql
-- File: 20240122_initial_schema.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM (...);
CREATE TYPE order_status AS ENUM (...);
-- ... all other enums

-- Create tables
CREATE TABLE users (...);
CREATE TABLE customers (...);
CREATE TABLE orders (...);
CREATE TABLE line_items (...);
CREATE TABLE art_files (...);
CREATE TABLE status_change_logs (...);

-- Create indexes
CREATE INDEX idx_orders_status ON orders(status);
-- ... all other indexes

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... all other tables

-- Create policies
CREATE POLICY admin_all ON orders ...;
-- ... all other policies

-- Create functions
CREATE FUNCTION update_updated_at() ...;
-- ... all other functions

-- Create triggers
CREATE TRIGGER update_orders_timestamp ...;
-- ... all other triggers
```

### Change Order Migration

```sql
-- File: 20240122_change_order_refactor.sql

-- Add new columns to line_items
ALTER TABLE line_items
  ADD COLUMN is_change_order BOOLEAN DEFAULT false,
  ADD COLUMN change_order_date TIMESTAMPTZ,
  ADD COLUMN original_quantity INTEGER;

-- Add new columns to orders
ALTER TABLE orders
  ADD COLUMN has_change_orders BOOLEAN DEFAULT false,
  ADD COLUMN last_change_order_date TIMESTAMPTZ;

-- Remove old change order columns (if exist)
ALTER TABLE orders
  DROP COLUMN IF EXISTS is_change_order,
  DROP COLUMN IF EXISTS parent_order_id,
  DROP COLUMN IF EXISTS change_order_ids;

-- Create new indexes
CREATE INDEX idx_orders_change_orders ON orders(has_change_orders)
  WHERE has_change_orders = true;

CREATE INDEX idx_line_items_change_order ON line_items(is_change_order)
  WHERE is_change_order = true;

-- Update constraint to allow negative quantities
ALTER TABLE line_items
  DROP CONSTRAINT IF EXISTS positive_qty,
  ADD CONSTRAINT nonzero_qty CHECK (qty <> 0);

-- Add comments
COMMENT ON COLUMN line_items.is_change_order IS
  'True if this line item was added as part of a change order';
COMMENT ON COLUMN orders.has_change_orders IS
  'True if this order has any change order items';
```

---

## Data Validation Rules

### Business Rules

1. **Order Numbers**: Must be unique, format: `PREFIX-YYYY-####`
2. **In-Hands Date**: Cannot be in the past
3. **Line Item Qty**: Cannot be zero, can be negative for change orders
4. **Prices**: Must be non-negative
5. **Decoration Placements**: Between 1 and 8
6. **Status Progression**: Must follow workflow order (with exceptions for backward movement)

### Data Integrity

- **Referential Integrity**: Foreign keys enforced
- **Cascade Deletes**: Line items, art files deleted with order
- **Soft Deletes**: Orders marked as archived, not deleted
- **Audit Trail**: All changes logged in status_change_logs

---

## Sample Data

### Sample Insert Queries

```sql
-- Insert sample customer
INSERT INTO customers (name, company_name, email, phone)
VALUES ('John Smith', 'ABC Corporation', 'john@abc.com', '555-1234');

-- Insert sample order
INSERT INTO orders (
  order_number, customer_id, status, project_name, in_hands_date
) VALUES (
  'TBD-2024-0001',
  '...customer-uuid...',
  'Quote',
  'Summer Promo',
  '2024-07-01'
);

-- Insert sample line item
INSERT INTO line_items (
  order_id, item_number, name, color, size, qty,
  cost, price, decoration_type, decoration_placements
) VALUES (
  '...order-uuid...',
  'SS001',
  'Basic T-Shirt',
  'Navy',
  'L',
  50,
  5.00,
  12.00,
  'Screen Print',
  1
);

-- Insert change order line item
INSERT INTO line_items (
  order_id, item_number, name, color, size, qty,
  cost, price, decoration_type, decoration_placements,
  is_change_order, change_order_date
) VALUES (
  '...order-uuid...',
  'SS001',
  'Basic T-Shirt',
  'Gray',
  'L',
  25,  -- Additional items
  5.00,
  12.00,
  'Screen Print',
  1,
  true,
  NOW()
);
```

---

## Backup & Recovery

### Backup Strategy

1. **Automated Backups**: Daily via Supabase
2. **Point-in-Time Recovery**: Up to 7 days
3. **Manual Backups**: Before major migrations
4. **Export Data**: Regular CSV exports for critical tables

### Recovery Procedures

```sql
-- Restore from backup
pg_restore -d database_name backup_file.dump

-- Point-in-time recovery (Supabase dashboard)
-- Navigate to Settings → Database → Point-in-time Recovery
```

---

## Performance Considerations

### Query Optimization Tips

1. **Use Indexes**: All foreign keys and frequently queried columns indexed
2. **Limit Results**: Always use LIMIT for large datasets
3. **Select Specific Columns**: Avoid SELECT *
4. **Use WHERE Clauses**: Filter at database level, not in application
5. **Batch Operations**: Use bulk inserts for multiple records

### Monitoring

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Appendix: Complete TypeScript Definitions

See `src/types.ts` for the complete TypeScript interface definitions matching this schema.

---

**End of Data Schema Documentation**

*This schema supports the complete Pallet 2.0 application including the new change order system.*
