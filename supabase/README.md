# Pallet Supabase Database Setup

This directory contains the database schema and migrations for the Pallet application using Supabase.

## Overview

Pallet uses Supabase for:
- **PostgreSQL Database**: All order, customer, and product data
- **Authentication**: User login and role-based access control
- **Storage**: Art files, proofs, and customer uploads
- **Row Level Security (RLS)**: Multi-user access with permissions

## Database Schema

### Core Tables

1. **orders** - Main order tracking (Lead → Quote → ... → Closed)
2. **line_items** - Individual products within orders
3. **customers** - Customer database for CRM
4. **users** - System users with roles (Admin, Manager, Sales, Production, etc.)
5. **products** - Product catalog
6. **status_change_logs** - Complete audit trail of all changes
7. **productivity_entries** - Hourly production floor tracking
8. **art_files** - References to files in Supabase Storage

### Workflow Stages

The system tracks orders through 11 stages:

0. **Lead** - Initial sales inquiry
1. **Quote** - Building quote with line items
2. **Approval** - Quote sent for customer approval
3. **Art Confirmation** - Artwork proof approval
4. **Inventory Order** - Ordering blank goods
5. **Production Prep** - Preparing for production
6. **Inventory Received** - Receiving blank goods
7. **Production** - Decoration and packing
8. **Fulfillment** - Shipping or pickup
9. **Invoice** - Send invoice to customer
10. **Closeout** - Project file archival
11. **Closed** - Completed/Archived

## Setup Instructions

### 1. Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Wait for the database to initialize
4. Copy your project URL and anon key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Run Database Migrations

You can run migrations in two ways:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

#### Option B: Using SQL Editor (Manual)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file in order:
   - `migrations/20240122000001_initial_schema.sql`
   - `migrations/20240122000002_storage_and_helpers.sql`
4. Execute each migration

### 4. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `art-files`
3. Set as **Private** (not public)
4. Set file size limit to **50MB**
5. Configure allowed MIME types:
   - `image/*`
   - `application/pdf`
   - `application/illustrator`
   - `application/postscript`

The storage policies are already created by the migration.

### 5. Create First Admin User

After setting up authentication (see below), you'll need to create your first admin user.

#### Option 1: Through Supabase Dashboard

1. Go to Authentication → Users
2. Add a new user with email/password
3. Copy the user's UUID
4. Go to SQL Editor and run:
   ```sql
   UPDATE users
   SET auth_user_id = 'paste-uuid-here', role = 'Admin'
   WHERE username = 'admin';
   ```

#### Option 2: Through Sign-Up Flow

1. Use the app's sign-up feature
2. Manually update the user's role in the database to 'Admin'

### 6. Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` and other required packages.

## User Roles & Permissions

The system supports 6 user roles with different access levels:

| Role | Can View | Can Create | Can Edit | Can Delete | Notes |
|------|----------|------------|----------|------------|-------|
| **Admin** | All | All | All | Yes | Full system access |
| **Manager** | All | All | All | No | Can manage most data |
| **Sales** | All | Leads, Quotes | Own orders | No | Sales-focused |
| **Production** | Production stages | Productivity | Production data | No | Floor operations |
| **Fulfillment** | Fulfillment+ | No | Fulfillment | No | Shipping only |
| **ReadOnly** | All | No | No | No | View-only access |

## Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only see data they should access
- ReadOnly users cannot modify anything
- Audit logs are write-only (no edits)
- File uploads are scoped to authenticated users

## Database Functions

### `generate_order_number(prefix)`
Generates sequential order numbers like `TBD-2024-0001`

```sql
SELECT generate_order_number('TBD');
-- Returns: TBD-2024-0001
```

### `search_orders(search_query)`
Full-text search across orders

```sql
SELECT * FROM search_orders('Acme Corporation');
```

### `refresh_analytics_views()`
Refresh materialized views for analytics

```sql
SELECT refresh_analytics_views();
```

### `validate_stage_transition(current, new)`
Validates workflow stage transitions

```sql
SELECT validate_stage_transition('Quote', 'Approval');
-- Returns: true
```

## Views

### `order_summary`
Pre-aggregated order data with line item totals

```sql
SELECT * FROM order_summary WHERE status = 'Production';
```

### `daily_productivity_summary`
Daily production metrics

```sql
SELECT * FROM daily_productivity_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
```

### `customer_lifetime_value`
Customer analytics (materialized view)

```sql
SELECT * FROM customer_lifetime_value
ORDER BY lifetime_revenue DESC
LIMIT 10;
```

## Migration Strategy

### Adding New Migrations

When you need to modify the schema:

1. Create a new migration file:
   ```
   supabase/migrations/YYYYMMDDHHMMSS_description.sql
   ```

2. Add your changes (ALTER TABLE, etc.)

3. Test locally if using Supabase CLI:
   ```bash
   supabase db reset
   ```

4. Deploy to production:
   ```bash
   supabase db push
   ```

### Rollback Strategy

Supabase doesn't have built-in rollbacks. Best practices:
- Always backup before major changes
- Test migrations locally first
- Write reversible migrations when possible
- Use database backups from Supabase dashboard

## Data Import/Export

### Export Current Data

If you have existing data in localStorage or JSON:

1. Use the provided data migration script (coming soon)
2. Or manually insert via SQL:

```sql
INSERT INTO customers (name, email, phone)
VALUES ('Acme Corp', 'contact@acme.com', '555-1234');
```

### Backup Database

From Supabase dashboard:
1. Go to Database → Backups
2. Download latest backup
3. Store securely

## Troubleshooting

### Connection Issues

If you can't connect to Supabase:
1. Check `.env.local` has correct values
2. Verify project URL and anon key
3. Check project isn't paused (free tier)

### RLS Errors

If you get "permission denied" errors:
1. Verify user is authenticated
2. Check user's role in `users` table
3. Review RLS policies in SQL Editor

### Migration Errors

If migrations fail:
1. Check for syntax errors in SQL
2. Verify dependencies (tables must exist before foreign keys)
3. Check Supabase logs in dashboard

## Performance Optimization

### Indexes

All critical indexes are created by migrations:
- Order status, customer name, order number
- Full-text search on orders
- Line items by order and decoration type

### Caching

The app uses:
- React Query for client-side caching (to be implemented)
- Supabase Realtime for live updates (optional)

### Analytics

For better performance on analytics:
1. Refresh materialized views periodically:
   ```sql
   SELECT refresh_analytics_views();
   ```

2. Consider running analytics queries off-hours

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use anon key in client** - Never expose service role key
3. **RLS policies** - Always test with different user roles
4. **File uploads** - Validate file types and sizes
5. **Audit logging** - Review status_change_logs regularly

## Support & Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## License

Proprietary - Gemini Studio Internal Use Only
