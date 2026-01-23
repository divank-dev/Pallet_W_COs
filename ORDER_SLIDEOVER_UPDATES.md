# OrderSlideOver.tsx Updates for New Change Order System

## Overview

This document contains the specific code changes needed to update OrderSlideOver.tsx from the old change order system (separate entities) to the new system (flagged line items).

---

## SECTION 1: Helper Functions to Add

Add these functions after the imports and before the component (around line 40):

```typescript
// Helper to separate original and change order items
const separateLineItems = (items: LineItem[]) => {
  const original = items.filter(item => !item.isChangeOrder);
  const changeOrders = items.filter(item => item.isChangeOrder);
  return { original, changeOrders };
};

// Calculate totals for a set of items
const calculateItemTotals = (items: LineItem[]) => {
  return items.reduce((acc, item) => ({
    qty: acc.qty + item.qty,
    value: acc.value + (item.price * item.qty),
    count: acc.count + 1
  }), { qty: 0, value: 0, count: 0 });
};

// Format date for display
const formatChangeOrderDate = (date?: Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
```

---

## SECTION 2: Replace buildLineItemsStructure useMemo

**Location:** Lines 1699-1854

**OLD CODE:** Remove the entire `buildLineItemsStructure` useMemo hook

**NEW CODE:**

```typescript
// Simplified line items structure for new change order system
const lineItemsData = useMemo(() => {
  const allItems = order.lineItems || [];
  const { original, changeOrders } = separateLineItems(allItems);

  const originalTotals = calculateItemTotals(original);
  const changeOrderTotals = calculateItemTotals(changeOrders);
  const netTotals = {
    qty: originalTotals.qty + changeOrderTotals.qty,
    value: originalTotals.value + changeOrderTotals.value,
    count: originalTotals.count + changeOrderTotals.count
  };

  return {
    original,
    changeOrders,
    originalTotals,
    changeOrderTotals,
    netTotals,
    hasChangeOrders: changeOrders.length > 0
  };
}, [order.lineItems]);
```

---

## SECTION 3: Update Line Items Display

**Location:** Lines 2647-2787

**Replace the entire line items table section with:**

```typescript
{/* Line Items Table */}
<div className="border border-slate-200 rounded-xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-left min-w-[650px]">
      <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
        <tr>
          <th className="px-3 py-3">Item #</th>
          <th className="px-3 py-3">Description</th>
          <th className="px-3 py-3">Color</th>
          <th className="px-3 py-3">Size</th>
          <th className="px-3 py-3 text-center">Qty</th>
          <th className="px-3 py-3">Decoration</th>
          <th className="px-3 py-3 text-right">Price</th>
          <th className="px-3 py-3 text-right">Total</th>
          <th className="px-3 py-3 w-10"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {/* Original Order Items */}
        {lineItemsData.original.length > 0 && (
          <>
            {lineItemsData.hasChangeOrders && (
              <tr className="bg-blue-50">
                <td colSpan={9} className="px-3 py-2">
                  <span className="text-xs font-bold text-blue-900 uppercase">
                    Original Order Items
                  </span>
                </td>
              </tr>
            )}
            {lineItemsData.original.map(item => (
              <tr key={item.id} className="text-sm hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.itemNumber || '-'}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                <td className="px-3 py-3 text-slate-600">{item.color || '-'}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                    checkPlusSize(item.size) ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.size || '-'}
                  </span>
                </td>
                <td className="px-3 py-3 text-center font-bold text-slate-900">{item.qty}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold w-fit ${getDecorationBadgeClass(item.decorationType)}`}>
                      {getDecorationLabel(item.decorationType)}
                    </span>
                    <span className="text-xs text-slate-400">{item.decorationPlacements} placement(s)</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-slate-600">${item.price.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">
                  ${(item.price * item.qty).toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </>
        )}

        {/* Change Order Items */}
        {lineItemsData.changeOrders.length > 0 && (
          <>
            <tr className="bg-orange-50 border-t-2 border-orange-200">
              <td colSpan={9} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-900 uppercase flex items-center gap-2">
                    <span className="inline-flex px-2 py-1 bg-orange-600 text-white rounded text-xs font-bold">
                      CHANGE ORDER
                    </span>
                    Items Added {formatChangeOrderDate(order.lastChangeOrderDate)}
                  </span>
                  <span className="text-xs text-orange-700">
                    {lineItemsData.changeOrders.length} item{lineItemsData.changeOrders.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </td>
            </tr>
            {lineItemsData.changeOrders.map(item => (
              <tr key={item.id} className="text-sm bg-orange-50 hover:bg-orange-100 transition-colors">
                <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.itemNumber || '-'}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                <td className="px-3 py-3 text-slate-600">{item.color || '-'}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                    checkPlusSize(item.size) ? 'bg-orange-200 text-orange-800' : 'bg-orange-200 text-orange-700'
                  }`}>
                    {item.size || '-'}
                  </span>
                </td>
                <td className={`px-3 py-3 text-center font-bold ${
                  item.qty < 0 ? 'text-red-600' : 'text-slate-900'
                }`}>
                  {item.qty > 0 ? '+' : ''}{item.qty}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold w-fit ${getDecorationBadgeClass(item.decorationType)}`}>
                      {getDecorationLabel(item.decorationType)}
                    </span>
                    <span className="text-xs text-slate-400">{item.decorationPlacements} placement(s)</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-slate-600">${item.price.toFixed(2)}</td>
                <td className={`px-3 py-3 text-right font-bold ${
                  item.qty < 0 ? 'text-red-600' : 'text-slate-900'
                }`}>
                  {item.qty > 0 ? '+' : ''}${(item.price * item.qty).toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-orange-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </>
        )}

        {/* Empty State */}
        {(!order.lineItems || order.lineItems.length === 0) && (
          <tr>
            <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
              No items added yet. Click below to add your first item.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Summary Section */}
  {(order.lineItems?.length || 0) > 0 && (
    <div className="bg-slate-50 border-t border-slate-200">
      {/* Breakdown if has change orders */}
      {lineItemsData.hasChangeOrders && (
        <div className="px-4 py-3 space-y-2 border-b border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Original Order:</span>
            <span className="font-bold text-slate-900">
              {lineItemsData.originalTotals.qty} items • ${lineItemsData.originalTotals.value.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-orange-600">Change Order:</span>
            <span className={`font-bold ${
              lineItemsData.changeOrderTotals.value < 0 ? 'text-red-600' : 'text-orange-700'
            }`}>
              {lineItemsData.changeOrderTotals.qty > 0 ? '+' : ''}
              {lineItemsData.changeOrderTotals.qty} items •
              {lineItemsData.changeOrderTotals.value > 0 ? '+' : ''}
              ${lineItemsData.changeOrderTotals.value.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-700">Net Total:</span>
            <span className="font-bold text-blue-700">
              {lineItemsData.netTotals.qty} items • ${lineItemsData.netTotals.value.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Grand Total */}
      <div className="px-4 py-4 flex justify-between items-center">
        <div>
          <span className="text-sm font-bold text-slate-500 uppercase">Grand Total</span>
          <span className="text-xs text-slate-400 ml-2">
            ({lineItemsData.netTotals.count} line item{lineItemsData.netTotals.count !== 1 ? 's' : ''})
          </span>
        </div>
        <span className="text-2xl font-black text-slate-900">
          ${lineItemsData.netTotals.value.toFixed(2)}
        </span>
      </div>
    </div>
  )}
</div>
```

---

## SECTION 4: Update Quantity Input to Allow Negatives

**Location:** Lines 1961-1970 (updateQuantity function)

**OLD CODE:**
```typescript
const updateQuantity = (colorId: string, size: string, qty: number) => {
  setSkuConfig(prev => ({
    ...prev,
    colorRows: prev.colorRows.map(row =>
      row.id === colorId
        ? { ...row, quantities: { ...row.quantities, [size]: Math.max(0, qty) } }
        : row
    )
  }));
};
```

**NEW CODE:**
```typescript
const updateQuantity = (colorId: string, size: string, qty: number) => {
  // Allow negative quantities for change orders
  // But warn if the result would be negative overall
  setSkuConfig(prev => ({
    ...prev,
    colorRows: prev.colorRows.map(row =>
      row.id === colorId
        ? { ...row, quantities: { ...row.quantities, [size]: qty } }
        : row
    )
  }));
};
```

---

## SECTION 5: Update Add Line Item Logic

**Location:** Lines 1973-2025 (handleAddSkuToOrder function)

**Find this section and ADD after line 2020 (before onUpdate call):**

```typescript
const handleAddSkuToOrder = (resetForm: boolean) => {
  const newLineItems: LineItem[] = [];

  // ... existing line item creation code ...

  // **ADD THIS SECTION BEFORE onUpdate:**
  // Mark items as change orders if order has been moved back to Quote for changes
  const isAddingChangeOrder = order.status === 'Quote' && order.hasChangeOrders;
  const itemsToAdd = newLineItems.map(item => ({
    ...item,
    isChangeOrder: isAddingChangeOrder,
    changeOrderDate: isAddingChangeOrder ? new Date() : undefined
  }));

  // Update order
  onUpdate({
    ...order,
    lineItems: [...(order.lineItems || []), ...itemsToAdd],
    hasChangeOrders: isAddingChangeOrder || order.hasChangeOrders,
    lastChangeOrderDate: isAddingChangeOrder ? new Date() : order.lastChangeOrderDate
  });

  // ... rest of existing code ...
};
```

---

## SECTION 6: Add Help Text for Negative Quantities

**Location:** In the quantity input section of the Add Item modal (around lines 4420-4450)

**ADD this warning below the quantity inputs (after each size input):**

```typescript
{/* Add this after the quantity inputs for each size */}
{SIZE_OPTIONS.map(size => (
  <div key={size} className="flex flex-col">
    <input
      type="number"
      value={row.quantities[size] || ''}
      onChange={(e) => updateQuantity(row.id, size, parseInt(e.target.value) || 0)}
      className={`w-16 px-2 py-1.5 border rounded text-sm text-center ${
        (row.quantities[size] || 0) < 0
          ? 'border-red-300 bg-red-50 text-red-700'
          : 'border-slate-200'
      }`}
      placeholder="0"
    />
    {(row.quantities[size] || 0) < 0 && (
      <span className="text-xs text-red-600 mt-0.5">
        -{Math.abs(row.quantities[size])}
      </span>
    )}
  </div>
))}

{/* Add warning if total is negative */}
{skuPreview.totalQty < 0 && (
  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-xs text-red-700 flex items-center gap-1">
      <AlertCircle size={14} />
      <strong>Warning:</strong> Net quantity is negative ({skuPreview.totalQty}). This will reduce the order total.
    </p>
  </div>
)}
```

---

## SECTION 7: Remove Old Change Order Code

**Find and REMOVE these sections:**

1. **Lines 1688-1697:** Remove parentOrder and changeOrders lookups
2. **Lines 2221-2248:** Remove change order relationship display in header
3. Any other references to `order.isChangeOrder`, `order.parentOrderId`, `order.changeOrderIds`

---

## SECTION 8: Update grandTotal Calculation

**Location:** Lines 1907-1909

**Keep as is - it already works correctly:**

```typescript
const grandTotal = useMemo(() => {
  return order.lineItems?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;
}, [order.lineItems]);
```

---

## Testing Checklist

After implementing changes:

- [ ] Original items display with white background
- [ ] Change order items display with orange background
- [ ] Change order items show "+ badge and date
- [ ] Negative quantities show in red
- [ ] Summary shows breakdown (original + change + net)
- [ ] Can add negative quantities
- [ ] Warning appears for negative quantities
- [ ] Delete button works for all items
- [ ] Grand total is correct
- [ ] No references to old change order system remain

---

## Notes

- The new system is simpler - no need for complex rollup logic
- Change order items are just flagged with `isChangeOrder: true`
- All items stay in the same `order.lineItems` array
- Summary calculations are straightforward addition
- Negative quantities are displayed in red and prefixed with + or - signs

---

**Implementation Time Estimate:** 1-2 hours

**Priority:** High - core functionality

**Files Modified:**
- `components/OrderSlideOver.tsx` (1 file, multiple sections)
