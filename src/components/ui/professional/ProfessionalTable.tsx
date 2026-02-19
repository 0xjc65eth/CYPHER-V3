'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface ProfessionalTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: string;
  onRowClick?: (row: T, index: number) => void;
  selectedRowKey?: string | null;
  stickyHeader?: boolean;
  dense?: boolean;
  striped?: boolean;
  hoverEffect?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    enabled: boolean;
    pageSize: number;
    showPageSizeSelector?: boolean;
  };
  exportable?: boolean;
  searchable?: boolean;
  className?: string;
}

export function ProfessionalTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  selectedRowKey = null,
  stickyHeader = true,
  dense = false,
  striped = true,
  hoverEffect = true,
  loading = false,
  emptyMessage = 'No data available',
  pagination,
  exportable = false,
  searchable = false,
  className = ''
}: ProfessionalTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 50);

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Process data (search, sort, paginate)
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchable && searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(row => {
        return columns.some(col => {
          if (!col.filterable) return false;
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(search);
        });
      });
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDir === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    // Pagination
    if (pagination?.enabled) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      result = result.slice(start, end);
    }

    return result;
  }, [data, searchTerm, sortKey, sortDir, currentPage, pageSize, columns, searchable, pagination]);

  const totalPages = pagination?.enabled
    ? Math.ceil(data.length / pageSize)
    : 1;

  // Export to CSV
  const handleExport = () => {
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        // Escape commas and quotes
        const escaped = String(value || '').replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`overflow-hidden rounded-terminal border border-gray-800 ${className}`}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="border-b border-gray-800 bg-gray-900/60 px-4 py-3">
            <div className="flex gap-4">
              {columns.map((col, i) => (
                <div key={i} className="h-3 bg-gray-800 rounded" style={{ width: col.width || 'auto' }} />
              ))}
            </div>
          </div>
          {/* Row skeletons */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border-b border-gray-800/50 px-4 py-3">
              <div className="flex gap-4">
                {columns.map((col, j) => (
                  <div key={j} className="h-3 bg-gray-800/50 rounded" style={{ width: col.width || 'auto' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex items-center justify-between gap-3 px-1">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/60 border-gray-800 text-sm h-9 font-mono"
              />
            </div>
          )}

          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2 border-gray-800 hover:border-orange-500/50 text-gray-400 hover:text-orange-400"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-terminal border border-gray-800 bg-black/40">
        <table className="w-full border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr className="bg-gray-900/80 backdrop-blur-sm border-b-2 border-orange-500/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sortable ? 'cursor-pointer hover:text-orange-400 transition-colors' : ''}
                    ${col.headerClassName || 'text-gray-400'}
                  `}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="opacity-60">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {processedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                processedData.map((row, rowIndex) => {
                  const rowKey = row[keyField];
                  const isSelected = selectedRowKey === rowKey;

                  return (
                    <motion.tr
                      key={rowKey}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => onRowClick?.(row, rowIndex)}
                      className={`
                        border-b border-gray-800/50 font-mono text-xs
                        ${striped && rowIndex % 2 === 1 ? 'bg-gray-900/20' : 'bg-transparent'}
                        ${hoverEffect ? 'hover:bg-orange-500/5 cursor-pointer transition-colors duration-150' : ''}
                        ${isSelected ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : ''}
                        ${dense ? 'h-8' : 'h-10'}
                      `}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`
                            px-4 py-2
                            ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                            ${col.className || 'text-gray-300'}
                          `}
                        >
                          {col.format
                            ? col.format(row[col.key], row, rowIndex)
                            : row[col.key]}
                        </td>
                      ))}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination?.enabled && totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-gray-500 font-mono">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 border-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-xs text-gray-400 font-mono min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 border-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {pagination.showPageSizeSelector && (
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-400 font-mono"
            >
              {[25, 50, 100, 200].map(size => (
                <option key={size} value={size}>{size} rows</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// Number formatting utilities
export const formatters = {
  price: (value: number, decimals: number = 8) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  currency: (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  },

  compact: (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  },

  percentage: (value: number, decimals: number = 2) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
  },

  number: (value: number) => {
    return value.toLocaleString('en-US');
  }
};

// Color-coded change indicator
export function ChangeIndicator({ value, showSign = true }: { value: number; showSign?: boolean }) {
  const isPositive = value >= 0;
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const sign = showSign && isPositive ? '+' : '';

  return (
    <span className={`${color} font-mono font-semibold`}>
      {sign}{value.toFixed(2)}%
    </span>
  );
}
