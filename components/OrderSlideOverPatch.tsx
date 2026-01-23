/**
 * OrderSlideOver.tsx - CODE ADDITIONS/REPLACEMENTS
 *
 * This file contains the new code sections to add to OrderSlideOver.tsx
 * Follow the ORDER_SLIDEOVER_UPDATES.md guide to apply these changes
 */

// ============================================
// SECTION 1: Helper Functions (Add after imports, around line 40)
// ============================================

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
  return d.toLocalizedString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};


// ============================================
// SECTION 2: Simplified lineItemsData useMemo (REPLACE buildLineItemsStructure)
// Replace lines 1699-1854
// ============================================

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


// ============================================
// SECTION 3: Updated updateQuantity function (REPLACE lines 1961-1970)
// ============================================

const updateQuantity = (colorId: string, size: string, qty: number) => {
  // Allow negative quantities for change orders
  setSkuConfig(prev => ({
    ...prev,
    colorRows: prev.colorRows.map(row =>
      row.id === colorId
        ? { ...row, quantities: { ...row.quantities, [size]: qty } }
        : row
    )
  }));
};


// ============================================
// SECTION 4: Updated handleAddSkuToOrder (MODIFY around line 2020)
// ADD this code before the onUpdate call
// ============================================

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
