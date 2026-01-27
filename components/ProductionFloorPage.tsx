import React, { useState, useMemo } from 'react';
import { X, Monitor, Tv, Calendar, Clock, AlertTriangle, Package, Printer, CheckCircle2, Plus, Trash2, Save, ChevronDown, ChevronUp, Users, TrendingUp } from 'lucide-react';
import { Order, ProductivityEntry, ProductionMethod } from '../types';

interface ProductionFloorPageProps {
  orders: Order[];
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
}

type ViewTab = 'dashboard' | 'worksheet' | 'history';

const ProductionFloorPage: React.FC<ProductionFloorPageProps> = ({ orders, onClose, onSelectOrder }) => {
  const [tvMode, setTvMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [productivityEntries, setProductivityEntries] = useState<ProductivityEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);

  // New entry form state
  const [newEntry, setNewEntry] = useState({
    operatorName: '',
    orderNumber: '',
    orderId: '',
    decorationType: 'ScreenPrint' as ProductionMethod,
    itemsDecorated: 0,
    itemsPacked: 0,
    notes: ''
  });

  // Get today's date string
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();

  // Orders in production
  const productionOrders = useMemo(() => {
    return orders.filter(o => !o.isArchived && o.status === 'Production');
  }, [orders]);

  // Upcoming orders (in prep or waiting for inventory)
  const upcomingOrders = useMemo(() => {
    return orders.filter(o =>
      !o.isArchived &&
      ['Production Prep', 'Inventory Received'].includes(o.status)
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [orders]);

  // Orders due within 7 days
  const urgentOrders = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return orders.filter(o => {
      if (o.isArchived || o.status === 'Closed') return false;
      if (!o.dueDate) return false;
      const dueDate = new Date(o.dueDate);
      return dueDate <= sevenDaysFromNow && dueDate >= now;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [orders]);

  // Today's productivity
  const todayProductivity = useMemo(() => {
    const todayEntries = productivityEntries.filter(e => e.date === today);
    return {
      totalDecorated: todayEntries.reduce((sum, e) => sum + e.itemsDecorated, 0),
      totalPacked: todayEntries.reduce((sum, e) => sum + e.itemsPacked, 0),
      entries: todayEntries
    };
  }, [productivityEntries, today]);

  // Get days until due
  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Add productivity entry
  const handleAddEntry = () => {
    if (!newEntry.operatorName || !newEntry.orderNumber) return;

    const entry: ProductivityEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: today,
      hour: currentHour,
      operatorName: newEntry.operatorName,
      orderNumber: newEntry.orderNumber,
      orderId: newEntry.orderId,
      decorationType: newEntry.decorationType,
      itemsDecorated: newEntry.itemsDecorated,
      itemsPacked: newEntry.itemsPacked,
      notes: newEntry.notes || undefined,
      createdAt: new Date()
    };

    setProductivityEntries(prev => [entry, ...prev]);
    setNewEntry({
      operatorName: '',
      orderNumber: '',
      orderId: '',
      decorationType: 'ScreenPrint',
      itemsDecorated: 0,
      itemsPacked: 0,
      notes: ''
    });
    setShowAddEntry(false);
  };

  // Delete productivity entry
  const handleDeleteEntry = (id: string) => {
    setProductivityEntries(prev => prev.filter(e => e.id !== id));
  };

  // Get production order for dropdown
  const availableOrders = useMemo(() => {
    return orders.filter(o =>
      !o.isArchived &&
      ['Production', 'Production Prep', 'Inventory Received'].includes(o.status)
    );
  }, [orders]);

  // TV Mode Component
  if (tvMode) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 overflow-hidden">
        {/* TV Header */}
        <div className="bg-slate-800 px-8 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-4">
            <Monitor className="text-purple-400" size={32} />
            <div>
              <h1 className="text-3xl font-black text-white">Production Floor</h1>
              <p className="text-slate-400">Live Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-4xl font-black text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-slate-400">{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
            <button
              onClick={() => setTvMode(false)}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* TV Content */}
        <div className="p-8 h-[calc(100vh-100px)] overflow-hidden">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Left Column: In Production */}
            <div className="bg-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                <h2 className="text-2xl font-black text-white">IN PRODUCTION</h2>
                <span className="ml-auto text-3xl font-black text-green-400">{productionOrders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {productionOrders.map(order => {
                  const totalItems = order.lineItems?.reduce((sum, li) => sum + li.qty, 0) || 0;
                  const decoratedItems = order.lineItems?.filter(li => li.decorated).reduce((sum, li) => sum + li.qty, 0) || 0;
                  const progress = totalItems > 0 ? Math.round((decoratedItems / totalItems) * 100) : 0;

                  return (
                    <div key={order.id} className="bg-slate-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white truncate">{order.customer}</h3>
                        {order.rushOrder && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">RUSH</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{order.projectName}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-600 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-green-400">{progress}%</span>
                      </div>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-slate-400">{decoratedItems}/{totalItems} items</span>
                        <span className="text-amber-400">Due: {order.dueDate || 'TBD'}</span>
                      </div>
                    </div>
                  );
                })}
                {productionOrders.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No orders in production</p>
                  </div>
                )}
              </div>
            </div>

            {/* Center Column: Urgent (Due in 7 Days) */}
            <div className="bg-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-amber-500" size={24} />
                <h2 className="text-2xl font-black text-white">DUE WITHIN 7 DAYS</h2>
                <span className="ml-auto text-3xl font-black text-amber-400">{urgentOrders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {urgentOrders.map(order => {
                  const daysUntil = getDaysUntilDue(order.dueDate);
                  const isOverdue = daysUntil < 0;
                  const isDueToday = daysUntil === 0;
                  const isDueTomorrow = daysUntil === 1;

                  return (
                    <div
                      key={order.id}
                      className={`rounded-xl p-4 ${
                        isOverdue ? 'bg-red-900/50 border-2 border-red-500' :
                        isDueToday ? 'bg-red-800/50 border-2 border-red-400' :
                        isDueTomorrow ? 'bg-amber-800/50 border-2 border-amber-400' :
                        'bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white truncate">{order.customer}</h3>
                        <span className={`text-2xl font-black ${
                          isOverdue ? 'text-red-400' :
                          isDueToday ? 'text-red-400' :
                          isDueTomorrow ? 'text-amber-400' :
                          'text-amber-300'
                        }`}>
                          {isOverdue ? 'OVERDUE' :
                           isDueToday ? 'TODAY' :
                           isDueTomorrow ? 'TOMORROW' :
                           `${daysUntil}d`}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{order.projectName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm px-2 py-1 bg-slate-600 rounded text-slate-300">{order.status}</span>
                        <span className="text-slate-400 text-sm">{order.dueDate}</span>
                      </div>
                    </div>
                  );
                })}
                {urgentOrders.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    <CheckCircle2 size={48} className="mx-auto mb-2 opacity-50 text-green-500" />
                    <p>No urgent deadlines</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Upcoming */}
            <div className="bg-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="text-blue-400" size={24} />
                <h2 className="text-2xl font-black text-white">COMING UP</h2>
                <span className="ml-auto text-3xl font-black text-blue-400">{upcomingOrders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {upcomingOrders.slice(0, 8).map(order => (
                  <div key={order.id} className="bg-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white truncate">{order.customer}</h3>
                      {order.rushOrder && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">RUSH</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm truncate">{order.projectName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded">{order.status}</span>
                      <span className="text-slate-400 text-sm">{order.dueDate || 'TBD'}</span>
                    </div>
                  </div>
                ))}
                {upcomingOrders.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No upcoming orders</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Productivity Footer */}
          <div className="mt-6 bg-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TrendingUp className="text-green-400" size={24} />
              <span className="text-xl font-bold text-white">Today's Production</span>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-black text-green-400">{todayProductivity.totalDecorated}</p>
                <p className="text-slate-400 text-sm">Items Decorated</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-blue-400">{todayProductivity.totalPacked}</p>
                <p className="text-slate-400 text-sm">Items Packed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-purple-400">{todayProductivity.entries.length}</p>
                <p className="text-slate-400 text-sm">Log Entries</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular View
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-16 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-8">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Monitor className="text-purple-600 flex-shrink-0" size={24} />
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold text-slate-900 truncate">Production</h1>
            <p className="text-xs text-slate-500 hidden md:block">Dashboard & Productivity Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={() => setTvMode(true)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors text-xs md:text-sm"
          >
            <Tv size={16} />
            <span className="hidden sm:inline">TV Mode</span>
          </button>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={22} className="text-slate-500" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Selector */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-white"
        >
          <option value="dashboard">Dashboard</option>
          <option value="worksheet">Productivity Worksheet</option>
          <option value="history">History</option>
        </select>
      </div>

      {/* Tabs - Hidden on mobile */}
      <div className="hidden md:block bg-white border-b border-slate-200 px-8">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'dashboard'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('worksheet')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'worksheet'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Productivity Worksheet
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-slate-500 uppercase">In Production</span>
                </div>
                <p className="text-3xl font-black text-slate-900">{productionOrders.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <span className="text-sm font-bold text-slate-500 uppercase">Due in 7 Days</span>
                </div>
                <p className="text-3xl font-black text-amber-600">{urgentOrders.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={16} className="text-blue-500" />
                  <span className="text-sm font-bold text-slate-500 uppercase">Coming Up</span>
                </div>
                <p className="text-3xl font-black text-blue-600">{upcomingOrders.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-sm font-bold text-slate-500 uppercase">Today's Output</span>
                </div>
                <p className="text-3xl font-black text-green-600">{todayProductivity.totalDecorated}</p>
              </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* In Production */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                  <h3 className="font-bold text-green-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    In Production ({productionOrders.length})
                  </h3>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {productionOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-green-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">{order.customer}</p>
                        {order.rushOrder && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">RUSH</span>}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{order.projectName}</p>
                      <p className="text-xs text-slate-400 mt-1">Due: {order.dueDate || 'TBD'}</p>
                    </div>
                  ))}
                  {productionOrders.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No orders in production</p>
                  )}
                </div>
              </div>

              {/* Due Soon */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Due Within 7 Days ({urgentOrders.length})
                  </h3>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {urgentOrders.map(order => {
                    const daysUntil = getDaysUntilDue(order.dueDate);
                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrder(order)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          daysUntil <= 1 ? 'bg-red-50 border-red-200 hover:border-red-400' : 'bg-amber-50 border-amber-100 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800">{order.customer}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            daysUntil <= 0 ? 'bg-red-500 text-white' :
                            daysUntil === 1 ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {daysUntil <= 0 ? 'OVERDUE' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil} days`}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">{order.projectName}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{order.status}</span>
                          <span className="text-xs text-slate-400">{order.dueDate}</span>
                        </div>
                      </div>
                    );
                  })}
                  {urgentOrders.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No urgent orders</p>
                  )}
                </div>
              </div>

              {/* Coming Up */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                  <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <Calendar size={16} />
                    Coming Up ({upcomingOrders.length})
                  </h3>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {upcomingOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">{order.customer}</p>
                        {order.rushOrder && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">RUSH</span>}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{order.projectName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{order.status}</span>
                        <span className="text-xs text-slate-400">{order.dueDate || 'TBD'}</span>
                      </div>
                    </div>
                  ))}
                  {upcomingOrders.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No upcoming orders</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'worksheet' && (
          <div className="space-y-6">
            {/* Worksheet Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">Hourly Production Log</h2>
                  <p className="text-slate-500 text-sm">Track production output for operators</p>
                </div>
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors text-sm sm:text-base"
                >
                  <Plus size={18} />
                  Log Production
                </button>
              </div>

              {/* Today's Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm font-bold text-green-600 uppercase mb-1">Items Decorated Today</p>
                  <p className="text-3xl font-black text-green-700">{todayProductivity.totalDecorated}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm font-bold text-blue-600 uppercase mb-1">Items Packed Today</p>
                  <p className="text-3xl font-black text-blue-700">{todayProductivity.totalPacked}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm font-bold text-purple-600 uppercase mb-1">Log Entries Today</p>
                  <p className="text-3xl font-black text-purple-700">{todayProductivity.entries.length}</p>
                </div>
              </div>
            </div>

            {/* Add Entry Form */}
            {showAddEntry && (
              <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-6">
                <h3 className="font-bold text-purple-800 mb-4 flex items-center gap-2">
                  <Clock size={18} />
                  Log Production Entry - {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operator Name *</label>
                    <input
                      type="text"
                      placeholder="Enter operator name"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                      value={newEntry.operatorName}
                      onChange={(e) => setNewEntry({ ...newEntry, operatorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Order *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      value={newEntry.orderId}
                      onChange={(e) => {
                        const order = availableOrders.find(o => o.id === e.target.value);
                        setNewEntry({
                          ...newEntry,
                          orderId: e.target.value,
                          orderNumber: order?.orderNumber || ''
                        });
                      }}
                    >
                      <option value="">Select order...</option>
                      {availableOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          {order.orderNumber} - {order.customer}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Decoration Type</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      value={newEntry.decorationType}
                      onChange={(e) => setNewEntry({ ...newEntry, decorationType: e.target.value as ProductionMethod })}
                    >
                      <option value="ScreenPrint">Screen Print</option>
                      <option value="DTF">DTF</option>
                      <option value="Embroidery">Embroidery</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Items Decorated</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newEntry.itemsDecorated || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, itemsDecorated: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Items Packed</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newEntry.itemsPacked || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, itemsPacked: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddEntry}
                    disabled={!newEntry.operatorName || !newEntry.orderId}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Save Entry
                  </button>
                  <button
                    onClick={() => setShowAddEntry(false)}
                    className="px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Today's Entries */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Today's Production Log</h3>
                <span className="text-sm text-slate-500">{today}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {todayProductivity.entries.length > 0 ? (
                  todayProductivity.entries.map(entry => (
                    <div key={entry.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Clock size={18} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-800 truncate">{entry.operatorName}</p>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-sm text-slate-500">{entry.orderNumber} • {entry.decorationType}</p>
                          {entry.notes && <p className="text-xs text-slate-400 mt-1">{entry.notes}</p>}
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <span className="text-sm font-bold text-green-600">{entry.itemsDecorated}</span>
                              <span className="text-xs text-slate-400 ml-1">decorated</span>
                            </div>
                            <div>
                              <span className="text-sm font-bold text-blue-600">{entry.itemsPacked}</span>
                              <span className="text-xs text-slate-400 ml-1">packed</span>
                            </div>
                            <div className="ml-auto text-right">
                              <span className="text-xs font-medium text-slate-500">
                                {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <Clock size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No production logged today</p>
                    <button
                      onClick={() => setShowAddEntry(true)}
                      className="mt-2 text-purple-600 font-medium hover:underline"
                    >
                      Log your first entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Productivity History</h2>

              {/* Summary by Operator */}
              {productivityEntries.length > 0 ? (
                <div className="space-y-6">
                  {/* Group by date */}
                  {(Object.entries(
                    productivityEntries.reduce((acc, entry) => {
                      if (!acc[entry.date]) acc[entry.date] = [];
                      acc[entry.date].push(entry);
                      return acc;
                    }, {} as Record<string, ProductivityEntry[]>)
                  ) as [string, ProductivityEntry[]][])
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, entries]) => {
                      const totalDecorated = entries.reduce((sum, e) => sum + e.itemsDecorated, 0);
                      const totalPacked = entries.reduce((sum, e) => sum + e.itemsPacked, 0);

                      return (
                        <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                            <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                              {new Date(date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </h4>
                            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                              <span className="text-green-600 font-bold">{totalDecorated} decorated</span>
                              <span className="text-blue-600 font-bold">{totalPacked} packed</span>
                              <span className="text-slate-500">{entries.length} entries</span>
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {entries.map(entry => (
                              <div key={entry.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-1">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <span className="text-slate-400 w-12 sm:w-16 flex-shrink-0">{entry.hour}:00</span>
                                  <span className="font-medium text-slate-800 truncate">{entry.operatorName}</span>
                                  <span className="text-slate-500 hidden sm:inline">•</span>
                                  <span className="text-slate-500 truncate">{entry.orderNumber}</span>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 pl-14 sm:pl-0 flex-shrink-0">
                                  <span className="text-green-600">{entry.itemsDecorated} dec</span>
                                  <span className="text-blue-600">{entry.itemsPacked} pkg</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <TrendingUp size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No productivity history yet</p>
                  <p className="text-sm">Start logging production to see history</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionFloorPage;
