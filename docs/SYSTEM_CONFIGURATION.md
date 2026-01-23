# Pallet 2.0 - System Configuration Guide
**Complete Settings & Configuration Reference**
**Version**: 2.0
**Last Updated**: 2026-01-22

---

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Application Settings](#application-settings)
3. [User Management](#user-management)
4. [Pricing Configuration](#pricing-configuration)
5. [Workflow Customization](#workflow-customization)
6. [Email & Notifications](#email--notifications)
7. [Integration Settings](#integration-settings)
8. [Security Settings](#security-settings)
9. [Backup & Maintenance](#backup--maintenance)

---

## Environment Configuration

### Environment Variables

Create `.env.local` file in project root:

```env
# Gemini API (AI Assistant)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Production Settings
VITE_APP_ENV=production
VITE_APP_VERSION=2.0.0
VITE_API_TIMEOUT=30000

# Optional: Feature Flags
VITE_ENABLE_CHANGE_ORDERS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
```

### Supabase Setup

1. **Create Supabase Project**:
   - Go to https://supabase.com
   - Create new project
   - Copy project URL and anon key

2. **Apply Database Migration**:
   ```bash
   # Navigate to project
   cd C:\Users\dominic.ivankovich\.claude\Pallet

   # Run migration
   psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/migrations/20240122_clean_start.sql
   ```

3. **Configure Storage**:
   - Navigate to Storage in Supabase dashboard
   - Create bucket: `art-files`
   - Set public/private access
   - Configure RLS policies

4. **Set Up Authentication**:
   - Enable Email/Password provider
   - Configure email templates
   - Set password requirements
   - Enable MFA (optional)

### Development vs Production

**Development**:
```env
VITE_APP_ENV=development
VITE_SUPABASE_URL=https://dev-project.supabase.co
```

**Production**:
```env
VITE_APP_ENV=production
VITE_SUPABASE_URL=https://prod-project.supabase.co
```

---

## Application Settings

### Company Information

Access: Settings → Company Info

```typescript
interface CompanySettings {
  name: string;              // Company legal name
  displayName: string;       // Public-facing name
  address: string;           // Street address
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;             // General contact email
  website: string;
  taxId: string;             // EIN/Tax ID
  logo?: string;             // Logo file path
}
```

**Example**:
```json
{
  "name": "Pallet Promotional Products LLC",
  "displayName": "Pallet Promo",
  "address": "123 Business St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "phone": "(555) 123-4567",
  "email": "info@palletpromo.com",
  "website": "https://palletpromo.com",
  "taxId": "12-3456789"
}
```

### Vendor Configuration

Manage suppliers for blank products:

```typescript
interface Vendor {
  id: string;
  name: string;               // Vendor company name
  contactName: string;        // Primary contact
  email: string;
  phone: string;
  website?: string;
  accountNumber?: string;     // Your account # with vendor
  terms: string;              // Payment terms (Net 30, etc.)
  shippingMethod: string;     // Standard shipping method
  notes?: string;
  isActive: boolean;
}
```

**Common Vendors**:
- SanMar (S&S Activewear)
- Alphabroder
- Bodek & Rhodes
- Hit Promotional Products
- ASI suppliers

### Order Number Configuration

```typescript
interface OrderNumberConfig {
  prefix: string;             // Default: "TBD"
  yearFormat: string;         // Default: "YYYY"
  numberLength: number;       // Default: 4
  startNumber: number;        // Default: 1
  separator: string;          // Default: "-"
}
```

**Format Examples**:
```
TBD-2024-0001
QUOTE-24-001
ORD-2024-JAN-0001
```

---

## User Management

### Creating Users

**Admin Dashboard → Users → Add User**

```typescript
interface UserCreate {
  email: string;              // Required, must be unique
  displayName: string;        // Required
  role: UserRole;             // Required
  password?: string;          // Optional, sent via email if not set
  isActive: boolean;          // Default: true
}
```

### Role Permissions Matrix

| Feature | Admin | Manager | Sales | Production | Fulfillment | ReadOnly |
|---------|-------|---------|-------|------------|-------------|----------|
| View All Orders | ✅ | ✅ | ⚠️ Own | ⚠️ Prod | ⚠️ Ship | ✅ |
| Create Quotes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Orders | ✅ | ✅ | ⚠️ Own | ⚠️ Prod | ❌ | ❌ |
| Delete Orders | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Financials | ✅ | ✅ | ⚠️ Own | ❌ | ❌ | ✅ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Upload Art | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Art | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Ordered | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mark Received | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Mark Decorated | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ship Orders | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create Invoices | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

⚠️ = Limited access based on role

### Password Requirements

**Default Policy**:
- Minimum length: 8 characters
- Must contain: uppercase, lowercase, number
- Must NOT contain: common words, sequential characters
- Expires: 90 days (optional)
- Cannot reuse last 3 passwords

**Configure in**: Supabase Dashboard → Authentication → Policies

---

## Pricing Configuration

### Base Pricing Structure

```typescript
interface PricingConfig {
  // Margins
  defaultMarkupPercent: number;      // Default: 100% (2x cost)
  minimumMarkupPercent: number;      // Default: 50%
  rushOrderSurcharge: number;        // Default: 20%

  // Decoration Base Costs
  screenPrintSetup: number;          // Per color setup
  screenPrintPerPiece: number;       // Per piece per color
  embroiderySetup: number;           // Digitizing fee
  embroideryPerStitch: number;       // Cost per 1000 stitches
  dtfSetup: number;                  // DTF setup fee
  dtfPerPiece: number;              // Per piece DTF

  // Plus Size Surcharges
  plusSizeSurcharge: number;         // Default: $2.00
  plusSizeStartsAt: string;          // Default: "2XL"

  // Quantity Discounts
  quantityBreaks: QuantityBreak[];
}

interface QuantityBreak {
  minQty: number;
  maxQty: number;
  discountPercent: number;
}
```

**Example Configuration**:
```json
{
  "defaultMarkupPercent": 100,
  "minimumMarkupPercent": 50,
  "rushOrderSurcharge": 20,

  "screenPrintSetup": 25.00,
  "screenPrintPerPiece": 2.50,
  "embroiderySetup": 50.00,
  "embroideryPerStitch": 0.01,
  "dtfSetup": 15.00,
  "dtfPerPiece": 3.50,

  "plusSizeSurcharge": 2.00,
  "plusSizeStartsAt": "2XL",

  "quantityBreaks": [
    { "minQty": 1, "maxQty": 24, "discountPercent": 0 },
    { "minQty": 25, "maxQty": 49, "discountPercent": 5 },
    { "minQty": 50, "maxQty": 99, "discountPercent": 10 },
    { "minQty": 100, "maxQty": 999999, "discountPercent": 15 }
  ]
}
```

### Price Calculation Formula

```typescript
function calculatePrice(item: LineItemInput): number {
  let basePrice = item.cost * (1 + markupPercent / 100);

  // Add decoration cost
  let decorationCost = 0;
  switch (item.decorationType) {
    case 'Screen Print':
      decorationCost = (screenPrintSetup / item.qty) +
                       (screenPrintPerPiece * item.screenPrintColors * item.decorationPlacements);
      break;
    case 'Embroidery':
      const stitches = getStitchCount(item.stitchCountTier);
      decorationCost = (embroiderySetup / item.qty) +
                       (embroideryPerStitch * stitches / 1000 * item.decorationPlacements);
      break;
    case 'DTF':
      decorationCost = (dtfSetup / item.qty) +
                       (dtfPerPiece * getDtfMultiplier(item.dtfSize) * item.decorationPlacements);
      break;
  }

  basePrice += decorationCost;

  // Add plus size surcharge
  if (item.isPlusSize) {
    basePrice += plusSizeSurcharge;
  }

  // Apply quantity discount
  const discount = getQuantityDiscount(item.qty);
  basePrice *= (1 - discount / 100);

  // Apply rush surcharge
  if (item.isRush) {
    basePrice *= (1 + rushOrderSurcharge / 100);
  }

  return Math.round(basePrice * 100) / 100; // Round to 2 decimals
}
```

---

## Workflow Customization

### Stage Configuration

```typescript
interface StageConfig {
  name: string;
  displayName: string;
  color: string;              // Hex color for UI
  icon: string;               // Icon name
  isActive: boolean;          // Enable/disable stage
  requiresApproval: boolean;  // Require approval to advance
  notifications: NotificationConfig[];
  automations: AutomationConfig[];
}
```

**Default Stages**:
```json
[
  {
    "name": "Lead",
    "displayName": "Lead",
    "color": "#6366f1",
    "icon": "target",
    "isActive": true,
    "requiresApproval": false
  },
  {
    "name": "Quote",
    "displayName": "Quote",
    "color": "#8b5cf6",
    "icon": "file-text",
    "isActive": true,
    "requiresApproval": false
  },
  {
    "name": "Approval",
    "displayName": "Approval",
    "color": "#ec4899",
    "icon": "clipboard-check",
    "isActive": true,
    "requiresApproval": true
  }
  // ... etc
]
```

### Custom Fields

Add custom fields to orders:

```typescript
interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options?: string[];         // For select type
  required: boolean;
  defaultValue?: any;
  applicableStages: string[]; // Which stages show this field
}
```

**Example Custom Fields**:
```json
[
  {
    "id": "po_number",
    "name": "poNumber",
    "label": "Customer PO Number",
    "type": "text",
    "required": false,
    "applicableStages": ["Quote", "Approval"]
  },
  {
    "id": "sales_rep",
    "name": "salesRep",
    "label": "Sales Representative",
    "type": "select",
    "options": ["John Smith", "Jane Doe", "Bob Johnson"],
    "required": true,
    "applicableStages": ["Lead", "Quote"]
  }
]
```

---

## Email & Notifications

### Email Configuration

```typescript
interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  fromEmail: string;
  fromName: string;
  replyToEmail: string;

  // SMTP Settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;

  // API Settings (SendGrid/Mailgun)
  apiKey?: string;
}
```

**Example SMTP**:
```json
{
  "provider": "smtp",
  "fromEmail": "noreply@palletpromo.com",
  "fromName": "Pallet Promo",
  "replyToEmail": "info@palletpromo.com",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpUser": "your-email@gmail.com",
  "smtpPassword": "your-app-password",
  "smtpSecure": true
}
```

### Email Templates

**Quote Sent**:
```
Subject: Quote #{{orderNumber}} - {{projectName}}

Dear {{customerName}},

Thank you for your interest! Please find attached your quote for {{projectName}}.

Order Details:
- Quote Number: {{orderNumber}}
- Project: {{projectName}}
- Total Items: {{totalItems}}
- Estimated Total: ${{totalAmount}}
- In-Hands Date: {{inHandsDate}}

Please review and let us know if you have any questions.

Best regards,
{{companyName}}
```

**Art Approval Request**:
```
Subject: Art Approval Needed - Order {{orderNumber}}

Dear {{customerName}},

Your artwork is ready for review for order {{orderNumber}}.

Please review the attached files and approve or request changes.

[View Artwork Button]

Thank you!
{{companyName}}
```

### Notification Settings

```typescript
interface NotificationSettings {
  // Email Notifications
  emailOnQuoteSent: boolean;
  emailOnOrderApproved: boolean;
  emailOnArtReady: boolean;
  emailOnShipped: boolean;
  emailOnInvoiceSent: boolean;

  // Internal Notifications
  notifyOnNewLead: boolean;
  notifyOnStageChange: boolean;
  notifyOnChangeOrder: boolean;
  notifyOnPastDue: boolean;

  // Recipient Groups
  notifyAdmins: string[];       // Email addresses
  notifySales: string[];
  notifyProduction: string[];
}
```

---

## Integration Settings

### Accounting Integration

**QuickBooks Online**:
```typescript
interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  realmId: string;
  environment: 'sandbox' | 'production';

  // Sync Settings
  syncCustomers: boolean;
  syncInvoices: boolean;
  syncPayments: boolean;
  autoCreateInvoices: boolean;
}
```

**Xero**:
```typescript
interface XeroConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;

  syncSettings: {
    syncCustomers: boolean;
    syncInvoices: boolean;
    syncPayments: boolean;
  };
}
```

### Shipping Integration

**ShipStation**:
```typescript
interface ShipStationConfig {
  apiKey: string;
  apiSecret: string;
  storeId: string;

  defaultCarrier: string;      // USPS, UPS, FedEx
  defaultService: string;       // Ground, 2Day, Overnight
  autoCreateShipments: boolean;
  autoFulfill: boolean;
}
```

### eCommerce Integration

**Shopify**:
```typescript
interface ShopifyConfig {
  shopName: string;             // yourstore.myshopify.com
  accessToken: string;
  apiVersion: string;           // 2024-01

  importOrders: boolean;
  exportInventory: boolean;
  syncPricing: boolean;
}
```

---

## Security Settings

### Authentication Settings

```typescript
interface AuthSettings {
  // Password Policy
  minPasswordLength: number;            // Default: 8
  requireUppercase: boolean;            // Default: true
  requireLowercase: boolean;            // Default: true
  requireNumbers: boolean;              // Default: true
  requireSpecialChars: boolean;         // Default: false
  passwordExpireDays: number;           // Default: 90, 0 = never

  // Session
  sessionTimeoutMinutes: number;        // Default: 60
  rememberMeDays: number;               // Default: 30

  // Multi-Factor Authentication
  mfaRequired: boolean;                 // Default: false
  mfaRequiredForRoles: UserRole[];      // Default: ['admin']
  mfaMethod: 'totp' | 'sms' | 'email';  // Default: 'totp'

  // Login Attempts
  maxLoginAttempts: number;             // Default: 5
  lockoutDurationMinutes: number;       // Default: 30
}
```

### Data Retention Policy

```typescript
interface RetentionPolicy {
  archiveOrdersAfterDays: number;       // Default: 365
  deleteArchivedAfterDays: number;      // Default: 0 (never)
  purgeLogsAfterDays: number;           // Default: 90
  exportBeforeDelete: boolean;          // Default: true
}
```

### Access Control

**IP Whitelist** (optional):
```json
{
  "enableIpWhitelist": false,
  "allowedIps": [
    "192.168.1.0/24",
    "10.0.0.1"
  ]
}
```

**API Rate Limiting**:
```json
{
  "enableRateLimiting": true,
  "requestsPerMinute": 60,
  "requestsPerHour": 1000,
  "burstAllowance": 10
}
```

---

## Backup & Maintenance

### Automated Backups

**Supabase (Managed)**:
- Daily automatic backups
- 7-day retention (Free tier)
- 30-day retention (Pro tier)
- Point-in-time recovery available

**Manual Backup**:
```bash
# Export database
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d).dump

# Export to CSV
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -c "COPY orders TO STDOUT CSV HEADER" > orders.csv
```

### Maintenance Schedule

**Daily**:
- ✅ Automated database backups
- ✅ Log cleanup (90+ days)
- ✅ Monitor disk space

**Weekly**:
- ✅ Review system errors
- ✅ Update security patches
- ✅ Archive old orders

**Monthly**:
- ✅ Review user permissions
- ✅ Update pricing configuration
- ✅ Export financial reports
- ✅ Database optimization (VACUUM, ANALYZE)

### Health Monitoring

```typescript
interface HealthCheck {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;         // ms
    connectionCount: number;
    lastBackup: Date;
  };
  storage: {
    status: 'healthy' | 'degraded' | 'down';
    usedSpace: number;            // bytes
    totalSpace: number;           // bytes
  };
  api: {
    status: 'healthy' | 'degraded' | 'down';
    averageResponseTime: number;  // ms
    errorRate: number;            // percentage
  };
}
```

**Monitoring Endpoints**:
- `/api/health` - Overall health
- `/api/health/database` - Database status
- `/api/health/storage` - Storage status

---

## Performance Tuning

### Database Optimization

```sql
-- Analyze tables
ANALYZE orders;
ANALYZE line_items;
ANALYZE customers;

-- Vacuum tables (reclaim space)
VACUUM ANALYZE orders;

-- Reindex
REINDEX TABLE orders;
```

### Caching Configuration

```typescript
interface CacheConfig {
  enabled: boolean;
  ttl: number;                  // Time to live (seconds)
  maxSize: number;              // Max cache size (MB)

  // Cache strategies
  cacheCustomers: boolean;
  cacheProducts: boolean;
  cacheSettings: boolean;
  cachePricing: boolean;
}
```

**Example**:
```json
{
  "enabled": true,
  "ttl": 3600,
  "maxSize": 100,
  "cacheCustomers": true,
  "cacheProducts": true,
  "cacheSettings": true,
  "cachePricing": true
}
```

---

## Troubleshooting Common Issues

### Database Connection Issues

**Problem**: "Connection refused" or "Timeout"

**Solutions**:
1. Check Supabase project status
2. Verify environment variables
3. Check IP whitelist settings
4. Verify database is not paused (free tier)

### Slow Performance

**Problem**: Queries taking too long

**Solutions**:
1. Check database indexes
2. Review query execution plans
3. Enable caching
4. Optimize large tables
5. Upgrade Supabase tier if needed

### Email Not Sending

**Problem**: Emails not being delivered

**Solutions**:
1. Check SMTP credentials
2. Verify email provider settings
3. Check spam folder
4. Review email template syntax
5. Check rate limits

---

## Support & Resources

### Documentation

- **User Guide**: `docs/USER_TRAINING_GUIDE.md`
- **Data Schema**: `docs/DATA_SCHEMA.md`
- **API Reference**: `docs/API_REFERENCE.md`
- **Change Orders**: `CHANGE_ORDER_WORKFLOW.md`

### Technical Support

- **Email**: support@pallet.app
- **Phone**: (555) 123-4567
- **Hours**: Monday-Friday, 9 AM - 5 PM EST
- **Emergency**: (555) 987-6543 (24/7)

### Community

- **Forum**: https://community.pallet.app
- **Discord**: https://discord.gg/pallet
- **GitHub**: https://github.com/pallet/pallet-2.0

---

**End of System Configuration Guide**

*This guide covers all settings and configuration options for Pallet 2.0.*
