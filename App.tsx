
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronDown, Bell, X, LogOut, Loader2, Menu, Layers } from 'lucide-react';
import { Order, OrderStatus, ViewMode, StatusChangeLog, ProductionMethod } from './types';
import { DUMMY_ORDERS, ORDER_STAGES, PRODUCTION_METHODS, PRODUCTION_METHOD_LABELS, PRODUCTION_METHOD_COLORS } from './constants';
import { TEST_ORDERS } from './tests/testOrders';
import { fetchOrders, createOrder as createOrderDb, updateOrder as updateOrderDb, deleteOrders as deleteOrdersDb, subscribeToOrders } from './src/lib/orderService';
import Sidebar from './components/Sidebar';
import WorkflowSidebar from './components/WorkflowSidebar';
import OrderCard from './components/OrderCard';
import OrderSlideOver from './components/OrderSlideOver';
import NewOrderModal from './components/NewOrderModal';
import ChangeOrderModal from './components/ChangeOrderModal';
import SettingsPage from './components/SettingsPage';
import ReportsPage from './components/ReportsPage';
import CustomerSearch from './components/CustomerSearch';
import FulfillmentTrackingPage from './components/FulfillmentTrackingPage';
import ProductionFloorPage from './components/ProductionFloorPage';
import TestRunner from './tests/TestRunner';
import LoginPage from './components/LoginPage';
import SetupWizard from './components/SetupWizard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { checkSetupStatus } from './src/lib/authService';

// Main App Content (requires authentication)
const AppContent: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<OrderStatus>('Lead');
  const [viewMode, setViewMode] = useState<ViewMode>('Sales');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showChangeOrder, setShowChangeOrder] = useState(false);
  const [autoOpenAddItem, setAutoOpenAddItem] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [activeView, setActiveView] = useState<'orders' | 'settings' | 'reports' | 'fulfillment' | 'productionFloor'>('orders');
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [isDeadOpportunitiesActive, setIsDeadOpportunitiesActive] = useState(false);
  const [deadOpportunitySearch, setDeadOpportunitySearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileWorkflowOpen, setIsMobileWorkflowOpen] = useState(false);

  // Close mobile menus when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
        setIsMobileWorkflowOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track component mount state to prevent updates after unmount.
  // Must set true on mount to handle React 18 StrictMode double-mount cycle.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch orders from Supabase on mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 1;

    const loadOrders = async () => {
      try {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        setLoadError(null);
        // Hard timeout: if fetchOrders hangs beyond 10s, force reject
        const data = await Promise.race([
          fetchOrders(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Load timed out')), 10000))
        ]);
        if (!isMountedRef.current) return;
        setOrders(data);

        // Subscribe to real-time updates
        unsubscribe = subscribeToOrders((updatedOrders) => {
          if (!isMountedRef.current) return;
          setOrders(updatedOrders);
          // Update selected order if it changed
          setSelectedOrder(prev => {
            if (!prev) return prev;
            const updated = updatedOrders.find(o => o.id === prev.id);
            return updated || prev;
          });
        });
      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.error('Failed to load orders:', err);

        // Retry on abort/timeout errors
        const isAbortError = err?.message?.includes('abort') || err?.message?.includes('timed out') || err?.name === 'AbortError';
        if (isAbortError && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying order fetch (attempt ${retryCount}/${MAX_RETRIES})...`);
          setTimeout(() => { if (isMountedRef.current) loadOrders(); }, 1500);
          return;
        }

        setLoadError('Failed to load orders from database. Using offline mode.');
        setOrders(TEST_ORDERS);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Keyboard shortcut for test runner (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setShowTestRunner(prev => !prev);
      }
      if (e.key === 'Escape' && showTestRunner) {
        setShowTestRunner(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTestRunner]);

  // Helper to add audit log entry
  const addAuditLog = (order: Order, action: string, previousValue: any, newValue: any, notes?: string): Order => {
    const logEntry: StatusChangeLog = {
      timestamp: new Date(),
      userId: currentUser?.id,
      userName: currentUser?.displayName,
      action,
      previousValue,
      newValue,
      notes
    };
    return {
      ...order,
      history: [...order.history, logEntry],
      updatedAt: new Date()
    };
  };

  // When a customer is selected, show all their orders across all stages
  // When no customer is selected, show orders in the current stage
  const filteredOrders = useMemo(() => {
    if (selectedCustomer) {
      // Show all orders for the selected customer across all stages
      return orders.filter(o =>
        !o.isArchived &&
        o.customer === selectedCustomer
      );
    }
    // Normal stage-based filtering
    return orders.filter(o =>
      !o.isArchived &&
      o.status === currentStage
    );
  }, [orders, currentStage, selectedCustomer]);

  // Get customer's orders grouped by stage for display (including Closed)
  const customerOrdersByStage = useMemo(() => {
    if (!selectedCustomer) return null;
    const grouped: Record<OrderStatus, Order[]> = {} as Record<OrderStatus, Order[]>;
    const allStages: OrderStatus[] = [...ORDER_STAGES, 'Closed'];
    allStages.forEach(stage => {
      grouped[stage] = orders.filter(o =>
        !o.isArchived &&
        o.customer === selectedCustomer &&
        o.status === stage
      );
    });
    return grouped;
  }, [orders, selectedCustomer]);

  const countsByStage = useMemo(() => {
    return orders.filter(o => !o.isArchived).reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<OrderStatus, number>);
  }, [orders]);

  // Dead Opportunities: closed orders with closedReason = 'Dead Opportunity'
  const deadOpportunities = useMemo(() => {
    return orders.filter(o =>
      !o.isArchived &&
      o.status === 'Closed' &&
      o.closedReason === 'Dead Opportunity'
    );
  }, [orders]);

  // Filtered dead opportunities (by customer search)
  const filteredDeadOpportunities = useMemo(() => {
    if (!deadOpportunitySearch.trim()) return deadOpportunities;
    const searchLower = deadOpportunitySearch.toLowerCase();
    return deadOpportunities.filter(o =>
      o.customer.toLowerCase().includes(searchLower) ||
      o.customerEmail?.toLowerCase().includes(searchLower) ||
      o.projectName.toLowerCase().includes(searchLower) ||
      o.orderNumber.toLowerCase().includes(searchLower)
    );
  }, [deadOpportunities, deadOpportunitySearch]);

  // Stages that should display orders in columns by decoration type
  const DECORATION_COLUMN_STAGES: OrderStatus[] = ['Art Confirmation', 'Inventory Order', 'Production Prep'];

  // Get the primary decoration type for an order (based on most items or first item)
  const getOrderDecorationTypes = (order: Order): ProductionMethod[] => {
    if (!order.lineItems || order.lineItems.length === 0) return ['Other'];
    const types = new Set<ProductionMethod>();
    order.lineItems.forEach(item => {
      if (item.decorationType) {
        types.add(item.decorationType);
      }
    });
    return types.size > 0 ? Array.from(types) : ['Other'];
  };

  // Check if current stage should show decoration type columns
  const showDecorationColumns = !selectedCustomer && DECORATION_COLUMN_STAGES.includes(currentStage);

  // Group filtered orders by decoration type (for column view)
  const ordersByDecorationType = useMemo(() => {
    if (!showDecorationColumns) return null;
    const grouped: Record<ProductionMethod, Order[]> = {
      'ScreenPrint': [],
      'DTF': [],
      'Embroidery': [],
      'Other': []
    };
    filteredOrders.forEach(order => {
      const types = getOrderDecorationTypes(order);
      // Place order in each relevant decoration type column
      types.forEach(type => {
        grouped[type].push(order);
      });
    });
    return grouped;
  }, [filteredOrders, showDecorationColumns]);

  const handleUpdateOrder = useCallback(async (updated: Order) => {
    // Find the original order to compare
    const original = orders.find(o => o.id === updated.id);

    // Add audit log for status changes
    let orderWithAudit = updated;
    if (original && original.status !== updated.status) {
      orderWithAudit = addAuditLog(
        updated,
        'Status changed',
        original.status,
        updated.status,
        `Stage advanced by ${currentUser?.displayName}`
      );
    }

    // Optimistic update
    setOrders(prev => prev.map(o => o.id === updated.id ? orderWithAudit : o));
    setSelectedOrder(orderWithAudit);

    // Persist to Supabase and sync state with canonical DB data
    try {
      setIsSaving(true);
      const saved = await updateOrderDb(updated.id, orderWithAudit);
      // Sync state with DB-refreshed order (ensures IDs, computed fields, and
      // nullable fields like closedAt are accurate after the round-trip)
      if (saved) {
        setOrders(prev => prev.map(o => o.id === saved.id ? saved : o));
        setSelectedOrder(saved);
      }
    } catch (err) {
      console.error('Failed to save order:', err);
      // Revert on error
      if (original) {
        setOrders(prev => prev.map(o => o.id === updated.id ? original : o));
        setSelectedOrder(original);
      }
    } finally {
      setIsSaving(false);
    }
  }, [orders, currentUser]);

  const handleCreateOrder = useCallback(async (newOrder: any) => {
    // Add creation audit log
    const orderWithAudit = addAuditLog(
      newOrder as Order,
      'Order created',
      null,
      newOrder.status || 'Lead',
      `Created by ${currentUser?.displayName}`
    );

    setShowNewOrder(false);
    setCurrentStage(newOrder.status || 'Lead');

    // Create in Supabase
    try {
      setIsSaving(true);
      const created = await createOrderDb(orderWithAudit);
      setOrders(prev => [created, ...prev]);

      // If creating a quote, automatically open the order detail with Add Item form
      if (newOrder.status === 'Quote') {
        setSelectedOrder(created);
        setAutoOpenAddItem(true);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
      // Fallback to local state
      setOrders(prev => [orderWithAudit, ...prev]);
      if (newOrder.status === 'Quote') {
        setSelectedOrder(orderWithAudit);
        setAutoOpenAddItem(true);
      }
    } finally {
      setIsSaving(false);
    }
  }, [currentUser]);

  const handleSelectOrderForChangeOrder = (order: Order) => {
    // Move the order back to Quote stage to add change order items
    // But preserve the status of existing line items (ordered, received, etc.)
    const updatedOrder: Order = {
      ...order,
      status: 'Quote',
      hasChangeOrders: true,
      lastChangeOrderDate: new Date(),
      updatedAt: new Date(),
      history: [
        ...order.history,
        {
          timestamp: new Date(),
          userId: currentUser?.id,
          userName: currentUser?.displayName,
          action: 'Change order initiated',
          previousValue: order.status,
          newValue: 'Quote',
          notes: `Order moved back to Quote for change order items by ${currentUser?.displayName}. Existing line item status preserved.`
        }
      ]
    };

    // Update the order in state
    setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

    // Close the modal
    setShowChangeOrder(false);

    // Move to Quote stage view
    setCurrentStage('Quote');

    // Open the order detail view
    setSelectedOrder(updatedOrder);

    // Auto-open the add item form so user can add change order items
    setAutoOpenAddItem(true);
  };

  // Handle deleting orders (Admin only)
  const handleDeleteOrders = useCallback(async (orderIds: string[]) => {
    // Optimistic delete
    const previousOrders = orders;
    setOrders(prev => prev.filter(o => !orderIds.includes(o.id)));

    // Clear selection if deleted order was selected
    if (selectedOrder && orderIds.includes(selectedOrder.id)) {
      setSelectedOrder(null);
    }

    // Delete from Supabase
    try {
      await deleteOrdersDb(orderIds);
    } catch (err) {
      console.error('Failed to delete orders:', err);
      // Revert on error
      setOrders(previousOrders);
    }
  }, [orders, selectedOrder]);

  // Handle moving a quote to Dead Opportunities (with option to also create a Lead)
  const handleDeleteQuote = (orderId: string, alsoCreateLead: boolean) => {
    const orderToMove = orders.find(o => o.id === orderId);
    if (!orderToMove) return;

    // Move the quote to Dead Opportunities (Closed with reason)
    const deadOpportunity: Order = {
      ...orderToMove,
      status: 'Closed',
      closedAt: new Date(),
      closedReason: 'Dead Opportunity',
      reopenedFrom: orderToMove.status,
      history: [
        ...orderToMove.history,
        {
          timestamp: new Date(),
          userId: currentUser?.id,
          userName: currentUser?.displayName,
          action: 'Moved to Dead Opportunities',
          previousValue: orderToMove.status,
          newValue: 'Dead Opportunity',
          notes: `Quote marked as dead opportunity by ${currentUser?.displayName}`
        }
      ],
      updatedAt: new Date()
    };

    if (alsoCreateLead) {
      // Create a new Lead with the customer contact info
      const leadOrderNumber = `LEAD-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;
      const newLead: Order = {
        id: leadOrderNumber,
        orderNumber: leadOrderNumber,
        customer: orderToMove.customer,
        customerEmail: orderToMove.customerEmail,
        customerPhone: orderToMove.customerPhone,
        projectName: orderToMove.projectName + ' (new opportunity)',
        status: 'Lead',
        createdAt: new Date(),
        dueDate: '',
        lineItems: [],
        artStatus: 'Not Started',
        rushOrder: false,
        leadInfo: {
          source: 'Other',
          temperature: 'Warm',
          estimatedQuantity: 0,
          estimatedValue: 0,
          productInterest: '',
          decorationInterest: null,
          contactedAt: new Date(),
          contactNotes: `Lead created from dead opportunity ${orderToMove.orderNumber}`
        },
        prepStatus: { gangSheetCreated: null, artworkDigitized: null, screensBurned: null, prepPending: false },
        fulfillment: { method: null, shippingLabelPrinted: false, customerPickedUp: false },
        invoiceStatus: { invoiceCreated: false, invoiceSent: false, paymentReceived: false },
        closeoutChecklist: { filesSaved: false, canvaArchived: false, summaryUploaded: false },
        artConfirmation: { overallStatus: 'Not Started', placements: [], clientFiles: [], referenceFiles: [], revisionHistory: [] },
        history: [{
          timestamp: new Date(),
          userId: currentUser?.id,
          userName: currentUser?.displayName,
          action: 'Lead created from dead opportunity',
          previousValue: orderToMove.orderNumber,
          newValue: 'Lead',
          notes: `New lead created from dead opportunity ${orderToMove.orderNumber}`
        }],
        version: 1,
        isArchived: false
      };

      // Update the quote to dead opportunity and add the new lead
      setOrders(prev => [newLead, ...prev.map(o => o.id === orderId ? deadOpportunity : o)]);
      setCurrentStage('Lead');
    } else {
      // Just move to Dead Opportunities
      setOrders(prev => prev.map(o => o.id === orderId ? deadOpportunity : o));
    }

    // Clear selection
    setSelectedOrder(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Error banner */}
      {loadError && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 text-center text-sm z-50">
          {loadError}
        </div>
      )}
      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
      <Sidebar
        activeView={activeView}
        onSettingsClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }}
        onOrdersClick={() => { setActiveView('orders'); setIsMobileMenuOpen(false); }}
        onReportsClick={() => { setActiveView('reports'); setIsMobileMenuOpen(false); }}
        onFulfillmentClick={() => { setActiveView('fulfillment'); setIsMobileMenuOpen(false); }}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      {activeView === 'settings' ? (
        <SettingsPage orders={orders} onClose={() => setActiveView('orders')} onDeleteOrders={handleDeleteOrders} />
      ) : activeView === 'reports' ? (
        <ReportsPage orders={orders} onClose={() => setActiveView('orders')} />
      ) : activeView === 'fulfillment' ? (
        <FulfillmentTrackingPage
          orders={orders}
          onClose={() => setActiveView('orders')}
          onSelectOrder={(order) => {
            setSelectedOrder(order);
            setActiveView('orders');
            setCurrentStage(order.status);
          }}
        />
      ) : activeView === 'productionFloor' ? (
        <>
          <WorkflowSidebar
            currentStage={currentStage}
            counts={countsByStage}
            deadOpportunitiesCount={deadOpportunities.length}
            onStageSelect={(stage) => {
              setCurrentStage(stage);
              setActiveView('orders');
              setIsDeadOpportunitiesActive(false);
              setIsMobileWorkflowOpen(false);
            }}
            onNewOrder={() => { setShowNewOrder(true); setIsMobileWorkflowOpen(false); }}
            onNewChangeOrder={() => { setShowChangeOrder(true); setIsMobileWorkflowOpen(false); }}
            onDeadOpportunitiesClick={() => {
              setIsDeadOpportunitiesActive(true);
              setSelectedCustomer('');
              setActiveView('orders');
              setIsMobileWorkflowOpen(false);
            }}
            isDeadOpportunitiesActive={isDeadOpportunitiesActive}
            onProductionFloorClick={() => { setActiveView('productionFloor'); setIsMobileWorkflowOpen(false); }}
            isProductionFloorActive={true}
            isMobileOpen={isMobileWorkflowOpen}
            onMobileClose={() => setIsMobileWorkflowOpen(false)}
          />
          <ProductionFloorPage
            orders={orders}
            onClose={() => setActiveView('orders')}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setActiveView('orders');
              setCurrentStage(order.status);
            }}
          />
        </>
      ) : (
        <>
          <WorkflowSidebar
            currentStage={currentStage}
            counts={countsByStage}
            deadOpportunitiesCount={deadOpportunities.length}
            onStageSelect={(stage) => {
              setCurrentStage(stage);
              setActiveView('orders');
              setIsDeadOpportunitiesActive(false);
              setDeadOpportunitySearch('');
              setIsMobileWorkflowOpen(false);
            }}
            onNewOrder={() => { setShowNewOrder(true); setIsMobileWorkflowOpen(false); }}
            onNewChangeOrder={() => { setShowChangeOrder(true); setIsMobileWorkflowOpen(false); }}
            onDeadOpportunitiesClick={() => {
              setIsDeadOpportunitiesActive(true);
              setSelectedCustomer('');
              setIsMobileWorkflowOpen(false);
            }}
            isDeadOpportunitiesActive={isDeadOpportunitiesActive}
            onProductionFloorClick={() => { setActiveView('productionFloor'); setIsMobileWorkflowOpen(false); }}
            isProductionFloorActive={activeView === 'productionFloor'}
            isMobileOpen={isMobileWorkflowOpen}
            onMobileClose={() => setIsMobileWorkflowOpen(false)}
          />

          <main className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="h-16 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-8">
              <div className="flex items-center gap-2 md:gap-6 flex-1">
                {/* Mobile Menu Buttons */}
                <div className="flex items-center gap-1 md:hidden">
                  <button
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <Menu size={24} />
                  </button>
                  <button
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    onClick={() => setIsMobileWorkflowOpen(!isMobileWorkflowOpen)}
                  >
                    <Layers size={24} />
                  </button>
                </div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900">Gemini Studio</h1>
                <div className="hidden sm:block w-40 md:w-64 lg:w-96">
                  <CustomerSearch
                    orders={orders}
                    onSelectCustomer={(customer) => {
                      setSelectedCustomer(customer);
                      setIsDeadOpportunitiesActive(false);
                      setDeadOpportunitySearch('');
                    }}
                    placeholder="Search by business name..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('Sales')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      viewMode === 'Sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Sales View
                  </button>
                  <button
                    onClick={() => setViewMode('Production')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      viewMode === 'Production' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Production View
                  </button>
                </div>

                <button className="p-2 text-slate-400 hover:text-slate-600">
                  <Bell size={20} />
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {currentUser?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-slate-700">{currentUser?.displayName}</p>
                      <p className="text-xs text-slate-500">{currentUser?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-7xl mx-auto">
                {/* Customer Filter Active Banner */}
                {selectedCustomer && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Showing all orders for</p>
                      <p className="text-lg font-bold text-blue-900">{selectedCustomer}</p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer('')}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <X size={16} />
                      Clear Filter
                    </button>
                  </div>
                )}

                {isDeadOpportunitiesActive ? (
                  // Dead Opportunities View
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Dead Opportunities</h2>
                        <p className="text-slate-500 text-sm">
                          {filteredDeadOpportunities.length} of {deadOpportunities.length} killed leads and quotes
                        </p>
                      </div>
                    </div>

                    {/* Search Filter */}
                    <div className="mb-6">
                      <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by customer, email, project, or order number..."
                          value={deadOpportunitySearch}
                          onChange={(e) => setDeadOpportunitySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        {deadOpportunitySearch && (
                          <button
                            onClick={() => setDeadOpportunitySearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredDeadOpportunities.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDeadOpportunities.map(order => (
                          <div key={order.id} className="relative">
                            <div className="absolute -top-2 -right-2 z-10 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                              Dead
                            </div>
                            <OrderCard
                              order={order}
                              viewMode={viewMode}
                              onClick={setSelectedOrder}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Search size={48} strokeWidth={1} className="mb-4" />
                        <p className="font-medium">
                          {deadOpportunitySearch
                            ? `No dead opportunities matching "${deadOpportunitySearch}"`
                            : 'No dead opportunities yet'}
                        </p>
                      </div>
                    )}
                  </>
                ) : selectedCustomer && customerOrdersByStage ? (
                  // Customer-specific view: show orders grouped by stage
                  <div className="space-y-8">
                    {([...ORDER_STAGES, 'Closed'] as OrderStatus[]).map(stage => {
                      const stageOrders = customerOrdersByStage[stage];
                      if (stageOrders.length === 0) return null;

                      return (
                        <div key={stage}>
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-lg font-bold text-slate-900">{stage}</h3>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                              {stageOrders.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {stageOrders.map(order => (
                              <OrderCard
                                key={order.id}
                                order={order}
                                viewMode={viewMode}
                                onClick={setSelectedOrder}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {filteredOrders.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Search size={48} strokeWidth={1} className="mb-4" />
                        <p className="font-medium">No active orders for {selectedCustomer}</p>
                      </div>
                    )}
                  </div>
                ) : showDecorationColumns && ordersByDecorationType ? (
                  // Decoration type column view for Art Confirmation, Inventory Order, Production Prep
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-1">{currentStage}</h2>
                        <p className="text-slate-500 text-sm">Managing {filteredOrders.length} orders by decoration type</p>
                      </div>
                    </div>

                    {filteredOrders.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PRODUCTION_METHODS.map(decorationType => {
                          const typeOrders = ordersByDecorationType[decorationType];
                          const colors = PRODUCTION_METHOD_COLORS[decorationType];
                          return (
                            <div key={decorationType} className={`rounded-xl border-2 ${colors.border} ${colors.bg} overflow-hidden`}>
                              <div className={`px-4 py-3 border-b ${colors.border} flex items-center justify-between`}>
                                <h3 className={`font-bold ${colors.text}`}>{PRODUCTION_METHOD_LABELS[decorationType]}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.text} bg-white/60`}>
                                  {typeOrders.length}
                                </span>
                              </div>
                              <div className="p-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                                {typeOrders.length > 0 ? (
                                  typeOrders.map(order => (
                                    <OrderCard
                                      key={`${decorationType}-${order.id}`}
                                      order={order}
                                      viewMode={viewMode}
                                      onClick={setSelectedOrder}
                                    />
                                  ))
                                ) : (
                                  <div className="text-center py-8 text-slate-400">
                                    <p className="text-sm font-medium">No orders</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Search size={48} strokeWidth={1} className="mb-4" />
                        <p className="font-medium">No orders found in {currentStage}</p>
                      </div>
                    )}
                  </>
                ) : (
                  // Normal stage-based view
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-1">{currentStage}</h2>
                        <p className="text-slate-500 text-sm">Managing {filteredOrders.length} orders in this stage</p>
                      </div>
                    </div>

                    {filteredOrders.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredOrders.map(order => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            viewMode={viewMode}
                            onClick={setSelectedOrder}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Search size={48} strokeWidth={1} className="mb-4" />
                        <p className="font-medium">No orders found in {currentStage}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>

          {/* Slide-over Detail View */}
          {selectedOrder && (
            <>
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 animate-in fade-in duration-300"
                onClick={() => {
                  setSelectedOrder(null);
                  setAutoOpenAddItem(false);
                }}
              />
              <OrderSlideOver
                order={selectedOrder}
                viewMode={viewMode}
                onClose={() => {
                  setSelectedOrder(null);
                  setAutoOpenAddItem(false);
                }}
                onUpdate={handleUpdateOrder}
                onDeleteQuote={handleDeleteQuote}
                initialShowAddItem={autoOpenAddItem}
                onAddItemOpened={() => setAutoOpenAddItem(false)}
                allOrders={orders}
              />
            </>
          )}

          {/* Modals */}
          {showNewOrder && (
            <NewOrderModal
              onClose={() => setShowNewOrder(false)}
              onCreate={handleCreateOrder}
            />
          )}
          {showChangeOrder && (
            <ChangeOrderModal
              onClose={() => setShowChangeOrder(false)}
              onSelectOrder={handleSelectOrderForChangeOrder}
              orders={orders}
            />
          )}
        </>
      )}

      {/* Test Runner (Ctrl+Shift+T to toggle) */}
      {showTestRunner && (
        <TestRunner
          orders={orders}
          onLoadTestOrders={(testOrders) => {
            setOrders(testOrders);
            setShowTestRunner(false);
          }}
        />
      )}
    </div>
  );
};

// Component that checks auth and renders LoginPage or AppContent
const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [setupStatus, setSetupStatus] = useState<'checking' | 'needed' | 'complete'>('checking');

  useEffect(() => {
    const checkSetup = async () => {
      if (isAuthenticated) {
        setSetupStatus('complete');
        return;
      }

      try {
        // Timeout setup check to prevent Chrome from hanging on slow Supabase responses.
        // checkSetupStatus has internal retries that can take up to ~95s; cap it at 8s.
        const status = await Promise.race([
          checkSetupStatus(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Setup check timeout')), 8000))
        ]);
        setSetupStatus(status.needsSetup ? 'needed' : 'complete');
      } catch (err) {
        console.error('Setup check failed:', err);
        setSetupStatus('complete'); // Proceed to login on error
      }
    };

    if (!isLoading) {
      checkSetup();
    }
  }, [isAuthenticated, isLoading]);

  // Still checking
  if (isLoading || setupStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // Need setup
  if (setupStatus === 'needed') {
    return <SetupWizard onComplete={() => setSetupStatus('complete')} />;
  }

  // Normal auth flow
  return isAuthenticated ? <AppContent /> : <LoginPage />;
};

// Main App wrapper with AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
