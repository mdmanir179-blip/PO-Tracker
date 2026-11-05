import React, { useState } from 'react';
import {
  Plus,
  Truck,
  Printer,
  PackageCheck,
  RotateCcw,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  CreditCard,
  Users,
  ShieldCheck,
  ChevronRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { ActiveTab, PurchaseOrder, DnRecord } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onNewPo: () => void;
  purchaseOrders: PurchaseOrder[];
  rtoCount: number;
  grnCount: number;
  logisticsAlertCount: number;
  darkMode: boolean;
  isGrey: boolean;
  isDrawerOpen?: boolean;
  onToggleDrawer?: (open: boolean) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onNewPo,
  purchaseOrders,
  rtoCount,
  grnCount,
  logisticsAlertCount,
  darkMode,
  isGrey,
  isDrawerOpen: externalDrawerOpen,
  onToggleDrawer,
}) => {
  const [internalMoreOpen, setInternalMoreOpen] = useState(false);
  const isMoreOpen = externalDrawerOpen !== undefined ? externalDrawerOpen : internalMoreOpen;
  const setMoreOpen = (open: boolean) => {
    if (onToggleDrawer) {
      onToggleDrawer(open);
    } else {
      setInternalMoreOpen(open);
    }
  };

  const poEntryCount = purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY').length;
  const inTransitCount = purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT').length;

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar on Mobile Only (< md) */}
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t-2 border-orange-500/30 px-1 sm:px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors shadow-[0_-4px_25px_rgba(0,0,0,0.3)] ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* 1. New PO Button (Prominent Action Button) */}
          <button
            type="button"
            onClick={onNewPo}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 group cursor-pointer"
            title="Create New Purchase Order"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30 group-active:scale-95 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-bold mt-1 text-orange-600 dark:text-orange-400">
              New PO
            </span>
          </button>

          {/* 2. Logistics Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('LOGISTICS')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 relative transition-colors cursor-pointer ${
              activeTab === 'LOGISTICS'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Logistics & Delivery"
          >
            <div className="relative">
              <Truck
                className={`w-5 h-5 ${
                  activeTab === 'LOGISTICS' ? 'stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
              {logisticsAlertCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                  {logisticsAlertCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium ${
                activeTab === 'LOGISTICS' ? 'font-bold' : ''
              }`}
            >
              Logistics
            </span>
            {activeTab === 'LOGISTICS' && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
            )}
          </button>

          {/* 3. Printing Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('PRINT_TEAM')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors cursor-pointer ${
              activeTab === 'PRINT_TEAM'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Print Team & Barcodes"
          >
            <Printer
              className={`w-5 h-5 ${
                activeTab === 'PRINT_TEAM' ? 'stroke-[2.5]' : 'stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] mt-1 font-medium ${
                activeTab === 'PRINT_TEAM' ? 'font-bold' : ''
              }`}
            >
              Printing
            </span>
            {activeTab === 'PRINT_TEAM' && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
            )}
          </button>

          {/* 4. GRN Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('GRN')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 relative transition-colors cursor-pointer ${
              activeTab === 'GRN'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="GRN Goods Receipt Note"
          >
            <div className="relative">
              <PackageCheck
                className={`w-5 h-5 ${
                  activeTab === 'GRN' ? 'stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
              {grnCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                  {grnCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium ${
                activeTab === 'GRN' ? 'font-bold' : ''
              }`}
            >
              GRN
            </span>
            {activeTab === 'GRN' && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
            )}
          </button>

          {/* 5. RTO Management Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('RTO_TRACKER')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 relative transition-colors cursor-pointer ${
              activeTab === 'RTO_TRACKER'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="RTO Return to Origin"
          >
            <div className="relative">
              <RotateCcw
                className={`w-5 h-5 ${
                  activeTab === 'RTO_TRACKER' ? 'stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
              {rtoCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-orange-600 text-white text-[9px] font-bold">
                  {rtoCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium ${
                activeTab === 'RTO_TRACKER' ? 'font-bold' : ''
              }`}
            >
              RTO
            </span>
            {activeTab === 'RTO_TRACKER' && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
            )}
          </button>

          {/* 6. More Menu Drawer Button */}
          <button
            type="button"
            onClick={() => setMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors cursor-pointer ${
              isMoreOpen
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="All Navigation Tabs"
          >
            <Menu className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] mt-1 font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Bottom Sheet Drawer (< md) */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden bg-black/60 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className={`w-full max-h-[80vh] rounded-t-3xl border-t p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl overflow-y-auto space-y-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : isGrey
                ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <h3 className="font-bold text-sm">All Workspaces & Tabs</h3>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Workspaces */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleTabClick('DASHBOARD')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-orange-500" />
                  <span>Dashboard</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('PO_ENTRY')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'PO_ENTRY'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-500" />
                  <span>01. PO Entry ({poEntryCount})</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('IN_TRANSIT')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'IN_TRANSIT'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>02. In Transit ({inTransitCount})</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('DN_TRACKER')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'DN_TRACKER'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>04. DN Tracker</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('PAYMENTS')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'PAYMENTS'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>PO Payments</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('POC_DIRECTORY')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'POC_DIRECTORY'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>POC Team</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('ADMIN_AUDIT')}
                className={`col-span-2 p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  activeTab === 'ADMIN_AUDIT'
                    ? 'bg-orange-600/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                  <span>05. Admin & Staff Controls</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
