import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  darkMode?: boolean;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  darkMode = false,
  itemLabel = 'records',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems === 0) {
    return null;
  }

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with intelligent truncation
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [];
    pages.push(1);
    if (safePage > 3) {
      pages.push('ellipsis');
    }
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) {
      pages.push('ellipsis');
    }
    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t text-xs select-none transition-colors ${
        darkMode
          ? 'border-slate-800 bg-slate-900/50 text-slate-300'
          : 'border-slate-200 bg-slate-50/60 text-slate-600'
      }`}
    >
      {/* Item Range Info */}
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold font-mono text-orange-600 dark:text-orange-400">{startItem}</span> to{' '}
          <span className="font-semibold font-mono text-orange-600 dark:text-orange-400">{endItem}</span> of{' '}
          <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{totalItems}</span> {itemLabel}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1 ml-2 text-[11px] text-slate-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={`px-1.5 py-0.5 rounded border text-xs bg-transparent cursor-pointer ${
                darkMode ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700'
              }`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            title="First Page"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              darkMode
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-white text-slate-700 shadow-xs'
            }`}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Prev Page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            title="Previous Page"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              darkMode
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-white text-slate-700 shadow-xs'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Numeric Page Buttons */}
          <div className="flex items-center gap-1 mx-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span key={`ell-${idx}`} className="px-1.5 py-1 text-slate-400">
                    …
                  </span>
                );
              }
              const isActive = p === safePage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs'
                      : darkMode
                      ? 'border border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'border border-slate-300 hover:bg-white text-slate-700 shadow-xs'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages}
            title="Next Page"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              darkMode
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-white text-slate-700 shadow-xs'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage === totalPages}
            title="Last Page"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              darkMode
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-white text-slate-700 shadow-xs'
            }`}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
