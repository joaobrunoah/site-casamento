import React, { useMemo, useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumber } from 'react-phone-number-input';
import { getApiUrl } from '../utils/api';

export interface Guest {
  id?: string;
  nome: string;
  genero: string;
  faixaEtaria: string;
  custo: string;
  situacao: string;
  mesa: string;
}

export interface Invite {
  id?: string;
  nomeDoConvite: string;
  ddi: string;
  telefone: string;
  grupo: string;
  observacao: string;
  guests: Guest[];
}

interface InviteCardProps {
  invite: Invite;
  inviteIndex: number;
  onInviteUpdate: (inviteIndex: number, field: keyof Invite, value: string) => void;
  onGuestUpdate: (inviteIndex: number, guestIndex: number, field: keyof Guest, value: string) => void;
  onInviteSaved?: (inviteIndex: number, savedInvite: Invite) => void;
  onInviteDeleted?: (inviteIndex: number, inviteId: string) => void;
  disableApiSave?: boolean; // If true, save only updates local state without API call
}

const InviteCard: React.FC<InviteCardProps> = ({ 
  invite, 
  inviteIndex, 
  onInviteUpdate, 
  onGuestUpdate,
  onInviteSaved,
  onInviteDeleted,
  disableApiSave = false
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [originalInvite, setOriginalInvite] = useState<Invite>({ ...invite });
  const [editedInvite, setEditedInvite] = useState<Invite>({ ...invite });

  // Sync originalInvite when invite prop changes (e.g., after loading from database)
  // Only update when not editing to avoid overwriting user's edits
  useEffect(() => {
    if (!isEditing && invite.id) {
      const inviteString = JSON.stringify(invite);
      const originalString = JSON.stringify(originalInvite);
      // Only update if the invite actually changed
      if (inviteString !== originalString) {
        setOriginalInvite(deepClone(invite));
        setEditedInvite(deepClone(invite));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite, isEditing]);

  // Deep clone function
  const deepClone = <T,>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };

  const handleEdit = () => {
    // Copy original to edited when entering edit mode
    setEditedInvite(deepClone(originalInvite));
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Revert to original values but keep edited values in memory
    setIsEditing(false);
    // The editedInvite state is kept, so if user edits again, their changes are preserved
  };

  const handleSave = async () => {
    if (disableApiSave) {
      // In import mode, just update local state without API call
      setOriginalInvite(deepClone(editedInvite));
      setIsEditing(false);
      
      // Notify parent component
      if (onInviteSaved) {
        onInviteSaved(inviteIndex, editedInvite);
      }
      return;
    }

    if (!invite.id) {
      alert('Erro: Convite não possui ID. Não é possível salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const url = getApiUrl('postInvite');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: invite.id,
          nomeDoConvite: editedInvite.nomeDoConvite,
          ddi: editedInvite.ddi,
          telefone: editedInvite.telefone,
          grupo: editedInvite.grupo,
          observacao: editedInvite.observacao,
          guests: editedInvite.guests || []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Failed to save invite');
      }

      // After saving, fetch the updated invite
      const getUrl = getApiUrl(`getInvite?id=${invite.id}`);
      const getResponse = await fetch(getUrl);
      
      if (!getResponse.ok) {
        throw new Error('Failed to fetch updated invite');
      }

      const savedInvite = await getResponse.json();
      
      // Update original invite with saved data
      const updatedInvite: Invite = {
        id: savedInvite.id,
        nomeDoConvite: savedInvite.nomeDoConvite || '',
        ddi: savedInvite.ddi || '',
        telefone: savedInvite.telefone || '',
        grupo: savedInvite.grupo || '',
        observacao: savedInvite.observacao || '',
        guests: savedInvite.guests || []
      };

      setOriginalInvite(updatedInvite);
      setIsEditing(false);
      
      // Notify parent component
      if (onInviteSaved) {
        onInviteSaved(inviteIndex, updatedInvite);
      }
    } catch (error) {
      console.error('Error saving invite:', error);
      alert(`Erro ao salvar convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteFieldChange = (field: keyof Invite, value: string) => {
    setEditedInvite(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGuestFieldChange = (guestIndex: number, field: keyof Guest, value: string) => {
    setEditedInvite(prev => ({
      ...prev,
      guests: prev.guests.map((guest, idx) =>
        idx === guestIndex ? { ...guest, [field]: value } : guest
      )
    }));
  };

  const handleDeleteGuest = (guestIndex: number) => {
    setEditedInvite(prev => ({
      ...prev,
      guests: prev.guests.filter((_, idx) => idx !== guestIndex)
    }));
  };

  const handleAddGuest = () => {
    const newGuest: Guest = {
      nome: '',
      genero: '',
      faixaEtaria: '',
      custo: '',
      situacao: '',
      mesa: ''
    };
    setEditedInvite(prev => ({
      ...prev,
      guests: [...prev.guests, newGuest]
    }));
  };

  const handleDeleteInvite = async () => {
    if (!invite.id) {
      alert('Erro: Convite não possui ID. Não é possível excluir.');
      return;
    }

    const confirmed = window.confirm('Tem certeza que deseja excluir esse convite?');
    
    if (!confirmed) {
      return;
    }

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

      const result = await response.json();
      
      // Notify parent component
      if (onInviteDeleted) {
        onInviteDeleted(inviteIndex, invite.id);
      }
    } catch (error) {
      console.error('Error deleting invite:', error);
      alert(`Erro ao excluir convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Clean phone number: remove formatting like (XX) XXXX-XXXX or (XX) XXXXX-XXXX
  const cleanPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  // Combine DDI and Telefone into international phone format
  const phoneValue = useMemo(() => {
    const currentInvite = isEditing ? editedInvite : originalInvite;
    let cleanTelefone = '';
    let ddiCode = '';

    if (currentInvite.telefone) {
      cleanTelefone = cleanPhoneNumber(currentInvite.telefone);
    }

    if (currentInvite.ddi) {
      ddiCode = cleanPhoneNumber(currentInvite.ddi);
    }

    if (cleanTelefone && !ddiCode) {
      return `+55${cleanTelefone}`;
    }

    if (ddiCode && cleanTelefone) {
      return `+${ddiCode}${cleanTelefone}`;
    }

    if (ddiCode) {
      return `+${ddiCode}`;
    }

    return '';
  }, [isEditing ? editedInvite.ddi : originalInvite.ddi, isEditing ? editedInvite.telefone : originalInvite.telefone]);

  const handlePhoneChange = (value: string | undefined) => {
    if (value) {
      try {
        const phoneNumber = parsePhoneNumber(value);
        if (phoneNumber) {
          const countryCode = phoneNumber.countryCallingCode;
          const nationalNumber = phoneNumber.nationalNumber;
          handleInviteFieldChange('ddi', `+${countryCode}`);
          handleInviteFieldChange('telefone', nationalNumber);
        }
      } catch (error) {
        const match = value.match(/^\+?(\d{1,3})(.*)$/);
        if (match) {
          handleInviteFieldChange('ddi', `+${match[1]}`);
          handleInviteFieldChange('telefone', match[2].replace(/\D/g, ''));
        }
      }
    } else {
      handleInviteFieldChange('ddi', '');
      handleInviteFieldChange('telefone', '');
    }
  };

  const displayInvite = isEditing ? editedInvite : originalInvite;
  const isDisabled = isSaving;

  return (
    <div className="invite-card">
      {isSaving && (
        <div className="invite-loading-overlay">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Salvando...</div>
        </div>
      )}
      
      <div className="invite-header">
        <div className="invite-actions">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="invite-action-button edit-button"
                disabled={isDisabled}
              >
                <span className="button-icon">✏️</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteInvite}
                className="invite-action-button delete-button"
                disabled={isDisabled}
              >
                <span className="button-icon">🗑️</span>
                <span>Excluir</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="invite-action-button cancel-button"
                disabled={isDisabled}
              >
                <span className="button-icon">✖️</span>
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="invite-action-button save-button"
                disabled={isDisabled}
              >
                <span className="button-icon">💾</span>
                <span>Salvar</span>
              </button>
            </>
          )}
        </div>

        <div className="invite-details">
          <div className="invite-detail-row">
            <div className="invite-detail">
              <label className="detail-label">Nome do Convite:</label>
              {isEditing ? (
                <input
                  type="text"
                  className="detail-input"
                  value={displayInvite.nomeDoConvite || ''}
                  onChange={(e) => handleInviteFieldChange('nomeDoConvite', e.target.value)}
                  placeholder="Sem nome"
                  disabled={isDisabled}
                />
              ) : (
                <div className="detail-value">{displayInvite.nomeDoConvite || 'Sem nome'}</div>
              )}
            </div>
            <div className="invite-detail phone-field">
              <label className="detail-label">Telefone:</label>
              {isEditing ? (
                <PhoneInput
                  international
                  defaultCountry="BR"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  className="phone-input-wrapper"
                  disabled={isDisabled}
                />
              ) : (
                <div className="detail-value">
                  {phoneValue || displayInvite.ddi || displayInvite.telefone || 'Não informado'}
                </div>
              )}
            </div>
            <div className="invite-detail">
              <label className="detail-label">Grupo:</label>
              {isEditing ? (
                <select
                  className="detail-input"
                  value={displayInvite.grupo || ''}
                  onChange={(e) => handleInviteFieldChange('grupo', e.target.value)}
                  disabled={isDisabled}
                >
                  <option value="">Selecione um grupo</option>
                  <option value="Amigos">Amigos</option>
                  <option value="Amigos do noivo">Amigos do noivo</option>
                  <option value="Amigos da noiva">Amigos da noiva</option>
                  <option value="Família do noivo">Família do noivo</option>
                  <option value="Família da noiva">Família da noiva</option>
                  <option value="Padrinhos">Padrinhos</option>
                </select>
              ) : (
                <div className="detail-value">{displayInvite.grupo || 'Não informado'}</div>
              )}
            </div>
          </div>
          <div className="invite-detail">
            <label className="detail-label">Observação:</label>
            {isEditing ? (
              <input
                type="text"
                className="detail-input"
                value={displayInvite.observacao || ''}
                onChange={(e) => handleInviteFieldChange('observacao', e.target.value)}
                disabled={isDisabled}
              />
            ) : (
              <div className="detail-value">{displayInvite.observacao || 'Sem observação'}</div>
            )}
          </div>
        </div>
      </div>
      <div className="guests-section">
        <div className="guests-header">
          <div className="guests-title">Convidados ({displayInvite.guests.length})</div>
          {isEditing && (
            <button
              type="button"
              onClick={handleAddGuest}
              className="add-guest-button"
              disabled={isDisabled}
            >
              <span className="button-icon">➕</span>
              <span>Convidado</span>
            </button>
          )}
        </div>
        {displayInvite.guests.length > 0 ? (
          <div className="guests-table-container">
            <table className="guests-table">
              <thead>
                <tr>
                  {isEditing && <th className="delete-column"></th>}
                  <th>Nome</th>
                  <th>Gênero</th>
                  <th>Faixa Etária</th>
                  <th>Custo</th>
                  <th>Situação</th>
                  <th>Mesa</th>
                </tr>
              </thead>
              <tbody>
                {displayInvite.guests.map((guest, guestIndex) => (
                  <tr key={guestIndex}>
                    {isEditing && (
                      <td className="delete-column">
                        <button
                          type="button"
                          onClick={() => handleDeleteGuest(guestIndex)}
                          className="delete-guest-button"
                          disabled={isDisabled}
                          title="Remover convidado"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          className="guest-input"
                          value={guest.nome || ''}
                          onChange={(e) => handleGuestFieldChange(guestIndex, 'nome', e.target.value)}
                          disabled={isDisabled}
                        />
                      ) : (
                        <div className="guest-value">{guest.nome || '-'}</div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="guest-input"
                          value={guest.genero || ''}
                          onChange={(e) => handleGuestFieldChange(guestIndex, 'genero', e.target.value)}
                          disabled={isDisabled}
                        >
                          <option value="">Selecione</option>
                          <option value="F">F</option>
                          <option value="M">M</option>
                          <option value="NB">NB</option>
                        </select>
                      ) : (
                        <div className="guest-value">{guest.genero || '-'}</div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="guest-input"
                          value={guest.faixaEtaria || ''}
                          onChange={(e) => handleGuestFieldChange(guestIndex, 'faixaEtaria', e.target.value)}
                          disabled={isDisabled}
                        >
                          <option value="">Selecione</option>
                          <option value="Adulto">Adulto</option>
                          <option value="Adolescente">Adolescente</option>
                          <option value="Criança">Criança</option>
                          <option value="Criança de Colo">Criança de Colo</option>
                          <option value="Idoso">Idoso</option>
                        </select>
                      ) : (
                        <div className="guest-value">{guest.faixaEtaria || '-'}</div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="guest-input"
                          value={guest.custo || ''}
                          onChange={(e) => handleGuestFieldChange(guestIndex, 'custo', e.target.value)}
                          disabled={isDisabled}
                        >
                          <option value="">Selecione</option>
                          <option value="Inteira">Inteira</option>
                          <option value="Meia">Meia</option>
                          <option value="Gratuita">Gratuita</option>
                        </select>
                      ) : (
                        <div className="guest-value">{guest.custo || '-'}</div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="guest-input"
                          value={guest.situacao || ''}
                          onChange={(e) => handleGuestFieldChange(guestIndex, 'situacao', e.target.value)}
                          disabled={isDisabled}
                        >
                          <option value="">Selecione</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Não comparecerá">Não comparecerá</option>
                        </select>
                      ) : (
                        <div className="guest-value">{guest.situacao || '-'}</div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          className="guest-input"
                          value={guest.mesa || ''}
                          onChange={(e) => handleGuestFieldChange(guestIndex, 'mesa', e.target.value)}
                          min="0"
                          step="1"
                          placeholder="Número da mesa"
                          disabled={isDisabled}
                        />
                      ) : (
                        <div className="guest-value">{guest.mesa || '-'}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-guests">Nenhum convidado cadastrado</p>
        )}
      </div>
    </div>
  );
};

export default InviteCard;
