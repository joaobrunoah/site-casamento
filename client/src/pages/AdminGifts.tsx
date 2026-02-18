import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import FilterPopup from '../components/FilterPopup';
import FilterableTable from '../components/FilterableTable';
import { getApiUrl, getAuthHeaders } from '../utils/api';
import './AdminGifts.css';

type TabType = 'cadastrar' | 'comprados' | 'configuracoes';

interface Gift {
  id?: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  imagem: string;
}

interface PurchaseGiftItem {
  id?: string;
  nome: string;
  descricao?: string;
  preco: number;
  quantidade: number;
}

interface Purchase {
  id: string;
  fromName: string;
  email: string;
  message: string;
  gifts: PurchaseGiftItem[];
  totalPrice: number;
  paymentId: string | null;
  status?: 'pending' | 'approved' | 'rejected';
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

interface FilterPopupState {
  tableType: 'gifts' | 'purchases';
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
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState<boolean>(false);
  const [statsExpanded, setStatsExpanded] = useState<boolean>(true);
  const [showGiftPopup, setShowGiftPopup] = useState<boolean>(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<boolean>(false);
  const [selectedGifts, setSelectedGifts] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog | null>(null);
  const [filterPopup, setFilterPopup] = useState<FilterPopupState | null>(null);
  const [purchaseDetailPopup, setPurchaseDetailPopup] = useState<Purchase | null>(null);
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

  const [purchasesFilters, setPurchasesFilters] = useState<{
    fromName: Set<string>;
    email: Set<string>;
    listaPresentes: Set<string>;
    total: Set<string>;
    message: Set<string>;
  }>({
    fromName: new Set(),
    email: new Set(),
    listaPresentes: new Set(),
    total: new Set(),
    message: new Set(),
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

  // Fetch purchases when Comprados tab is active
  useEffect(() => {
    if (activeTab !== 'comprados') return;
    const fetchPurchases = async () => {
      setLoadingPurchases(true);
      try {
        const response = await fetch(getApiUrl('payment/list-purchases'), {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch purchases');
        const data = await response.json();
        setPurchases(data);
      } catch (error) {
        console.error('Error fetching purchases:', error);
        showToast('Erro ao carregar compras.', 'error');
      } finally {
        setLoadingPurchases(false);
      }
    };
    fetchPurchases();
  }, [activeTab]);

  const getColumnLabel = (column: string): string => {
    const labels: { [key: string]: string } = {
      nome: 'Nome',
      descricao: 'Descrição',
      preco: 'Preço',
      estoque: 'Estoque',
      fromName: 'De',
      email: 'E-mail',
      listaPresentes: 'Lista de Presentes',
      total: 'Total',
      message: 'Mensagem aos noivos',
    };
    return labels[column] || column;
  };

  // Get gift names as comma-separated string for a purchase
  const getPurchaseGiftNames = (p: Purchase): string =>
    p.gifts
      .flatMap((g) => Array(g.quantidade || 1).fill(g.nome))
      .join(', ');

  const getSortedPurchases = (): Purchase[] => {
    let filtered = [...purchases];
    if (purchasesFilters.fromName.size > 0) {
      filtered = filtered.filter((p) => purchasesFilters.fromName.has(p.fromName || ''));
    }
    if (purchasesFilters.email.size > 0) {
      filtered = filtered.filter((p) => purchasesFilters.email.has(p.email || ''));
    }
    if (purchasesFilters.listaPresentes.size > 0) {
      filtered = filtered.filter((p) =>
        p.gifts.some((g) => purchasesFilters.listaPresentes.has(g.nome || ''))
      );
    }
    if (purchasesFilters.total.size > 0) {
      filtered = filtered.filter((p) =>
        purchasesFilters.total.has(String(p.totalPrice?.toFixed(2) ?? '0.00'))
      );
    }
    if (purchasesFilters.message.size > 0) {
      filtered = filtered.filter((p) => purchasesFilters.message.has(p.message || ''));
    }
    return filtered;
  };

  const totalPurchased = purchases.reduce(
    (sum, p) => sum + (p.status === 'approved' ? (p.totalPrice || 0) : 0),
    0,
  );
  const totalPending = purchases.reduce(
    (sum, p) => sum + (p.status === 'pending' ? (p.totalPrice || 0) : 0),
    0,
  );

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
  const handleOpenFilterPopup = (
    tableType: 'gifts' | 'purchases',
    column: string,
    event: React.MouseEvent<HTMLElement>
  ) => {
    event.stopPropagation();
    
    let values: string[] = [];
    let selectedValues: Set<string> = new Set();
    
    if (tableType === 'gifts') {
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
    } else {
      switch (column) {
        case 'fromName':
          values = Array.from(new Set(purchases.map(p => p.fromName || '').filter(v => v !== ''))).sort();
          selectedValues = new Set(purchasesFilters.fromName);
          break;
        case 'email':
          values = Array.from(new Set(purchases.map(p => p.email || '').filter(v => v !== ''))).sort();
          selectedValues = new Set(purchasesFilters.email);
          break;
        case 'listaPresentes':
          values = Array.from(
            new Set(purchases.flatMap(p => p.gifts.map(g => g.nome || '').filter(v => v !== '')))
          ).sort();
          selectedValues = new Set(purchasesFilters.listaPresentes);
          break;
        case 'total':
          values = Array.from(
            new Set(purchases.map(p => (p.totalPrice ?? 0).toFixed(2)))
          ).sort();
          selectedValues = new Set(purchasesFilters.total);
          break;
        case 'message':
          values = Array.from(new Set(purchases.map(p => p.message || '').filter(v => v !== ''))).sort();
          selectedValues = new Set(purchasesFilters.message);
          break;
      }
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
      tableType,
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
    
    if (filterPopup.tableType === 'gifts') {
      setGiftsFilters(prev => ({
        ...prev,
        [filterPopup.column]: selectedValues
      }));
    } else {
      setPurchasesFilters(prev => ({
        ...prev,
        [filterPopup.column]: selectedValues
      }));
    }
    
    setFilterPopup(null);
  };

  const handleClearFilter = () => {
    if (!filterPopup) return;
    
    if (filterPopup.tableType === 'gifts') {
      setGiftsFilters(prev => ({
        ...prev,
        [filterPopup.column]: new Set()
      }));
    } else {
      setPurchasesFilters(prev => ({
        ...prev,
        [filterPopup.column]: new Set()
      }));
    }
  };

  const hasActiveFilter = (tableType: 'gifts' | 'purchases', column: string): boolean => {
    if (tableType === 'gifts') {
      return giftsFilters[column as keyof typeof giftsFilters]?.size > 0 ?? false;
    }
    return purchasesFilters[column as keyof typeof purchasesFilters]?.size > 0 ?? false;
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
          className={`tab-button ${activeTab === 'comprados' ? 'active' : ''}`}
          onClick={() => setActiveTab('comprados')}
        >
          Comprados
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
            </div>
            <FilterableTable
              columns={[
                {
                  id: 'imagem',
                  label: 'Imagem',
                  filterable: false,
                  render: (gift: Gift) => {
                    return gift.imagem ? (
                      <img src={gift.imagem} alt={gift.nome} className="gift-image" />
                    ) : (
                      <div className="gift-image-placeholder">Sem imagem</div>
                    );
                  },
                },
                {
                  id: 'nome',
                  label: 'Nome',
                  filterable: true,
                  render: (gift: Gift) => gift.nome || 'Sem nome',
                },
                {
                  id: 'descricao',
                  label: 'Descrição',
                  filterable: true,
                  className: 'descricao-cell',
                  render: (gift: Gift) => gift.descricao || 'Sem descrição',
                },
                {
                  id: 'preco',
                  label: 'Preço (R$)',
                  filterable: true,
                  render: (gift: Gift) => `R$ ${gift.preco?.toFixed(2) || '0.00'}`,
                },
                {
                  id: 'estoque',
                  label: 'Estoque',
                  filterable: true,
                  render: (gift: Gift) => gift.estoque || 0,
                },
              ]}
              data={getSortedGifts()}
              bulkDeleteMode={bulkDeleteMode}
              selectedItems={selectedGifts}
              onRowClick={bulkDeleteMode ? undefined : (gift) => handleEditGift(gift)}
              onFilterClick={(columnId, e) => handleOpenFilterPopup('gifts', columnId, e)}
              onSelectAll={handleSelectAllGifts}
              onToggleSelect={(giftId) => {
                const gift = gifts.find(g => g.id === giftId);
                if (gift?.id) handleToggleGiftSelection(gift.id);
              }}
              getRowId={(gift: Gift) => gift.id || gift.nome || ''}
              hasActiveFilter={(col) => hasActiveFilter('gifts', col)}
              onToggleBulkDelete={handleToggleBulkDeleteMode}
              onCancelBulkDelete={handleCancelBulkDelete}
              onConfirmBulkDelete={handleBulkDeleteGifts}
              className="gifts-table-section"
              tableClassName="gifts-list-table"
            />
          </>
        )}

        {/* Tab Comprados */}
        {activeTab === 'comprados' && (
          <>
            {loadingPurchases ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Carregando compras...</div>
            ) : (
              <>
                {purchases.length > 0 && (
                  <div className={`stats-section ${statsExpanded ? 'expanded' : 'collapsed'}`}>
                    <div
                      className="stats-header"
                      onClick={() => setStatsExpanded(!statsExpanded)}
                    >
                      <div className="stats-header-title">Estatísticas</div>
                      <div className="stats-header-icon">
                        {statsExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                    {statsExpanded && (
                      <div className="stats-row">
                        <div className="stat-item">
                          <div className="stat-label">R$ Comprados (aprovados)</div>
                          <div className="stat-value">
                            R$ {totalPurchased.toFixed(2)}
                          </div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-label">R$ Pendentes</div>
                          <div className="stat-value stat-value-pending">
                            R$ {totalPending.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <FilterableTable
                  columns={[
                    {
                      id: 'fromName',
                      label: 'De',
                      filterable: true,
                      render: (p: Purchase) => p.fromName || '—',
                    },
                    {
                      id: 'email',
                      label: 'E-mail',
                      filterable: true,
                      render: (p: Purchase) => p.email || '—',
                    },
                    {
                      id: 'listaPresentes',
                      label: 'Lista de Presentes',
                      filterable: true,
                      className: 'lista-presentes-cell',
                      render: (p: Purchase) => getPurchaseGiftNames(p) || '—',
                    },
                    {
                      id: 'total',
                      label: 'Total',
                      filterable: true,
                      render: (p: Purchase) =>
                        `R$ ${(p.totalPrice ?? 0).toFixed(2)}`,
                    },
                    {
                      id: 'status',
                      label: 'Status pagamento',
                      filterable: false,
                      render: (p: Purchase) => {
                        const s = p.status || 'pending';
                        const label = s === 'approved' ? 'Aprovado' : s === 'rejected' ? 'Recusado' : 'Pendente';
                        const icon = s === 'approved' ? '✓' : s === 'rejected' ? '✕' : '⚠';
                        return (
                          <span className={`payment-status payment-status--${s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending'}`}>
                            <span className="payment-status-label">{label}</span>
                            <span className="payment-status-icon" aria-hidden>{icon}</span>
                          </span>
                        );
                      },
                    },
                    {
                      id: 'message',
                      label: 'Mensagem aos noivos',
                      filterable: true,
                      className: 'message-cell',
                      render: (p: Purchase) => p.message || '—',
                    },
                  ]}
                  data={getSortedPurchases()}
                  onRowClick={(p) => setPurchaseDetailPopup(p)}
                  onFilterClick={(columnId, e) =>
                    handleOpenFilterPopup('purchases', columnId, e)
                  }
                  getRowId={(p: Purchase) => p.id || ''}
                  hasActiveFilter={(col) => hasActiveFilter('purchases', col)}
                  className="purchases-table-section"
                  tableClassName="purchases-list-table"
                  emptyMessage="Nenhuma compra encontrada"
                />
              </>
            )}
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
        <div className="popup-overlay">
          <div className="popup-content">
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

      {/* Purchase Detail Popup (Comprados) */}
      {purchaseDetailPopup && (
        <div className="popup-overlay" onClick={() => setPurchaseDetailPopup(null)}>
          <div className="popup-content purchase-detail-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Detalhes da compra</h2>
              <button className="popup-close" onClick={() => setPurchaseDetailPopup(null)} aria-label="Fechar">×</button>
            </div>
            <div className="popup-body purchase-detail-body">
              <div className="purchase-detail-row">
                <span className="purchase-detail-label">De:</span>
                <span className="purchase-detail-value">{purchaseDetailPopup.fromName || '—'}</span>
              </div>
              <div className="purchase-detail-row">
                <span className="purchase-detail-label">E-mail:</span>
                <span className="purchase-detail-value">{purchaseDetailPopup.email || '—'}</span>
              </div>
              <div className="purchase-detail-section">
                <span className="purchase-detail-label">Presentes:</span>
                <ul className="purchase-detail-gifts">
                  {purchaseDetailPopup.gifts?.map((g, i) => (
                    <li key={i} className="purchase-detail-gift-item">
                      <div className="purchase-detail-gift-name">{g.nome}</div>
                      {g.descricao && (
                        <div className="purchase-detail-gift-desc">{g.descricao}</div>
                      )}
                      <div className="purchase-detail-gift-meta">
                        R$ {Number(g.preco).toFixed(2)} × {g.quantidade} = R$ {(Number(g.preco) * (g.quantidade ?? 1)).toFixed(2)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="purchase-detail-row purchase-detail-total">
                <span className="purchase-detail-label">Total:</span>
                <span className="purchase-detail-value">R$ {(purchaseDetailPopup.totalPrice ?? 0).toFixed(2)}</span>
              </div>
              {purchaseDetailPopup.message && (
                <div className="purchase-detail-section">
                  <span className="purchase-detail-label">Mensagem aos noivos:</span>
                  <p className="purchase-detail-message">{purchaseDetailPopup.message}</p>
                </div>
              )}
              <div className="purchase-detail-row">
                <span className="purchase-detail-label">Status do pagamento:</span>
                <span className={`payment-status payment-status--${purchaseDetailPopup.status === 'approved' ? 'approved' : purchaseDetailPopup.status === 'rejected' ? 'rejected' : 'pending'}`}>
                  {purchaseDetailPopup.status === 'approved' ? 'Aprovado' : purchaseDetailPopup.status === 'rejected' ? 'Recusado' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>
        </div>
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
