import React, { useState, useEffect } from 'react';
import './FilterPopup.css';

export interface FilterPopupProps {
  column: string;
  columnLabel: string;
  values: string[];
  selectedValues: Set<string>;
  position: { top: number; left: number };
  onClose: () => void;
  onApply: (selectedValues: Set<string>) => void;
  onClear: () => void;
}

const FilterPopup: React.FC<FilterPopupProps> = ({
  column,
  columnLabel,
  values,
  selectedValues: initialSelectedValues,
  position,
  onClose,
  onApply,
  onClear,
}) => {
  const [selectedValues, setSelectedValues] = useState<Set<string>>(initialSelectedValues);

  // Update selected values when prop changes
  useEffect(() => {
    setSelectedValues(initialSelectedValues);
  }, [initialSelectedValues]);

  const handleToggleValue = (value: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedValues.size === values.length) {
      setSelectedValues(new Set());
    } else {
      setSelectedValues(new Set(values));
    }
  };

  const handleApply = () => {
    onApply(selectedValues);
  };

  const handleClear = () => {
    setSelectedValues(new Set());
    onClear();
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      <div className="filter-popup-overlay" onClick={onClose}></div>
      <div 
        className="filter-popup"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="filter-popup-header">
          <h3>Filtrar por {columnLabel}</h3>
          <button className="filter-popup-close" onClick={onClose}>×</button>
        </div>
        <div className="filter-popup-content">
          <div className="filter-select-all">
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedValues.size === values.length && values.length > 0}
                onChange={handleToggleSelectAll}
                className="filter-checkbox"
              />
              <span>Selecionar todos</span>
            </label>
          </div>
          <div className="filter-values-list">
            {values.map((value) => (
              <label key={value} className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedValues.has(value)}
                  onChange={() => handleToggleValue(value)}
                  className="filter-checkbox"
                />
                <span>{value || '(vazio)'}</span>
              </label>
            ))}
            {values.length === 0 && (
              <div className="filter-no-values">Nenhum valor disponível</div>
            )}
          </div>
        </div>
        <div className="filter-popup-footer">
          <button 
            className="filter-button filter-clear-button"
            onClick={handleClear}
          >
            Limpar
          </button>
          <button 
            className="filter-button filter-apply-button"
            onClick={handleApply}
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterPopup;
