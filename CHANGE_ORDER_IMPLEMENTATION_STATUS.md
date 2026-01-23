# Change Order Implementation Status

## ✅ Completed

### 1. Data Model Updates
- [x] Updated `LineItem` interface with change order fields:
  - `isChangeOrder?: boolean`
  - `changeOrderDate?: Date`
  - `originalQuantity?: number`
- [x] Updated `Order` interface:
  - Added `hasChangeOrders?: boolean`
  - Added `lastChangeOrderDate?: Date`
  - Removed old separate change order entity fields

### 2. ChangeOrderModal Component
- [x] Complete rewrite of component
- [x] Simplified workflow: select parent order only
- [x] Filters out orders in Production or later stages
- [x] Shows existing change order count
- [x] Clear explanation of what happens next
- [x] New prop structure: `onSelectOrder` instead of `onCreate`

### 3. App.tsx Integration
- [x] Created `handleSelectOrderForChangeOrder` function
- [x] Moves parent order back to Quote stage
- [x] Preserves existing line item status
- [x] Adds audit log entry
- [x] Opens order detail view automatically
- [x] Auto-opens add item form
- [x] Updated modal prop binding

### 4. Documentation
- [x] Created comprehensive `CHANGE_ORDER_WORKFLOW.md`
  - User workflow
  - Technical implementation
  - Examples
  - Stage-by-stage requirements
  - Database schema updates
  - Testing checklist
- [x] Created this implementation status document

---

## 🚧 Remaining Work

### 5. OrderSlideOver Component Updates
**Status**: Not started
**Priority**: High
**What's needed**:
- [ ] Separate display of original vs change order line items
- [ ] Orange background for change order items
- [ ] "CHANGE ORDER" badge on change order items
- [ ] Net summary section showing:
  - Original total
  - Change order total (can be negative)
  - Net total
- [ ] Visual distinction between item groups
- [ ] Show change order date on items

**Files to modify**:
- `components/OrderSlideOver.tsx`

**Example structure**:
```tsx
{/* Original Items Section */}
<div className="space-y-2">
  <h3>Original Order Items</h3>
  {originalItems.map(item => <LineItemDisplay item={item} />)}
</div>

{/* Change Order Items Section */}
{changeOrderItems.length > 0 && (
  <div className="mt-6 border-t-2 border-orange-200 pt-4">
    <div className="flex items-center gap-2 mb-3">
      <h3>Change Order Items</h3>
      <span className="badge">Added {date}</span>
    </div>
    {changeOrderItems.map(item => (
      <div className="bg-orange-50 border-orange-200">
        <LineItemDisplay item={item} showChangeOrderBadge />
      </div>
    ))}
  </div>
)}

{/* Net Summary */}
<div className="summary">
  <div>Original: {originalTotal}</div>
  <div>Change Orders: {changeOrderTotal}</div>
  <div className="font-bold">Net Total: {netTotal}</div>
</div>
```

---

### 6. Line Item Form - Allow Negative Quantities
**Status**: Not started
**Priority**: High
**What's needed**:
- [ ] Remove `min="0"` or `min="1"` validation from quantity input
- [ ] Allow negative numbers when `isChangeOrder` context
- [ ] Add validation: net quantity must be > 0
- [ ] Visual indicator for negative quantities (red text)
- [ ] Help text explaining negative quantities reduce original order

**Files to modify**:
- Component that handles line item creation/editing in `OrderSlideOver.tsx`

**Example**:
```tsx
<input
  type="number"
  value={qty}
  onChange={e => setQty(parseInt(e.target.value))}
  // Allow negatives for change orders
  // min={isAddingToChangeOrder ? undefined : 1}
  className={qty < 0 ? 'text-red-600' : ''}
/>
{qty < 0 && (
  <p className="text-xs text-red-600">
    This will reduce the original quantity by {Math.abs(qty)} items
  </p>
)}
```

---

### 7. Line Item Add/Edit Logic
**Status**: Not started
**Priority**: High
**What's needed**:
- [ ] When adding item to order with change order in progress, mark as change order
- [ ] Set `isChangeOrder: true` on new items
- [ ] Set `changeOrderDate: new Date()`
- [ ] For quantity reductions, set `originalQuantity` field
- [ ] Update order's `hasChangeOrders` flag
- [ ] Update order's `lastChangeOrderDate`

**Files to modify**:
- `OrderSlideOver.tsx` - line item add/edit functions

**Example**:
```typescript
const handleAddLineItem = (newItem: LineItem) => {
  // If order has been moved back to Quote for change orders
  const isChangeOrderItem = order.status === 'Quote' && order.hasChangeOrders;

  const lineItem: LineItem = {
    ...newItem,
    isChangeOrder: isChangeOrderItem,
    changeOrderDate: isChangeOrderItem ? new Date() : undefined,
    originalQuantity: newItem.qty < 0 ? Math.abs(newItem.qty) : undefined
  };

  // Add to order
  const updatedOrder = {
    ...order,
    lineItems: [...order.lineItems, lineItem],
    hasChangeOrders: isChangeOrderItem || order.hasChangeOrders,
    lastChangeOrderDate: isChangeOrderItem ? new Date() : order.lastChangeOrderDate
  };

  onUpdate(updatedOrder);
};
```

---

### 8. Stage Validation Logic
**Status**: Not started
**Priority**: Medium
**What's needed**:
- [ ] Update advancement validation to check ALL line items
- [ ] For Inventory Order stage: all items must be `ordered: true`
- [ ] For Inventory Received stage: all items must be `received: true`
- [ ] For Production stage: all items must be both ordered AND received
- [ ] Visual indicator showing which items are blocking advancement

**Files to modify**:
- `OrderSlideOver.tsx` - stage advancement functions
- Helper functions that validate stage requirements

**Example**:
```typescript
const canAdvanceFromInventoryOrder = (order: Order): boolean => {
  // ALL line items (original + change orders) must be ordered
  const allOrdered = order.lineItems.every(item => item.ordered === true);

  if (!allOrdered) {
    const unorderedItems = order.lineItems.filter(item => !item.ordered);
    console.log('Cannot advance - items not ordered:', unorderedItems);
  }

  return allOrdered;
};
```

---

### 9. Summary Calculations
**Status**: Not started
**Priority**: Medium
**What's needed**:
- [ ] Calculate original items total separately
- [ ] Calculate change order items total (can be negative)
- [ ] Calculate net total
- [ ] Display all three values in summary section
- [ ] Breakdown by decoration type for both groups

**Files to modify**:
- `OrderSlideOver.tsx` - summary section

**Example**:
```typescript
const orderSummary = useMemo(() => {
  const originalItems = order.lineItems.filter(li => !li.isChangeOrder);
  const changeOrderItems = order.lineItems.filter(li => li.isChangeOrder);

  const originalTotal = originalItems.reduce((sum, item) => {
    return sum + (item.price * item.qty);
  }, 0);

  const changeOrderTotal = changeOrderItems.reduce((sum, item) => {
    return sum + (item.price * item.qty);
  }, 0);

  const netTotal = originalTotal + changeOrderTotal;

  return {
    originalTotal,
    changeOrderTotal,
    netTotal,
    originalQty: originalItems.reduce((sum, item) => sum + item.qty, 0),
    changeOrderQty: changeOrderItems.reduce((sum, item) => sum + item.qty, 0),
    netQty: originalItems.reduce((sum, item) => sum + item.qty, 0) +
            changeOrderItems.reduce((sum, item) => sum + item.qty, 0)
  };
}, [order.lineItems]);
```

---

### 10. Visual Design Elements
**Status**: Not started
**Priority**: Medium
**What's needed**:
- [ ] Orange color scheme for change order items (already using orange-50, orange-200, etc.)
- [ ] Badge component for "CHANGE ORDER" label
- [ ] Red text for negative quantities
- [ ] Border/separator between original and change order items
- [ ] Icons or visual indicators for change order items

**Files to modify**:
- Various display components

---

### 11. Database Migration
**Status**: Not started
**Priority**: High (before production use)
**What's needed**:
- [ ] Create SQL migration file for Supabase
- [ ] Add columns to `line_items` table
- [ ] Add columns to `orders` table
- [ ] Remove old change order columns if they exist
- [ ] Create indexes for performance
- [ ] Test migration locally

**Files to create**:
- `supabase/migrations/YYYYMMDDHHMMSS_change_order_refactor.sql`

**Reference**: See `CHANGE_ORDER_WORKFLOW.md` for SQL examples

---

### 12. Testing
**Status**: Not started
**Priority**: High
**What's needed**:
- [ ] Test creating change order from each eligible stage
- [ ] Test blocking change orders from Production and later
- [ ] Test original items retain status
- [ ] Test negative quantities work correctly
- [ ] Test net calculations
- [ ] Test stage advancement with mixed items
- [ ] Test multiple change orders on same order
- [ ] Test audit logging

**See**: `CHANGE_ORDER_WORKFLOW.md` - Testing Checklist section

---

## 📊 Overall Progress

**Completed**: 4 major sections (Data model, Modal, App integration, Documentation)
**Remaining**: 8 major sections (mostly UI updates and validation logic)

**Estimated completion**:
- High priority items: 4-6 hours
- Medium priority items: 2-3 hours
- Database migration: 1 hour
- Testing: 2-3 hours

**Total**: 9-13 hours of development work remaining

---

## 🎯 Recommended Next Steps

1. **OrderSlideOver Component** - Most visible to users, shows the change order items
2. **Line Item Form** - Allow negative quantities
3. **Add Line Item Logic** - Mark new items as change orders
4. **Summary Calculations** - Show net totals
5. **Stage Validation** - Ensure both item types validated
6. **Database Migration** - Apply schema changes
7. **Testing** - Comprehensive testing
8. **Polish** - Visual refinements

---

## 📝 Notes

- Current implementation is **functional but incomplete** - the workflow logic is in place but UI needs updates
- Most critical work is in `OrderSlideOver.tsx` component
- Database migration should be created before production use
- All line items currently in database will default to `isChangeOrder: false` (original items)

---

## 🤝 Need Help?

Refer to:
- `CHANGE_ORDER_WORKFLOW.md` - Complete workflow documentation
- `types.ts` - Updated data model
- `components/ChangeOrderModal.tsx` - Example of new workflow
- `App.tsx` - handleSelectOrderForChangeOrder function

---

**Last Updated**: 2024-01-22
**Status**: Core logic complete, UI updates needed
