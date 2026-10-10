import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Edit3,
  ShieldCheck,
  Building2,
  Warehouse,
  Truck,
  Printer,
  CheckCircle2,
  Lock,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  EmployeeProfile,
  TeamRole,
  EmployeePermissions,
  ThemeMode,
} from '../types';

export interface EmployeeFormValues {
  uid?: string;
  employeeName: string;
  employeeId: string;
  email: string;
  role: TeamRole;
  accessStatus: 'APPROVED' | 'RESTRICTED';
  permissions: EmployeePermissions;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: EmployeeFormValues) => Promise<void>;
  initialEmployee: EmployeeProfile | null;
  themeMode: ThemeMode;
}

export function getDefaultPermissionsForRole(role: TeamRole): EmployeePermissions {
  switch (role) {
    case 'admin':
      return {
        canEditPo: true,
        canManageCatalog: true,
        canManageLogistics: true,
        canVerifyPrint: true,
        canManageGrn: true,
        canManageDn: true,
      };
    case 'backoffice':
      return {
        canEditPo: true,
        canManageCatalog: true,
        canManageLogistics: true,
        canVerifyPrint: true,
        canManageGrn: true,
        canManageDn: true,
      };
    case 'logistics':
      return {
        canEditPo: false,
        canManageCatalog: false,
        canManageLogistics: true,
        canVerifyPrint: false,
        canManageGrn: false,
        canManageDn: true,
      };
    case 'print':
      return {
        canEditPo: false,
        canManageCatalog: false,
        canManageLogistics: false,
        canVerifyPrint: true,
        canManageGrn: false,
        canManageDn: false,
      };
    case 'warehouse':
    default:
      return {
        canEditPo: false,
        canManageCatalog: false,
        canManageLogistics: false,
        canVerifyPrint: false,
        canManageGrn: true,
        canManageDn: true,
      };
  }
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
  themeMode,
}) => {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('backoffice');
  const [accessStatus, setAccessStatus] = useState<'APPROVED' | 'RESTRICTED'>('APPROVED');
  const [permissions, setPermissions] = useState<EmployeePermissions>(
    getDefaultPermissionsForRole('backoffice')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = themeMode === 'dark';
  const isGrey = themeMode === 'grey';

  useEffect(() => {
    if (initialEmployee) {
      const defaults = getDefaultPermissionsForRole(initialEmployee.role || 'backoffice');
      setEmployeeName(initialEmployee.employeeName || '');
      setEmployeeId(initialEmployee.employeeId || '');
      setEmail(initialEmployee.email || '');
      setRole(initialEmployee.role || 'backoffice');
      setAccessStatus(initialEmployee.accessStatus || 'APPROVED');
      setPermissions({
        ...defaults,
        ...(initialEmployee.permissions || {}),
      });
    } else {
      setEmployeeName('');
      setEmployeeId('');
      setEmail('');
      setRole('backoffice');
      setAccessStatus('APPROVED');
      setPermissions(getDefaultPermissionsForRole('backoffice'));
    }
    setError(null);
  }, [initialEmployee, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: TeamRole) => {
    setRole(newRole);
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const togglePermission = (key: keyof EmployeePermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = employeeName.trim();
    const trimmedId = employeeId.trim().replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();

    if (trimmedName.length < 2) {
      setError('Employee Name is required (minimum 2 characters).');
      return;
    }
    if (trimmedId.length < 2) {
      setError('Employee ID is required (e.g. EMP-105).');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        uid: initialEmployee?.uid,
        employeeName: trimmedName,
        employeeId: trimmedId,
        email: email.trim(),
        role,
        accessStatus,
        permissions,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save employee record.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full px-3.5 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
      : isGrey
      ? 'bg-zinc-100 border-zinc-400 text-zinc-900 placeholder-zinc-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  const roleOptions: { id: TeamRole; label: string; icon: React.ReactNode }[] = [
    { id: 'admin', label: 'Admin Department', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'backoffice', label: 'Backoffice Department', icon: <Building2 className="w-4 h-4" /> },
    { id: 'logistics', label: 'Logistics Department', icon: <Truck className="w-4 h-4" /> },
    { id: 'print', label: 'Print Verification Team', icon: <Printer className="w-4 h-4" /> },
    { id: 'warehouse', label: 'Warehouse / GRN Team', icon: <Warehouse className="w-4 h-4" /> },
  ];

  const permissionItems: { key: keyof EmployeePermissions; label: string; desc: string }[] = [
    {
      key: 'canEditPo',
      label: 'PO Entry & Edit Access',
      desc: 'Create & edit POs, multi-item SKUs, and PO expiry dates',
    },
    {
      key: 'canManageCatalog',
      label: 'Item ID & Product Name Master (Add / Delete)',
      desc: 'Allow Backoffice/Employee to add or delete master Item IDs & Product Names',
    },
    {
      key: 'canManageLogistics',
      label: 'Logistics & Tracking Access',
      desc: 'Update Logistics Partner, Pickup Tracking ID, PUC, ASN & Pickup Status',
    },
    {
      key: 'canVerifyPrint',
      label: 'Print Team Verification Access',
      desc: 'Verify documents (YES / NO) and print PDF / Excel PO slips',
    },
    {
      key: 'canManageGrn',
      label: 'GRN & Inward Access',
      desc: 'Mark Inward Success -> GRN and update GRN numbers',
    },
    {
      key: 'canManageDn',
      label: 'DN Tracker Access',
      desc: 'Log and update Discrepancy Notes (DN) and upload reports',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-xl border overflow-hidden my-8 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark
              ? 'border-slate-800 bg-slate-900'
              : isGrey
              ? 'border-zinc-300 bg-zinc-200'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {initialEmployee ? (
              <Edit3 className="w-5 h-5 text-orange-500" />
            ) : (
              <UserPlus className="w-5 h-5 text-orange-500" />
            )}
            <div>
              <h3 className="text-base font-bold">
                {initialEmployee
                  ? `Edit Employee & Permissions — ${initialEmployee.employeeName}`
                  : 'Admin: Add New Employee & Assign Permissions'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assign department role, approve/restrict account access, and configure module & Item Master permissions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Employee Name *
              </label>
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="e.g. EMP-204"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Email ID (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@company.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Select Department */}
          <div>
            <label className="block text-xs font-semibold mb-2">
              Assign Department / Team Role *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {roleOptions.map((opt) => {
                const selected = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleRoleChange(opt.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      selected
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold'
                        : isDark
                        ? 'border-slate-800 bg-slate-800/60 text-slate-300'
                        : isGrey
                        ? 'border-zinc-300 bg-zinc-200/70 text-zinc-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.icon}
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Access Status */}
          <div>
            <label className="block text-xs font-semibold mb-2">
              Portal Access Status *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccessStatus('APPROVED')}
                className={`p-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  accessStatus === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-300 dark:border-slate-700 opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVED (Active Portal Access)</span>
              </button>
              <button
                type="button"
                onClick={() => setAccessStatus('RESTRICTED')}
                className={`p-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  accessStatus === 'RESTRICTED'
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-slate-300 dark:border-slate-700 opacity-60'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>RESTRICTED (Read-Only / Blocked)</span>
              </button>
            </div>
          </div>

          {/* Granular Module Permissions */}
          <div
            className={`p-4 rounded-xl border space-y-2.5 ${
              isDark
                ? 'bg-slate-950/60 border-slate-800'
                : isGrey
                ? 'bg-zinc-200/70 border-zinc-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Granular Employee Permissions (Admin Control)
            </div>
            <div className="space-y-2">
              {permissionItems.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer ${
                    isDark
                      ? 'bg-slate-900 border-slate-800'
                      : isGrey
                      ? 'bg-zinc-100 border-zinc-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(permissions[item.key])}
                    onChange={() => togglePermission(item.key)}
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Saving...'
                  : initialEmployee
                  ? 'Save Employee Changes'
                  : 'Create Employee & Grant Access'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
