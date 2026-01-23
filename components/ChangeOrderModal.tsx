import React, { useState, useMemo } from 'react';
import { X, Search, Plus, AlertCircle, ArrowLeft } from 'lucide-react';
import { Order } from '../types';

interface ChangeOrderModalProps {
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
  orders: Order[];
}

const ChangeOrderModal: React.FC<ChangeOrderModalProps> = ({ onClose, onSelectOrder, orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentOrder, setSelectedParentOrder] = useState<Order | null>(null);

  // Filter orders that can have change orders added
  // Exclude: Leads, Closed, Archived, and anything in Production or later
  const eligibleParentOrders = useMemo(() => {
    return orders.filter(o =>
      !o.isArchived &&
      o.status !== 'Lead' &&
      o.status !== 'Closed' &&
      // Block change orders once order reaches Production
      o.status !== 'Production' &&
      o.status !== 'Fulfillment' &&
      o.status !== 'Invoice' &&
      o.status !== 'Closeout'
    );
  }, [orders]);

  // Search filtered orders
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return eligibleParentOrders;
    const searchLower = searchTerm.toLowerCase();
    return eligibleParentOrders.filter(o =>
      o.orderNumber.toLowerCase().includes(searchLower) ||
      o.customer.toLowerCase().includes(searchLower) ||
      o.projectName.toLowerCase().includes(searchLower)
    );
  }, [eligibleParentOrders, searchTerm]);

  const handleConfirmChangeOrder = () => {
    if (!selectedParentOrder) return;

    // Pass the selected order back to parent component
    // The parent will handle moving it back to Quote and opening the detail view
    onSelectOrder(selectedParentOrder);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-orange-50">
          <div>
            <h2 className="text-xl font-bold text-orange-900">Add Change Order Items</h2>
            <p className="text-sm text-orange-600 mt-1">Select the order to add change order items to</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-orange-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedParentOrder ? (
            <>
              {/* Search Box */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order number, customer, or project name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>

              {/* Order List */}
              {eligibleParentOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">No eligible orders found</p>
                  <p className="text-slate-400 text-sm mt-1">Change orders cannot be added to orders in Production or later stages</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <Search size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">No orders match your search</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredOrders.map(order => {
                    const hasChangeOrders = order.hasChangeOrders;
                    const changeOrderCount = order.lineItems.filter(li => li.isChangeOrder).length;

                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedParentOrder(order)}
                        className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900">{order.orderNumber}</span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                {order.status}
                              </span>
                              {hasChangeOrders && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                  {changeOrderCount} CO item{changeOrderCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-700">{order.customer}</p>
                            <p className="text-sm text-slate-500">{order.projectName}</p>
                            {order.lineItems && order.lineItems.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1">
                                {order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''} •
                                {' '}{order.lineItems.reduce((sum, item) => sum + item.qty, 0)} total units
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="w-8 h-8 rounded-full bg-orange-100 group-hover:bg-orange-600 flex items-center justify-center transition-colors">
                              <Plus size={16} className="text-orange-600 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Parent Order Summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-orange-600 uppercase mb-1">Selected Order</p>
                    <p className="font-bold text-slate-900 text-lg">{selectedParentOrder.orderNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedParentOrder(null)}
                    className="text-orange-600 hover:text-orange-700 text-sm font-bold flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Change
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium text-slate-700">Customer:</span> {selectedParentOrder.customer}</p>
                  <p><span className="font-medium text-slate-700">Project:</span> {selectedParentOrder.projectName}</p>
                  <p><span className="font-medium text-slate-700">Current Status:</span> {selectedParentOrder.status}</p>
                  {selectedParentOrder.lineItems && selectedParentOrder.lineItems.length > 0 && (
                    <p><span className="font-medium text-slate-700">Existing Items:</span> {selectedParentOrder.lineItems.length} items ({selectedParentOrder.lineItems.reduce((sum, item) => sum + item.qty, 0)} units)</p>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-2">What happens next:</p>
                    <ul className="space-y-1.5 text-blue-700">
                      <li>• This order will move back to <strong>Quote</strong> stage</li>
                      <li>• Existing line items retain their status (ordered, received, etc.)</li>
                      <li>• You can add new items or adjust quantities (negatives allowed)</li>
                      <li>• Change order items will be shown separately with an orange background</li>
                      <li>• The order will progress through approval stages for new items</li>
                      <li>• Both original and change order items must be ready before production</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmChangeOrder}
            disabled={!selectedParentOrder}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
              selectedParentOrder
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Add Change Order Items
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeOrderModal;
