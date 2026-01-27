-- ================================================
-- SEED DEFAULT USERS
-- Note: This creates user profiles in the users table.
-- The corresponding Supabase Auth accounts must be created
-- separately using the seed script: npm run seed:users
-- ================================================

-- Insert default users (auth_user_id will be populated by the seed script)
INSERT INTO users (id, username, display_name, email, role, department, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator', 'admin@company.com', 'Admin', 'Administration', true),
  ('00000000-0000-0000-0000-000000000002', 'manager', 'Manager User', 'manager@company.com', 'Manager', 'Administration', true),
  ('00000000-0000-0000-0000-000000000003', 'sales', 'Sales User', 'sales@company.com', 'Sales', 'Sales', true),
  ('00000000-0000-0000-0000-000000000004', 'production', 'Production User', 'production@company.com', 'Production', 'Production', true),
  ('00000000-0000-0000-0000-000000000005', 'fulfillment', 'Fulfillment User', 'fulfillment@company.com', 'Fulfillment', 'Fulfillment', true),
  ('00000000-0000-0000-0000-000000000006', 'readonly', 'ReadOnly User', 'readonly@company.com', 'ReadOnly', 'Administration', true)
ON CONFLICT (username) DO NOTHING;
