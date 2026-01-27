import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Package, DollarSign, Calendar, ChevronRight,
  Layers, Clock, AlertCircle, Zap, PieChart, ArrowUpRight, ArrowDownRight,
  Target, Printer, Shirt, X, Users
} from 'lucide-react';
import { Order, OrderStatus, ProductionMethod } from '../types';
import { ORDER_STAGES } from '../constants';

interface ReportsPageProps {
  orders: Order[];
  onClose: () => void;
}

type ReportTab = 'queue' | 'performance' | 'customers';

const ReportsPage: React.FC<ReportsPageProps> = ({ orders, onClose }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('queue');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filter non-archived orders for queue view
  const activeOrders = useMemo(() => orders.filter(o => !o.isArchived), [orders]);

  // Filter orders within date range for performance view
  const ordersInRange = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    return orders.filter(o => {
      const created = new Date(o.createdAt);
      return created >= startDate && created <= endDate;
    });
  }, [orders, dateRange]);

  // Queue Analytics
  const queueAnalytics = useMemo(() => {
    const byStage: Record<OrderStatus, Order[]> = {} as Record<OrderStatus, Order[]>;
    ORDER_STAGES.forEach(stage => {
      byStage[stage] = activeOrders.filter(o => o.status === stage);
    });

    const rushOrders = activeOrders.filter(o => o.rushOrder);
    const artPending = activeOrders.filter(o => o.artStatus === 'Pending');
    const totalValue = activeOrders.reduce((sum, o) =>
      sum + o.lineItems.reduce((s, li) => s + li.price * li.qty, 0), 0
    );
    const totalUnits = activeOrders.reduce((sum, o) =>
      sum + o.lineItems.reduce((s, li) => s + li.qty, 0), 0
    );

    return { byStage, rushOrders, artPending, totalValue, totalUnits };
  }, [activeOrders]);

  // Performance Analytics
  const performanceAnalytics = useMemo(() => {
    // Revenue & Costs
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnits = 0;
    const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
    const decorationStats: Record<ProductionMethod, { qty: number; revenue: number; orders: number }> = {
      'ScreenPrint': { qty: 0, revenue: 0, orders: 0 },
      'Embroidery': { qty: 0, revenue: 0, orders: 0 },
      'DTF': { qty: 0, revenue: 0, orders: 0 },
      'Other': { qty: 0, revenue: 0, orders: 0 }
    };
    const ordersByMethod = new Set<string>();

    ordersInRange.forEach(order => {
      order.lineItems.forEach(item => {
        const itemRevenue = item.price * item.qty;
        const itemCost = item.cost * item.qty;

        totalRevenue += itemRevenue;
        totalCost += itemCost;
        totalUnits += item.qty;

        // Product popularity
        const productKey = item.itemNumber || item.name;
        if (!productCounts[productKey]) {
          productCounts[productKey] = { name: item.name, qty: 0, revenue: 0 };
        }
        productCounts[productKey].qty += item.qty;
        productCounts[productKey].revenue += itemRevenue;

        // Decoration stats
        decorationStats[item.decorationType].qty += item.qty;
        decorationStats[item.decorationType].revenue += itemRevenue;

        const methodOrderKey = `${order.id}-${item.decorationType}`;
        if (!ordersByMethod.has(methodOrderKey)) {
          ordersByMethod.add(methodOrderKey);
          decorationStats[item.decorationType].orders++;
        }
      });
    });

    // Sort products by quantity
    const topProducts = Object.entries(productCounts)
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Daily/Weekly breakdown
    const dailyData: Record<string, { revenue: number; units: number; orders: number }> = {};
    ordersInRange.forEach(order => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { revenue: 0, units: 0, orders: 0 };
      }
      dailyData[dateKey].orders++;
      order.lineItems.forEach(item => {
        dailyData[dateKey].revenue += item.price * item.qty;
        dailyData[dateKey].units += item.qty;
      });
    });

    // Lead conversion
    const leads = ordersInRange.filter(o => o.status === 'Lead');
    const convertedFromLead = ordersInRange.filter(o =>
      o.status !== 'Lead' && o.leadInfo
    );
    const leadsValue = leads.reduce((sum, o) => sum + (o.leadInfo?.estimatedValue || 0), 0);

    return {
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      totalUnits,
      totalOrders: ordersInRange.length,
      avgOrderValue: ordersInRange.length > 0 ? totalRevenue / ordersInRange.length : 0,
      topProducts,
      decorationStats,
      dailyData,
      leads: leads.length,
      leadsValue,
      convertedLeads: convertedFromLead.length
    };
  }, [ordersInRange]);

  // Customer Analytics
  const customerAnalytics = useMemo(() => {
    interface CustomerData {
      name: string;
      quotedValue: number;
      orderValue: number;
      activeQuotes: number;
      deadLeadsValue: number;
      totalOrders: number;
      totalValue: number;
    }

    const customerMap = new Map<string, CustomerData>();

    // Quote/Lead stages: Lead, Quote, Approval
    const quoteStages: OrderStatus[] = ['Lead', 'Quote', 'Approval'];
    // Order stages: Art Confirmation and beyond
    const orderStages: OrderStatus[] = [
      'Art Confirmation', 'Inventory Order', 'Production Prep',
      'Inventory Received', 'Production', 'Fulfillment',
      'Invoice', 'Closeout', 'Closed'
    ];

    ordersInRange.forEach(order => {
      const customerName = order.customer || 'Unknown Customer';

      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, {
          name: customerName,
          quotedValue: 0,
          orderValue: 0,
          activeQuotes: 0,
          deadLeadsValue: 0,
          totalOrders: 0,
          totalValue: 0
        });
      }

      const customerData = customerMap.get(customerName)!;
      const orderTotal = order.lineItems.reduce((sum, item) => sum + item.price * item.qty, 0);

      customerData.totalOrders++;
      customerData.totalValue += orderTotal;

      // Count active quotes/leads (Lead, Quote, Approval stages)
      if (quoteStages.includes(order.status)) {
        customerData.quotedValue += orderTotal;
        customerData.activeQuotes++;
      }

      // Count orders (Art Confirmation and beyond, excluding Closed with dead reason)
      if (orderStages.includes(order.status) && order.status !== 'Closed') {
        customerData.orderValue += orderTotal;
      }

      // Calculate dead leads value (Closed orders)
      if (order.status === 'Closed') {
        customerData.deadLeadsValue += orderTotal;
      }
    });

    // Convert to array and sort by total value descending
    const customerArray = Array.from(customerMap.values()).sort((a, b) => b.totalValue - a.totalValue);

    // Calculate totals
    const totals = {
      totalCustomers: customerArray.length,
      totalQuotedValue: customerArray.reduce((sum, c) => sum + c.quotedValue, 0),
      totalOrderValue: customerArray.reduce((sum, c) => sum + c.orderValue, 0),
      totalActiveQuotes: customerArray.reduce((sum, c) => sum + c.activeQuotes, 0),
      totalDeadLeadsValue: customerArray.reduce((sum, c) => sum + c.deadLeadsValue, 0)
    };

    return { customers: customerArray, totals };
  }, [ordersInRange]);

  const getStageColor = (stage: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      'Lead': 'bg-emerald-500',
      'Quote': 'bg-blue-500',
      'Approval': 'bg-indigo-500',
      'Art Confirmation': 'bg-purple-500',
      'Inventory Order': 'bg-pink-500',
      'Production Prep': 'bg-orange-500',
      'Inventory Received': 'bg-amber-500',
      'Production': 'bg-yellow-500',
      'Fulfillment': 'bg-lime-500',
      'Invoice': 'bg-green-500',
      'Closeout': 'bg-teal-500',
      'Closed': 'bg-slate-500'
    };
    return colors[stage] || 'bg-slate-500';
  };

  const getDecorationLabel = (method: ProductionMethod) => {
    switch (method) {
      case 'ScreenPrint': return 'Screen Print';
      case 'DTF': return 'DTF';
      case 'Embroidery': return 'Embroidery';
      default: return 'Other';
    }
  };

  const getDecorationColor = (method: ProductionMethod) => {
    switch (method) {
      case 'ScreenPrint': return 'bg-purple-500';
      case 'DTF': return 'bg-cyan-500';
      case 'Embroidery': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-8 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <BarChart3 className="text-blue-600 flex-shrink-0" size={24} />
          <h1 className="text-base md:text-xl font-bold text-slate-900 truncate">Reports</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 ml-2"
        >
          <X size={20} />
        </button>
      </header>

      {/* Mobile Tab Selector */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-white"
        >
          <option value="queue">Order Queue</option>
          <option value="performance">Performance</option>
          <option value="customers">Customers</option>
          <option value="sla">SLA Dashboard</option>
        </select>
      </div>

      {/* Tab Navigation - Hidden on mobile */}
      <div className="hidden md:block bg-white border-b border-slate-200 px-4 md:px-8 overflow-x-auto">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers size={18} />
              Order Queue
            </div>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'performance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} />
              Performance Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'customers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Customer Analytics
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* QUEUE TAB */}
          {activeTab === 'queue' && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="text-blue-600" size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Active Orders</span>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{activeOrders.length}</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Zap className="text-red-600" size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Rush Orders</span>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{queueAnalytics.rushOrders.length}</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <AlertCircle className="text-orange-600" size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Art Pending</span>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{queueAnalytics.artPending.length}</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="text-green-600" size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Pipeline Value</span>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${queueAnalytics.totalValue.toLocaleString()}</p>
                </div>
              </div>

              {/* Pipeline Visualization */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Overview</h3>

                {/* Visual Bar Chart */}
                <div className="space-y-3 mb-6">
                  {ORDER_STAGES.map(stage => {
                    const count = queueAnalytics.byStage[stage].length;
                    const maxCount = Math.max(...ORDER_STAGES.map(s => queueAnalytics.byStage[s].length), 1);
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={stage} className="flex items-center gap-4">
                        <div className="w-40 text-sm font-medium text-slate-600 truncate">{stage}</div>
                        <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full ${getStageColor(stage)} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-700">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stage Details Grid */}
                <div className="grid grid-cols-5 gap-3 mt-8">
                  {ORDER_STAGES.map(stage => {
                    const stageOrders = queueAnalytics.byStage[stage];
                    const stageValue = stageOrders.reduce((sum, o) =>
                      sum + o.lineItems.reduce((s, li) => s + li.price * li.qty, 0), 0
                    );

                    return (
                      <div
                        key={stage}
                        className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                      >
                        <div className={`w-2 h-2 rounded-full ${getStageColor(stage)} mb-2`} />
                        <p className="text-xs font-medium text-slate-500 truncate">{stage}</p>
                        <p className="text-lg font-black text-slate-900">{stageOrders.length}</p>
                        <p className="text-xs text-slate-400">${stageValue.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rush Orders List */}
              {queueAnalytics.rushOrders.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                  <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                    <Zap size={20} />
                    Rush Orders Requiring Attention
                  </h3>
                  <div className="space-y-2">
                    {queueAnalytics.rushOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                        <div>
                          <p className="font-bold text-slate-900">{order.projectName}</p>
                          <p className="text-sm text-slate-500">{order.customer} • {order.orderNumber}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{order.status}</span>
                          <p className="text-xs text-slate-400 mt-1">Due: {new Date(order.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div className="space-y-8">
              {/* Date Range Picker */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="text-slate-400" size={20} />
                  <span className="text-sm font-medium text-slate-600">Date Range:</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  {[
                    { label: '7D', days: 7 },
                    { label: '30D', days: 30 },
                    { label: '90D', days: 90 },
                    { label: 'YTD', days: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)) }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setDateRange({
                        start: new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        end: new Date().toISOString().split('T')[0]
                      })}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Total Revenue</span>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="text-green-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${performanceAnalytics.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">{ordersInRange.length} orders</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Gross Profit</span>
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <TrendingUp className="text-emerald-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${performanceAnalytics.profit.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1">{performanceAnalytics.profitMargin.toFixed(1)}% margin</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Total Units</span>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shirt className="text-blue-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{performanceAnalytics.totalUnits.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">${(performanceAnalytics.totalRevenue / Math.max(performanceAnalytics.totalUnits, 1)).toFixed(2)} avg/unit</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Avg Order Value</span>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="text-purple-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${performanceAnalytics.avgOrderValue.toFixed(0)}</p>
                  <p className="text-xs text-slate-400 mt-1">{performanceAnalytics.totalOrders} total orders</p>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Total Cost</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">${performanceAnalytics.totalCost.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Leads Captured</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{performanceAnalytics.leads}</p>
                  <p className="text-xs text-slate-400 mt-1">${performanceAnalytics.leadsValue.toLocaleString()} est. value</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Leads Converted</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{performanceAnalytics.convertedLeads}</p>
                </div>
              </div>

              {/* Decoration Method Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Printer size={20} />
                  Performance by Decoration Method
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {(['ScreenPrint', 'Embroidery', 'DTF', 'Other'] as ProductionMethod[]).map(method => {
                    const stats = performanceAnalytics.decorationStats[method];
                    const revenuePercent = performanceAnalytics.totalRevenue > 0
                      ? (stats.revenue / performanceAnalytics.totalRevenue) * 100 : 0;

                    return (
                      <div key={method} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-3 h-3 rounded-full ${getDecorationColor(method)}`} />
                          <span className="font-bold text-slate-700">{getDecorationLabel(method)}</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-slate-400 uppercase">Revenue</p>
                            <p className="text-xl font-black text-slate-900">${stats.revenue.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">{revenuePercent.toFixed(1)}% of total</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                            <div>
                              <p className="text-xs text-slate-400">Units</p>
                              <p className="text-lg font-bold text-slate-700">{stats.qty.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Orders</p>
                              <p className="text-lg font-bold text-slate-700">{stats.orders}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visual breakdown bar */}
                <div className="mt-6">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Revenue Distribution</p>
                  <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex">
                    {(['ScreenPrint', 'Embroidery', 'DTF', 'Other'] as ProductionMethod[]).map(method => {
                      const stats = performanceAnalytics.decorationStats[method];
                      const percent = performanceAnalytics.totalRevenue > 0
                        ? (stats.revenue / performanceAnalytics.totalRevenue) * 100 : 0;

                      if (percent === 0) return null;

                      return (
                        <div
                          key={method}
                          className={`${getDecorationColor(method)} h-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                          title={`${getDecorationLabel(method)}: ${percent.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2">
                    {(['ScreenPrint', 'Embroidery', 'DTF', 'Other'] as ProductionMethod[]).map(method => {
                      const stats = performanceAnalytics.decorationStats[method];
                      if (stats.revenue === 0) return null;
                      return (
                        <div key={method} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <div className={`w-2 h-2 rounded-full ${getDecorationColor(method)}`} />
                          {getDecorationLabel(method)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Package size={20} />
                  Top Products by Volume
                </h3>

                {performanceAnalytics.topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                          <th className="text-left py-3 px-4">Rank</th>
                          <th className="text-left py-3 px-4">SKU / Product</th>
                          <th className="text-right py-3 px-4">Units Sold</th>
                          <th className="text-right py-3 px-4">Revenue</th>
                          <th className="text-right py-3 px-4">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceAnalytics.topProducts.map((product, index) => (
                          <tr key={product.sku} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-900">{product.name}</p>
                              <p className="text-xs text-slate-400">{product.sku}</p>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {product.qty.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-green-600">
                              ${product.revenue.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500">
                              {((product.revenue / Math.max(performanceAnalytics.totalRevenue, 1)) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Package size={48} strokeWidth={1} className="mx-auto mb-4 opacity-50" />
                    <p>No product data available for this period</p>
                  </div>
                )}
              </div>

              {/* Summary Footer */}
              <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing data from <span className="font-bold">{new Date(dateRange.start).toLocaleDateString()}</span> to <span className="font-bold">{new Date(dateRange.end).toLocaleDateString()}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {ordersInRange.length} orders • {performanceAnalytics.totalUnits.toLocaleString()} units • ${performanceAnalytics.totalRevenue.toLocaleString()} revenue
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-8">
              {/* Date Range Picker */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="text-slate-400" size={20} />
                  <span className="text-sm font-medium text-slate-600">Date Range:</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  {[
                    { label: '7D', days: 7 },
                    { label: '30D', days: 30 },
                    { label: '90D', days: 90 },
                    { label: 'YTD', days: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)) }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setDateRange({
                        start: new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        end: new Date().toISOString().split('T')[0]
                      })}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Total Customers</span>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="text-blue-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{customerAnalytics.totals.totalCustomers}</p>
                  <p className="text-xs text-slate-400 mt-1">{ordersInRange.length} orders</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Total Quoted Value</span>
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <DollarSign className="text-indigo-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${customerAnalytics.totals.totalQuotedValue.toLocaleString()}</p>
                  <p className="text-xs text-indigo-600 mt-1">{customerAnalytics.totals.totalActiveQuotes} active quotes</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Total Order Value</span>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="text-green-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${customerAnalytics.totals.totalOrderValue.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">Active orders in production</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">Dead Leads Value</span>
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="text-red-600" size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">${customerAnalytics.totals.totalDeadLeadsValue.toLocaleString()}</p>
                  <p className="text-xs text-red-600 mt-1">Closed opportunities</p>
                </div>
              </div>

              {/* Customer Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Users size={20} />
                  Customer Analytics by Account
                </h3>

                {customerAnalytics.customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                          <th className="text-left py-3 px-4">Customer</th>
                          <th className="text-right py-3 px-4">Total Quoted Value</th>
                          <th className="text-right py-3 px-4">Total Order Value</th>
                          <th className="text-right py-3 px-4">Active Quotes/Leads</th>
                          <th className="text-right py-3 px-4">Dead Leads Value</th>
                          <th className="text-right py-3 px-4">Total Orders</th>
                          <th className="text-right py-3 px-4">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerAnalytics.customers.map((customer, index) => (
                          <tr key={customer.name} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                  index === 0 ? 'bg-blue-100 text-blue-700' :
                                  index === 1 ? 'bg-indigo-100 text-indigo-700' :
                                  index === 2 ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{customer.name}</p>
                                  <p className="text-xs text-slate-400">{customer.totalOrders} {customer.totalOrders === 1 ? 'order' : 'orders'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="font-bold text-indigo-600">${customer.quotedValue.toLocaleString()}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="font-bold text-green-600">${customer.orderValue.toLocaleString()}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                                {customer.activeQuotes}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="font-bold text-red-600">${customer.deadLeadsValue.toLocaleString()}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="font-bold text-slate-700">{customer.totalOrders}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="font-black text-slate-900">${customer.totalValue.toLocaleString()}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Users size={48} strokeWidth={1} className="mx-auto mb-4 opacity-50" />
                    <p>No customer data available for this period</p>
                  </div>
                )}
              </div>

              {/* Summary Footer */}
              <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing data from <span className="font-bold">{new Date(dateRange.start).toLocaleDateString()}</span> to <span className="font-bold">{new Date(dateRange.end).toLocaleDateString()}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {customerAnalytics.totals.totalCustomers} customers • {ordersInRange.length} orders • ${(customerAnalytics.totals.totalQuotedValue + customerAnalytics.totals.totalOrderValue).toLocaleString()} total value
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
