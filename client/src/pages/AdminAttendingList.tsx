import React, { useState, useRef, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import * as XLSX from 'xlsx';
import InviteCard, { Invite, Guest } from '../components/InviteCard';
import { getApiUrl } from '../utils/api';
import './AdminAttendingList.css';

const AdminAttendingList: React.FC = () => {
  const { showConfirmationForm, updateShowConfirmationForm, loading } = useConfig();
  const [updating, setUpdating] = useState<boolean>(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [statsExpanded, setStatsExpanded] = useState<boolean>(false);
  const [loadingInvites, setLoadingInvites] = useState<boolean>(true);
  const [savingInvites, setSavingInvites] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = async () => {
    setUpdating(true);
    try {
      await updateShowConfirmationForm(!showConfirmationForm);
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Erro ao atualizar configuração. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is Excel format
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
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
          alert('O arquivo Excel deve ter pelo menos 3 linhas (linha 1 vazia, linha 2 com cabeçalhos, linha 3+ com dados).');
          return;
        }

        // Skip first line, use second line as headers, data starts from third line
        const dataRows = rawData.slice(2);

        // Parse rows and group guests under invites
        // First 5 columns are invite fields, rest are guest fields
        // New invite is only created when "Nome do Convite" (column 0) is filled
        const parsedInvites: Invite[] = [];
        let currentInvite: Invite | null = null;

        // Helper function to clean phone number
        const cleanPhoneNumber = (ddi: string, telefone: string): { ddi: string; telefone: string } => {
          let cleanedDdi = ddi || '';
          let cleanedTelefone = telefone || '';
          
          // If telefone has formatting like (XX) XXXX-XXXX or (XX) XXXXX-XXXX
          if (cleanedTelefone && /^\(?\d{2}\)?\s*\d{4,5}-?\d{4}$/.test(cleanedTelefone)) {
            // Clean the telefone (remove all non-digit characters)
            const cleanTelefone = cleanedTelefone.replace(/\D/g, '');
            // If no DDI, assume it's Brazilian and set DDI to +55
            if (!cleanedDdi || cleanedDdi.trim() === '') {
              cleanedDdi = '+55';
            }
            cleanedTelefone = cleanTelefone;
          } else if (cleanedTelefone && !cleanedDdi) {
            // If telefone exists but no DDI, check if it's already a clean number
            const cleanTelefone = cleanedTelefone.replace(/\D/g, '');
            if (cleanTelefone.length === 10 || cleanTelefone.length === 11) {
              // Likely a Brazilian number, add +55
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
          // Check if row has any data
          const hasData = row.some(cell => {
            const strValue = String(cell || '').trim();
            return strValue !== '' && strValue !== 'null' && strValue !== 'undefined';
          });

          if (!hasData) continue;

          // Extract invite fields (first 5 columns)
          const inviteFields = row.slice(0, 5).map(cell => String(cell || '').trim());
          const nomeDoConvite = inviteFields[0] || '';
          
          // Extract guest fields (remaining columns)
          const guestFields = row.slice(5).map(cell => String(cell || '').trim());
          const guestNome = guestFields[0] || '';
          const hasGuestData = guestFields.some(field => field !== '');

          // New invite is only created when "Nome do Convite" is filled
          if (nomeDoConvite) {
            // Save previous invite if it exists and has guests
            if (currentInvite && currentInvite.guests.length > 0) {
              parsedInvites.push(currentInvite);
            }

            // Clean phone number from this row (first row of the invite)
            const phoneData = cleanPhoneNumber(inviteFields[1] || '', inviteFields[2] || '');

            // Create new invite with phone and grupo from this row
            currentInvite = {
              nomeDoConvite: nomeDoConvite,
              ddi: phoneData.ddi,
              telefone: phoneData.telefone,
              grupo: inviteFields[3] || '', // Grupo only from first row
              observacao: inviteFields[4] || '', // Initial observacao from first row
              guests: []
            };
          }

          // If there's guest data, add guest to current invite
          if (hasGuestData && currentInvite) {
            // Collect observations from this row (phone numbers, observacao)
            const rowObservations: string[] = [];
            
            // If this row has phone number (and it's not the first row with nomeDoConvite)
            if (!nomeDoConvite) {
              const rowDdi = inviteFields[1] || '';
              const rowTelefone = inviteFields[2] || '';
              
              if (rowTelefone) {
                const phoneText = formatPhoneForObservacao(rowDdi, rowTelefone);
                if (phoneText) {
                  rowObservations.push(phoneText);
                }
              }
              
              // Add observacao from this row if it exists
              if (inviteFields[4]) {
                rowObservations.push(inviteFields[4]);
              }
            }
            
            // Build observation line with guest name
            if (rowObservations.length > 0 && guestNome) {
              const observationLine = `${guestNome} (${rowObservations.join(', ')})`;
              if (currentInvite.observacao) {
                currentInvite.observacao += '\n' + observationLine;
              } else {
                currentInvite.observacao = observationLine;
              }
            } else if (rowObservations.length > 0) {
              // If no guest name but has observations
              const observationLine = rowObservations.join(', ');
              if (currentInvite.observacao) {
                currentInvite.observacao += '\n' + observationLine;
              } else {
                currentInvite.observacao = observationLine;
              }
            }

            // Add guest to the invite
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

        // Add the last invite if it exists and has guests
        if (currentInvite && currentInvite.guests.length > 0) {
          parsedInvites.push(currentInvite);
        }
        
        if (parsedInvites.length === 0) {
          alert('O arquivo Excel não contém dados válidos após a linha de cabeçalhos.');
          return;
        }
        
        setInvites(parsedInvites);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Erro ao processar o arquivo Excel. Verifique se o arquivo está no formato correto.');
      }
    };

    reader.onerror = () => {
      alert('Erro ao ler o arquivo. Tente novamente.');
    };

    reader.readAsBinaryString(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportToExcel = () => {
    if (invites.length === 0) {
      alert('Não há convites para exportar.');
      return;
    }

    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data array
      const data: (string | number)[][] = [];
      
      // Row 1: Empty
      data.push([]);
      
      // Row 2: Headers
      // ID, Nome do Convite, DDI, Telefone, Grupo, Observação, Nome, Gênero, Faixa Etária, Custo, Situação, Mesa
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
      
      // Row 3+: Data rows
      invites.forEach((invite) => {
        if (invite.guests.length === 0) {
          // If no guests, still add a row with invite info
          data.push([
            invite.id || '',
            invite.nomeDoConvite || '',
            invite.ddi || '',
            invite.telefone || '',
            invite.grupo || '',
            invite.observacao || '',
            '', // Nome
            '', // Gênero
            '', // Faixa Etária
            '', // Custo
            '', // Situação
            ''  // Mesa
          ]);
        } else {
          // First row: invite info + first guest
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
          
          // Subsequent rows: empty invite fields + other guests
          for (let i = 1; i < invite.guests.length; i++) {
            data.push([
              '', // ID (empty for subsequent rows)
              '', // Nome do Convite
              '', // DDI
              '', // Telefone
              '', // Grupo
              '', // Observação
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
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Convites');
      
      // Generate filename with current date
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `convites_${dateStr}.xlsx`;
      
      // Write file
      XLSX.writeFile(workbook, filename);
      
      alert(`Convites exportados com sucesso! Arquivo: ${filename}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Erro ao exportar convites. Tente novamente.');
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
        // Ensure guests array exists for each invite
        const invitesWithGuests = data.map((invite: Invite) => ({
          ...invite,
          guests: invite.guests || []
        }));
        setInvites(invitesWithGuests);
      } catch (error) {
        console.error('Error fetching invites:', error);
        alert('Erro ao carregar convites do banco de dados.');
      } finally {
        setLoadingInvites(false);
      }
    };

    fetchInvites();
  }, []);

  // Save all invites to database
  const handleSaveInvites = async () => {
    if (invites.length === 0) {
      alert('Não há convites para salvar.');
      return;
    }

    setSavingInvites(true);
    try {
      const savePromises = invites.map(async (invite, index) => {
        try {
          const url = getApiUrl('postInvite');
          console.log(`Saving invite ${index + 1}/${invites.length}:`, invite);
          
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
      
      // Update invites with their IDs (in case new invites were created)
      setInvites(savedInvites.map((saved, index) => ({
        ...saved,
        guests: saved.guests || invites[index].guests || []
      })));

      alert(`Convites salvos com sucesso! Total: ${savedInvites.length}`);
    } catch (error) {
      console.error('Error saving invites:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao salvar convites:\n\n${errorMessage}\n\nVerifique o console para mais detalhes.`);
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

  if (loadingInvites) {
    return (
      <div className="admin-attending-list">
        <div style={{ padding: '20px', textAlign: 'center' }}>Carregando convites...</div>
      </div>
    );
  }

  return (
    <div className="admin-attending-list">
      {invites.length > 0 && (
        <div 
          className={`stats-section ${statsExpanded ? 'expanded' : 'collapsed'}`}
        >
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
      <div className="config-section">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showConfirmationForm}
            onChange={handleToggle}
            disabled={loading || updating}
            className="toggle-input"
          />
          <span className="toggle-text">Mostrar Confirmação de Presença?</span>
        </label>
      </div>
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
        {invites.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleSaveInvites}
              className="upload-button"
              disabled={savingInvites}
              style={{ marginLeft: '10px' }}
            >
              {savingInvites ? 'Salvando...' : 'Salvar Convites'}
            </button>
            <button
              type="button"
              onClick={handleExportToExcel}
              className="upload-button export-button"
              style={{ marginLeft: '10px' }}
            >
              Exportar para Excel
            </button>
          </>
        )}
      </div>
      
      {invites.length > 0 && (
        <div className="invites-section">
          <div className="invites-list">
            {invites.map((invite, inviteIndex) => (
              <InviteCard
                key={invite.id || inviteIndex}
                invite={invite}
                inviteIndex={inviteIndex}
                onInviteUpdate={(inviteIdx, field, value) => {
                  setInvites(prevInvites => {
                    const updated = [...prevInvites];
                    updated[inviteIdx] = { ...updated[inviteIdx], [field]: value };
                    return updated;
                  });
                }}
                onGuestUpdate={(inviteIdx, guestIdx, field, value) => {
                  setInvites(prevInvites => {
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
                  setInvites(prevInvites => {
                    const updated = [...prevInvites];
                    updated[inviteIdx] = savedInvite;
                    return updated;
                  });
                }}
                onInviteDeleted={(inviteIdx, inviteId) => {
                  setInvites(prevInvites => {
                    return prevInvites.filter((_, idx) => idx !== inviteIdx);
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendingList;
