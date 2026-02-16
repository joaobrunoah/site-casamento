import React, { useMemo } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumber } from 'react-phone-number-input';

export interface Guest {
  nome: string;
  genero: string;
  faixaEtaria: string;
  custo: string;
  situacao: string;
  mesa: string;
}

export interface Invite {
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
}

const InviteCard: React.FC<InviteCardProps> = ({ invite, inviteIndex, onInviteUpdate, onGuestUpdate }) => {
  const handleInviteFieldChange = (field: keyof Invite, value: string) => {
    onInviteUpdate(inviteIndex, field, value);
  };

  const handleGuestFieldChange = (guestIndex: number, field: keyof Guest, value: string) => {
    onGuestUpdate(inviteIndex, guestIndex, field, value);
  };

  // Clean phone number: remove formatting like (XX) XXXX-XXXX or (XX) XXXXX-XXXX
  const cleanPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  };

  // Combine DDI and Telefone into international phone format
  const phoneValue = useMemo(() => {
    let cleanTelefone = '';
    let ddiCode = '';

    // Clean telefone if it exists
    if (invite.telefone) {
      cleanTelefone = cleanPhoneNumber(invite.telefone);
    }

    // Get DDI code
    if (invite.ddi) {
      ddiCode = cleanPhoneNumber(invite.ddi);
    }

    // If telefone exists but no DDI, assume it's a Brazilian number and add +55
    if (cleanTelefone && !ddiCode) {
      // Check if it's already in format (XX) XXXX-XXXX or (XX) XXXXX-XXXX
      // Clean it and prepend +55
      return `+55${cleanTelefone}`;
    }

    // If both exist, combine them
    if (ddiCode && cleanTelefone) {
      return `+${ddiCode}${cleanTelefone}`;
    }

    // If only DDI exists
    if (ddiCode) {
      return `+${ddiCode}`;
    }

    return '';
  }, [invite.ddi, invite.telefone]);

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
        // If parsing fails, try to extract manually
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

  return (
    <div className="invite-card">
      <div className="invite-header">
        <div className="invite-details">
          <div className="invite-detail-row">
            <div className="invite-detail">
              <label className="detail-label">Nome do Convite:</label>
              <input
                type="text"
                className="detail-input"
                value={invite.nomeDoConvite || ''}
                onChange={(e) => handleInviteFieldChange('nomeDoConvite', e.target.value)}
                placeholder="Sem nome"
              />
            </div>
            <div className="invite-detail phone-field">
              <label className="detail-label">Telefone:</label>
              <PhoneInput
                international
                defaultCountry="BR"
                value={phoneValue}
                onChange={handlePhoneChange}
                className="phone-input-wrapper"
              />
            </div>
            <div className="invite-detail">
              <label className="detail-label">Grupo:</label>
              <select
                className="detail-input"
                value={invite.grupo || ''}
                onChange={(e) => handleInviteFieldChange('grupo', e.target.value)}
              >
                <option value="">Selecione um grupo</option>
                <option value="Amigos">Amigos</option>
                <option value="Amigos do noivo">Amigos do noivo</option>
                <option value="Amigos da noiva">Amigos da noiva</option>
                <option value="Família do noivo">Família do noivo</option>
                <option value="Família da noiva">Família da noiva</option>
                <option value="Padrinhos">Padrinhos</option>
              </select>
            </div>
          </div>
          <div className="invite-detail">
            <label className="detail-label">Observação:</label>
            <input
              type="text"
              className="detail-input"
              value={invite.observacao || ''}
              onChange={(e) => handleInviteFieldChange('observacao', e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="guests-section">
        <div className="guests-title">Convidados ({invite.guests.length})</div>
        {invite.guests.length > 0 ? (
          <div className="guests-table-container">
            <table className="guests-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Gênero</th>
                  <th>Faixa Etária</th>
                  <th>Custo</th>
                  <th>Situação</th>
                  <th>Mesa</th>
                </tr>
              </thead>
              <tbody>
                {invite.guests.map((guest, guestIndex) => (
                  <tr key={guestIndex}>
                    <td>
                      <input
                        type="text"
                        className="guest-input"
                        value={guest.nome || ''}
                        onChange={(e) => handleGuestFieldChange(guestIndex, 'nome', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="guest-input"
                        value={guest.genero || ''}
                        onChange={(e) => handleGuestFieldChange(guestIndex, 'genero', e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="F">F</option>
                        <option value="M">M</option>
                        <option value="NB">NB</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="guest-input"
                        value={guest.faixaEtaria || ''}
                        onChange={(e) => handleGuestFieldChange(guestIndex, 'faixaEtaria', e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="Adulto">Adulto</option>
                        <option value="Adolescente">Adolescente</option>
                        <option value="Criança">Criança</option>
                        <option value="Criança de Colo">Criança de Colo</option>
                        <option value="Idoso">Idoso</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="guest-input"
                        value={guest.custo || ''}
                        onChange={(e) => handleGuestFieldChange(guestIndex, 'custo', e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="Inteira">Inteira</option>
                        <option value="Meia">Meia</option>
                        <option value="Gratuita">Gratuita</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="guest-input"
                        value={guest.situacao || ''}
                        onChange={(e) => handleGuestFieldChange(guestIndex, 'situacao', e.target.value)}
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
                        className="guest-input"
                        value={guest.mesa || ''}
                        onChange={(e) => handleGuestFieldChange(guestIndex, 'mesa', e.target.value)}
                        min="0"
                        step="1"
                        placeholder="Número da mesa"
                      />
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
