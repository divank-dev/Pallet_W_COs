-- Temporarily disable RLS for development
-- This allows the app to work without Supabase Auth

-- Drop existing policies
DROP POLICY IF EXISTS "Users: Admins full access" ON users;
DROP POLICY IF EXISTS "Users: Read all" ON users;
DROP POLICY IF EXISTS "Users: Update self" ON users;
DROP POLICY IF EXISTS "Customers: Read all" ON customers;
DROP POLICY IF EXISTS "Customers: Sales/Admin modify" ON customers;
DROP POLICY IF EXISTS "Products: Read all" ON products;
DROP POLICY IF EXISTS "Products: Admin/Manager modify" ON products;
DROP POLICY IF EXISTS "Orders: Read all" ON orders;
DROP POLICY IF EXISTS "Orders: Non-ReadOnly modify" ON orders;
DROP POLICY IF EXISTS "Line Items: Read all" ON line_items;
DROP POLICY IF EXISTS "Line Items: Non-ReadOnly modify" ON line_items;
DROP POLICY IF EXISTS "Logs: Read all" ON status_change_logs;
DROP POLICY IF EXISTS "Logs: Insert all" ON status_change_logs;
DROP POLICY IF EXISTS "Productivity: Read all" ON productivity_entries;
DROP POLICY IF EXISTS "Productivity: Production/Admin modify" ON productivity_entries;
DROP POLICY IF EXISTS "Art Files: Read all" ON art_files;
DROP POLICY IF EXISTS "Art Files: Non-ReadOnly modify" ON art_files;

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_change_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE art_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE database_metadata DISABLE ROW LEVEL SECURITY;

-- Grant full access to anon and authenticated roles
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON customers TO anon, authenticated;
GRANT ALL ON products TO anon, authenticated;
GRANT ALL ON orders TO anon, authenticated;
GRANT ALL ON line_items TO anon, authenticated;
GRANT ALL ON status_change_logs TO anon, authenticated;
GRANT ALL ON productivity_entries TO anon, authenticated;
GRANT ALL ON art_files TO anon, authenticated;
GRANT ALL ON database_metadata TO anon, authenticated;

-- Grant sequence access for inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
