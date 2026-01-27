
import React from 'react';
import { ShoppingBag, Box, Settings, Shirt, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeView: 'orders' | 'settings' | 'reports' | 'fulfillment';
  onSettingsClick: () => void;
  onOrdersClick: () => void;
  onReportsClick: () => void;
  onFulfillmentClick: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSettingsClick, onOrdersClick, onReportsClick, onFulfillmentClick, isMobileOpen, onMobileClose }) => {
  const { permissions, logout, currentUser } = useAuth();

  const items = [
    { icon: ShoppingBag, label: 'Orders', active: activeView === 'orders', onClick: onOrdersClick, visible: true },
    { icon: BarChart3, label: 'Reports', active: activeView === 'reports', onClick: onReportsClick, visible: permissions.canViewReports },
    { icon: Box, label: 'Fulfillment', active: activeView === 'fulfillment', onClick: onFulfillmentClick, visible: permissions.canAccessFulfillmentTracking },
    { icon: Settings, label: 'Settings', active: activeView === 'settings', onClick: onSettingsClick, visible: permissions.canAccessSettings },
  ].filter(item => item.visible);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-20 bg-slate-900 h-full flex flex-col items-center py-6
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="text-blue-400 mb-4">
          <Shirt size={32} />
        </div>
        <div className="flex flex-col items-center gap-4 flex-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              title={item.label}
              className={`p-3 rounded-xl transition-all ${
                item.active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon size={24} />
            </button>
          ))}
        </div>

        {/* User info and Sign Out */}
        <div className="mt-auto flex flex-col items-center gap-3 pt-4 border-t border-slate-700">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm" title={currentUser?.displayName}>
            {currentUser?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
