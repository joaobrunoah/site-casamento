import React, { useState } from 'react';
import { Invite, Guest } from '../components/InviteCard';
import { getApiUrl } from '../utils/api';
import './AttendingForm.css';

type FormState = 'search' | 'loading' | 'confirm' | 'form' | 'success';

const AttendingForm: React.FC = () => {
  const [formState, setFormState] = useState<FormState>('search');
  const [nameInput, setNameInput] = useState('');
  const [matchedInvite, setMatchedInvite] = useState<Invite | null>(null);
  const [matchedGuest, setMatchedGuest] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [guestSituations, setGuestSituations] = useState<Record<string, string>>({});
  const [intoleranciaGluten, setIntoleranciaGluten] = useState(false);
  const [intoleranciaLactose, setIntoleranciaLactose] = useState(false);
  const [intoleranciaOutroChecked, setIntoleranciaOutroChecked] = useState(false);
  const [intoleranciaOutro, setIntoleranciaOutro] = useState('');
  const [aeroportoChegada, setAeroportoChegada] = useState('');
  const [dataChegada, setDataChegada] = useState('');
  const [horaChegada, setHoraChegada] = useState('');
  const [transporteAeroportoHotel, setTransporteAeroportoHotel] = useState(false);
  const [transporteHotelFesta, setTransporteHotelFesta] = useState(false);
  const [transporteFestaHotel, setTransporteFestaHotel] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNameSearch = async () => {
    if (!nameInput.trim()) {
      setError('Por favor, digite seu nome');
      return;
    }

    setFormState('loading');
    setError(null);

    try {
      const url = getApiUrl(`searchInvitesByGuestName?name=${encodeURIComponent(nameInput.trim())}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Erro ao buscar convite');
      }

      const data = await response.json();

      if (!data.success || !data.invite) {
        setError('Nenhum convite encontrado com esse nome. Por favor, verifique o nome digitado.');
        setFormState('search');
        return;
      }

      setMatchedInvite(data.invite);
      setMatchedGuest(data.matchedGuest);
      setFormState('confirm');
      
      // Initialize guest situations from existing data
      const situations: Record<string, string> = {};
      data.invite.guests.forEach((guest: Guest) => {
        if (guest.id) {
          situations[guest.id] = guest.situacao || 'Pendente';
        }
      });
      setGuestSituations(situations);

      // Load existing confirmation data if available
      if (data.invite.intoleranciaGluten !== undefined) {
        setIntoleranciaGluten(data.invite.intoleranciaGluten);
      }
      if (data.invite.intoleranciaLactose !== undefined) {
        setIntoleranciaLactose(data.invite.intoleranciaLactose);
      }
      if (data.invite.intoleranciaOutro) {
        setIntoleranciaOutro(data.invite.intoleranciaOutro);
        setIntoleranciaOutroChecked(true);
      }
      if (data.invite.aeroportoChegada) {
        setAeroportoChegada(data.invite.aeroportoChegada);
      }
      if (data.invite.dataChegada) {
        setDataChegada(data.invite.dataChegada);
      }
      if (data.invite.horaChegada) {
        setHoraChegada(data.invite.horaChegada);
      }
      if (data.invite.transporteAeroportoHotel !== undefined) {
        setTransporteAeroportoHotel(data.invite.transporteAeroportoHotel);
      }
      if (data.invite.transporteHotelFesta !== undefined) {
        setTransporteHotelFesta(data.invite.transporteHotelFesta);
      }
      if (data.invite.transporteFestaHotel !== undefined) {
        setTransporteFestaHotel(data.invite.transporteFestaHotel);
      }
    } catch (err) {
      setError('Erro ao buscar convite. Por favor, tente novamente.');
      setFormState('search');
      console.error('Error searching invite:', err);
    }
  };

  const handleNameInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSearch();
    }
  };

  const handleConfirmIdentity = () => {
    setFormState('form');
  };

  const handleGuestSituationChange = (guestId: string, situacao: string) => {
    setGuestSituations(prev => ({
      ...prev,
      [guestId]: situacao
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!matchedInvite?.id) {
        throw new Error('Convite não encontrado');
      }

      // Prepare guest updates
      const guestUpdates = matchedInvite.guests
        .filter(guest => guest.id)
        .map(guest => ({
          id: guest.id!,
          situacao: guestSituations[guest.id!] || guest.situacao || 'Pendente'
        }));

      const url = getApiUrl('updateInviteConfirmation');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: matchedInvite.id,
          guests: guestUpdates,
          intoleranciaGluten,
          intoleranciaLactose,
          intoleranciaOutro: intoleranciaOutro.trim() || '',
          aeroportoChegada,
          dataChegada,
          horaChegada,
          transporteAeroportoHotel,
          transporteHotelFesta,
          transporteFestaHotel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao salvar confirmação');
      }

      setFormState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar confirmação. Por favor, tente novamente.');
      console.error('Error submitting form:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isGuestConfirmed = (guest: Guest): boolean => {
    return guest.situacao === 'Confirmado' || guest.situacao === 'Não comparecerá';
  };

  return (
    <div className="attending-form-container">
      {formState === 'search' && (
        <div className="attending-form-search">
          <label htmlFor="name-input" className="name-label">
            Digite seu Nome:
          </label>
          <input
            id="name-input"
            type="text"
            className="name-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyPress={handleNameInputKeyPress}
            onBlur={handleNameSearch}
            placeholder="Seu nome completo"
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      {formState === 'loading' && (
        <div className="attending-form-loading">
          <div className="loading-spinner"></div>
          <p>Buscando seu convite...</p>
        </div>
      )}

      {formState === 'confirm' && matchedInvite && matchedGuest && (
        <div className="attending-form-confirm">
          <p className="confirm-question">
            Você é <strong>{matchedGuest.nome}</strong> do convite <strong>{matchedInvite.nomeDoConvite}</strong>?
          </p>
          <div className="confirm-buttons">
            <button
              type="button"
              className="confirm-button yes"
              onClick={handleConfirmIdentity}
            >
              Sim, sou eu
            </button>
            <button
              type="button"
              className="confirm-button no"
              onClick={() => {
                setFormState('search');
                setNameInput('');
                setMatchedInvite(null);
                setMatchedGuest(null);
              }}
            >
              Não, não sou eu
            </button>
          </div>
        </div>
      )}

      {formState === 'form' && matchedInvite && (
        <form className="attending-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <label className="form-label">Nome do Convite</label>
            <div className="form-readonly">{matchedInvite.nomeDoConvite}</div>
          </div>

          <div className="form-section">
            <label className="form-label">Lista de Convidados</label>
            <table className="guests-table-form">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {matchedInvite.guests.map((guest) => (
                  <tr key={guest.id || guest.nome}>
                    <td>{guest.nome}</td>
                    <td>
                      {isGuestConfirmed(guest) ? (
                        <span className="guest-situation-readonly">{guest.situacao}</span>
                      ) : (
                        <select
                          className="guest-situation-select"
                          value={guestSituations[guest.id || ''] || 'Pendente'}
                          onChange={(e) => guest.id && handleGuestSituationChange(guest.id, e.target.value)}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Não comparecerá">Não comparecerá</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-section">
            <label className="form-label">Alguma instrução para Buffet?</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={intoleranciaGluten}
                  onChange={(e) => setIntoleranciaGluten(e.target.checked)}
                />
                <span>Intolerância a Gluten</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={intoleranciaLactose}
                  onChange={(e) => setIntoleranciaLactose(e.target.checked)}
                />
                <span>Intolerância a Lactose</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={intoleranciaOutroChecked}
                  onChange={(e) => {
                    setIntoleranciaOutroChecked(e.target.checked);
                    if (!e.target.checked) {
                      setIntoleranciaOutro('');
                    }
                  }}
                />
                <span>Outro:</span>
                <input
                  type="text"
                  className="text-input-small"
                  value={intoleranciaOutro}
                  onChange={(e) => setIntoleranciaOutro(e.target.value)}
                  placeholder="Digite qual"
                  disabled={!intoleranciaOutroChecked}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Aeroporto de Chegada (Opcional)</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="aeroporto"
                  value="CGH"
                  checked={aeroportoChegada === 'CGH'}
                  onChange={(e) => setAeroportoChegada(e.target.value)}
                />
                <span>Congonhas (CGH)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="aeroporto"
                  value="GRU"
                  checked={aeroportoChegada === 'GRU'}
                  onChange={(e) => setAeroportoChegada(e.target.value)}
                />
                <span>Guarulhos (GRU)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="aeroporto"
                  value="VCP"
                  checked={aeroportoChegada === 'VCP'}
                  onChange={(e) => setAeroportoChegada(e.target.value)}
                />
                <span>Viracopos (VCP)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="aeroporto"
                  value=""
                  checked={aeroportoChegada === ''}
                  onChange={(e) => setAeroportoChegada('')}
                />
                <span>Não vou de avião</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Data de chegada</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="dataChegada"
                  value="12/06"
                  checked={dataChegada === '12/06'}
                  onChange={(e) => setDataChegada(e.target.value)}
                />
                <span>12/06</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="dataChegada"
                  value="13/06"
                  checked={dataChegada === '13/06'}
                  onChange={(e) => setDataChegada(e.target.value)}
                />
                <span>13/06</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Hora da chegada</label>
            <input
              type="time"
              className="time-input"
              value={horaChegada}
              onChange={(e) => setHoraChegada(e.target.value)}
              min="00:00"
              max="23:59"
            />
          </div>

          <div className="form-section">
            <label className="form-label">Pretende usar nosso transporte?</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transporteAeroportoHotel}
                  onChange={(e) => setTransporteAeroportoHotel(e.target.checked)}
                />
                <span>Van do aeroporto para o hotel</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transporteHotelFesta}
                  onChange={(e) => setTransporteHotelFesta(e.target.checked)}
                />
                <span>Van do hotel para a festa</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transporteFestaHotel}
                  onChange={(e) => setTransporteFestaHotel(e.target.checked)}
                />
                <span>Van de volta da festa para o hotel</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Confirmar'}
          </button>
        </form>
      )}

      {formState === 'success' && (
        <div className="attending-form-success">
          <h2>Confirmação enviada com sucesso!</h2>
          <p>Obrigado por confirmar sua presença. Esperamos você na nossa festa!</p>
        </div>
      )}
    </div>
  );
};

export default AttendingForm;
