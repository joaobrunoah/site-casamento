import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import FilterPopup from '../components/FilterPopup';
import { getApiUrl, getAuthHeaders } from '../utils/api';
import './AdminGifts.css';

type TabType = 'cadastrar' | 'configuracoes';

interface Gift {
  id?: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  imagem: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ConfirmationDialog {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface FilterPopup {
  column: string;
  values: string[];
  selectedValues: Set<string>;
  position: { top: number; left: number };
}

const AdminGifts: React.FC = () => {
  const { showGiftsList, updateShowGiftsList, loading } = useConfig();
  const [activeTab, setActiveTab] = useState<TabType>('cadastrar');
  const [updating, setUpdating] = useState<boolean>(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loadingGifts, setLoadingGifts] = useState<boolean>(true);
  const [showGiftPopup, setShowGiftPopup] = useState<boolean>(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<boolean>(false);
  const [selectedGifts, setSelectedGifts] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog | null>(null);
  const [filterPopup, setFilterPopup] = useState<FilterPopup | null>(null);
  const toastIdCounter = useRef<number>(0);

  // Filter states
  const [giftsFilters, setGiftsFilters] = useState<{
    nome: Set<string>;
    descricao: Set<string>;
    preco: Set<string>;
    estoque: Set<string>;
  }>({
    nome: new Set(),
    descricao: new Set(),
    preco: new Set(),
    estoque: new Set(),
  });

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = toastIdCounter.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Show confirmation dialog
  const showConfirmation = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmationDialog({ message, onConfirm, onCancel });
  };

  const handleConfirm = () => {
    if (confirmationDialog) {
      confirmationDialog.onConfirm();
      setConfirmationDialog(null);
    }
  };

  const handleCancel = () => {
    if (confirmationDialog?.onCancel) {
      confirmationDialog.onCancel();
    }
    setConfirmationDialog(null);
  };

  const handleToggle = async () => {
    setUpdating(true);
    try {
      await updateShowGiftsList(!showGiftsList);
      showToast('Configuração atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating config:', error);
      showToast('Erro ao atualizar configuração. Tente novamente.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Fetch gifts from database
  useEffect(() => {
    const fetchGifts = async () => {
      setLoadingGifts(true);
      try {
        const url = getApiUrl('listGifts');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch gifts');
        }
        const data = await response.json();
        setGifts(data);
      } catch (error) {
        console.error('Error fetching gifts:', error);
        showToast('Erro ao carregar presentes do banco de dados.', 'error');
      } finally {
        setLoadingGifts(false);
      }
    };

    fetchGifts();
  }, []);

  const getColumnLabel = (column: string): string => {
    const labels: { [key: string]: string } = {
      nome: 'Nome',
      descricao: 'Descrição',
      preco: 'Preço',
      estoque: 'Estoque',
    };
    return labels[column] || column;
  };

  // Handle open popup for new gift
  const handleAddGift = () => {
    setSelectedGift({
      nome: '',
      descricao: '',
      preco: 0,
      estoque: 0,
      imagem: '',
    });
    setShowGiftPopup(true);
  };

  // Handle open popup for editing gift
  const handleEditGift = (gift: Gift) => {
    if (bulkDeleteMode) return;
    setSelectedGift(gift);
    setShowGiftPopup(true);
  };

  // Handle close popup
  const handleClosePopup = () => {
    setShowGiftPopup(false);
    setSelectedGift(null);
  };

  // Handle save gift
  const handleSaveGift = async (gift: Gift) => {
    try {
      const url = getApiUrl('postGift');
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(gift),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Failed to save gift');
      }

      const savedGift = await response.json();
      
      if (gift.id) {
        // Update existing gift
        setGifts(prevGifts => 
          prevGifts.map(g => g.id === gift.id ? savedGift : g)
        );
        showToast('Presente atualizado com sucesso!', 'success');
      } else {
        // Add new gift
        setGifts(prevGifts => [...prevGifts, savedGift]);
        showToast('Presente cadastrado com sucesso!', 'success');
      }

      handleClosePopup();
    } catch (error) {
      console.error('Error saving gift:', error);
      showToast(`Erro ao salvar presente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  // Handle delete gift
  const handleDeleteGift = async (giftId: string) => {
    if (!giftId) {
      showToast('Erro: Presente não possui ID. Não é possível excluir.', 'error');
      return;
    }

    showConfirmation('Tem certeza que deseja excluir este presente?', async () => {
      try {
        const url = getApiUrl(`deleteGift?id=${giftId}`);
        const response = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || errorData.details || 'Failed to delete gift');
        }

        setGifts(prevGifts => prevGifts.filter(g => g.id !== giftId));
        showToast('Presente excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Error deleting gift:', error);
        showToast(`Erro ao excluir presente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
      }
    });
  };

  // Bulk deletion handlers
  const handleToggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
    setSelectedGifts(new Set());
  };

  const handleSelectAllGifts = () => {
    const sortedGifts = getSortedGifts();
    if (selectedGifts.size === sortedGifts.filter(g => g.id).length) {
      setSelectedGifts(new Set());
    } else {
      setSelectedGifts(new Set(sortedGifts.filter(g => g.id).map(g => g.id!)));
    }
  };

  const handleToggleGiftSelection = (giftId: string) => {
    setSelectedGifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(giftId)) {
        newSet.delete(giftId);
      } else {
        newSet.add(giftId);
      }
      return newSet;
    });
  };

  const handleCancelBulkDelete = () => {
    setBulkDeleteMode(false);
    setSelectedGifts(new Set());
  };

  const handleBulkDeleteGifts = () => {
    const selectedCount = selectedGifts.size;
    if (selectedCount === 0) {
      showToast('Nenhum presente selecionado.', 'error');
      return;
    }

    showConfirmation(
      `Tem certeza que deseja excluir ${selectedCount} presente(s)?`,
      async () => {
        try {
          const deletePromises = Array.from(selectedGifts).map(async (giftId) => {
            const url = getApiUrl(`deleteGift?id=${giftId}`);
            const response = await fetch(url, {
              method: 'DELETE',
              headers: getAuthHeaders(),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || errorData.details || 'Failed to delete gift');
            }

            return giftId;
          });

          await Promise.all(deletePromises);

          setGifts(prevGifts => prevGifts.filter(g => !selectedGifts.has(g.id || '')));
          setBulkDeleteMode(false);
          setSelectedGifts(new Set());
          showToast(`${selectedCount} presente(s) excluído(s) com sucesso!`, 'success');
        } catch (error) {
          console.error('Error deleting gifts:', error);
          showToast(`Erro ao excluir presentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
        }
      }
    );
  };

  // Get sorted gifts for display
  const getSortedGifts = () => {
    let filtered = [...gifts].sort((a, b) => {
      const nameA = (a.nome || '').toLowerCase();
      const nameB = (b.nome || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Apply filters
    if (giftsFilters.nome.size > 0) {
      filtered = filtered.filter(g => giftsFilters.nome.has(g.nome || ''));
    }
    if (giftsFilters.descricao.size > 0) {
      filtered = filtered.filter(g => giftsFilters.descricao.has(g.descricao || ''));
    }
    if (giftsFilters.preco.size > 0) {
      filtered = filtered.filter(g => giftsFilters.preco.has(String(g.preco || 0)));
    }
    if (giftsFilters.estoque.size > 0) {
      filtered = filtered.filter(g => giftsFilters.estoque.has(String(g.estoque || 0)));
    }
    
    return filtered;
  };

  // Filter popup handlers
  const handleOpenFilterPopup = (column: string, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    
    let values: string[] = [];
    let selectedValues: Set<string> = new Set();
    
    switch (column) {
      case 'nome':
        values = Array.from(new Set(gifts.map(g => g.nome || '').filter(v => v !== ''))).sort();
        selectedValues = new Set(giftsFilters.nome);
        break;
      case 'descricao':
        values = Array.from(new Set(gifts.map(g => g.descricao || '').filter(v => v !== ''))).sort();
        selectedValues = new Set(giftsFilters.descricao);
        break;
      case 'preco':
        values = Array.from(new Set(gifts.map(g => String(g.preco || 0)).filter(v => v !== ''))).sort();
        selectedValues = new Set(giftsFilters.preco);
        break;
      case 'estoque':
        values = Array.from(new Set(gifts.map(g => String(g.estoque || 0)).filter(v => v !== ''))).sort();
        selectedValues = new Set(giftsFilters.estoque);
        break;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 350;
    const popupHeight = 500;
    let left = rect.left;
    let top = rect.bottom + 5;
    
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - 10;
    }
    if (top + popupHeight > window.innerHeight) {
      top = rect.top - popupHeight - 5;
    }
    if (left < 10) {
      left = 10;
    }
    if (top < 10) {
      top = 10;
    }
    
    setFilterPopup({
      column,
      values,
      selectedValues: new Set(selectedValues),
      position: { top, left }
    });
  };

  const handleCloseFilterPopup = () => {
    setFilterPopup(null);
  };

  const handleApplyFilter = (selectedValues: Set<string>) => {
    if (!filterPopup) return;
    
    setGiftsFilters(prev => ({
      ...prev,
      [filterPopup.column]: selectedValues
    }));
    
    setFilterPopup(null);
  };

  const handleClearFilter = () => {
    if (!filterPopup) return;
    
    setGiftsFilters(prev => ({
      ...prev,
      [filterPopup.column]: new Set()
    }));
  };

  const hasActiveFilter = (column: string): boolean => {
    return giftsFilters[column as keyof typeof giftsFilters].size > 0;
  };

  if (loadingGifts) {
    return (
      <div className="admin-gifts">
        <div style={{ padding: '20px', textAlign: 'center' }}>Carregando presentes...</div>
      </div>
    );
  }

  return (
    <div className="admin-gifts">
      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'cadastrar' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('cadastrar');
            setBulkDeleteMode(false);
            setSelectedGifts(new Set());
          }}
        >
          Cadastrar Presentes
        </button>
        <button
          className={`tab-button ${activeTab === 'configuracoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('configuracoes')}
        >
          Configurações
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Tab Cadastrar Presentes */}
        {activeTab === 'cadastrar' && (
          <>
            <div className="gifts-actions-section">
              <button
                type="button"
                onClick={handleAddGift}
                className="add-gift-button"
                disabled={bulkDeleteMode}
              >
                <span className="button-icon">+</span>
                Presente
              </button>
              {!bulkDeleteMode ? (
                <button
                  type="button"
                  onClick={handleToggleBulkDeleteMode}
                  className="bulk-delete-button"
                  style={{ marginLeft: '10px' }}
                >
                  <span className="button-icon">✓</span>
                  Marcar para Remoção
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelBulkDelete}
                    className="bulk-delete-cancel-button"
                    style={{ marginLeft: '10px' }}
                  >
                    Cancelar Exclusão
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteGifts}
                    className="bulk-delete-confirm-button"
                    disabled={selectedGifts.size === 0}
                    style={{ marginLeft: '10px' }}
                  >
                    <span className="button-icon">🗑️</span>
                    Excluir ({selectedGifts.size})
                  </button>
                </>
              )}
            </div>
            <div className="gifts-table-section">
              <table className="gifts-list-table">
                <thead>
                  <tr>
                    {bulkDeleteMode && (
                      <th className="checkbox-header">
                        <input
                          type="checkbox"
                          checked={selectedGifts.size > 0 && selectedGifts.size === getSortedGifts().filter(g => g.id).length}
                          onChange={handleSelectAllGifts}
                          className="checkbox-input"
                        />
                      </th>
                    )}
                    <th>Imagem</th>
                    <th 
                      className="filter-header"
                      onClick={(e) => handleOpenFilterPopup('nome', e)}
                    >
                      <span>Nome</span>
                      {hasActiveFilter('nome') && <span className="filter-indicator">🔽</span>}
                    </th>
                    <th 
                      className="filter-header"
                      onClick={(e) => handleOpenFilterPopup('descricao', e)}
                    >
                      <span>Descrição</span>
                      {hasActiveFilter('descricao') && <span className="filter-indicator">🔽</span>}
                    </th>
                    <th 
                      className="filter-header"
                      onClick={(e) => handleOpenFilterPopup('preco', e)}
                    >
                      <span>Preço (R$)</span>
                      {hasActiveFilter('preco') && <span className="filter-indicator">🔽</span>}
                    </th>
                    <th 
                      className="filter-header"
                      onClick={(e) => handleOpenFilterPopup('estoque', e)}
                    >
                      <span>Estoque</span>
                      {hasActiveFilter('estoque') && <span className="filter-indicator">🔽</span>}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedGifts().map((gift) => {
                    const isSelected = gift.id ? selectedGifts.has(gift.id) : false;
                    return (
                      <tr
                        key={gift.id || gift.nome}
                        onClick={() => !bulkDeleteMode && handleEditGift(gift)}
                        className={`gift-row-clickable ${isSelected ? 'row-selected' : ''}`}
                      >
                        {bulkDeleteMode && (
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => gift.id && handleToggleGiftSelection(gift.id)}
                              className="checkbox-input"
                              onClick={(e) => e.stopPropagation()}
                              disabled={!gift.id}
                            />
                          </td>
                        )}
                        <td>
                          {gift.imagem ? (
                            <img src={gift.imagem} alt={gift.nome} className="gift-image" />
                          ) : (
                            <div className="gift-image-placeholder">Sem imagem</div>
                          )}
                        </td>
                        <td>{gift.nome || 'Sem nome'}</td>
                        <td className="descricao-cell">{gift.descricao || 'Sem descrição'}</td>
                        <td>R$ {gift.preco?.toFixed(2) || '0.00'}</td>
                        <td>{gift.estoque || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab Configurações */}
        {activeTab === 'configuracoes' && (
          <div className="config-section">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showGiftsList}
                onChange={handleToggle}
                disabled={loading || updating}
                className="toggle-input"
              />
              <span className="toggle-text">Mostrar Lista de Presentes?</span>
            </label>
          </div>
        )}
      </div>

      {/* Gift Popup */}
      {showGiftPopup && selectedGift && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{selectedGift.id ? 'Editar Presente' : 'Novo Presente'}</h2>
              <button className="popup-close" onClick={handleClosePopup}>×</button>
            </div>
            <div className="popup-body">
              <GiftForm
                gift={selectedGift}
                onSave={handleSaveGift}
                onCancel={handleClosePopup}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationDialog && (
        <div className="confirmation-overlay" onClick={handleCancel}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirmation-message">{confirmationDialog.message}</div>
            <div className="confirmation-buttons">
              <button className="confirmation-button cancel-button" onClick={handleCancel}>
                Cancelar
              </button>
              <button className="confirmation-button confirm-button" onClick={handleConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Filter Popup */}
      {filterPopup && (
        <FilterPopup
          column={filterPopup.column}
          columnLabel={getColumnLabel(filterPopup.column)}
          values={filterPopup.values}
          selectedValues={filterPopup.selectedValues}
          position={filterPopup.position}
          onClose={handleCloseFilterPopup}
          onApply={handleApplyFilter}
          onClear={handleClearFilter}
        />
      )}
    </div>
  );
};

// Gift Form Component
interface GiftFormProps {
  gift: Gift;
  onSave: (gift: Gift) => void;
  onCancel: () => void;
}

const GiftForm: React.FC<GiftFormProps> = ({ gift, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Gift>(gift);
  const [saving, setSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Gift, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="gift-form">
      <div className="form-group">
        <label htmlFor="nome">Nome *</label>
        <input
          type="text"
          id="nome"
          value={formData.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          required
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => handleChange('descricao', e.target.value)}
          rows={4}
          className="form-textarea"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="preco">Preço (R$)</label>
          <input
            type="number"
            id="preco"
            value={formData.preco}
            onChange={(e) => handleChange('preco', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="estoque">Estoque</label>
          <input
            type="number"
            id="estoque"
            value={formData.estoque}
            onChange={(e) => handleChange('estoque', parseInt(e.target.value) || 0)}
            min="0"
            className="form-input"
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="imagem">URL da Imagem</label>
        <input
          type="url"
          id="imagem"
          value={formData.imagem}
          onChange={(e) => handleChange('imagem', e.target.value)}
          placeholder="https://..."
          className="form-input"
        />
        {formData.imagem && (
          <div className="image-preview">
            <img src={formData.imagem} alt="Preview" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
          </div>
        )}
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="form-button cancel-button">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="form-button save-button">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default AdminGifts;
