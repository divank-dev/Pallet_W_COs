# Pallet 2.0 - User Training Guide
**Complete Training Manual for All Users**
**Version**: 2.0
**Last Updated**: 2026-01-22

---

## Table of Contents

1. [Introduction](#introduction)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Dashboard Overview](#dashboard-overview)
4. [Order Workflow](#order-workflow)
5. [Creating & Managing Orders](#creating--managing-orders)
6. [Change Order System](#change-order-system)
7. [Line Items Management](#line-items-management)
8. [Art & Production Management](#art--production-management)
9. [Reporting & Analytics](#reporting--analytics)
10. [Common Tasks Quick Reference](#common-tasks-quick-reference)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Pallet 2.0?

Pallet 2.0 is a comprehensive order management system designed specifically for promotional products businesses. It streamlines the entire workflow from initial customer inquiry through production, fulfillment, and invoicing.

### Key Features

✅ **11-Stage Workflow** - Track orders from Lead to Closed
✅ **Change Order Management** - Handle customer changes seamlessly
✅ **Art File Management** - Track artwork approvals and revisions
✅ **Production Tracking** - Monitor decoration and packing status
✅ **Multiple Decoration Methods** - Screen Print, Embroidery, DTF, Heat Transfer
✅ **Role-Based Access** - Secure permissions for different user types
✅ **Comprehensive Reporting** - Real-time insights into your business

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Internet**: Stable internet connection required
- **Screen**: Minimum 1280x720 resolution (1920x1080 recommended)

---

## User Roles & Permissions

### Role Types

#### 👑 **Admin**
**Full Access**
- All permissions
- User management
- Company settings
- Financial data access
- Delete records

**Typical Users**: Business owners, system administrators

#### 👔 **Manager**
**High-Level Access**
- View all orders
- Edit all orders
- Access reports
- Manage production
- Cannot delete or manage users

**Typical Users**: Operations managers, production managers

#### 💼 **Sales**
**Customer-Facing Access**
- Create leads and quotes
- Manage own orders
- View customer information
- Limited to sales stages (Lead → Approval)
- Cannot access production or financial stages

**Typical Users**: Sales representatives, account managers

#### 🎨 **Production**
**Production-Focused Access**
- View orders in production stages
- Update production status
- Mark items as decorated/packed
- Cannot edit pricing or customer info

**Typical Users**: Production staff, decorators

#### 📦 **Fulfillment**
**Shipping-Focused Access**
- View orders ready for fulfillment
- Update shipping status
- Print shipping labels
- Cannot edit order details

**Typical Users**: Warehouse staff, shipping coordinators

#### 👁️ **Read Only**
**View-Only Access**
- View all orders (no editing)
- View reports
- Export data
- Cannot make any changes

**Typical Users**: Accountants, auditors, stakeholders

---

## Dashboard Overview

### Main Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ PALLET 2.0                    [Search]     [User] [Settings]│
├─────────────────────────────────────────────────────────────┤
│ Workflow Stages (Horizontal Navigation)                     │
│ [Lead][Quote][Approval][Art][Inventory][Production][Ship]..│
├──────────────┬──────────────────────────────────────────────┤
│ FILTERS      │ ORDER CARDS                                  │
│              │                                              │
│ □ Customers  │  ┌──────────────┐ ┌──────────────┐         │
│ □ Date Range │  │ TBD-2024-001 │ │ TBD-2024-002 │         │
│ □ Products   │  │ Acme Corp    │ │ Beta LLC     │         │
│ □ Status     │  │ 100 items    │ │ 50 items     │         │
│              │  │ $2,500       │ │ $1,250       │         │
│ [+ New Quote]│  └──────────────┘ └──────────────┘         │
│ [+ New CO]   │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Workflow Stages Explained

1. **Lead** - Initial customer inquiry
2. **Quote** - Creating and editing quotes
3. **Approval** - Waiting for customer approval
4. **Art Confirmation** - Artwork approval process
5. **Inventory Order** - Ordering blank products
6. **Production Prep** - Preparing screens, digitizing, etc.
7. **Inventory Received** - Blanks received confirmation
8. **Production** - Decorating and packing
9. **Fulfillment** - Shipping to customer
10. **Invoice** - Invoicing and payment
11. **Closeout** - Final reconciliation
12. **Closed** - Completed orders

### Action Buttons

- **+ New Quote**: Create a new quote/order
- **+ New Change Order**: Add items to an existing order
- **Search**: Find orders by number, customer, or project name
- **Filters**: Filter visible orders by various criteria

---

## Order Workflow

### Stage Requirements

Each stage has specific requirements before an order can advance:

#### Lead → Quote
✅ Customer information entered
✅ At least one line item added

#### Quote → Approval
✅ All line items priced
✅ Quote reviewed and finalized

#### Approval → Art Confirmation
✅ Customer approved the quote
✅ Payment terms agreed

#### Art Confirmation → Inventory Order
✅ All artwork approved by customer
✅ Art files uploaded and confirmed

#### Inventory Order → Production Prep
✅ All items marked as "Ordered"
✅ Purchase orders sent to vendors

#### Production Prep → Inventory Received
✅ Screens created (for screen printing)
✅ Embroidery digitized (if applicable)
✅ DTF transfers prepared (if applicable)

#### Inventory Received → Production
✅ All items marked as "Received"
✅ Inventory counted and verified

#### Production → Fulfillment
✅ All items decorated
✅ All items packed
✅ Quality control passed

#### Fulfillment → Invoice
✅ Shipping label printed OR customer picked up
✅ Proof of delivery obtained

#### Invoice → Closeout
✅ Invoice created and sent
✅ Payment tracking started

#### Closeout → Closed
✅ Payment received
✅ Final reconciliation complete

---

## Creating & Managing Orders

### Creating a New Quote

1. **Click "+ New Quote"** in the sidebar
2. **Enter Customer Information**:
   - Customer Name (required)
   - Contact Name
   - Email
   - Phone
   - Company/Organization
3. **Add Project Details**:
   - Project Name
   - Event Date (if applicable)
   - In-Hands Date (delivery deadline)
   - Notes/Special Instructions
4. **Add Line Items** (see Line Items section)
5. **Review & Save**

### Opening an Order

1. Navigate to the appropriate workflow stage
2. Click on any order card
3. Order details slide out from the right

### Editing Order Information

1. Open the order
2. Edit fields directly (based on your permissions)
3. Changes save automatically
4. Audit log tracks all changes

### Advancing Orders

1. Ensure all requirements for current stage are met
2. Click the **"Move to [Next Stage]"** button
3. System validates requirements
4. Order moves to next stage
5. Audit log entry created

### Moving Orders Backward

Use **"Move Back One Stage"** button when:
- Customer requests changes
- Errors discovered
- Need to revise artwork
- Inventory issues

**Note**: Moving backward is logged in the audit trail.

---

## Change Order System

### What is a Change Order?

A change order allows you to add, remove, or modify items on an existing order **before it reaches Production stage**.

### When to Use Change Orders

✅ **Use Change Orders For**:
- Customer wants to add more items
- Customer wants to reduce quantities
- Color or size changes needed
- Additional decoration needed

❌ **Do NOT Use Change Orders For**:
- Orders already in Production or later
- Completely new/separate orders
- Different customer or project

### Creating a Change Order

#### Step 1: Initiate
1. Click **"+ New Change Order"** in sidebar
2. Modal opens with eligible orders

#### Step 2: Select Parent Order
1. Search for the order by:
   - Order number (e.g., TBD-2024-001)
   - Customer name
   - Project name
2. Click on the order to select it
3. Review the order details displayed

#### Step 3: Confirm
1. Read the explanation of what happens next
2. Click **"Start Change Order"**
3. System automatically:
   - Moves order back to **Quote** stage
   - Preserves existing item status (ordered, received, etc.)
   - Opens the order detail view
   - Opens the Add Item form

#### Step 4: Add Change Order Items
1. Add new items (positive quantities)
2. Reduce existing items (negative quantities)
3. Items are automatically marked as change orders
4. Save the changes

### Understanding Change Order Display

#### Original Items
- **White background**
- Standard display
- Maintain their status (ordered, received, etc.)

#### Change Order Items
- **🟧 Orange background**
- **"CHANGE ORDER"** badge
- Shows date added
- Negative quantities in **red text**
- Positive quantities with **+** prefix

#### Summary Display
```
Original Order: 100 items • $2,500.00
Change Order:   +25 items • +$625.00
                -10 items • -$250.00
Net Change:     +15 items • +$375.00
───────────────────────────────────────
Net Total:      115 items • $2,875.00
```

### Change Order Workflow

After adding change order items:

1. **Quote Stage**: Review combined order
2. **Approval**: Customer approves changes
3. **Art Confirmation**: Approve art for new items
4. **Inventory Order**: Order new items
5. **Production Prep**: Prepare for new items
6. **Inventory Received**: Receive new items
7. **Production**: Process ALL items together

### Important Rules

⚠️ **Production Cutoff**
- Change orders **BLOCKED** once order reaches Production
- Reason: Items already being decorated
- Solution: Create a new separate order instead

⚠️ **All Items Must Advance Together**
- Original AND change order items must meet stage requirements
- Example: ALL items must be ordered before advancing from Inventory Order

---

## Line Items Management

### Adding a Line Item

1. **Open an order** in Quote, Approval, or Art Confirmation stage
2. **Click "+ Add Line Item"** button
3. **Enter Item Details**:

#### Basic Information
- **Item Number**: SKU or style number
- **Description**: Product name
- **Quantity**: Number of units
- **Cost**: Your cost from supplier
- **Price**: Selling price to customer

#### Product Details
- **Color**: Select from your color list or type custom
- **Size**: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL
  - Plus sizes (2XL+) automatically flagged
  - Plus size surcharge applied if configured

#### Decoration
- **Decoration Type**:
  - Screen Print
  - Embroidery
  - DTF (Direct to Film)
  - Heat Transfer
  - Vinyl
  - Sublimation
  - None (blank items)

- **Number of Placements**: How many locations (1-8)
  - Left Chest
  - Full Back
  - Sleeve
  - Multiple locations, etc.

- **Screen Print Colors** (if Screen Print selected): 1-8
  - Each color = separate screen
  - More colors = higher cost

- **Embroidery Stitch Count** (if Embroidery selected):
  - Simple (< 5,000 stitches)
  - Medium (5,000 - 10,000)
  - Complex (> 10,000)

- **DTF Size** (if DTF selected):
  - Small (< 6")
  - Medium (6" - 12")
  - Large (> 12")

4. **Review Pricing**:
   - Price calculates automatically based on:
     - Base cost
     - Decoration type
     - Number of placements
     - Complexity factors
   - Adjust final price if needed

5. **Save**: Item added to order

### SKU Configuration System

For adding multiple colors/sizes of the same item:

1. **Enter base item info** (number, description, decoration)
2. **Add Color Rows**:
   - Click "+ Add Color"
   - Select color
   - Enter quantities for each size
3. **Review Preview**:
   - Total quantity shown
   - Total price calculated
4. **Add to Order**:
   - System creates individual line item for each color/size
   - Each with correct pricing

**Example**:
```
Navy T-Shirt (Screen Print, 1 color, left chest)
├─ Navy    | S:10  M:20  L:15  XL:5  | 50 total
├─ Gray    | S:5   M:10  L:10  XL:5  | 30 total
└─ Black   | S:8   M:12  L:8   XL:2  | 30 total

Creates 12 line items (3 colors × 4 sizes with qty > 0)
```

### Negative Quantities (Change Orders Only)

When adding change order items, you can use **negative quantities** to reduce items:

**Example**: Customer ordered 100 Navy T-Shirts but now wants only 90

1. Open the order (must have change orders enabled)
2. Add line item:
   - Same item (Navy T-Shirt)
   - Quantity: **-10**
3. System shows:
   - Original: 100 items
   - Change: -10 items (in red)
   - Net: 90 items

### Editing Line Items

- **During Quote/Approval**: Full editing allowed
- **After Art Confirmation**: Create change order instead
- **During/After Production**: Cannot edit (use new order)

### Deleting Line Items

1. Click the **🗑️ trash icon** next to the item
2. Confirm deletion
3. Item removed immediately
4. Totals recalculate

**Warning**: Cannot be undone! Make sure before deleting.

---

## Art & Production Management

### Art File Upload

1. **Navigate to Art Confirmation stage**
2. **Open the order**
3. **Click "Upload Art File"**
4. **Select file** (PNG, JPG, PDF, AI, EPS)
5. **Add notes** (optional):
   - Placement instructions
   - Color notes
   - Size specifications
6. **Upload**

### Art Approval Process

1. **Upload art files** for customer review
2. **Send to customer** for approval
3. **Customer feedback**:
   - ✅ Approved → Mark as approved
   - ❌ Revision needed → Upload new version
4. **All art approved** → Advance to Inventory Order

### Production Tracking

#### Inventory Management
- **Order Blanks**: Mark when PO sent to vendor
- **Receive Blanks**: Mark when inventory arrives
- **Count & Verify**: Ensure all items received

#### Production Prep
- **Screen Printing**: Create screens
- **Embroidery**: Digitize artwork
- **DTF**: Prepare transfers
- **Heat Transfer**: Cut vinyl/prepare transfers

#### Production Floor
- **Decorate Items**: Check off as decorated
- **Pack Items**: Check off as packed
- **Quality Control**: Verify before shipping

**Run Sheet View**: Shows all items with checkboxes
```
Item #    Description         Color  Size  Qty  Decorated  Packed
────────────────────────────────────────────────────────────────
SS001     Basic T-Shirt       Navy   L     25   [✓]        [✓]
SS001     Basic T-Shirt       Navy   XL    15   [✓]        [ ]
HS200     Hoodie             Black   M     10   [ ]        [ ]
```

### Bulk Actions

Speed up production tracking:
- **Mark All Ordered**: Check all items as ordered at once
- **Mark All Received**: Check all items as received
- **Mark All Decorated**: Check all items as decorated
- **Mark All Packed**: Check all items as packed

---

## Reporting & Analytics

### Available Reports

#### Order Summary Dashboard
- Total orders by stage
- Total revenue by stage
- Average order value
- Orders by date range

#### Customer Reports
- Top customers by revenue
- Order frequency
- Outstanding invoices

#### Production Reports
- Items by decoration type
- Production capacity utilization
- Turnaround time metrics

#### Financial Reports
- Revenue by month
- Profit margins
- Cost analysis

### Exporting Data

1. Navigate to desired report
2. Click **"Export"** button
3. Choose format:
   - CSV (for Excel)
   - PDF (for printing)
   - JSON (for data processing)

---

## Common Tasks Quick Reference

### Quick Task Guide

| Task | Steps |
|------|-------|
| **Create Quote** | Sidebar → + New Quote → Fill details → Add items → Save |
| **Add Items** | Open order → + Add Line Item → Configure → Save |
| **Change Order** | Sidebar → + New Change Order → Select order → Add items |
| **Upload Art** | Open order → Art section → Upload Art File → Select file |
| **Mark Ordered** | Open order → Inventory Order stage → Check boxes → Save |
| **Mark Received** | Open order → Inventory Received stage → Check boxes → Save |
| **Decorate Items** | Open order → Production stage → Check decorated boxes |
| **Pack Items** | Open order → Production stage → Check packed boxes |
| **Ship Order** | Open order → Fulfillment stage → Print label or mark picked up |
| **Create Invoice** | Open order → Invoice stage → Create invoice → Send |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + N` | New quote |
| `Esc` | Close open order |
| `Tab` | Navigate between fields |
| `Enter` | Save current form |

---

## Troubleshooting

### Common Issues & Solutions

#### Cannot Advance Order
**Symptom**: "Move to Next Stage" button is disabled

**Solutions**:
1. Check all requirements are met for current stage
2. Ensure all items have required status (ordered, received, etc.)
3. Verify all mandatory fields filled
4. Check for validation errors (red text)

#### Cannot Find Order
**Symptom**: Order not showing in list

**Solutions**:
1. Check you're on correct workflow stage
2. Clear any active filters
3. Use search function (order number or customer name)
4. Check if order was archived or deleted

#### Change Order Button Disabled
**Symptom**: Cannot create change order

**Solutions**:
1. Order must be **before Production stage**
2. Order cannot be archived
3. Order cannot be in Lead or Closed status
4. Check your user permissions

#### Items Not Calculating Correctly
**Symptom**: Prices or totals seem wrong

**Solutions**:
1. Verify cost and price entered correctly
2. Check decoration settings
3. Confirm plus size surcharge applied (if applicable)
4. Review pricing configuration in settings

#### Art Files Not Uploading
**Symptom**: Upload fails or shows error

**Solutions**:
1. Check file size (max 10MB recommended)
2. Verify file format (PNG, JPG, PDF, AI, EPS)
3. Check internet connection
4. Try different browser
5. Clear browser cache

### Getting Help

**In-App Support**:
- Settings → Help & Support
- Contact your system administrator
- Review this training guide

**Technical Support**:
- Email: support@pallet.app
- Phone: (555) 123-4567
- Hours: Monday-Friday, 9 AM - 5 PM EST

---

## Best Practices

### Daily Operations

✅ **Review Active Orders**: Check each stage daily
✅ **Update Status Promptly**: Keep orders moving
✅ **Upload Art Quickly**: Don't delay art confirmation
✅ **Track Inventory**: Mark ordered/received accurately
✅ **Quality Control**: Double-check before shipping
✅ **Invoice Timely**: Send invoices upon shipment

### Data Entry

✅ **Consistent Naming**: Use same customer names
✅ **Complete Information**: Fill all relevant fields
✅ **Accurate Pricing**: Double-check costs and prices
✅ **Detailed Notes**: Add context for future reference
✅ **Proper Categorization**: Select correct decoration types

### Communication

✅ **Add Notes**: Document customer conversations
✅ **Track Changes**: Use audit log to see history
✅ **Share Updates**: Keep team informed via notes
✅ **Respond Quickly**: Address customer requests promptly

---

## Training Exercises

### Exercise 1: Create a Simple Quote
1. Create new quote for "ABC Company"
2. Add 50 Navy T-Shirts, size M, with screen print
3. Set price at $15 each
4. Move to Approval stage

### Exercise 2: Handle a Change Order
1. Create a test order with 100 items
2. Move it to Art Confirmation stage
3. Create a change order
4. Add 25 additional items
5. Reduce original quantity by 10
6. Review the net summary

### Exercise 3: Production Workflow
1. Create an order with multiple items
2. Progress through all stages
3. Mark items as ordered
4. Mark items as received
5. Mark items as decorated and packed
6. Complete fulfillment

---

## Appendix

### Glossary

- **Line Item**: Individual product in an order
- **SKU**: Stock Keeping Unit (product identifier)
- **Change Order**: Modification to existing order
- **Run Sheet**: Production checklist
- **In-Hands Date**: When customer needs order
- **PO**: Purchase Order
- **DTF**: Direct to Film printing
- **RLS**: Row Level Security (database permissions)

### Order Number Format

`PREFIX-YEAR-NUMBER`

Example: `TBD-2024-0001`
- PREFIX: Configurable (default: TBD)
- YEAR: 4-digit year
- NUMBER: Sequential number (0001-9999)

### Contact Information

**Company**: Pallet 2.0
**Website**: https://pallet.app
**Support Email**: support@pallet.app
**Sales**: sales@pallet.app

---

**End of User Training Guide**

*This guide is continuously updated. Version 2.0 reflects the latest change order system implementation.*
