import React, { useState } from 'react';
import axios from 'axios';
import './Page.css';
import './ConfirmarPresenca.css';

const ConfirmarPresenca = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    quantidadePessoas: '1',
    mensagem: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post('/api/confirmacoes', formData);
      setSuccess(true);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        quantidadePessoas: '1',
        mensagem: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao confirmar presença. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">Confirmar Presença</h2>
      <p className="page-subtitle">
        Por favor, confirme sua presença até o dia 01 de Dezembro de 2024.
        Sua confirmação é muito importante para nós!
      </p>

        {success && (
          <div className="success-message">
            <h3>Confirmação realizada com sucesso!</h3>
          <p>Obrigado por confirmar sua presença. Estamos ansiosos para celebrar com você!</p>
        </div>
      )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

      <form className="confirmation-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome">Nome Completo *</label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            placeholder="Seu nome completo"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">E-mail *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="seu@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefone">Telefone</label>
          <input
            type="tel"
            id="telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="form-group">
          <label htmlFor="quantidadePessoas">Número de Pessoas *</label>
          <select
            id="quantidadePessoas"
            name="quantidadePessoas"
            value={formData.quantidadePessoas}
            onChange={handleChange}
            required
          >
            <option value="1">1 pessoa</option>
            <option value="2">2 pessoas</option>
            <option value="3">3 pessoas</option>
            <option value="4">4 pessoas</option>
            <option value="5">5 ou mais pessoas</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="mensagem">Mensagem (opcional)</label>
          <textarea
            id="mensagem"
            name="mensagem"
            value={formData.mensagem}
            onChange={handleChange}
            rows="4"
            placeholder="Deixe uma mensagem para os noivos..."
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Enviando...' : 'Confirmar Presença'}
        </button>
      </form>
    </div>
  );
};

export default ConfirmarPresenca;
