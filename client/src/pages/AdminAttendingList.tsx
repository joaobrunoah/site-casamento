import React, { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import './AdminAttendingList.css';

const AdminAttendingList: React.FC = () => {
  const { showConfirmationForm, updateShowConfirmationForm, loading } = useConfig();
  const [updating, setUpdating] = useState<boolean>(false);

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

  return (
    <div className="admin-attending-list">
      <h1>Lista de Convidados</h1>
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
      {/* Admin list will be added later */}
    </div>
  );
};

export default AdminAttendingList;
