# Deployment Workflow Guide

## Overview

Your Pallet application has two main components:
1. **Application Code** → Stored in GitHub
2. **Database Schema** → Deployed to Supabase

This guide explains how to manage and deploy both going forward.

---

## 📦 Day-to-Day Workflow

### Option A: Simple Workflow (Recommended for Now)

Perfect for solo development or small teams.

#### 1. Making Code Changes

```bash
# 1. Make your changes to React components, TypeScript files, etc.
# 2. Test locally
npm run dev

# 3. Commit to git
git add .
git commit -m "Your commit message"

# 4. Push to GitHub
git push origin main
```

#### 2. Making Database Changes

When you need to change the database (add tables, modify columns, etc.):

**A. Create a new migration file:**
```bash
# Name format: YYYYMMDDHHMMSS_description.sql
# Example: 20240123120000_add_vendor_table.sql
```

**B. Write your SQL changes:**
```sql
-- Example: supabase/migrations/20240123120000_add_vendor_table.sql

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_vendors_name ON vendors(name);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "Vendors: Read all"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);
```

**C. Test and apply the migration:**

1. Go to Supabase SQL Editor: https://app.supabase.com/project/vjjhcydyydhrtuzkmxjc/sql/new
2. Copy/paste your migration SQL
3. Click "Run"
4. Verify it worked

**D. Commit the migration file to GitHub:**
```bash
git add supabase/migrations/20240123120000_add_vendor_table.sql
git commit -m "Add vendors table to database schema"
git push origin main
```

---

### Option B: Using Supabase CLI (More Advanced)

Better for teams or when you want automated migrations.

#### Initial Setup (One-Time)

```bash
# Install Supabase CLI via npx (no global install needed)
# Already done - you can use npx supabase

# Link to your project
npx supabase link --project-ref vjjhcydyydhrtuzkmxjc
```

#### Creating Database Changes

```bash
# 1. Create a new migration file (auto-generates filename)
npx supabase migration new add_vendor_table

# This creates: supabase/migrations/20240123120000_add_vendor_table.sql

# 2. Edit the file and add your SQL changes

# 3. Apply migration to Supabase
npx supabase db push

# 4. Commit to GitHub
git add supabase/migrations/20240123120000_add_vendor_table.sql
git commit -m "Add vendors table"
git push origin main
```

#### Pulling Remote Changes

If someone else made database changes:

```bash
# Pull migrations from Supabase
npx supabase db pull

# This downloads current schema as a new migration file
# Review and commit it
git add supabase/migrations/
git commit -m "Pull latest schema from Supabase"
git push origin main
```

---

## 🔄 Complete Development Cycle

### Scenario 1: Adding a New Feature

Let's say you want to add a "Vendors" feature.

**Step 1: Plan your changes**
- New vendors table in database
- New VendorsPage component
- New API calls in supabase.ts

**Step 2: Database changes first**
```bash
# Create migration
# supabase/migrations/20240123120000_add_vendors.sql

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_active ON vendors(is_active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors: Read all"
  ON vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendors: Admin/Manager modify"
  ON vendors FOR ALL TO authenticated
  USING (get_user_role() IN ('Admin', 'Manager'));

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Step 3: Apply to Supabase**
- Copy/paste into SQL Editor and run
- OR use `npx supabase db push`

**Step 4: Update TypeScript types**
```bash
# Update src/lib/database.types.ts with new vendor types
# (You can do this manually or generate from Supabase)
```

**Step 5: Write your application code**
```typescript
// src/lib/supabase.ts - Add vendor functions
export const getVendors = async () => {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return data;
};

// components/VendorsPage.tsx - Create your component
```

**Step 6: Commit everything to GitHub**
```bash
git add .
git commit -m "Add vendors management feature

- Add vendors table with RLS policies
- Create VendorsPage component
- Add vendor API functions
"
git push origin main
```

---

## 👥 Team Collaboration

### When Multiple People Work on the Project

**Developer A makes database changes:**
1. Creates migration file
2. Applies to Supabase
3. Commits migration to GitHub
4. Pushes to GitHub

**Developer B pulls changes:**
```bash
# 1. Pull latest code from GitHub
git pull origin main

# 2. Check for new migrations
ls supabase/migrations/

# 3. Apply any new migrations to their Supabase project
# Copy/paste SQL into their SQL Editor
# OR use: npx supabase db push
```

### Best Practices for Teams:

1. **Never edit migration files after they're committed** - create a new migration instead
2. **Migrations should be run in order** - filename timestamp ensures this
3. **Test migrations locally first** if using local Supabase
4. **Document breaking changes** in migration comments
5. **Coordinate schema changes** - communicate before major changes

---

## 🚨 Common Scenarios

### Scenario: "I made a mistake in my migration"

**If NOT yet committed to GitHub:**
```bash
# Delete the migration file
rm supabase/migrations/20240123120000_bad_migration.sql

# Create a new corrected one
```

**If ALREADY committed to GitHub:**
```bash
# Create a NEW migration to fix it
# supabase/migrations/20240123130000_fix_vendors_table.sql

ALTER TABLE vendors ADD COLUMN missing_field TEXT;
```

**Never delete or edit committed migration files** - create a new one to fix issues.

---

### Scenario: "Database is out of sync with migrations"

This happens if you made manual changes in SQL Editor without creating a migration file.

**Fix:**
```bash
# Option 1: Pull current schema
npx supabase db pull

# This creates a migration with current state
# Review, commit, and push

# Option 2: Manually create migration
# Document the changes you made manually
# Create a migration file with those changes
```

---

### Scenario: "Need to rollback a database change"

Supabase doesn't have built-in rollback. You need to create a new migration that reverses changes:

```sql
-- Original migration: 20240123120000_add_vendors.sql
CREATE TABLE vendors (...);

-- Rollback migration: 20240123150000_remove_vendors.sql
DROP TABLE vendors CASCADE;
```

**Better approach:** Test migrations thoroughly before applying to production.

---

## 📋 Pre-Deployment Checklist

Before pushing changes:

- [ ] Code changes tested locally (`npm run dev`)
- [ ] Database migrations tested in Supabase
- [ ] TypeScript types updated (if schema changed)
- [ ] Migration files committed to GitHub
- [ ] `.env.local` not committed (in .gitignore)
- [ ] Build succeeds (`npm run build`)

---

## 🔐 Environment Management

### Development
- `.env.local` → Your development Supabase project
- Test changes here first

### Production (Future)
- `.env.production` → Production Supabase project
- Apply tested migrations here
- Use separate Supabase project for production

**Setup production:**
```bash
# 1. Create new Supabase project for production
# 2. Run ALL migrations in order
# 3. Use production URL/keys in deployment platform
```

---

## 🛠️ Helpful Commands

### Git Commands
```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Your message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View commit history
git log --oneline
```

### Supabase Commands (using npx)
```bash
# Link project
npx supabase link --project-ref vjjhcydyydhrtuzkmxjc

# Create new migration
npx supabase migration new your_migration_name

# Apply migrations
npx supabase db push

# Pull schema
npx supabase db pull

# Check migration status
npx supabase migration list
```

### npm Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📚 Quick Reference

| Task | Command |
|------|---------|
| Commit code changes | `git add . && git commit -m "message" && git push` |
| Create migration | Create file in `supabase/migrations/` |
| Apply migration | Copy/paste SQL in Supabase Dashboard |
| Test locally | `npm run dev` |
| Build app | `npm run build` |

---

## 🎯 Recommended Workflow Summary

**For most changes:**

1. **Code changes** → Edit React/TypeScript files
2. **Test locally** → `npm run dev`
3. **Database changes** → Create migration file
4. **Apply to Supabase** → Run SQL in dashboard
5. **Commit everything** → `git add . && git commit && git push`

**That's it!** Simple and straightforward.

---

## Need Help?

- Database issues → Check Supabase dashboard logs
- Git issues → Use `git status` to see what's wrong
- Build issues → Check console for TypeScript errors
- Lost changes → Check `git log` and `git diff`

---

**Last Updated:** 2024-01-22
**Project:** Pallet Order Management System
