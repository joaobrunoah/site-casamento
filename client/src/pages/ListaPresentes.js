import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Page.css';
import './ListaPresentes.css';

const ListaPresentes = () => {
  const [presentes, setPresentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPresentes();
  }, []);

  const fetchPresentes = async () => {
    try {
      const response = await axios.get('/api/presentes');
      setPresentes(response.data);
      setError('');
    } catch (err) {
      setError('Erro ao carregar lista de presentes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePresente = async (id) => {
    const presente = presentes.find(p => p.id === id);
    if (!presente) return;

    try {
      const response = await axios.put(`/api/presentes/${id}`, {
        comprado: !presente.comprado
      });
      setPresentes(presentes.map(p => p.id === id ? response.data : p));
    } catch (err) {
      setError('Erro ao atualizar presente. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p>Carregando lista de presentes...</p>
      </div>
    );
  }

  const presentesDisponiveis = presentes.filter(p => !p.comprado);
  const presentesComprados = presentes.filter(p => p.comprado);

  return (
    <div className="page-container">
      <h2 className="page-title">Lista de Presentes</h2>
      <p className="page-subtitle">
        Sua presença é o maior presente! Mas se quiser nos presentear, 
        aqui está nossa lista de desejos.
      </p>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

      {presentesDisponiveis.length > 0 && (
        <div className="presents-section">
          <h3>Presentes Disponíveis</h3>
          <div className="presents-grid">
            {presentesDisponiveis.map((presente) => (
              <div key={presente.id} className="presente-card available">
                <div className="presente-info">
                  <h4>{presente.nome}</h4>
                  <p className="presente-valor">R$ {presente.valor.toFixed(2)}</p>
                </div>
                <button
                  className="presente-button"
                  onClick={() => handleTogglePresente(presente.id)}
                >
                  Selecionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {presentesComprados.length > 0 && (
        <div className="presents-section">
          <h3>Presentes Já Escolhidos</h3>
          <div className="presents-grid">
            {presentesComprados.map((presente) => (
              <div key={presente.id} className="presente-card selected">
                <div className="presente-info">
                  <h4>{presente.nome}</h4>
                  <p className="presente-valor">R$ {presente.valor.toFixed(2)}</p>
                </div>
                <button
                  className="presente-button selected"
                  onClick={() => handleTogglePresente(presente.id)}
                >
                  ✓ Selecionado
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

        <div className="note-box">
          <h3>Informações Importantes</h3>
        <ul className="info-list">
          <li>Os presentes podem ser entregues no dia do casamento ou enviados para nosso endereço.</li>
          <li>Se preferir, também aceitamos contribuições em dinheiro para nossa lua de mel.</li>
          <li>Para mais informações sobre entrega, entre em contato conosco.</li>
        </ul>
      </div>
    </div>
  );
};

export default ListaPresentes;
