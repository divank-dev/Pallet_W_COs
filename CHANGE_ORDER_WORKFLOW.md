# Change Order Workflow Documentation

## Overview

The Change Order system allows customers to add items, reduce quantities, or make changes to existing orders **before they reach the Production stage**. Change orders are handled as line items on the parent order rather than separate order entities.

---

## Key Principles

1. **Line Item Integration**: Change order items are marked with `isChangeOrder: true` and displayed separately
2. **Status Preservation**: Original line items maintain their status (ordered, received, etc.) when adding change orders
3. **Workflow Reset**: Parent order moves back to Quote stage to process new items
4. **Negative Quantities**: Supported for quantity reductions
5. **Production Cutoff**: Change orders blocked once order reaches Production stage
6. **Net Summary**: Shows combined totals of original + change order items

---

## When Change Orders Are Allowed

### ✅ Eligible Stages
- **Quote** - Adding more items to quote
- **Approval** - Customer wants to add before approving
- **Art Confirmation** - Additional items during art phase
- **Inventory Order** - Add items before/during ordering
- **Production Prep** - Last chance before production
- **Inventory Received** - Items received but can still add more

### ❌ Blocked Stages
- **Lead** - Not yet an order
- **Production** - Too late, items in production
- **Fulfillment** - Order being shipped
- **Invoice** - Invoicing in progress
- **Closeout** - Closing out project
- **Closed** - Order completed

**Reason**: Once production begins, any changes must be new separate orders to avoid production confusion.

---

## User Workflow

### Step 1: Initiate Change Order

1. Click **"New Change Order"** button (available in workflow sidebar)
2. Modal opens to select parent order
3. Search for order by number, customer, or project name
4. Select the order to add change order items to

### Step 2: Order Moves to Quote

When confirmed:
- Parent order automatically moves to **Quote** stage
- Existing line items **retain** their status flags:
  - ✓ `ordered: true` → stays true
  - ✓ `received: true` → stays true
  - ✓ Timestamps preserved
- Order marked with `hasChangeOrders: true`
- Audit log records the change
- Order detail view opens automatically
- Add Item form opens automatically

### Step 3: Add Change Order Items

Users can:
- **Add new items** (positive quantities)
- **Reduce quantities** (negative quantities)
- **Mix additions and reductions**

New line items are automatically marked with:
```typescript
{
  isChangeOrder: true,
  changeOrderDate: new Date(),
  // For quantity reductions:
  originalQuantity: <previous qty>  // if reducing existing item
}
```

### Step 4: Display Differentiation

**Original Items**:
- White background
- Normal display
- Show current status (ordered, received, etc.)

**Change Order Items**:
- **Orange/amber background** (bg-orange-50)
- **"CHANGE ORDER"** badge
- Date added displayed
- Negative quantities shown in red

### Step 5: Summary Calculations

Order summary shows:
- **Original Total**: Sum of non-change-order items
- **Change Order Total**: Sum of change order items (can be negative)
- **Net Total**: Original + Change Order
- **Breakdown** by decoration type

Example:
```
Original Order: 100 items ($2,500)
Change Order:   +25 items ($625)
                -10 items ($250)
Net Change:     +15 items ($375)
─────────────────────────────────
Final Total:    115 items ($2,875)
```

### Step 6: Process Through Stages

The order progresses through stages with **both** original and change order items:

#### Quote → Approval
- Review all items (original + change orders)
- Customer approves combined order

#### Art Confirmation
- **Original items**: Art may already be approved
- **Change order items**: Need art confirmation
- Can proceed when all items have art approved

#### Inventory Order
- **Original items**: May already be ordered/received
- **Change order items**: Need to be ordered
- Track separately which items are ordered

#### Production Prep
- Prepare for production of all items
- Existing items may have prep done
- New items need prep

#### Inventory Received
- **Original items**: May already be received
- **Change order items**: Need to be received
- Can proceed when all items received

#### Production
- **All items** must be ready (ordered AND received)
- Original and change order items processed together
- From this point forward, no more change orders allowed

---

## Technical Implementation

### Data Structure Changes

#### LineItem Interface
```typescript
export interface LineItem {
  // ... existing fields ...

  // Change Order Tracking
  isChangeOrder?: boolean;        // True if this is a change order item
  changeOrderDate?: Date;         // When this change order item was added
  originalQuantity?: number;      // Original qty before change (for tracking reductions)
}
```

#### Order Interface
```typescript
export interface Order {
  // ... existing fields ...

  // Change Order tracking
  hasChangeOrders?: boolean;      // True if this order has change order items
  lastChangeOrderDate?: Date;     // When the most recent change order was added

  // REMOVED (no longer using separate change order entities):
  // isChangeOrder?: boolean;
  // parentOrderId?: string;
  // changeOrderIds?: string[];
}
```

### Validation Logic

#### Stage Advancement
Before advancing from any stage, check:
1. **Original items**: Check their stage-specific requirements
2. **Change order items**: Check their stage-specific requirements
3. **Combined**: All items must meet requirements

Example - Advancing from Inventory Order:
```typescript
const canAdvanceFromInventoryOrder = (order: Order): boolean => {
  // Check ALL line items (original and change orders)
  return order.lineItems.every(item => item.ordered === true);
};
```

#### Change Order Creation
```typescript
const canAddChangeOrder = (order: Order): boolean => {
  // Block if order is in Production or later
  const blockedStages = ['Production', 'Fulfillment', 'Invoice', 'Closeout', 'Closed'];

  if (blockedStages.includes(order.status)) {
    return false;
  }

  return !order.isArchived && order.status !== 'Lead';
};
```

### Line Item Display Component

```tsx
<div className="space-y-4">
  {/* Original Items */}
  {originalItems.length > 0 && (
    <div>
      <h3>Original Order Items</h3>
      {originalItems.map(item => (
        <LineItemCard key={item.id} item={item} />
      ))}
    </div>
  )}

  {/* Change Order Items */}
  {changeOrderItems.length > 0 && (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <h3>Change Order Items</h3>
        <span className="badge-orange">Added {formatDate(order.lastChangeOrderDate)}</span>
      </div>
      {changeOrderItems.map(item => (
        <LineItemCard
          key={item.id}
          item={item}
          className="bg-orange-50 border-orange-200"
          showChangeOrderBadge
        />
      ))}
    </div>
  )}
</div>
```

---

## Negative Quantities

### Use Case
Customer ordered 100 shirts but wants to reduce to 90.

### Implementation
1. Add a change order item with `qty: -10`
2. Set `originalQuantity: 100`
3. Display shows:
   - Original: 100 items
   - Change: -10 items (red text)
   - Net: 90 items

### Validation
- Total quantity after changes must be > 0
- Cannot reduce below zero
- Warning if reduction affects already-ordered items

---

## Examples

### Example 1: Adding Items

**Original Order (TBD-2024-0001)**:
- 50 Navy T-Shirts @ $15 each
- Status: Inventory Order
- Items ordered: Yes

**Customer wants to add**:
- 25 Gray T-Shirts @ $15 each

**Process**:
1. Click "New Change Order"
2. Select TBD-2024-0001
3. Order moves to Quote (Navy shirts still marked as ordered)
4. Add 25 Gray T-Shirts (marked as change order)
5. Progress through Approval → Art → Inventory Order (Gray shirts)
6. Both items proceed to production together

### Example 2: Reducing Quantities

**Original Order (TBD-2024-0002)**:
- 100 Polos @ $25 each
- Status: Art Confirmation

**Customer reduces to 75 Polos**:

**Process**:
1. New Change Order
2. Select order
3. Add line item:
   - Same item (Polos)
   - Qty: -25
   - originalQuantity: 100
4. Summary shows:
   - Original: 100 @ $25 = $2,500
   - Change: -25 @ $25 = -$625
   - Net: 75 @ $25 = $1,875

### Example 3: Mixed Changes

**Original Order**:
- 50 T-Shirts (Navy) @ $15
- 30 Hoodies (Black) @ $40
- Status: Inventory Received

**Changes**:
- Add 20 more T-Shirts (Navy)
- Reduce Hoodies to 25 (-5)
- Add 15 T-Shirts (Gray)

**Result**:
- Original items: 80 items, $2,200
- Change orders: +30 items, +$500 (20 navy + 15 gray - 5 hoodies)
- Net total: 110 items, $2,700

---

## Stage-by-Stage Requirements

### Quote → Approval
- ✅ Has at least one line item (original or change order)
- ✅ All items have pricing

### Approval → Art Confirmation
- ✅ Customer approved (manual confirmation)
- ✅ All items ready for art

### Art Confirmation → Inventory Order
- ✅ **All items** (original + change orders) have art approved
- ✅ `artStatus === 'Approved'`

### Inventory Order → Production Prep
- ✅ **All items** marked as `ordered: true`
- ✅ This includes change order items that were added

### Production Prep → Inventory Received
- ✅ Prep completed for all decoration types
- ✅ Gang sheets, screens, digitizing done as needed

### Inventory Received → Production
- ✅ **All items** marked as `received: true`
- ✅ Both original and change order items received
- ⚠️ **After this point, NO MORE CHANGE ORDERS**

### Production → Fulfillment
- ✅ All items decorated and packed
- ✅ Production floor tracking complete

---

## UI/UX Guidelines

### Color Coding
- **Original Items**: White background, blue accents
- **Change Order Items**: Orange background (bg-orange-50), orange badges
- **Negative Quantities**: Red text color
- **Change Order Badge**: Orange badge with "CHANGE ORDER" text

### Badges & Indicators
- Order card: Shows "X CO items" if has change orders
- Line item: "CHANGE ORDER" badge on change order items
- Summary: "Net Change: +X items" or "Net Change: -X items"

### User Feedback
- Confirmation before moving order back to Quote
- Warning if reducing ordered/received items
- Clear summary of net changes
- Audit log entries for all changes

---

## Database Schema Updates

### Migration for Change Order Fields

```sql
-- Add change order tracking to line_items table
ALTER TABLE line_items
ADD COLUMN is_change_order BOOLEAN DEFAULT false,
ADD COLUMN change_order_date TIMESTAMPTZ,
ADD COLUMN original_quantity INTEGER;

-- Add change order tracking to orders table
ALTER TABLE orders
ADD COLUMN has_change_orders BOOLEAN DEFAULT false,
ADD COLUMN last_change_order_date TIMESTAMPTZ;

-- Remove old change order fields (if they exist)
ALTER TABLE orders
DROP COLUMN IF EXISTS is_change_order,
DROP COLUMN IF EXISTS parent_order_id,
DROP COLUMN IF EXISTS change_order_ids;

-- Create index for change order queries
CREATE INDEX idx_line_items_change_order ON line_items(is_change_order)
WHERE is_change_order = true;

-- Add comment
COMMENT ON COLUMN line_items.is_change_order IS
'True if this line item was added as part of a change order';
```

---

## Reporting & Analytics

### Reports Should Account For:
1. **Original vs Change Order items** in summaries
2. **Net quantities** after changes
3. **Change order frequency** by customer
4. **Time between order and change** (order created vs change order date)
5. **Revenue impact** of change orders (additions vs reductions)

### Example Report Queries

**Orders with Change Orders:**
```sql
SELECT
  order_number,
  customer_name,
  status,
  COUNT(CASE WHEN is_change_order THEN 1 END) as change_order_items,
  SUM(CASE WHEN is_change_order THEN qty ELSE 0 END) as change_order_qty
FROM orders o
JOIN line_items li ON li.order_id = o.id
WHERE o.has_change_orders = true
GROUP BY o.id;
```

**Net Change Summary:**
```sql
SELECT
  order_id,
  SUM(CASE WHEN NOT is_change_order THEN qty ELSE 0 END) as original_qty,
  SUM(CASE WHEN is_change_order THEN qty ELSE 0 END) as change_qty,
  SUM(qty) as net_qty
FROM line_items
GROUP BY order_id;
```

---

## Testing Checklist

- [ ] Can create change order from Quote stage
- [ ] Can create change order from Approval stage
- [ ] Can create change order from Art Confirmation stage
- [ ] Can create change order from Inventory Order stage
- [ ] Can create change order from Production Prep stage
- [ ] Can create change order from Inventory Received stage
- [ ] **Cannot** create change order from Production stage
- [ ] **Cannot** create change order from Fulfillment stage
- [ ] Original line items maintain ordered status
- [ ] Original line items maintain received status
- [ ] Change order items display with orange background
- [ ] Negative quantities allowed and displayed in red
- [ ] Net summary calculates correctly
- [ ] Stage advancement validates all items (original + change orders)
- [ ] Audit log records change order creation
- [ ] Can add multiple change orders to same order
- [ ] Search/filter works with change order items
- [ ] Reports show correct totals with change orders

---

## Future Enhancements

### Possible Additions:
1. **Change Order Approval Workflow**: Require manager approval for large changes
2. **Change Order Pricing**: Auto-calculate price adjustments
3. **Change Order Limits**: Set limits on how many changes allowed
4. **Change Order History**: Track all changes over time
5. **Change Order Reversal**: Ability to undo a change order
6. **Change Order Templates**: Common change patterns
7. **Automated Notifications**: Alert production when change orders added

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Can't create change order"
- **Check**: Order status - must be before Production
- **Check**: Order not archived or closed

**Issue**: "Items not showing as change orders"
- **Check**: `isChangeOrder` flag set to true
- **Check**: Component correctly filtering items

**Issue**: "Net total incorrect"
- **Check**: Negative quantities handled correctly
- **Check**: Summary calculation includes all items

**Issue**: "Can't advance stage"
- **Check**: All items meet stage requirements
- **Check**: Both original AND change order items validated

---

**Document Version**: 1.0
**Last Updated**: 2024-01-22
**Authors**: Development Team
