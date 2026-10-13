import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { AppNotification, NotificationType, WorkflowStage } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onSelectPo: (poNumber: string, stage: WorkflowStage) => void;
  onDismissNotification: (id: string) => void;
  onDismissAll: () => void;
  darkMode: boolean;
  isGrey: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hasBrowserNotificationPermission: boolean;
  onRequestBrowserNotification: () => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onSelectPo,
  onDismissNotification,
  onDismissAll,
  darkMode,
  isGrey,
  soundEnabled,
  onToggleSound,
  hasBrowserNotificationPermission,
  onRequestBrowserNotification,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'ALL' | 'EXPIRED' | 'APPOINTMENT' | 'SOON'>('ALL');

  if (!isOpen) return null;

  const expiredCount = notifications.filter(
    (n) => n.type === 'EXPIRED' || n.type === 'EXPIRING_TODAY'
  ).length;

  const appointmentTodayCount = notifications.filter(
    (n) => n.type === 'APPOINTMENT_TODAY'
  ).length;

  const soonCount = notifications.filter(
    (n) => n.type === 'EXPIRING_SOON' || n.type === 'APPOINTMENT_TOMORROW'
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'EXPIRED') return n.type === 'EXPIRED' || n.type === 'EXPIRING_TODAY';
    if (filter === 'APPOINTMENT') return n.type === 'APPOINTMENT_TODAY';
    if (filter === 'SOON') return n.type === 'EXPIRING_SOON' || n.type === 'APPOINTMENT_TOMORROW';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg mt-14 sm:mt-16 rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
            darkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Ops Alerts & Notifications</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-600 text-white">
                  {notifications.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live Date Expiry Warnings & Today's Warehouse Appointments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio chime toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Notification Chime' : 'Unmute Notification Chime'}
              className={`p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                soundEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action strip: Browser permission + Clear all */}
        <div
          className={`px-4 sm:px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
            darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}
        >
          {!hasBrowserNotificationPermission ? (
            <button
              type="button"
              onClick={onRequestBrowserNotification}
              className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Desktop Push Alerts</span>
            </button>
          ) : (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Desktop Alerts Active</span>
            </span>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onDismissAll}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer font-medium"
            >
              Dismiss All ({notifications.length})
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-4 sm:px-5 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              filter === 'ALL'
                ? 'bg-orange-600 text-white'
                : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('APPOINTMENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
              filter === 'APPOINTMENT'
                ? 'bg-amber-600 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Today's Appointments ({appointmentTodayCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('EXPIRED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
              filter === 'EXPIRED'
                ? 'bg-red-600 text-white'
                : 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Expired POs ({expiredCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('SOON')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
              filter === 'SOON'
                ? 'bg-yellow-600 text-white'
                : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Upcoming ({soonCount})</span>
          </button>
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold">All Clear!</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active date expiry warnings or pending appointments in this filter.
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isExpired = n.type === 'EXPIRED' || n.type === 'EXPIRING_TODAY';
              const isTodayApt = n.type === 'APPOINTMENT_TODAY';

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isExpired
                      ? 'border-red-500/40 bg-red-500/10'
                      : isTodayApt
                      ? 'border-amber-500/40 bg-amber-500/10 shadow-xs'
                      : n.severity === 'warning'
                      ? 'border-yellow-500/40 bg-yellow-500/10'
                      : darkMode
                      ? 'border-slate-800 bg-slate-950/60'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isExpired
                            ? 'bg-red-500 text-white'
                            : isTodayApt
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isTodayApt ? (
                          <Calendar className="w-4 h-4" />
                        ) : isExpired ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isExpired
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                : isTodayApt
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {n.type.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                            {n.poNumber}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold mt-1 text-slate-900 dark:text-white">
                          {n.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDismissNotification(n.id)}
                      title="Dismiss this notification"
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]">
                      {n.warehouseName}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectPo(n.poNumber, n.targetStage);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        isExpired
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : isTodayApt
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-orange-600 hover:bg-orange-500 text-white'
                      }`}
                    >
                      <span>View PO & Shift Tab</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
