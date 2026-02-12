'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  TableColumn, 
  SortConfig, 
  PaginationConfig, 
  TableLoadingState,
  ExportConfig
} from '@/types/runes-tables';

interface BaseTableProps {
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  error?: string;
  sortConfig?: SortConfig;
  pagination?: PaginationConfig;
  onSort?: (config: SortConfig) => void;
  onPageChange?: (page: number) => void;
  onExport?: (config: ExportConfig) => void;
  className?: string;
  showExport?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
}

export const BaseTable: React.FC<BaseTableProps> = ({
  data,
  columns,
  loading = false,
  error,
  sortConfig,
  pagination,
  onSort,
  onPageChange,
  onExport,
  className = '',
  showExport = true,
  showPagination = true,
  emptyMessage = 'No data available'
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleSort = useCallback((columnKey: string) => {
    if (!onSort) return;
    
    const newDirection = 
      sortConfig?.key === columnKey && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    
    onSort({ key: columnKey, direction: newDirection });
  }, [sortConfig, onSort]);

  const formatCellValue = useCallback((value: any, column: TableColumn) => {
    if (value === null || value === undefined) return '-';

    switch (column.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: value < 1 ? 6 : 2,
          maximumFractionDigits: value < 1 ? 6 : 2
        }).format(value);
      
      case 'percentage':
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return (
          <span className={`${numValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {numValue >= 0 ? '+' : ''}{numValue.toFixed(2)}%
          </span>
        );
      
      case 'number':
        if (typeof value === 'number') {
          return new Intl.NumberFormat('en-US').format(value);
        }
        return value;
      
      case 'date':
        return new Date(value).toLocaleString();
      
      case 'address':
        const addr = value.toString();
        return (
          <span 
            className="font-mono text-xs cursor-pointer hover:text-blue-400 transition-colors"
            title={addr}
            onClick={() => navigator.clipboard.writeText(addr)}
          >
            {addr.slice(0, 6)}...{addr.slice(-4)}
          </span>
        );
      
      case 'hash':
        const hash = value.toString();
        return (
          <span 
            className="font-mono text-xs cursor-pointer hover:text-blue-400 transition-colors"
            title={hash}
            onClick={() => navigator.clipboard.writeText(hash)}
          >
            {hash.slice(0, 8)}...{hash.slice(-8)}
          </span>
        );
      
      default:
        return value;
    }
  }, []);

  const renderSortIcon = useCallback((columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <svg className="w-3 h-3 ml-1 opacity-50" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }, [sortConfig]);

  const renderPagination = useCallback(() => {
    if (!showPagination || !pagination || !onPageChange) return null;

    const { page, total, pageSize } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800/30 border-t border-gray-700/50">
        <div className="flex items-center text-sm text-gray-400">
          Showing {startItem}-{endItem} of {total.toLocaleString()} results
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = page <= 3 ? i + 1 : page - 2 + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    pageNum === page 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  }, [showPagination, pagination, onPageChange]);

  const renderLoadingSkeleton = useCallback(() => (
    <div className="animate-pulse">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="flex space-x-4 py-4 px-6 border-b border-gray-700/30">
          {columns.map((column, j) => (
            <div 
              key={j} 
              className="h-4 bg-gray-700/50 rounded flex-1"
              style={{ width: column.width || 'auto' }}
            />
          ))}
        </div>
      ))}
    </div>
  ), [columns]);

  if (error) {
    return (
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="text-red-400 text-lg mb-2">Error loading data</div>
          <div className="text-gray-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden ${className}`}>
      {/* Export Controls */}
      {showExport && onExport && (
        <div className="flex justify-end p-4 border-b border-gray-700/50">
          <div className="flex space-x-2">
            <button
              onClick={() => onExport({ format: 'csv', includeColumns: columns.map(c => c.key) })}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => onExport({ format: 'json', includeColumns: columns.map(c => c.key) })}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              Export JSON
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-800/50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {renderLoadingSkeleton()}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr 
                  key={row.id || index}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-300 ${
                        column.align === 'center' ? 'text-center' : 
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {formatCellValue(row[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
};