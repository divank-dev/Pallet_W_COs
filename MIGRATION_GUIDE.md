# Migration Guide: Local Storage → Supabase

This guide will help you migrate your existing Pallet application from local storage to Supabase.

## Overview

The migration process involves:
1. Setting up Supabase infrastructure
2. Installing new dependencies
3. Migrating existing data
4. Updating application code to use Supabase
5. Testing the migration

## Prerequisites

- Existing Pallet application running locally
- Node.js and npm installed
- A Supabase account ([sign up here](https://app.supabase.com))

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: Pallet Production
   - **Database Password**: (generate secure password)
   - **Region**: (choose closest to your users)
4. Click "Create new project"
5. Wait 2-3 minutes for setup

### 1.2 Get Your Credentials

1. In your Supabase project, go to Settings → API
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### 1.3 Configure Environment

1. In your Pallet project, create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and paste your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```

## Step 2: Database Setup

### 2.1 Run Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (get project ID from project settings)
supabase link --project-ref your-project-id

# Push migrations to database
supabase db push
```

**Option B: Manual SQL Execution**

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open `supabase/migrations/20240122000001_initial_schema.sql`
4. Copy all contents and paste into SQL Editor
5. Click "Run"
6. Repeat for `20240122000002_storage_and_helpers.sql`

### 2.2 Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "Create bucket"
3. Configure:
   - **Name**: `art-files`
   - **Public**: No (keep private)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: Add these:
     ```
     image/*
     application/pdf
     application/illustrator
     application/postscript
     ```
4. Click "Create bucket"

## Step 3: Install Dependencies

```bash
cd /path/to/Pallet
npm install
```

This will install `@supabase/supabase-js` and other required packages.

## Step 4: Data Migration

### 4.1 Export Existing Data

If you're currently using localStorage or local JSON files:

1. Open your browser DevTools (F12)
2. Go to Console
3. Run this to export orders:
   ```javascript
   copy(JSON.stringify(localStorage.getItem('pallet_orders')))
   ```
4. Paste into a file: `data-export/orders.json`

### 4.2 Create Data Migration Script

Create `scripts/migrate-data.ts`:

```typescript
import { supabase } from './src/lib/supabase';
import ordersData from './data-export/orders.json';

async function migrateOrders() {
  console.log('Starting data migration...');

  for (const order of ordersData) {
    // 1. Create/get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({
        name: order.customer,
        email: order.customerEmail,
        phone: order.customerPhone
      })
      .select()
      .single();

    if (customerError) {
      console.error('Customer error:', customerError);
      continue;
    }

    // 2. Create order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: order.orderNumber,
        customer_id: customer.id,
        customer_name: order.customer,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        project_name: order.projectName,
        status: order.status,
        art_status: order.artStatus,
        due_date: order.dueDate,
        rush_order: order.rushOrder,
        notes: order.notes,
        lead_info: order.leadInfo,
        art_confirmation: order.artConfirmation,
        prep_status: order.prepStatus,
        fulfillment_status: order.fulfillment,
        invoice_status: order.invoiceStatus,
        closeout_checklist: order.closeoutChecklist,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order error:', orderError);
      continue;
    }

    // 3. Create line items
    if (order.lineItems && order.lineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('line_items')
        .insert(
          order.lineItems.map(item => ({
            order_id: newOrder.id,
            item_number: item.itemNumber,
            name: item.name,
            color: item.color,
            size: item.size,
            qty: item.qty,
            decoration_type: item.decorationType,
            decoration_placements: item.decorationPlacements,
            decoration_description: item.decorationDescription,
            cost: item.cost,
            price: item.price,
            ordered: item.ordered,
            received: item.received,
            decorated: item.decorated,
            packed: item.packed,
            screen_print_colors: item.screenPrintColors,
            is_plus_size: item.isPlusSize,
            stitch_count_tier: item.stitchCountTier,
            dtf_size: item.dtfSize
          }))
        );

      if (lineItemsError) {
        console.error('Line items error:', lineItemsError);
      }
    }

    // 4. Create audit logs
    if (order.history && order.history.length > 0) {
      const { error: historyError } = await supabase
        .from('status_change_logs')
        .insert(
          order.history.map(log => ({
            order_id: newOrder.id,
            timestamp: log.timestamp,
            user_name: log.userName,
            action: log.action,
            previous_value: log.previousValue,
            new_value: log.newValue,
            notes: log.notes
          }))
        );

      if (historyError) {
        console.error('History error:', historyError);
      }
    }

    console.log(`✓ Migrated order: ${order.orderNumber}`);
  }

  console.log('Migration complete!');
}

migrateOrders().catch(console.error);
```

### 4.3 Run Migration

```bash
npx tsx scripts/migrate-data.ts
```

## Step 5: Update Application Code

### 5.1 Update AuthContext

The existing `AuthContext` needs to be updated to use Supabase Auth instead of local authentication. This will be a significant refactor.

Key changes:
- Replace local username/password with Supabase Auth
- Use `supabase.auth.signInWithPassword()`
- Listen to `supabase.auth.onAuthStateChange()`
- Store user profile in `users` table

### 5.2 Update Data Fetching

Replace local state management with Supabase queries:

**Before (App.tsx):**
```typescript
const [orders, setOrders] = useState<Order[]>(TEST_ORDERS);
```

**After:**
```typescript
const [orders, setOrders] = useState<Order[]>([]);

useEffect(() => {
  loadOrders();

  // Subscribe to realtime changes
  const subscription = supabase
    .channel('orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, () => {
      loadOrders(); // Refresh on changes
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);

async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      line_items (*),
      customer:customers (*)
    `)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading orders:', error);
    return;
  }

  setOrders(data);
}
```

### 5.3 Update Order Operations

**Create Order:**
```typescript
const handleCreateOrder = async (newOrder: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: await generateOrderNumber(newOrder.status === 'Lead' ? 'LEAD' : 'TBD'),
      customer_name: newOrder.customer,
      customer_email: newOrder.customerEmail,
      project_name: newOrder.projectName,
      status: newOrder.status,
      // ... other fields
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    return;
  }

  setOrders(prev => [data, ...prev]);
};
```

**Update Order:**
```typescript
const handleUpdateOrder = async (updated: Order) => {
  const { error } = await supabase
    .from('orders')
    .update({
      status: updated.status,
      art_status: updated.artStatus,
      // ... other fields
      updated_at: new Date().toISOString()
    })
    .eq('id', updated.id);

  if (error) {
    console.error('Error updating order:', error);
    return;
  }

  setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
};
```

## Step 6: Authentication Setup

### 6.1 Create First Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Enter:
   - Email: `admin@yourdomain.com`
   - Password: (strong password)
   - Confirm: checked
4. Click "Create user"
5. Copy the user's UUID

### 6.2 Link User to System

In SQL Editor, run:
```sql
-- Get the auth user ID from the previous step
UPDATE users
SET
  auth_user_id = '00000000-0000-0000-0000-000000000000', -- Replace with actual UUID
  email = 'admin@yourdomain.com'
WHERE username = 'admin';
```

### 6.3 Test Login

1. Start your app: `npm run dev`
2. You should see the login page
3. Login with `admin@yourdomain.com` and your password

## Step 7: Testing

### 7.1 Test Checklist

- [ ] User can login
- [ ] Orders load correctly
- [ ] Can create new Lead
- [ ] Can create new Quote
- [ ] Can add line items
- [ ] Can advance order through stages
- [ ] Art files upload to Storage
- [ ] Customer search works
- [ ] Reports generate correctly
- [ ] Audit logs are created
- [ ] User roles restrict access properly

### 7.2 Verify Database

Check that data was migrated correctly:

```sql
-- Count records
SELECT
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM line_items) as line_items,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM users) as users;

-- Sample orders
SELECT order_number, customer_name, status, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

## Step 8: Production Deployment

### 8.1 Environment Variables

For production deployment (e.g., Vercel, Netlify):

1. Add environment variables in your hosting platform:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 8.2 Build

```bash
npm run build
```

### 8.3 Deploy

Deploy the `dist` folder to your hosting platform.

## Rollback Plan

If you need to rollback to local storage:

1. Keep a backup of your local data
2. Comment out Supabase code
3. Restore localStorage-based state management
4. Redeploy previous version

## Troubleshooting

### "Invalid JWT" Errors

- Clear browser cache and localStorage
- Re-login
- Check that environment variables are correct

### "Permission Denied" Errors

- Check user role in database
- Verify RLS policies
- Ensure user is authenticated

### Data Not Loading

- Check Supabase dashboard → API → Logs
- Verify network requests in DevTools
- Check for errors in browser console

### File Upload Fails

- Verify storage bucket exists
- Check file size (max 50MB)
- Verify file type is allowed
- Check storage policies

## Performance Optimization

After migration:

1. **Enable Realtime** (optional):
   - Go to Database → Replication
   - Enable realtime for `orders`, `line_items`

2. **Configure Caching**:
   - Install React Query: `npm install @tanstack/react-query`
   - Wrap app with QueryClientProvider
   - Use `useQuery` for data fetching

3. **Optimize Queries**:
   - Use `.select()` to only fetch needed columns
   - Add indexes for custom queries
   - Use materialized views for analytics

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Review PostgreSQL logs
3. Check RLS policies
4. Verify migration SQL ran correctly

## Next Steps

After successful migration:

1. Set up automated backups in Supabase
2. Configure email templates for auth
3. Add user invitation workflow
4. Set up monitoring and alerts
5. Train team on new system

---

**Migration Checklist:**

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Storage bucket created
- [ ] Dependencies installed
- [ ] Data migrated
- [ ] Auth configured
- [ ] First admin user created
- [ ] Application code updated
- [ ] Testing completed
- [ ] Production deployed

🎉 Congratulations! Your Pallet application is now running on Supabase!
