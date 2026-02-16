import React, { useState, useRef, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import * as XLSX from 'xlsx';
import InviteCard, { Invite, Guest } from '../components/InviteCard';
import { getApiUrl } from '../utils/api';
import './AdminAttendingList.css';

type TabType = 'convidados' | 'convites' | 'importar' | 'configuracoes';

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

const AdminAttendingList: React.FC = () => {
  const { showConfirmationForm, updateShowConfirmationForm, loading } = useConfig();
  const [activeTab, setActiveTab] = useState<TabType>('convidados');
  const [updating, setUpdating] = useState<boolean>(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [importedInvites, setImportedInvites] = useState<Invite[]>([]);
  const [statsExpanded, setStatsExpanded] = useState<boolean>(false);
  const [loadingInvites, setLoadingInvites] = useState<boolean>(true);
  const [savingInvites, setSavingInvites] = useState<boolean>(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [showInvitePopup, setShowInvitePopup] = useState<boolean>(false);
  const [updatingGuest, setUpdatingGuest] = useState<{inviteId: string, guestIndex: number} | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<boolean>(false);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set()); // Format: "inviteId-guestIndex"
  const [selectedInvites, setSelectedInvites] = useState<Set<string>>(new Set()); // Format: inviteId
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdCounter = useRef<number>(0);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = toastIdCounter.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Show confirmation dialog
  const showConfirmation = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmationDialog({ message, onConfirm, onCancel });
  };

  // Handle confirmation
  const handleConfirm = () => {
    if (confirmationDialog) {
      confirmationDialog.onConfirm();
      setConfirmationDialog(null);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (confirmationDialog?.onCancel) {
      confirmationDialog.onCancel();
    }
    setConfirmationDialog(null);
  };

  const handleToggle = async () => {
    setUpdating(true);
    try {
      await updateShowConfirmationForm(!showConfirmationForm);
      showToast('Configuração atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating config:', error);
      showToast('Erro ao atualizar configuração. Tente novamente.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Update guest field using PUT method
  const updateGuestField = async (inviteId: string, guestIndex: number, field: 'situacao' | 'mesa', value: string) => {
    if (!inviteId) {
      showToast('Erro: Convite não possui ID.', 'error');
      return;
    }

    setUpdatingGuest({ inviteId, guestIndex });
    try {
      const url = getApiUrl(`updateInvite?id=${inviteId}`);
      
      // Get current invite to update the specific guest
      const invite = invites.find(inv => inv.id === inviteId);
      if (!invite) {
        throw new Error('Convite não encontrado');
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guests: [{
            index: guestIndex,
            [field]: value
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Failed to update guest');
      }

      const updatedInvite = await response.json();
      
      // Update local state
      setInvites(prevInvites => 
        prevInvites.map(inv => 
          inv.id === inviteId ? updatedInvite : inv
        )
      );
      
      showToast('Convidado atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating guest:', error);
      showToast(`Erro ao atualizar convidado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    } finally {
      setUpdatingGuest(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is Excel format
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showToast('Por favor, selecione um arquivo Excel (.xlsx ou .xls)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays (raw data)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
        
        if (rawData.length < 3) {
          showToast('O arquivo Excel deve ter pelo menos 3 linhas (linha 1 vazia, linha 2 com cabeçalhos, linha 3+ com dados).', 'error');
          return;
        }

        // Skip first line, use second line as headers, data starts from third line
        const dataRows = rawData.slice(2);

        // Parse rows and group guests under invites
        const parsedInvites: Invite[] = [];
        let currentInvite: Invite | null = null;

        // Helper function to clean phone number
        const cleanPhoneNumber = (ddi: string, telefone: string): { ddi: string; telefone: string } => {
          let cleanedDdi = ddi || '';
          let cleanedTelefone = telefone || '';
          
          if (cleanedTelefone && /^\(?\d{2}\)?\s*\d{4,5}-?\d{4}$/.test(cleanedTelefone)) {
            const cleanTelefone = cleanedTelefone.replace(/\D/g, '');
            if (!cleanedDdi || cleanedDdi.trim() === '') {
              cleanedDdi = '+55';
            }
            cleanedTelefone = cleanTelefone;
          } else if (cleanedTelefone && !cleanedDdi) {
            const cleanTelefone = cleanedTelefone.replace(/\D/g, '');
            if (cleanTelefone.length === 10 || cleanTelefone.length === 11) {
              cleanedDdi = '+55';
              cleanedTelefone = cleanTelefone;
            }
          }
          
          return { ddi: cleanedDdi, telefone: cleanedTelefone };
        };

        // Helper function to format phone for observacao
        const formatPhoneForObservacao = (ddi: string, telefone: string): string => {
          if (!telefone) return '';
          const cleaned = cleanPhoneNumber(ddi, telefone);
          if (cleaned.telefone) {
            return cleaned.ddi ? `${cleaned.ddi} ${cleaned.telefone}` : cleaned.telefone;
          }
          return '';
        };

        for (const row of dataRows) {
          const hasData = row.some(cell => {
            const strValue = String(cell || '').trim();
            return strValue !== '' && strValue !== 'null' && strValue !== 'undefined';
          });

          if (!hasData) continue;

          const inviteFields = row.slice(0, 5).map(cell => String(cell || '').trim());
          const nomeDoConvite = inviteFields[0] || '';
          
          const guestFields = row.slice(5).map(cell => String(cell || '').trim());
          const guestNome = guestFields[0] || '';
          const hasGuestData = guestFields.some(field => field !== '');

          if (nomeDoConvite) {
            if (currentInvite && currentInvite.guests.length > 0) {
              parsedInvites.push(currentInvite);
            }

            const phoneData = cleanPhoneNumber(inviteFields[1] || '', inviteFields[2] || '');

            currentInvite = {
              nomeDoConvite: nomeDoConvite,
              ddi: phoneData.ddi,
              telefone: phoneData.telefone,
              grupo: inviteFields[3] || '',
              observacao: inviteFields[4] || '',
              guests: []
            };
          }

          if (hasGuestData && currentInvite) {
            const rowObservations: string[] = [];
            
            if (!nomeDoConvite) {
              const rowDdi = inviteFields[1] || '';
              const rowTelefone = inviteFields[2] || '';
              
              if (rowTelefone) {
                const phoneText = formatPhoneForObservacao(rowDdi, rowTelefone);
                if (phoneText) {
                  rowObservations.push(phoneText);
                }
              }
              
              if (inviteFields[4]) {
                rowObservations.push(inviteFields[4]);
              }
            }
            
            if (rowObservations.length > 0 && guestNome) {
              const observationLine = `${guestNome} (${rowObservations.join(', ')})`;
              if (currentInvite.observacao) {
                currentInvite.observacao += '\n' + observationLine;
              } else {
                currentInvite.observacao = observationLine;
              }
            } else if (rowObservations.length > 0) {
              const observationLine = rowObservations.join(', ');
              if (currentInvite.observacao) {
                currentInvite.observacao += '\n' + observationLine;
              } else {
                currentInvite.observacao = observationLine;
              }
            }

            const guest: Guest = {
              nome: guestNome,
              genero: guestFields[1] || '',
              faixaEtaria: guestFields[2] || '',
              custo: guestFields[3] || '',
              situacao: guestFields[4] || '',
              mesa: guestFields[5] || ''
            };
            currentInvite.guests.push(guest);
          }
        }

        if (currentInvite && currentInvite.guests.length > 0) {
          parsedInvites.push(currentInvite);
        }
        
        if (parsedInvites.length === 0) {
          showToast('O arquivo Excel não contém dados válidos após a linha de cabeçalhos.', 'error');
          return;
        }
        
        setImportedInvites(parsedInvites);
        showToast(`Arquivo carregado com sucesso! ${parsedInvites.length} convite(s) encontrado(s).`, 'success');
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        showToast('Erro ao processar o arquivo Excel. Verifique se o arquivo está no formato correto.', 'error');
      }
    };

    reader.onerror = () => {
      showToast('Erro ao ler o arquivo. Tente novamente.', 'error');
    };

    reader.readAsBinaryString(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportToExcel = () => {
    const invitesToExport = activeTab === 'importar' ? importedInvites : invites;
    
    if (invitesToExport.length === 0) {
      showToast('Não há convites para exportar.', 'error');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const data: (string | number)[][] = [];
      
      data.push([]);
      data.push([
        'ID',
        'Nome do Convite',
        'DDI',
        'Telefone',
        'Grupo',
        'Observação',
        'Nome',
        'Gênero',
        'Faixa Etária',
        'Custo',
        'Situação',
        'Mesa'
      ]);
      
      invitesToExport.forEach((invite) => {
        if (invite.guests.length === 0) {
          data.push([
            invite.id || '',
            invite.nomeDoConvite || '',
            invite.ddi || '',
            invite.telefone || '',
            invite.grupo || '',
            invite.observacao || '',
            '', '', '', '', '', ''
          ]);
        } else {
          data.push([
            invite.id || '',
            invite.nomeDoConvite || '',
            invite.ddi || '',
            invite.telefone || '',
            invite.grupo || '',
            invite.observacao || '',
            invite.guests[0].nome || '',
            invite.guests[0].genero || '',
            invite.guests[0].faixaEtaria || '',
            invite.guests[0].custo || '',
            invite.guests[0].situacao || '',
            invite.guests[0].mesa || ''
          ]);
          
          for (let i = 1; i < invite.guests.length; i++) {
            data.push([
              '', '', '', '', '', '',
              invite.guests[i].nome || '',
              invite.guests[i].genero || '',
              invite.guests[i].faixaEtaria || '',
              invite.guests[i].custo || '',
              invite.guests[i].situacao || '',
              invite.guests[i].mesa || ''
            ]);
          }
        }
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Convites');
      
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];
      const filename = `convites_${dateStr}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      showToast(`Convites exportados com sucesso! Arquivo: ${filename}`, 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showToast('Erro ao exportar convites. Tente novamente.', 'error');
    }
  };

  // Fetch invites from database on mount
  useEffect(() => {
    const fetchInvites = async () => {
      setLoadingInvites(true);
      try {
        const url = getApiUrl('listInvites');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch invites');
        }
        const data = await response.json();
        const invitesWithGuests = data.map((invite: Invite) => ({
          ...invite,
          guests: invite.guests || []
        }));
        setInvites(invitesWithGuests);
      } catch (error) {
        console.error('Error fetching invites:', error);
        showToast('Erro ao carregar convites do banco de dados.', 'error');
      } finally {
        setLoadingInvites(false);
      }
    };

    fetchInvites();
  }, []);

  // Save all imported invites to database
  const handleSaveImportedInvites = async () => {
    if (importedInvites.length === 0) {
      showToast('Não há convites para salvar.', 'error');
      return;
    }

    setSavingInvites(true);
    try {
      const savePromises = importedInvites.map(async (invite, index) => {
        try {
          const url = getApiUrl('postInvite');
          console.log(`Saving invite ${index + 1}/${importedInvites.length}:`, invite);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: invite.id,
              nomeDoConvite: invite.nomeDoConvite || '',
              ddi: invite.ddi || '',
              telefone: invite.telefone || '',
              grupo: invite.grupo || '',
              observacao: invite.observacao || '',
              guests: invite.guests || []
            }),
          });

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              const text = await response.text();
              errorMessage = text || errorMessage;
            }
            console.error(`Error saving invite ${index + 1}:`, errorMessage);
            throw new Error(`Convite ${index + 1} (${invite.nomeDoConvite || 'sem nome'}): ${errorMessage}`);
          }

          const savedInvite = await response.json();
          console.log(`Successfully saved invite ${index + 1}:`, savedInvite);
          return savedInvite;
        } catch (error) {
          console.error(`Error saving invite ${index + 1}:`, error);
          throw error;
        }
      });

      const savedInvites = await Promise.all(savePromises);
      
      setInvites(savedInvites.map((saved, index) => ({
        ...saved,
        guests: saved.guests || importedInvites[index].guests || []
      })));

      setImportedInvites([]);
      setActiveTab('convidados');
      showToast(`Convites salvos com sucesso! Total: ${savedInvites.length}`, 'success');
    } catch (error) {
      console.error('Error saving invites:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showToast(`Erro ao salvar convites: ${errorMessage}`, 'error');
    } finally {
      setSavingInvites(false);
    }
  };

  // Calculate statistics
  const calculateStatistics = () => {
    let totalGuests = 0;
    let pendentes = 0;
    let confirmados = 0;
    let naoComparecerao = 0;
    let mulheres = 0;
    let criancas = 0;

    invites.forEach((invite) => {
      invite.guests.forEach((guest) => {
        totalGuests++;
        const situacao = guest.situacao?.trim().toLowerCase() || '';
        if (situacao === 'pendente') {
          pendentes++;
        } else if (situacao === 'confirmado') {
          confirmados++;
        } else if (situacao === 'não comparecerá' || situacao === 'nao comparecera' || situacao === 'não comparecera') {
          naoComparecerao++;
        }
        
        const genero = guest.genero?.trim().toUpperCase() || '';
        if (genero === 'F') {
          mulheres++;
        }
        
        const faixaEtaria = guest.faixaEtaria?.trim().toLowerCase() || '';
        if (faixaEtaria === 'criança') {
          criancas++;
        }
      });
    });

    return { totalGuests, pendentes, confirmados, naoComparecerao, mulheres, criancas };
  };

  const stats = calculateStatistics();

  // Get all guests flattened with invite info, sorted alphabetically by invite name
  const getAllGuests = () => {
    const allGuests: Array<Guest & { inviteId: string; inviteNome: string; telefone: string; guestIndex: number; guestKey: string }> = [];
    invites.forEach(invite => {
      invite.guests.forEach((guest, guestIndex) => {
        allGuests.push({
          ...guest,
          inviteId: invite.id || '',
          inviteNome: invite.nomeDoConvite || '',
          telefone: invite.ddi && invite.telefone ? `${invite.ddi} ${invite.telefone}` : (invite.telefone || ''),
          guestIndex: guestIndex,
          guestKey: `${invite.id || ''}-${guestIndex}`
        });
      });
    });
    // Sort alphabetically by invite name (Nome do Convite)
    return allGuests.sort((a, b) => {
      const nameA = (a.inviteNome || '').toLowerCase();
      const nameB = (b.inviteNome || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  // Get sorted invites for display
  const getSortedInvites = () => {
    return [...invites].sort((a, b) => {
      const nameA = (a.nomeDoConvite || '').toLowerCase();
      const nameB = (b.nomeDoConvite || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const handleInviteClick = (invite: Invite) => {
    setSelectedInvite(invite);
    setShowInvitePopup(true);
  };

  const handleClosePopup = () => {
    setShowInvitePopup(false);
    setSelectedInvite(null);
  };

  // Handle invite saved in popup - reload invite from API
  const handleInviteSavedInPopup = async (inviteIndex: number, savedInvite: Invite) => {
    if (!savedInvite.id) {
      showToast('Erro: Convite salvo mas não possui ID.', 'error');
      return;
    }

    try {
      // Fetch the updated invite from API
      const url = getApiUrl(`getInvite?id=${savedInvite.id}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch updated invite');
      }

      const updatedInvite = await response.json();
      
      // Update the selected invite in popup
      setSelectedInvite(updatedInvite);
      
      // Update the invite in the invites list
      setInvites(prevInvites => 
        prevInvites.map(inv => 
          inv.id === updatedInvite.id ? updatedInvite : inv
        )
      );
      
      showToast('Convite atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Error fetching updated invite:', error);
      showToast('Erro ao recarregar convite atualizado.', 'error');
      // Still update with the saved invite data we have
      setSelectedInvite(savedInvite);
      setInvites(prevInvites => 
        prevInvites.map(inv => 
          inv.id === savedInvite.id ? savedInvite : inv
        )
      );
    }
  };

  const handleDeleteInvite = async (invite: Invite, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    
    if (!invite.id) {
      showToast('Erro: Convite não possui ID. Não é possível excluir.', 'error');
      return;
    }

    showConfirmation('Tem certeza que deseja excluir o convite?', async () => {
      try {
        const url = getApiUrl(`deleteInvite?id=${invite.id}`);
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || errorData.details || 'Failed to delete invite');
        }

        // Remove invite from state
        setInvites(prevInvites => prevInvites.filter(inv => inv.id !== invite.id));
        
        showToast('Convite excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Error deleting invite:', error);
        showToast(`Erro ao excluir convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
      }
    });
  };

  // Bulk deletion handlers
  const handleToggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
    setSelectedGuests(new Set());
    setSelectedInvites(new Set());
  };

  const handleSelectAllGuests = () => {
    const allGuests = getAllGuests();
    if (selectedGuests.size === allGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(allGuests.map(g => g.guestKey)));
    }
  };

  const handleSelectAllInvites = () => {
    const sortedInvites = getSortedInvites();
    if (selectedInvites.size === sortedInvites.length) {
      setSelectedInvites(new Set());
    } else {
      setSelectedInvites(new Set(sortedInvites.filter(inv => inv.id).map(inv => inv.id!)));
    }
  };

  const handleToggleGuestSelection = (guestKey: string) => {
    setSelectedGuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestKey)) {
        newSet.delete(guestKey);
      } else {
        newSet.add(guestKey);
      }
      return newSet;
    });
  };

  const handleToggleInviteSelection = (inviteId: string) => {
    setSelectedInvites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inviteId)) {
        newSet.delete(inviteId);
      } else {
        newSet.add(inviteId);
      }
      return newSet;
    });
  };

  const handleCancelBulkDelete = () => {
    setBulkDeleteMode(false);
    setSelectedGuests(new Set());
    setSelectedInvites(new Set());
  };

  const handleBulkDeleteGuests = () => {
    const selectedCount = selectedGuests.size;
    if (selectedCount === 0) {
      showToast('Nenhum convidado selecionado.', 'error');
      return;
    }

    showConfirmation(
      `Tem certeza que deseja excluir ${selectedCount} convidado(s)?`,
      async () => {
        try {
          // Group deletions by invite
          const deletionsByInvite = new Map<string, number[]>();
          
          selectedGuests.forEach(guestKey => {
            const [inviteId, guestIndexStr] = guestKey.split('-');
            const guestIndex = parseInt(guestIndexStr, 10);
            
            if (!deletionsByInvite.has(inviteId)) {
              deletionsByInvite.set(inviteId, []);
            }
            deletionsByInvite.get(inviteId)!.push(guestIndex);
          });

          // Delete guests from each invite
          const deletePromises = Array.from(deletionsByInvite.entries()).map(async ([inviteId, guestIndices]) => {
            const invite = invites.find(inv => inv.id === inviteId);
            if (!invite) return;

            // Sort indices in descending order to avoid index shifting issues
            const sortedIndices = [...guestIndices].sort((a, b) => b - a);
            
            // Create updated guests array without deleted guests
            let updatedGuests = [...invite.guests];
            sortedIndices.forEach(index => {
              updatedGuests.splice(index, 1);
            });

            // Update invite via PUT
            const url = getApiUrl(`updateInvite?id=${inviteId}`);
            const response = await fetch(url, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                guests: updatedGuests
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || errorData.details || 'Failed to delete guests');
            }

            return await response.json();
          });

          await Promise.all(deletePromises);

          // Refresh invites from API
          const url = getApiUrl('listInvites');
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const invitesWithGuests = data.map((invite: Invite) => ({
              ...invite,
              guests: invite.guests || []
            }));
            setInvites(invitesWithGuests);
          }

          setBulkDeleteMode(false);
          setSelectedGuests(new Set());
          showToast(`${selectedCount} convidado(s) excluído(s) com sucesso!`, 'success');
        } catch (error) {
          console.error('Error deleting guests:', error);
          showToast(`Erro ao excluir convidados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
        }
      }
    );
  };

  const handleBulkDeleteInvites = () => {
    const selectedCount = selectedInvites.size;
    if (selectedCount === 0) {
      showToast('Nenhum convite selecionado.', 'error');
      return;
    }

    const invitesToDelete = new Set(selectedInvites);
    
    showConfirmation(
      `Tem certeza que deseja excluir ${selectedCount} convite(s)?`,
      async () => {
        try {
          const deletePromises = Array.from(invitesToDelete).map(async (inviteId) => {
            const url = getApiUrl(`deleteInvite?id=${inviteId}`);
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || errorData.details || 'Failed to delete invite');
            }

            return inviteId;
          });

          await Promise.all(deletePromises);

          // Remove invites from state
          setInvites(prevInvites => prevInvites.filter(inv => !invitesToDelete.has(inv.id || '')));
          
          setBulkDeleteMode(false);
          setSelectedInvites(new Set());
          showToast(`${selectedCount} convite(s) excluído(s) com sucesso!`, 'success');
        } catch (error) {
          console.error('Error deleting invites:', error);
          showToast(`Erro ao excluir convites: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
        }
      }
    );
  };

  if (loadingInvites) {
    return (
      <div className="admin-attending-list">
        <div style={{ padding: '20px', textAlign: 'center' }}>Carregando convites...</div>
      </div>
    );
  }

  return (
    <div className="admin-attending-list">
      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'convidados' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('convidados');
            setBulkDeleteMode(false);
            setSelectedGuests(new Set());
            setSelectedInvites(new Set());
          }}
        >
          Convidados
        </button>
        <button
          className={`tab-button ${activeTab === 'convites' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('convites');
            setBulkDeleteMode(false);
            setSelectedGuests(new Set());
            setSelectedInvites(new Set());
          }}
        >
          Convites
        </button>
        <button
          className={`tab-button ${activeTab === 'importar' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('importar');
            setBulkDeleteMode(false);
            setSelectedGuests(new Set());
            setSelectedInvites(new Set());
          }}
        >
          Importar Lista
        </button>
        <button
          className={`tab-button ${activeTab === 'configuracoes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('configuracoes');
            setBulkDeleteMode(false);
            setSelectedGuests(new Set());
            setSelectedInvites(new Set());
          }}
        >
          Configurações
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Tab Convidados */}
        {activeTab === 'convidados' && (
          <>
            {invites.length > 0 && (
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
                  <>
                    <div className="stats-row">
                      <div className="stat-item">
                        <div className="stat-label"># Convidados</div>
                        <div className="stat-value">{stats.totalGuests}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label"># Pendentes</div>
                        <div className="stat-value">{stats.pendentes}</div>
                      </div>
                      <div className="stat-item stat-confirmed">
                        <div className="stat-label"># Confirmados</div>
                        <div className="stat-value">{stats.confirmados}</div>
                      </div>
                      <div className="stat-item stat-not-attending">
                        <div className="stat-label"># Não comparecerão</div>
                        <div className="stat-value">{stats.naoComparecerao}</div>
                      </div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-item">
                        <div className="stat-label"># Mulheres</div>
                        <div className="stat-value">{stats.mulheres}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label"># Crianças</div>
                        <div className="stat-value">{stats.criancas}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="guests-table-section">
              {!bulkDeleteMode ? (
                <div className="bulk-delete-controls">
                  <button
                    type="button"
                    onClick={handleToggleBulkDeleteMode}
                    className="bulk-delete-button"
                  >
                    <span className="button-icon">✓</span>
                    Marcar para Exclusão
                  </button>
                </div>
              ) : (
                <div className="bulk-delete-controls">
                  <button
                    type="button"
                    onClick={handleCancelBulkDelete}
                    className="bulk-delete-cancel-button"
                  >
                    Cancelar Exclusão
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteGuests}
                    className="bulk-delete-confirm-button"
                    disabled={selectedGuests.size === 0}
                  >
                    <span className="button-icon">🗑️</span>
                    Excluir ({selectedGuests.size})
                  </button>
                </div>
              )}
              <table className="guests-list-table">
                <thead>
                  <tr>
                    {bulkDeleteMode && (
                      <th className="checkbox-header">
                        <input
                          type="checkbox"
                          checked={selectedGuests.size > 0 && selectedGuests.size === getAllGuests().length}
                          onChange={handleSelectAllGuests}
                          className="checkbox-input"
                        />
                      </th>
                    )}
                    <th>Nome do Convite</th>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Situação</th>
                    <th>Mesa</th>
                  </tr>
                </thead>
                <tbody>
                  {getAllGuests().map((guest, index) => {
                    const isUpdating = updatingGuest?.inviteId === guest.inviteId && updatingGuest?.guestIndex === guest.guestIndex;
                    const invite = invites.find(inv => inv.id === guest.inviteId);
                    const isSelected = selectedGuests.has(guest.guestKey);
                    
                    return (
                      <tr key={`${guest.inviteId}-${index}`} className={isSelected ? 'row-selected' : ''}>
                        {bulkDeleteMode && (
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleGuestSelection(guest.guestKey)}
                              className="checkbox-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td>
                          <button
                            className="invite-name-link"
                            onClick={() => handleInviteClick(invite!)}
                            disabled={bulkDeleteMode}
                          >
                            {guest.inviteNome}
                          </button>
                        </td>
                        <td>{guest.nome}</td>
                        <td>{guest.telefone}</td>
                        <td>
                          <select
                            className="guest-field-select"
                            value={guest.situacao || ''}
                            onChange={(e) => updateGuestField(guest.inviteId, guest.guestIndex, 'situacao', e.target.value)}
                            disabled={isUpdating || !guest.inviteId || bulkDeleteMode}
                          >
                            <option value="">Selecione</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Não comparecerá">Não comparecerá</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="guest-field-input"
                            value={guest.mesa || ''}
                            onBlur={(e) => updateGuestField(guest.inviteId, guest.guestIndex, 'mesa', e.target.value)}
                            disabled={isUpdating || !guest.inviteId || bulkDeleteMode}
                            placeholder="Número da mesa"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab Convites */}
        {activeTab === 'convites' && (
          <>
            <div className="export-section">
              <button
                type="button"
                onClick={handleExportToExcel}
                className="export-button"
              >
                <span className="button-icon">📥</span>
                Exportar para Excel
              </button>
              {!bulkDeleteMode ? (
                <button
                  type="button"
                  onClick={handleToggleBulkDeleteMode}
                  className="bulk-delete-button"
                  style={{ marginLeft: '10px' }}
                >
                  <span className="button-icon">✓</span>
                  Marcar para Exclusão
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
                    onClick={handleBulkDeleteInvites}
                    className="bulk-delete-confirm-button"
                    disabled={selectedInvites.size === 0}
                    style={{ marginLeft: '10px' }}
                  >
                    <span className="button-icon">🗑️</span>
                    Excluir ({selectedInvites.size})
                  </button>
                </>
              )}
            </div>
            <div className="invites-table-section">
              <table className="invites-list-table">
                <thead>
                  <tr>
                    {bulkDeleteMode && (
                      <th className="checkbox-header">
                        <input
                          type="checkbox"
                          checked={selectedInvites.size > 0 && selectedInvites.size === getSortedInvites().filter(inv => inv.id).length}
                          onChange={handleSelectAllInvites}
                          className="checkbox-input"
                        />
                      </th>
                    )}
                    <th>Nome do Convite</th>
                    <th>Telefone</th>
                    <th>Grupo</th>
                    <th>Observação</th>
                    {!bulkDeleteMode && <th>Excluir</th>}
                  </tr>
                </thead>
                <tbody>
                  {getSortedInvites().map((invite) => {
                    const isSelected = invite.id ? selectedInvites.has(invite.id) : false;
                    return (
                      <tr
                        key={invite.id || invite.nomeDoConvite}
                        onClick={() => !bulkDeleteMode && handleInviteClick(invite)}
                        className={`invite-row-clickable ${isSelected ? 'row-selected' : ''}`}
                      >
                        {bulkDeleteMode && (
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => invite.id && handleToggleInviteSelection(invite.id)}
                              className="checkbox-input"
                              onClick={(e) => e.stopPropagation()}
                              disabled={!invite.id}
                            />
                          </td>
                        )}
                        <td>{invite.nomeDoConvite || 'Sem nome'}</td>
                        <td>{invite.ddi && invite.telefone ? `${invite.ddi} ${invite.telefone}` : (invite.telefone || 'Não informado')}</td>
                        <td>{invite.grupo || 'Não informado'}</td>
                        <td className="observacao-cell">{invite.observacao || 'Sem observação'}</td>
                        {!bulkDeleteMode && (
                          <td className="delete-action-cell">
                            <button
                              className="delete-invite-button"
                              onClick={(e) => handleDeleteInvite(invite, e)}
                              title="Excluir convite"
                            >
                              <span className="button-icon">🗑️</span>
                              <span>Excluir</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab Importar Lista */}
        {activeTab === 'importar' && (
          <>
            {importedInvites.length === 0 ? (
              <div className="upload-section">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="upload-button"
                >
                  Carregar Arquivo Excel
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <>
                <div className="upload-section">
                  <button
                    type="button"
                    onClick={handleSaveImportedInvites}
                    className="upload-button"
                    disabled={savingInvites}
                  >
                    {savingInvites ? 'Salvando...' : 'Salvar Convites'}
                  </button>
                </div>
                <div className="invites-section">
                  <div className="invites-list">
                    {importedInvites.map((invite, inviteIndex) => (
                      <InviteCard
                        key={inviteIndex}
                        invite={invite}
                        inviteIndex={inviteIndex}
                        disableApiSave={true}
                        onInviteUpdate={(inviteIdx, field, value) => {
                          setImportedInvites(prevInvites => {
                            const updated = [...prevInvites];
                            updated[inviteIdx] = { ...updated[inviteIdx], [field]: value };
                            return updated;
                          });
                        }}
                        onGuestUpdate={(inviteIdx, guestIdx, field, value) => {
                          setImportedInvites(prevInvites => {
                            const updated = [...prevInvites];
                            updated[inviteIdx] = {
                              ...updated[inviteIdx],
                              guests: updated[inviteIdx].guests.map((guest, idx) =>
                                idx === guestIdx ? { ...guest, [field]: value } : guest
                              )
                            };
                            return updated;
                          });
                        }}
                        onInviteSaved={(inviteIdx, savedInvite) => {
                          // In import mode, just update local state
                          setImportedInvites(prevInvites => {
                            const updated = [...prevInvites];
                            updated[inviteIdx] = savedInvite;
                            return updated;
                          });
                        }}
                        onInviteDeleted={(inviteIdx, inviteId) => {
                          setImportedInvites(prevInvites => {
                            return prevInvites.filter((_, idx) => idx !== inviteIdx);
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
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
                checked={showConfirmationForm}
                onChange={handleToggle}
                disabled={loading || updating}
                className="toggle-input"
              />
              <span className="toggle-text">Mostrar Formulário de Confirmação de Presença?</span>
            </label>
          </div>
        )}
      </div>

      {/* Invite Popup */}
      {showInvitePopup && selectedInvite && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Detalhes do Convite</h2>
              <button className="popup-close" onClick={handleClosePopup}>×</button>
            </div>
            <div className="popup-body">
              <InviteCard
                invite={selectedInvite}
                inviteIndex={0}
                onInviteUpdate={() => {}}
                onGuestUpdate={() => {}}
                onInviteSaved={handleInviteSavedInPopup}
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
    </div>
  );
};

export default AdminAttendingList;
