
import React from 'react';
import { Plus, ChevronRight, Target, Archive, Monitor, XCircle } from 'lucide-react';
import { OrderStatus } from '../types';
import { ORDER_STAGES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface WorkflowSidebarProps {
  currentStage: OrderStatus;
  counts: Record<OrderStatus, number>;
  deadOpportunitiesCount?: number;
  onStageSelect: (stage: OrderStatus) => void;
  onNewOrder: () => void;
  onNewChangeOrder?: () => void;
  onDeadOpportunitiesClick?: () => void;
  isDeadOpportunitiesActive?: boolean;
  onProductionFloorClick?: () => void;
  isProductionFloorActive?: boolean;
}

const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({ currentStage, counts, deadOpportunitiesCount = 0, onStageSelect, onNewOrder, onNewChangeOrder, onDeadOpportunitiesClick, isDeadOpportunitiesActive, onProductionFloorClick, isProductionFloorActive }) => {
  const { permissions, currentUser } = useAuth();

  // Filter stages based on user role
  const getVisibleStages = () => {
    // Production role: only show stages 3-8 (Approval through Production)
    // Indices 2-7 in ORDER_STAGES array
    if (currentUser?.role === 'Production') {
      return ORDER_STAGES.slice(2, 8); // Approval, Art Confirmation, Inventory Order, Production Prep, Inventory Received, Production
    }

    // All other roles: show all stages
    return ORDER_STAGES;
  };

  const visibleStages = getVisibleStages();

  // Separate Lead from the rest of the workflow stages (if visible)
  const leadStage = visibleStages[0]; // First stage in visible list
  const workflowStages = visibleStages.slice(1); // Everything else
  const showLeadSection = currentUser?.role !== 'Production'; // Production doesn't see Lead

  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
      {permissions.canCreateOrders && (
        <div className="p-6 space-y-3">
          <button
            onClick={onNewOrder}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={20} />
            New Lead / Order
          </button>
          {onNewChangeOrder && (
            <button
              onClick={onNewChangeOrder}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={20} />
              New Change Order
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {/* Sales Funnel Section - Only show for non-Production users */}
        {showLeadSection && (
          <>
            <div className="px-3 mb-2 text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
              <Target size={12} />
              Sales Funnel
            </div>
            <nav className="space-y-1 mb-4">
              <button
                onClick={() => onStageSelect(leadStage)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  currentStage === leadStage && !isDeadOpportunitiesActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    currentStage === leadStage && !isDeadOpportunitiesActive ? 'bg-emerald-600' : 'bg-slate-300'
                  }`} />
                  <span className="text-sm font-medium">{leadStage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    currentStage === leadStage && !isDeadOpportunitiesActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {counts[leadStage] || 0}
                  </span>
                  <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    currentStage === leadStage && !isDeadOpportunitiesActive ? 'text-emerald-400' : 'text-slate-300'
                  }`} />
                </div>
              </button>

              {/* Dead Opportunities */}
              <button
                onClick={onDeadOpportunitiesClick}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  isDeadOpportunitiesActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    isDeadOpportunitiesActive
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-500'
                  }`}>
                    <XCircle size={12} />
                  </div>
                  <span className="text-sm font-medium">Dead Opportunities</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isDeadOpportunitiesActive ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-500'
                  }`}>
                    {deadOpportunitiesCount}
                  </span>
                  <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDeadOpportunitiesActive ? 'text-red-400' : 'text-slate-300'
                  }`} />
                </div>
              </button>
            </nav>

            {/* Divider */}
            <div className="mx-3 border-t border-slate-200 my-3" />
          </>
        )}

        {/* Workflow Section */}
        <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Order Workflow
        </div>
        <nav className="space-y-1">
          {workflowStages.map((stage, index) => (
            <button
              key={stage}
              onClick={() => onStageSelect(stage)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                currentStage === stage
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  currentStage === stage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-400 border-slate-300'
                }`}>
                  {index + 1}
                </div>
                <span className="text-sm font-medium">{stage}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  currentStage === stage ? 'bg-blue-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[stage] || 0}
                </span>
                <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                  currentStage === stage ? 'text-blue-400' : 'text-slate-300'
                }`} />
              </div>
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 border-t border-slate-200 my-3" />

        {/* Closed Orders Section - Only show for non-Production users */}
        {showLeadSection && (
          <>
            <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Archive size={12} />
              Closed
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => onStageSelect('Closed')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  currentStage === 'Closed'
                    ? 'bg-slate-100 text-slate-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    currentStage === 'Closed'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    <Archive size={12} />
                  </div>
                  <span className="text-sm font-medium">Closed Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    currentStage === 'Closed' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {counts['Closed'] || 0}
                  </span>
                  <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    currentStage === 'Closed' ? 'text-slate-400' : 'text-slate-300'
                  }`} />
                </div>
              </button>
            </nav>
          </>
        )}

        {/* Operations Section - only show if user can access Production Floor */}
        {permissions.canAccessProductionFloor && (
          <>
            {/* Divider */}
            <div className="mx-3 border-t border-slate-200 my-3" />

            <div className="px-3 mb-2 text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
              <Monitor size={12} />
              Operations
            </div>
            <nav className="space-y-1">
              <button
                onClick={onProductionFloorClick}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                  isProductionFloorActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    isProductionFloorActive
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-500'
                  }`}>
                    <Monitor size={12} />
                  </div>
                  <span className="text-sm font-medium">Production Floor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isProductionFloorActive ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-500'
                  }`}>
                    TV
                  </span>
                  <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    isProductionFloorActive ? 'text-purple-400' : 'text-slate-300'
                  }`} />
                </div>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowSidebar;
