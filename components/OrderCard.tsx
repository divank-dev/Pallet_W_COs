import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock, User, DollarSign, Zap, Target, Calendar, ThermometerSun } from 'lucide-react';
import { Order, ViewMode, STAGE_NUMBER } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface OrderCardProps {
  order: Order;
  viewMode: ViewMode;
  onClick: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, viewMode, onClick }) => {
  const { currentUser } = useAuth();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(order.createdAt).getTime();
      setElapsedMinutes(Math.floor(diff / (1000 * 60)));
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const isLead = order.status === 'Lead';
  const isQuote = order.status === 'Quote';
  const slaCritical = isQuote && elapsedMinutes > 120; // 2 hours

  // Art pending warning: show if past stage 3 and art is still pending
  const isArtPendingWarning = order.artStatus === 'Pending' && STAGE_NUMBER[order.status] > 3;

  const formatElapsedTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalPrice = order.lineItems.reduce((acc, li) => acc + (li.price * li.qty), 0);

  // Lead-specific formatting
  const getTemperatureColor = (temp?: string) => {
    switch (temp) {
      case 'Hot': return 'bg-red-100 text-red-700 border-red-200';
      case 'Warm': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Cold': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Lead Card variant
  if (isLead) {
    return (
      <div
        onClick={() => onClick(order)}
        className="bg-white border border-emerald-200 rounded-xl p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
      >
        {/* Lead Temperature Badge */}
        <div className="absolute top-0 right-0">
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b ${getTemperatureColor(order.leadInfo?.temperature)}`}>
            <span className="flex items-center gap-1">
              <ThermometerSun size={10} />
              {order.leadInfo?.temperature || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 group-hover:text-emerald-600 transition-colors">
              {order.projectName}
            </h3>
            <p className="text-slate-500 text-sm flex items-center gap-1.5">
              <User size={14} /> {order.customer}
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            {order.orderNumber}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {/* Source */}
          <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            <Target size={12} />
            {order.leadInfo?.source || 'Unknown'}
          </div>

          {/* Follow-up date if set */}
          {order.leadInfo?.followUpDate && (
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar size={12} />
              Follow-up: {new Date(order.leadInfo.followUpDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Product Interest */}
        {order.leadInfo?.productInterest && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
            {order.leadInfo.productInterest}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock size={12} />
            {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days old
          </div>
          {viewMode === 'Sales' && (
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-slate-400 uppercase">Est. Value</div>
              <div className="flex items-center text-emerald-700 font-bold">
                <DollarSign size={16} />
                {(order.leadInfo?.estimatedValue || 0).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Estimated Quantity */}
        {order.leadInfo?.estimatedQuantity ? (
          <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-xs">
            <span className="text-slate-400">Est. Quantity:</span>
            <span className="font-bold text-slate-700">{order.leadInfo.estimatedQuantity} units</span>
          </div>
        ) : null}
      </div>
    );
  }

  // Standard Order Card
  return (
    <div
      onClick={() => onClick(order)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
    >
      {/* Badges - positioned top-right */}
      <div className="absolute top-0 right-0 flex gap-0">
        {order.rushOrder && (
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <Zap size={10} /> RUSH
          </div>
        )}
        {isArtPendingWarning && (
          <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
            <AlertCircle size={10} /> ART PENDING
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 group-hover:text-blue-600 transition-colors">
            {order.projectName}
          </h3>
          <p className="text-slate-500 text-sm flex items-center gap-1.5">
            <User size={14} /> {order.customer}
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
          {order.orderNumber}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {isQuote && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
            slaCritical ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-green-50 text-green-600 border border-green-100'
          }`}>
            <Clock size={12} />
            {formatElapsedTime(elapsedMinutes)}
          </div>
        )}
        {order.isChangeOrder && (
          <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            Change Order
          </div>
        )}
        {order.changeOrderIds && order.changeOrderIds.length > 0 && (
          <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            {order.changeOrderIds.length} CO{order.changeOrderIds.length !== 1 ? 's' : ''}
          </div>
        )}
        {order.dueDate && (
          <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Due: {new Date(order.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="text-xs text-slate-400">
          {order.lineItems.length} items
        </div>
        {viewMode === 'Sales' && currentUser?.role !== 'Production' && (
          <div className="flex items-center text-blue-700 font-bold">
            <DollarSign size={16} />
            {totalPrice.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
