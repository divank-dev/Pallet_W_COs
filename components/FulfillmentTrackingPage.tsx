import React, { useState, useMemo } from 'react';
import { X, Package, Truck, MapPin, Calendar, Search, Filter, CheckCircle2, Clock, ExternalLink, Phone, Mail } from 'lucide-react';
import { Order } from '../types';

interface FulfillmentTrackingPageProps {
  orders: Order[];
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
}

type FilterType = 'all' | 'shipped' | 'pickup' | 'pending';

const FulfillmentTrackingPage: React.FC<FulfillmentTrackingPageProps> = ({ orders, onClose, onSelectOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Get orders that are in fulfillment-related stages with tracking info
  const fulfillmentOrders = useMemo(() => {
    // Include orders in Fulfillment, Invoice, Closeout stages (not yet closed)
    const relevantStatuses = ['Fulfillment', 'Invoice', 'Closeout'];

    return orders.filter(o => {
      if (o.isArchived) return false;
      if (!relevantStatuses.includes(o.status)) return false;

      // Has either tracking number OR is marked for pickup
      const hasTrackingInfo = o.fulfillment.trackingNumber ||
                             o.fulfillment.method === 'PickedUp' ||
                             o.fulfillment.method === 'Shipped';

      return hasTrackingInfo || o.status === 'Fulfillment';
    });
  }, [orders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    let result = fulfillmentOrders;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.customer.toLowerCase().includes(term) ||
        o.orderNumber.toLowerCase().includes(term) ||
        o.projectName.toLowerCase().includes(term) ||
        (o.fulfillment.trackingNumber && o.fulfillment.trackingNumber.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (filterType === 'shipped') {
      result = result.filter(o => o.fulfillment.method === 'Shipped' && o.fulfillment.trackingNumber);
    } else if (filterType === 'pickup') {
      result = result.filter(o => o.fulfillment.method === 'PickedUp');
    } else if (filterType === 'pending') {
      result = result.filter(o => !o.fulfillment.method || (!o.fulfillment.trackingNumber && o.fulfillment.method === 'Shipped'));
    }

    return result;
  }, [fulfillmentOrders, searchTerm, filterType]);

  // Stats
  const stats = useMemo(() => {
    const shipped = fulfillmentOrders.filter(o => o.fulfillment.method === 'Shipped' && o.fulfillment.trackingNumber).length;
    const pickup = fulfillmentOrders.filter(o => o.fulfillment.method === 'PickedUp').length;
    const pending = fulfillmentOrders.filter(o => !o.fulfillment.method || (!o.fulfillment.trackingNumber && o.fulfillment.method === 'Shipped')).length;
    return { shipped, pickup, pending, total: fulfillmentOrders.length };
  }, [fulfillmentOrders]);

  const getStatusBadge = (order: Order) => {
    if (order.fulfillment.customerPickedUp) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Picked Up</span>;
    }
    if (order.fulfillment.method === 'Shipped' && order.fulfillment.trackingNumber) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Shipped</span>;
    }
    if (order.fulfillment.method === 'PickedUp') {
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Awaiting Pickup</span>;
    }
    return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">Pending</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-8">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Package className="text-blue-600 flex-shrink-0" size={24} />
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold text-slate-900 truncate">Fulfillment</h1>
            <p className="text-xs text-slate-500 hidden md:block">Track shipments and customer pickups</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0 ml-2"
        >
          <X size={20} className="text-slate-500" />
        </button>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => setFilterType('all')}
            className={`p-4 rounded-xl border-2 transition-all ${
              filterType === 'all' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Open</p>
          </button>
          <button
            onClick={() => setFilterType('shipped')}
            className={`p-4 rounded-xl border-2 transition-all ${
              filterType === 'shipped' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck size={20} className="text-blue-600" />
              <p className="text-2xl font-black text-blue-600">{stats.shipped}</p>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase">Shipped</p>
          </button>
          <button
            onClick={() => setFilterType('pickup')}
            className={`p-4 rounded-xl border-2 transition-all ${
              filterType === 'pickup' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-amber-600" />
              <p className="text-2xl font-black text-amber-600">{stats.pickup}</p>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase">Pickup</p>
          </button>
          <button
            onClick={() => setFilterType('pending')}
            className={`p-4 rounded-xl border-2 transition-all ${
              filterType === 'pending' ? 'border-slate-500 bg-slate-100' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-slate-500" />
              <p className="text-2xl font-black text-slate-600">{stats.pending}</p>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase">Pending</p>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 md:px-8 py-4 bg-white border-b border-slate-200">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, order number, or tracking number..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-slate-900">{order.customer}</h3>
                      {getStatusBadge(order)}
                      {order.rushOrder && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">RUSH</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {order.orderNumber} • {order.projectName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold">Due Date</p>
                    <p className="font-bold text-slate-800">{order.dueDate || 'Not set'}</p>
                  </div>
                </div>

                {/* Fulfillment Details */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  {/* Left: Shipping/Pickup Info */}
                  <div>
                    {order.fulfillment.method === 'Shipped' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Truck size={16} />
                          <span className="font-bold text-sm">Shipping</span>
                        </div>
                        {order.fulfillment.trackingNumber ? (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Tracking Number</p>
                            <p className="font-mono font-bold text-blue-700">{order.fulfillment.trackingNumber}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-amber-600 font-medium">Tracking number pending</p>
                        )}
                      </div>
                    ) : order.fulfillment.method === 'PickedUp' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-600">
                          <MapPin size={16} />
                          <span className="font-bold text-sm">Customer Pickup</span>
                        </div>
                        {order.fulfillment.customerPickedUp ? (
                          <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <div>
                              <p className="font-bold text-green-700 text-sm">Picked Up</p>
                              {order.fulfillment.fulfilledAt && (
                                <p className="text-xs text-green-600">
                                  {new Date(order.fulfillment.fulfilledAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50 rounded-lg p-3">
                            <p className="font-bold text-amber-700 text-sm">Awaiting Pickup</p>
                            <p className="text-xs text-amber-600">Ready for customer</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock size={16} />
                          <span className="font-bold text-sm">Pending</span>
                        </div>
                        <p className="text-sm text-slate-500">Fulfillment method not selected</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Contact & Items Info */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-bold uppercase">Customer Contact</p>
                    {order.customerEmail && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={14} />
                        <span>{order.customerEmail}</span>
                      </div>
                    )}
                    {order.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} />
                        <span>{order.customerPhone}</span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400">
                        {order.lineItems?.reduce((sum, li) => sum + li.qty, 0) || 0} items •
                        ${order.lineItems?.reduce((sum, li) => sum + (li.price * li.qty), 0).toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Stage */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Current Stage:</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">{order.status}</span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                    View Details <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
            <Package size={48} strokeWidth={1} className="mb-4" />
            <p className="font-medium">No fulfillment orders found</p>
            <p className="text-sm">Orders will appear here when they reach the Fulfillment stage</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FulfillmentTrackingPage;
