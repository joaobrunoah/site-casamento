import React, { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import './AdminGifts.css';

const AdminGifts: React.FC = () => {
  const { showGiftsList, updateShowGiftsList, loading } = useConfig();
  const [updating, setUpdating] = useState<boolean>(false);

  const handleToggle = async () => {
    setUpdating(true);
    try {
      await updateShowGiftsList(!showGiftsList);
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Erro ao atualizar configuração. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="admin-gifts">
      <h1 className="h1-section">Gerenciar Presentes</h1>
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
      {/* Admin gifts management will be added later */}
    </div>
  );
};

export default AdminGifts;
