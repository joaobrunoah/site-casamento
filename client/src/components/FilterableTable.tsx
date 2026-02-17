import React from 'react';
import './FilterableTable.css';

export interface TableColumn<T = any> {
  id: string;
  label: string;
  filterable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface FilterableTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  bulkDeleteMode?: boolean;
  selectedItems?: Set<string>;
  onRowClick?: (row: T, index: number) => void;
  onFilterClick?: (columnId: string, event: React.MouseEvent<HTMLElement>) => void;
  onSelectAll?: () => void;
  onToggleSelect?: (rowId: string) => void;
  getRowId: (row: T, index: number) => string;
  hasActiveFilter?: (columnId: string) => boolean;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
  onToggleBulkDelete?: () => void;
  onCancelBulkDelete?: () => void;
  onConfirmBulkDelete?: () => void;
}

const FilterableTable = <T,>({
  columns,
  data,
  bulkDeleteMode = false,
  selectedItems = new Set(),
  onRowClick,
  onFilterClick,
  onSelectAll,
  onToggleSelect,
  getRowId,
  hasActiveFilter,
  className = '',
  tableClassName = '',
  emptyMessage = 'Nenhum item encontrado',
  onToggleBulkDelete,
  onCancelBulkDelete,
  onConfirmBulkDelete,
}: FilterableTableProps<T>) => {
  const itemsWithIds = data.filter((row, index) => {
    const rowId = getRowId(row, index);
    return rowId;
  });
  const allSelected = itemsWithIds.length > 0 && selectedItems.size === itemsWithIds.length && 
    itemsWithIds.every((row, index) => {
      const rowId = getRowId(row, index);
      return selectedItems.has(rowId);
    });

  return (
    <div className={`filterable-table-section ${className}`}>
      {(onToggleBulkDelete || bulkDeleteMode) && (
        <div className="filterable-table-actions">
          {!bulkDeleteMode && onToggleBulkDelete ? (
            <button
              type="button"
              onClick={onToggleBulkDelete}
              className="bulk-delete-link"
            >
              Excluir vários
            </button>
          ) : (
            <>
              {onCancelBulkDelete && (
                <button
                  type="button"
                  onClick={onCancelBulkDelete}
                  className="bulk-delete-link"
                >
                  Cancelar
                </button>
              )}
              {onConfirmBulkDelete && (
                <button
                  type="button"
                  onClick={onConfirmBulkDelete}
                  disabled={selectedItems.size === 0}
                  className="bulk-delete-link"
                >
                  Excluir ({selectedItems.size})
                </button>
              )}
            </>
          )}
        </div>
      )}
      <table className={`filterable-table ${tableClassName}`}>
        <thead>
          <tr>
            {bulkDeleteMode && onSelectAll && (
              <th className="checkbox-header">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="checkbox-input"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.id}
                className={`${column.filterable && onFilterClick ? 'filter-header' : ''} ${column.headerClassName || ''}`}
                onClick={column.filterable && onFilterClick ? (e) => onFilterClick(column.id, e) : undefined}
              >
                <span>{column.label}</span>
                {column.filterable && hasActiveFilter && hasActiveFilter(column.id) && (
                  <span className="filter-indicator">🔽</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (bulkDeleteMode ? 1 : 0)} className="empty-message">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const rowId = getRowId(row, index);
              const isSelected = selectedItems.has(rowId);
              
              return (
                <tr
                  key={rowId}
                  onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                  className={`${onRowClick ? 'table-row-clickable' : ''} ${isSelected ? 'row-selected' : ''}`}
                >
                  {bulkDeleteMode && onToggleSelect && (
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(rowId)}
                        className="checkbox-input"
                        onClick={(e) => e.stopPropagation()}
                        disabled={!rowId}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.id} className={column.className || ''}>
                      {column.render ? column.render(row, index) : String((row as any)[column.id] || '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FilterableTable;
