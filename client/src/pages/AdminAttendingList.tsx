import React, { useState, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import * as XLSX from 'xlsx';
import InviteCard, { Invite, Guest } from '../components/InviteCard';
import './AdminAttendingList.css';

const AdminAttendingList: React.FC = () => {
  const { showConfirmationForm, updateShowConfirmationForm, loading } = useConfig();
  const [updating, setUpdating] = useState<boolean>(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [statsExpanded, setStatsExpanded] = useState<boolean>(false);
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
        const parsedInvites: Invite[] = [];
        let currentInvite: Invite | null = null;

        for (const row of dataRows) {
          // Check if row has any data
          const hasData = row.some(cell => {
            const strValue = String(cell || '').trim();
            return strValue !== '' && strValue !== 'null' && strValue !== 'undefined';
          });

          if (!hasData) continue;

          // Extract invite fields (first 5 columns)
          const inviteFields = row.slice(0, 5).map(cell => String(cell || '').trim());
          const hasInviteData = inviteFields.some(field => field !== '');

          // Extract guest fields (remaining columns)
          const guestFields = row.slice(5).map(cell => String(cell || '').trim());
          const hasGuestData = guestFields.some(field => field !== '');

          // If invite fields are not empty, create a new invite
          if (hasInviteData) {
            // Save previous invite if it exists and has guests
            if (currentInvite && currentInvite.guests.length > 0) {
              parsedInvites.push(currentInvite);
            }

            // Clean phone number if it's in format (XX) XXXX-XXXX or (XX) XXXXX-XXXX
            let ddi = inviteFields[1] || '';
            let telefone = inviteFields[2] || '';
            
            // If telefone has formatting like (XX) XXXX-XXXX or (XX) XXXXX-XXXX
            // This regex matches: (XX) XXXX-XXXX, (XX) XXXXX-XXXX, (XX)XXXX-XXXX, etc.
            if (telefone && /^\(?\d{2}\)?\s*\d{4,5}-?\d{4}$/.test(telefone)) {
              // Clean the telefone (remove all non-digit characters)
              const cleanTelefone = telefone.replace(/\D/g, '');
              // If no DDI, assume it's Brazilian and set DDI to +55
              if (!ddi || ddi.trim() === '') {
                ddi = '+55';
              }
              telefone = cleanTelefone;
            } else if (telefone && !ddi) {
              // If telefone exists but no DDI, and it's not in the formatted pattern,
              // check if it's already a clean number (10 or 11 digits for Brazil)
              const cleanTelefone = telefone.replace(/\D/g, '');
              if (cleanTelefone.length === 10 || cleanTelefone.length === 11) {
                // Likely a Brazilian number, add +55
                ddi = '+55';
                telefone = cleanTelefone;
              }
            }

            // Create new invite
            currentInvite = {
              nomeDoConvite: inviteFields[0] || '',
              ddi: ddi,
              telefone: telefone,
              grupo: inviteFields[3] || '',
              observacao: inviteFields[4] || '',
              guests: []
            };
          }

          // If there's guest data, add guest to current invite
          // (guests belong to the last non-empty invite above)
          if (hasGuestData) {
            if (!currentInvite) {
              // If no invite exists yet, skip this guest row
              continue;
            }
            const guest: Guest = {
              nome: guestFields[0] || '',
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
      </div>
      
      {invites.length > 0 && (
        <div className="invites-section">
          <div className="invites-list">
            {invites.map((invite, inviteIndex) => (
              <InviteCard
                key={inviteIndex}
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendingList;
