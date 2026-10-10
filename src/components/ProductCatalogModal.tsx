import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  Package,
  Lock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { ProductCatalogItem, ThemeMode } from '../types';
import { DEFAULT_PRODUCT_CATALOG } from '../constants/productCatalog';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItems: ProductCatalogItem[];
  canManageCatalog: boolean;
  onAddCatalogItem: (itemId: string, itemName: string) => Promise<void>;
  onDeleteCatalogItem: (item: ProductCatalogItem) => Promise<void>;
  themeMode: ThemeMode;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  catalogItems = [],
  canManageCatalog,
  onAddCatalogItem,
  onDeleteCatalogItem,
  themeMode,
}) => {
  const [newItemId, setNewItemId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = themeMode === 'dark';
  const isGrey = themeMode === 'grey';

  const combinedCatalog = useMemo(() => {
    const map = new Map<
      string,
      {
        id?: string;
        itemId: string;
        itemName: string;
        updatedByName: string;
        isCustom: boolean;
        rawDoc?: ProductCatalogItem;
      }
    >();

    DEFAULT_PRODUCT_CATALOG.forEach((d) => {
      map.set(d.itemId.toUpperCase(), {
        itemId: d.itemId.toUpperCase(),
        itemName: d.itemName,
        updatedByName: 'Built-in Default',
        isCustom: false,
      });
    });

    (catalogItems || []).forEach((c) => {
      if (c.itemId && c.itemName) {
        map.set(c.itemId.toUpperCase(), {
          id: c.id,
          itemId: c.itemId.toUpperCase(),
          itemName: c.itemName,
          updatedByName: c.updatedByName || 'Admin',
          isCustom: true,
          rawDoc: c,
        });
      }
    });

    const list = Array.from(map.values());
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (i) =>
        i.itemId.toLowerCase().includes(q) ||
        i.itemName.toLowerCase().includes(q)
    );
  }, [catalogItems, search]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCatalog) {
      setError('Only Admin or Backoffice employees with Admin permission can add/update Item IDs.');
      return;
    }
    const cleanId = newItemId.trim().toUpperCase();
    const cleanName = newItemName.trim();
    if (!cleanId || !cleanName) {
      setError('Both Item ID and Item Name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddCatalogItem(cleanId, cleanName);
      setNewItemId('');
      setNewItemName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to save Item ID.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = `w-full px-3.5 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
      : isGrey
      ? 'bg-zinc-100 border-zinc-400 text-zinc-900 placeholder-zinc-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div
        className={`w-full max-w-4xl rounded-xl border overflow-hidden my-8 ${
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
            <Package className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-base font-bold">
                Item ID & Product Name Master Catalog (Auto-Fill Directory)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When any Item ID from this catalog is typed in a PO, its Product Name auto-fills immediately.
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

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add / Update Item Form (Permitted only for Admin or Backoffice with Admin Permission) */}
          {canManageCatalog ? (
            <form
              onSubmit={handleAdd}
              className={`p-4 rounded-xl border space-y-3 ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-200/70 border-zinc-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Add or Update Master Item ID & Product Name</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Catalog Write Permission Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold mb-1">
                    Item ID / SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value.toUpperCase())}
                    placeholder="e.g. SKU-2050"
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold mb-1">
                    Product / Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Cold Pressed Coconut Oil 1L"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving...' : 'Add / Save'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                <strong>Read-Only Catalog View:</strong> Only Admin or Backoffice employees granted <strong>"Item ID & Product Name Master (Add / Delete)"</strong> permission by Admin can add or delete items here.
              </span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Catalog by Item ID or Product Name..."
              className={`${inputClass} pl-9`}
            />
          </div>

          {/* Catalog Table */}
          <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-semibold ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                        : isGrey
                        ? 'bg-zinc-200 border-zinc-300 text-zinc-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-2.5 px-4">Item ID (SKU)</th>
                    <th className="py-2.5 px-4">Product / Item Name</th>
                    <th className="py-2.5 px-4">Added / Updated By</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {combinedCatalog.map((item) => (
                    <tr
                      key={item.itemId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">
                        {item.itemId}
                      </td>
                      <td className="py-2.5 px-4 font-medium">{item.itemName}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {item.updatedByName}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {item.isCustom && item.rawDoc ? (
                          canManageCatalog ? (
                            <button
                              type="button"
                              onClick={() => onDeleteCatalogItem(item.rawDoc!)}
                              className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 inline-flex items-center gap-1 cursor-pointer"
                              title="Delete Item ID from Catalog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-semibold">Delete</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Locked
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400">Default SKU</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
