// Order Service - Supabase Data Layer
import { supabase } from './supabase';
import { Order, LineItem, OrderStatus, ArtStatus, ProductionMethod, StatusChangeLog } from '../../types';

// Normalize a date value to YYYY-MM-DD string
function normalizeDateToString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') {
    // Already a string — extract just the date portion if it's an ISO timestamp
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : value;
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return '';
}

// Convert DB status_change_logs rows to StatusChangeLog[]
function dbToHistory(logs: any[]): StatusChangeLog[] {
  return logs.map(log => ({
    timestamp: new Date(log.timestamp),
    userId: log.user_id || undefined,
    userName: log.user_name || undefined,
    action: log.action,
    previousValue: log.previous_value,
    newValue: log.new_value,
    notes: log.notes || undefined
  }));
}

// Convert Supabase row to app Order type
function dbToOrder(dbOrder: any, lineItems: any[] = [], historyLogs: any[] = []): Order {
  const mappedLineItems = lineItems.map(dbToLineItem);

  // Compute change order tracking from line items (Issue 3)
  const changeOrderItems = mappedLineItems.filter(li => li.isChangeOrder);
  const hasChangeOrders = changeOrderItems.length > 0;
  const lastChangeOrderDate = hasChangeOrders
    ? changeOrderItems.reduce((latest: Date | undefined, li) => {
        if (!li.changeOrderDate) return latest;
        if (!latest || li.changeOrderDate > latest) return li.changeOrderDate;
        return latest;
      }, undefined)
    : undefined;

  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    customer: dbOrder.customer_name,
    customerEmail: dbOrder.customer_email || undefined,
    customerPhone: dbOrder.customer_phone || undefined,
    projectName: dbOrder.project_name,
    status: dbOrder.status as OrderStatus,
    artStatus: dbOrder.art_status as ArtStatus,
    createdAt: new Date(dbOrder.created_at),
    updatedAt: dbOrder.updated_at ? new Date(dbOrder.updated_at) : undefined,
    dueDate: normalizeDateToString(dbOrder.due_date),
    rushOrder: dbOrder.rush_order || false,
    notes: dbOrder.notes || undefined,
    poNumbers: dbOrder.po_numbers || undefined,
    selectedVendorId: dbOrder.selected_vendor_id || undefined,
    lineItems: mappedLineItems,
    leadInfo: dbOrder.lead_info || undefined,
    artConfirmation: dbOrder.art_confirmation || {
      overallStatus: 'Not Started',
      placements: [],
      clientFiles: [],
      referenceFiles: [],
      revisionHistory: []
    },
    prepStatus: {
      gangSheetCreated: null,
      artworkDigitized: null,
      screensBurned: null,
      prepPending: false,
      ...dbOrder.prep_status
    },
    fulfillment: dbOrder.fulfillment_status || {
      method: null,
      shippingLabelPrinted: false,
      customerPickedUp: false
    },
    invoiceStatus: dbOrder.invoice_status || {
      invoiceCreated: false,
      invoiceSent: false,
      paymentReceived: false
    },
    closeoutChecklist: dbOrder.closeout_checklist || {
      filesSaved: false,
      canvaArchived: false,
      summaryUploaded: false
    },
    history: dbToHistory(historyLogs),
    version: dbOrder.version || 1,
    archivedAt: dbOrder.archived_at ? new Date(dbOrder.archived_at) : undefined,
    isArchived: dbOrder.is_archived || false,
    closedAt: dbOrder.closed_at ? new Date(dbOrder.closed_at) : undefined,
    closedReason: dbOrder.closed_reason || undefined,
    reopenedFrom: dbOrder.reopened_from as OrderStatus | undefined,
    hasChangeOrders: hasChangeOrders || undefined,
    lastChangeOrderDate
  };
}

// Convert app Order to Supabase insert/update format
function orderToDb(order: Partial<Order>): any {
  const dbOrder: any = {};

  if (order.orderNumber !== undefined) dbOrder.order_number = order.orderNumber;
  if (order.customer !== undefined) dbOrder.customer_name = order.customer;
  if (order.customerEmail !== undefined) dbOrder.customer_email = order.customerEmail;
  if (order.customerPhone !== undefined) dbOrder.customer_phone = order.customerPhone;
  if (order.projectName !== undefined) dbOrder.project_name = order.projectName;
  if (order.status !== undefined) dbOrder.status = order.status;
  if (order.artStatus !== undefined) dbOrder.art_status = order.artStatus;
  if (order.dueDate !== undefined) dbOrder.due_date = normalizeDateToString(order.dueDate) || null;
  if (order.rushOrder !== undefined) dbOrder.rush_order = order.rushOrder;
  if (order.notes !== undefined) dbOrder.notes = order.notes;
  if (order.poNumbers !== undefined) dbOrder.po_numbers = order.poNumbers;
  if (order.selectedVendorId !== undefined) dbOrder.selected_vendor_id = order.selectedVendorId;
  if (order.leadInfo !== undefined) dbOrder.lead_info = order.leadInfo;
  if (order.artConfirmation !== undefined) dbOrder.art_confirmation = order.artConfirmation;
  if (order.prepStatus !== undefined) dbOrder.prep_status = order.prepStatus;
  if (order.fulfillment !== undefined) dbOrder.fulfillment_status = order.fulfillment;
  if (order.invoiceStatus !== undefined) dbOrder.invoice_status = order.invoiceStatus;
  if (order.closeoutChecklist !== undefined) dbOrder.closeout_checklist = order.closeoutChecklist;
  if (order.version !== undefined) dbOrder.version = order.version;
  if (order.isArchived !== undefined) dbOrder.is_archived = order.isArchived;
  // For nullable fields, explicitly write null to DB when clearing (e.g. on reopen)
  if (order.archivedAt !== undefined) dbOrder.archived_at = order.archivedAt instanceof Date ? order.archivedAt.toISOString() : null;
  if (order.closedAt !== undefined) dbOrder.closed_at = order.closedAt instanceof Date ? order.closedAt.toISOString() : null;
  if (order.closedReason !== undefined) dbOrder.closed_reason = order.closedReason || null;
  if (order.reopenedFrom !== undefined) dbOrder.reopened_from = order.reopenedFrom || null;

  return dbOrder;
}

// Convert Supabase row to app LineItem type
function dbToLineItem(dbItem: any): LineItem {
  return {
    id: dbItem.id,
    itemNumber: dbItem.item_number,
    name: dbItem.name,
    color: dbItem.color,
    size: dbItem.size,
    qty: dbItem.qty,
    decorationType: dbItem.decoration_type as ProductionMethod,
    decorationPlacements: dbItem.decoration_placements || 1,
    decorationDescription: dbItem.decoration_description || undefined,
    cost: Number(dbItem.cost),
    price: Number(dbItem.price),
    ordered: dbItem.ordered || false,
    received: dbItem.received || false,
    decorated: dbItem.decorated || false,
    packed: dbItem.packed || false,
    orderedAt: dbItem.ordered_at ? new Date(dbItem.ordered_at) : undefined,
    receivedAt: dbItem.received_at ? new Date(dbItem.received_at) : undefined,
    decoratedAt: dbItem.decorated_at ? new Date(dbItem.decorated_at) : undefined,
    packedAt: dbItem.packed_at ? new Date(dbItem.packed_at) : undefined,
    screenPrintColors: dbItem.screen_print_colors || undefined,
    isPlusSize: dbItem.is_plus_size || false,
    stitchCountTier: dbItem.stitch_count_tier || undefined,
    dtfSize: dbItem.dtf_size || undefined,
    isChangeOrder: dbItem.is_change_order || false,
    changeOrderDate: dbItem.change_order_date ? new Date(dbItem.change_order_date) : undefined,
    originalQuantity: dbItem.original_quantity ?? undefined
  };
}

// Convert app LineItem to Supabase format
function lineItemToDb(item: LineItem, orderId: string): any {
  return {
    id: item.id,
    order_id: orderId,
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
    ordered_at: item.orderedAt?.toISOString(),
    received_at: item.receivedAt?.toISOString(),
    decorated_at: item.decoratedAt?.toISOString(),
    packed_at: item.packedAt?.toISOString(),
    screen_print_colors: item.screenPrintColors,
    is_plus_size: item.isPlusSize,
    stitch_count_tier: item.stitchCountTier,
    dtf_size: item.dtfSize,
    is_change_order: item.isChangeOrder || false,
    change_order_date: item.changeOrderDate?.toISOString() || null,
    original_quantity: item.originalQuantity ?? null
  };
}

// ============================================
// ORDER CRUD OPERATIONS
// ============================================

// Timeout wrapper for async operations
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Fetch all orders with their line items
export async function fetchOrders(): Promise<Order[]> {
  // Fetch orders with timeout protection
  const { data: ordersData, error: ordersError } = await withTimeout(
    Promise.resolve(supabase.from('orders').select('*').order('created_at', { ascending: false })),
    15000,
    'Orders fetch timed out after 15 seconds'
  ) as any;

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    throw ordersError;
  }

  if (!ordersData || ordersData.length === 0) {
    return [];
  }

  // Fetch all line items for these orders with timeout
  const orderIds = ordersData.map((o: any) => o.id);
  const { data: lineItemsData, error: lineItemsError } = await withTimeout(
    Promise.resolve(supabase.from('line_items').select('*').in('order_id', orderIds)),
    15000,
    'Line items fetch timed out after 15 seconds'
  ) as any;

  if (lineItemsError) {
    console.error('Error fetching line items:', lineItemsError);
    throw lineItemsError;
  }

  // Fetch status change logs for these orders with timeout
  const { data: logsData, error: logsError } = await withTimeout(
    Promise.resolve(supabase.from('status_change_logs').select('*').in('order_id', orderIds).order('timestamp', { ascending: true })),
    15000,
    'Status change logs fetch timed out after 15 seconds'
  ) as any;

  if (logsError) {
    console.error('Error fetching status change logs:', logsError);
    // Non-fatal: continue with empty history
  }

  // Group line items by order_id
  const lineItemsByOrder: Record<string, any[]> = {};
  (lineItemsData || []).forEach(item => {
    if (!lineItemsByOrder[item.order_id]) {
      lineItemsByOrder[item.order_id] = [];
    }
    lineItemsByOrder[item.order_id].push(item);
  });

  // Group logs by order_id
  const logsByOrder: Record<string, any[]> = {};
  (logsData || []).forEach((log: any) => {
    if (!logsByOrder[log.order_id]) {
      logsByOrder[log.order_id] = [];
    }
    logsByOrder[log.order_id].push(log);
  });

  // Convert to app format
  return ordersData.map(order => dbToOrder(order, lineItemsByOrder[order.id] || [], logsByOrder[order.id] || []));
}

// Fetch a single order by ID
export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (orderError) {
    console.error('Error fetching order:', orderError);
    return null;
  }

  const { data: lineItemsData, error: lineItemsError } = await supabase
    .from('line_items')
    .select('*')
    .eq('order_id', id);

  if (lineItemsError) {
    console.error('Error fetching line items:', lineItemsError);
  }

  const { data: logsData, error: logsError } = await supabase
    .from('status_change_logs')
    .select('*')
    .eq('order_id', id)
    .order('timestamp', { ascending: true });

  if (logsError) {
    console.error('Error fetching status change logs:', logsError);
  }

  return dbToOrder(orderData, lineItemsData || [], logsData || []);
}

// Create a new order
export async function createOrder(order: Omit<Order, 'id'>): Promise<Order> {
  // Generate order number if not provided
  let orderNumber = order.orderNumber;
  if (!orderNumber || orderNumber.startsWith('TBD-')) {
    const { data: genNumber, error: genError } = await supabase.rpc('generate_order_number', { prefix: 'ORD' });
    if (!genError && genNumber) {
      orderNumber = genNumber;
    } else {
      // Fallback order number
      orderNumber = `ORD-${Date.now()}`;
    }
  }

  // Insert order
  const dbOrder = orderToDb({ ...order, orderNumber });
  const { data: insertedOrder, error: orderError } = await supabase
    .from('orders')
    .insert(dbOrder)
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order:', orderError);
    throw orderError;
  }

  // Insert line items if any
  if (order.lineItems && order.lineItems.length > 0) {
    const lineItemsToInsert = order.lineItems.map(item => {
      const dbItem = lineItemToDb(item, insertedOrder.id);
      delete dbItem.id; // Let Supabase generate ID
      return dbItem;
    });

    const { error: lineItemsError } = await supabase
      .from('line_items')
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError);
    }
  }

  // Fetch and return the complete order
  return (await fetchOrderById(insertedOrder.id))!;
}

// Update an existing order
export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  const dbUpdates = orderToDb(updates);

  const { error: orderError } = await supabase
    .from('orders')
    .update(dbUpdates)
    .eq('id', id);

  if (orderError) {
    console.error('Error updating order:', orderError);
    throw orderError;
  }

  // Handle line items updates if provided
  if (updates.lineItems !== undefined) {
    // Get existing line items
    const { data: existingItems, error: fetchError } = await supabase
      .from('line_items')
      .select('id')
      .eq('order_id', id);

    if (fetchError) {
      console.error('Error fetching existing line items:', fetchError);
      throw fetchError;
    }

    const existingIds = new Set((existingItems || []).map(i => i.id));
    const newIds = new Set(updates.lineItems.map(i => i.id));

    // Delete removed items
    const toDelete = [...existingIds].filter(itemId => !newIds.has(itemId));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.from('line_items').delete().in('id', toDelete);
      if (deleteError) {
        console.error('Error deleting line items:', deleteError);
      }
    }

    // Upsert items
    for (const item of updates.lineItems) {
      const dbItem = lineItemToDb(item, id);
      if (existingIds.has(item.id)) {
        // Update existing
        const { error: updateError } = await supabase.from('line_items').update(dbItem).eq('id', item.id);
        if (updateError) {
          console.error('Error updating line item:', item.id, updateError);
        }
      } else {
        // Insert new — use the client-generated UUID directly
        const { error: insertError } = await supabase.from('line_items').insert(dbItem);
        if (insertError) {
          console.error('Error inserting line item:', item.id, insertError);
        }
      }
    }
  }

  // Fetch and return updated order
  return (await fetchOrderById(id))!;
}

// Delete orders
export async function deleteOrders(ids: string[]): Promise<void> {
  // Line items will be deleted automatically via CASCADE
  const { error } = await supabase
    .from('orders')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting orders:', error);
    throw error;
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
  let cancelled = false;

  const safeFetchAndCallback = async () => {
    if (cancelled) return;
    try {
      const orders = await fetchOrders();
      if (!cancelled) {
        callback(orders);
      }
    } catch (err) {
      if (cancelled) return;
      if (err instanceof Error && (err.message.includes('abort') || err.message.includes('timed out'))) {
        console.warn('[Subscription] Fetch aborted or timed out, skipping update');
      } else {
        console.error('[Subscription] Error fetching orders:', err);
      }
    }
  };

  // Subscribe to order changes
  const ordersChannel = supabase
    .channel('orders-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      safeFetchAndCallback
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'line_items' },
      safeFetchAndCallback
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    cancelled = true;
    supabase.removeChannel(ordersChannel);
  };
}

// ============================================
// STATUS CHANGE LOGGING
// ============================================

export async function logStatusChange(
  orderId: string,
  action: string,
  previousValue: any,
  newValue: any,
  userId?: string,
  userName?: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('status_change_logs')
    .insert({
      order_id: orderId,
      action,
      previous_value: previousValue,
      new_value: newValue,
      user_id: userId,
      user_name: userName,
      notes
    });

  if (error) {
    console.error('Error logging status change:', error);
  }
}
