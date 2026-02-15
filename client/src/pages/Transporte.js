import React from 'react';
import './Page.css';

const Transporte = () => {
  return (
    <div className="page-container">
      <h2 className="page-title">Transporte</h2>
      <p className="page-subtitle">
        Informações sobre como chegar ao local do casamento e opções de transporte.
      </p>

      <div className="transport-section">
        <div className="transport-card">
          <h3>Transporte Próprio</h3>
          <p>
            O salão possui estacionamento gratuito para todos os convidados.
            Há espaço suficiente para todos os veículos.
          </p>
          <p className="parking-info">
            <strong>Estacionamento:</strong> Gratuito | Capacidade: 100 vagas
          </p>
        </div>

        <div className="transport-card">
          <h3>Táxi / Uber</h3>
          <p>
            O local é facilmente acessível por aplicativos de transporte.
            Recomendamos usar Uber, 99 ou táxis convencionais.
          </p>
          <p className="app-note">
            <strong>Endereço para o aplicativo:</strong><br />
            Rua das Flores, 123 - São Paulo, SP
          </p>
        </div>

        <div className="transport-card">
          <h3>Transporte Coletivo</h3>
          <p>
            O local é servido por várias linhas de ônibus e está próximo 
            à estação de metrô mais próxima.
          </p>
          <ul className="transport-list">
            <li><strong>Metrô:</strong> Estação Jardim das Flores (Linha Verde) - 500m</li>
            <li><strong>Ônibus:</strong> Linhas 123, 456, 789 - Parada em frente ao salão</li>
          </ul>
        </div>

        <div className="transport-card highlight">
          <h3>Van de Transporte</h3>
          <p>
            Estamos organizando um transporte coletivo para os convidados que 
            estão hospedados nos hotéis parceiros.
          </p>
          <p className="van-schedule">
            <strong>Horários de saída dos hotéis:</strong><br />
            17:00 - Hotel Grand Plaza<br />
            17:15 - Boutique Hotel Central<br />
            17:10 - Hotel Express Downtown
          </p>
          <p className="van-return">
            <strong>Retorno:</strong> A van fará o retorno após o término da festa.
          </p>
          <p className="van-note">
            <em>Confirme sua participação no transporte coletivo ao confirmar sua presença.</em>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Transporte;
