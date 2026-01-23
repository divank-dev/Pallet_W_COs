// Order Service - Supabase Data Layer
import { supabase } from './supabase';
import { Order, LineItem, OrderStatus, ArtStatus, ProductionMethod } from '../../types';

// Convert Supabase row to app Order type
function dbToOrder(dbOrder: any, lineItems: any[] = []): Order {
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
    dueDate: dbOrder.due_date || '',
    rushOrder: dbOrder.rush_order || false,
    notes: dbOrder.notes || undefined,
    poNumbers: dbOrder.po_numbers || undefined,
    selectedVendorId: dbOrder.selected_vendor_id || undefined,
    lineItems: lineItems.map(dbToLineItem),
    leadInfo: dbOrder.lead_info || undefined,
    artConfirmation: dbOrder.art_confirmation || {
      overallStatus: 'Not Started',
      placements: [],
      clientFiles: [],
      referenceFiles: [],
      revisionHistory: []
    },
    prepStatus: dbOrder.prep_status || {
      gangSheetCreated: null,
      artworkDigitized: null,
      screensBurned: null
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
    history: [], // We'll handle history separately if needed
    version: dbOrder.version || 1,
    archivedAt: dbOrder.archived_at ? new Date(dbOrder.archived_at) : undefined,
    isArchived: dbOrder.is_archived || false,
    closedAt: dbOrder.closed_at ? new Date(dbOrder.closed_at) : undefined,
    closedReason: dbOrder.closed_reason || undefined,
    reopenedFrom: dbOrder.reopened_from as OrderStatus | undefined
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
  if (order.dueDate !== undefined) dbOrder.due_date = order.dueDate || null;
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
  if (order.archivedAt !== undefined) dbOrder.archived_at = order.archivedAt?.toISOString();
  if (order.closedAt !== undefined) dbOrder.closed_at = order.closedAt?.toISOString();
  if (order.closedReason !== undefined) dbOrder.closed_reason = order.closedReason;
  if (order.reopenedFrom !== undefined) dbOrder.reopened_from = order.reopenedFrom;

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
    dtfSize: dbItem.dtf_size || undefined
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
    dtf_size: item.dtfSize
  };
}

// ============================================
// ORDER CRUD OPERATIONS
// ============================================

// Fetch all orders with their line items
export async function fetchOrders(): Promise<Order[]> {
  // Fetch orders
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    throw ordersError;
  }

  if (!ordersData || ordersData.length === 0) {
    return [];
  }

  // Fetch all line items for these orders
  const orderIds = ordersData.map(o => o.id);
  const { data: lineItemsData, error: lineItemsError } = await supabase
    .from('line_items')
    .select('*')
    .in('order_id', orderIds);

  if (lineItemsError) {
    console.error('Error fetching line items:', lineItemsError);
    throw lineItemsError;
  }

  // Group line items by order_id
  const lineItemsByOrder: Record<string, any[]> = {};
  (lineItemsData || []).forEach(item => {
    if (!lineItemsByOrder[item.order_id]) {
      lineItemsByOrder[item.order_id] = [];
    }
    lineItemsByOrder[item.order_id].push(item);
  });

  // Convert to app format
  return ordersData.map(order => dbToOrder(order, lineItemsByOrder[order.id] || []));
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

  return dbToOrder(orderData, lineItemsData || []);
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
    const { data: existingItems } = await supabase
      .from('line_items')
      .select('id')
      .eq('order_id', id);

    const existingIds = new Set((existingItems || []).map(i => i.id));
    const newIds = new Set(updates.lineItems.map(i => i.id));

    // Delete removed items
    const toDelete = [...existingIds].filter(id => !newIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from('line_items').delete().in('id', toDelete);
    }

    // Upsert items
    for (const item of updates.lineItems) {
      const dbItem = lineItemToDb(item, id);
      if (existingIds.has(item.id)) {
        // Update existing
        await supabase.from('line_items').update(dbItem).eq('id', item.id);
      } else {
        // Insert new
        delete dbItem.id;
        await supabase.from('line_items').insert({ ...dbItem, id: item.id });
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
  // Subscribe to order changes
  const ordersChannel = supabase
    .channel('orders-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      async () => {
        // Refetch all orders when any change occurs
        const orders = await fetchOrders();
        callback(orders);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'line_items' },
      async () => {
        // Refetch all orders when line items change
        const orders = await fetchOrders();
        callback(orders);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
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
