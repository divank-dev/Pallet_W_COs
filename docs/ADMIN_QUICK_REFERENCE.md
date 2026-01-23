# Pallet 2.0 - Administrator Quick Reference
**Fast Reference Guide for System Administrators**
**Version**: 2.0
**Last Updated**: 2026-01-22

---

## Daily Tasks

### Morning Checklist
```
□ Check system health dashboard
□ Review overnight error logs
□ Verify automated backups completed
□ Check pending orders (overdue items)
□ Review new user registrations
□ Monitor storage usage
```

### End of Day Checklist
```
□ Archive completed orders
□ Export daily reports
□ Review audit logs
□ Check for system updates
□ Verify all production items marked
```

---

## Quick Commands

### Database Queries

**Count orders by status**:
```sql
SELECT status, COUNT(*)
FROM orders
WHERE NOT is_archived
GROUP BY status;
```

**Find overdue orders**:
```sql
SELECT order_number, customer_name, in_hands_date
FROM orders
WHERE in_hands_date < CURRENT_DATE
  AND status NOT IN ('Closed', 'Closeout')
  AND NOT is_archived
ORDER BY in_hands_date;
```

**Change order summary**:
```sql
SELECT
  COUNT(DISTINCT order_id) as orders_with_changes,
  COUNT(*) as total_change_items,
  SUM(qty) as net_qty_change
FROM line_items
WHERE is_change_order = true;
```

**Revenue by month**:
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as order_count,
  SUM(total_amount) as revenue
FROM orders
WHERE status = 'Closed'
GROUP BY month
ORDER BY month DESC;
```

### Bash Commands

**Start dev server**:
```bash
cd C:\Users\dominic.ivankovich\.claude\Pallet
npm run dev
```

**Build production**:
```bash
npm run build
npm run preview  # Test production build
```

**Database backup**:
```bash
# Export all tables
pg_dump -h db.your-project.supabase.co \
  -U postgres -d postgres \
  -F c -f backup_$(date +%Y%m%d).dump

# Export specific table
psql -h db.your-project.supabase.co \
  -U postgres -d postgres \
  -c "COPY orders TO STDOUT CSV HEADER" > orders_backup.csv
```

**Check logs**:
```bash
# View Vite dev server logs
tail -f C:\Users\DOMINI~1.IVA\AppData\Local\Temp\claude\C--Users-dominic-ivankovich\tasks\*.output

# View error logs
grep "ERROR" logs/application.log | tail -20
```

---

## User Management

### Create New User
```sql
INSERT INTO users (email, display_name, role, is_active)
VALUES ('user@example.com', 'John Doe', 'sales', true);
```

### Disable User
```sql
UPDATE users
SET is_active = false
WHERE email = 'user@example.com';
```

### Change User Role
```sql
UPDATE users
SET role = 'manager'
WHERE email = 'user@example.com';
```

### Reset Password
```bash
# Via Supabase Dashboard:
# Authentication → Users → Select User → Reset Password
```

### List Active Users
```sql
SELECT email, display_name, role, last_login
FROM users
WHERE is_active = true
ORDER BY role, display_name;
```

---

## Data Maintenance

### Archive Old Orders
```sql
UPDATE orders
SET is_archived = true
WHERE status = 'Closed'
  AND updated_at < NOW() - INTERVAL '1 year';
```

### Clean Old Logs
```sql
DELETE FROM status_change_logs
WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Recalculate Order Totals
```sql
UPDATE orders o
SET total_amount = (
  SELECT SUM(price * qty)
  FROM line_items li
  WHERE li.order_id = o.id
)
WHERE NOT is_archived;
```

### Fix Missing Order Numbers
```sql
-- Find orders without numbers
SELECT id, customer_name, created_at
FROM orders
WHERE order_number IS NULL OR order_number = '';

-- Assign sequential numbers
UPDATE orders
SET order_number = 'TBD-' || TO_CHAR(created_at, 'YYYY') || '-' ||
                   LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
WHERE order_number IS NULL;
```

---

## Troubleshooting

### "Page Crash" Issues

**Symptom**: App crashes when opening orders

**Quick Fix**:
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Check for undefined variables in console
# Press F12 → Console tab

# Restart dev server
npm run dev
```

**Check for errors**:
```typescript
// In browser console:
localStorage.clear();  // Clear local storage
location.reload();     // Reload page
```

### Database Connection Issues

**Symptom**: "Connection refused" or timeouts

**Diagnostics**:
```bash
# Test connection
psql -h db.your-project.supabase.co -U postgres -d postgres -c "SELECT 1;"

# Check active connections
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions**:
1. Verify Supabase project is running (not paused)
2. Check environment variables in `.env.local`
3. Verify IP not blocked
4. Check Supabase dashboard for outages

### Slow Performance

**Diagnostics**:
```sql
-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check missing indexes
SELECT
  schemaname, tablename, attname
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND attname NOT IN (
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  );
```

**Solutions**:
```sql
-- Vacuum and analyze
VACUUM ANALYZE orders;
VACUUM ANALYZE line_items;

-- Reindex
REINDEX TABLE orders;

-- Add missing index
CREATE INDEX idx_orders_customer ON orders(customer_id)
WHERE NOT is_archived;
```

### Storage Issues

**Check storage usage**:
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) AS indexes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Clean up**:
```sql
-- Delete old archived orders (BE CAREFUL!)
DELETE FROM orders
WHERE is_archived = true
  AND updated_at < NOW() - INTERVAL '2 years';

-- Vacuum to reclaim space
VACUUM FULL orders;
```

---

## Emergency Procedures

### Database Restore

**From Supabase Backup**:
1. Login to Supabase Dashboard
2. Navigate to Settings → Database
3. Click "Point-in-time Recovery"
4. Select restore point
5. Confirm restoration

**From Manual Backup**:
```bash
# Restore from .dump file
pg_restore -h db.your-project.supabase.co \
  -U postgres -d postgres \
  -c -v backup_20240122.dump

# Restore from SQL file
psql -h db.your-project.supabase.co \
  -U postgres -d postgres \
  -f backup_20240122.sql
```

### System Rollback

**Rollback migration**:
```bash
# If migration caused issues
psql -h db.your-project.supabase.co \
  -U postgres -d postgres \
  -f supabase/migrations/rollback_[migration_name].sql
```

**Rollback code**:
```bash
cd C:\Users\dominic.ivankovich\.claude\Pallet

# View git history
git log --oneline

# Rollback to previous commit
git revert [commit-hash]

# Or hard reset (BE CAREFUL!)
git reset --hard [commit-hash]
```

### Emergency Contacts

**Supabase Support**: support@supabase.com
**Emergency Hotline**: (555) 987-6543
**On-Call Admin**: Check internal directory

---

## Monitoring & Alerts

### Key Metrics to Watch

**System Health**:
- Database response time < 100ms
- API response time < 500ms
- Error rate < 1%
- Uptime > 99.9%

**Business Metrics**:
- Orders created per day
- Average order value
- Conversion rate (Lead → Closed)
- Time to fulfillment

**Alerts to Configure**:
```
⚠️  Database response time > 500ms
⚠️  Storage usage > 80%
⚠️  Error rate > 5%
⚠️  Failed login attempts > 10 in 5 minutes
🚨 Database connection failed
🚨 Supabase service down
🚨 Storage full
```

### Health Check Script

```bash
#!/bin/bash
# health_check.sh

# Check database
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Database: OK"
else
  echo "❌ Database: FAILED"
  # Send alert
fi

# Check application
curl -f http://localhost:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Application: OK"
else
  echo "❌ Application: FAILED"
  # Send alert
fi

# Check storage
STORAGE_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $STORAGE_USAGE -lt 80 ]; then
  echo "✅ Storage: OK ($STORAGE_USAGE%)"
else
  echo "⚠️  Storage: WARNING ($STORAGE_USAGE%)"
fi
```

---

## Security Checklist

### Weekly Security Tasks
```
□ Review failed login attempts
□ Check for suspicious user activity
□ Verify backup completion
□ Update security patches
□ Review access logs
□ Check for SQL injection attempts
□ Verify SSL certificates valid
```

### Monthly Security Tasks
```
□ Review user permissions
□ Audit admin actions
□ Password expiration check
□ Update dependencies (npm audit)
□ Review API rate limiting logs
□ Check for data breaches (Have I Been Pwned)
□ Test disaster recovery procedures
```

### Security Commands

**Check for SQL injection attempts**:
```sql
SELECT *
FROM status_change_logs
WHERE action LIKE '%DROP%'
   OR action LIKE '%DELETE%'
   OR action LIKE '%UNION%'
ORDER BY timestamp DESC;
```

**Failed login attempts**:
```sql
-- If you have auth logs table
SELECT user_email, COUNT(*), MAX(attempted_at)
FROM auth_logs
WHERE success = false
  AND attempted_at > NOW() - INTERVAL '1 day'
GROUP BY user_email
HAVING COUNT(*) > 5;
```

**Audit admin actions**:
```sql
SELECT u.email, s.action, s.timestamp
FROM status_change_logs s
JOIN users u ON s.user_id = u.id
WHERE u.role = 'admin'
  AND s.timestamp > NOW() - INTERVAL '7 days'
ORDER BY s.timestamp DESC;
```

---

## Performance Optimization

### Quick Wins

**1. Enable Connection Pooling**:
```typescript
// In supabase.ts
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
  },
  global: {
    headers: { 'x-connection-pool': 'true' },
  },
});
```

**2. Add Missing Indexes**:
```sql
-- Common queries that need indexes
CREATE INDEX IF NOT EXISTS idx_orders_status_date
  ON orders(status, in_hands_date)
  WHERE NOT is_archived;

CREATE INDEX IF NOT EXISTS idx_line_items_order_type
  ON line_items(order_id, decoration_type);
```

**3. Optimize Queries**:
```sql
-- BEFORE (slow)
SELECT * FROM orders;  -- Returns all columns, all rows

-- AFTER (fast)
SELECT id, order_number, customer_name, status, total_amount
FROM orders
WHERE NOT is_archived
  AND status = 'Quote'
LIMIT 50;
```

**4. Enable Caching**:
```typescript
// Cache frequently accessed data
const cachedCustomers = useMemo(() => {
  return customers; // Computed once
}, [customers]);
```

---

## Backup & Recovery

### Automated Backup Schedule

**Daily**:
- Full database backup (via Supabase)
- Export critical tables to CSV
- Backup art files (Supabase Storage)

**Weekly**:
- Full system snapshot
- Export user data
- Archive old logs

**Monthly**:
- Long-term archive
- Test restore procedures
- Update disaster recovery plan

### Backup Commands

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)

# Database backup
pg_dump -h db.your-project.supabase.co \
  -U postgres -d postgres \
  -F c -f /backups/db_$DATE.dump

# Export critical tables
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -c "COPY orders TO STDOUT CSV HEADER" > /backups/orders_$DATE.csv

psql -h db.your-project.supabase.co -U postgres -d postgres \
  -c "COPY customers TO STDOUT CSV HEADER" > /backups/customers_$DATE.csv

# Compress
tar -czf /backups/backup_$DATE.tar.gz /backups/*_$DATE.*

# Upload to cloud storage (optional)
aws s3 cp /backups/backup_$DATE.tar.gz s3://my-backups/

echo "Backup completed: $DATE"
```

---

## Useful Links

### Documentation
- User Guide: `docs/USER_TRAINING_GUIDE.md`
- Data Schema: `docs/DATA_SCHEMA.md`
- Configuration: `docs/SYSTEM_CONFIGURATION.md`
- Change Orders: `CHANGE_ORDER_WORKFLOW.md`
- Debug Report: `ENTERPRISE_DEBUG_REPORT.md`

### External Resources
- Supabase Dashboard: https://app.supabase.com
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs
- React Docs: https://react.dev
- TypeScript Docs: https://www.typescriptlang.org/docs

### Support
- Email: support@pallet.app
- Phone: (555) 123-4567
- Emergency: (555) 987-6543

---

## Keyboard Shortcuts

### Application
- `Ctrl/Cmd + K`: Open search
- `Ctrl/Cmd + N`: New quote
- `Esc`: Close current panel
- `Tab`: Navigate fields
- `Enter`: Save/Submit

### Browser DevTools
- `F12`: Open DevTools
- `Ctrl/Cmd + Shift + C`: Inspect element
- `Ctrl/Cmd + Shift + I`: Open console
- `Ctrl/Cmd + R`: Refresh page
- `Ctrl/Cmd + Shift + R`: Hard refresh (clear cache)

---

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Page won't load | Hard refresh (Ctrl+Shift+R) |
| Login not working | Clear cookies, check password |
| Orders not showing | Check filters, verify stage |
| Can't create change order | Order must be before Production |
| Upload fails | Check file size (<10MB), format |
| Prices wrong | Verify pricing configuration |
| Email not sending | Check SMTP settings |
| Database slow | Run VACUUM ANALYZE |
| Storage full | Archive old orders, clean logs |
| Users can't login | Check is_active flag |

---

**End of Admin Quick Reference**

*Keep this guide handy for daily operations and emergencies.*
