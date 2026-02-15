import React from 'react';
import './Page.css';

const ComoChegar = () => {
  return (
    <div className="page-container">
      <h2 className="page-title">Como Chegar</h2>
      <p className="page-subtitle">
        Salão de Festas Jardim das Flores<br />
        Rua das Flores, 123 - São Paulo, SP
      </p>

      <div className="directions-section">
          <div className="map-container">
            <div className="map-placeholder">
              <p>Mapa</p>
            <p className="map-note">Mapa interativo será integrado aqui</p>
            <p className="coordinates">Coordenadas: -23.5505° S, -46.6333° W</p>
          </div>
        </div>

        <div className="directions-cards">
          <div className="direction-card">
            <h3>De Carro</h3>
            <div className="direction-steps">
              <p><strong>Vindo do Centro:</strong></p>
              <ol>
                <li>Siga pela Av. Paulista em direção ao bairro</li>
                <li>Vire à direita na Rua das Flores</li>
                <li>O salão fica a 200m à direita</li>
              </ol>
              <p><strong>Vindo do Aeroporto:</strong></p>
              <ol>
                <li>Pegue a Rodovia até a Av. Marginal</li>
                <li>Siga até a Av. Paulista</li>
                <li>Vire à direita na Rua das Flores</li>
              </ol>
            </div>
          </div>

          <div className="direction-card">
            <h3>De Metrô</h3>
            <div className="direction-steps">
              <p>Linha Verde - Estação Jardim das Flores</p>
              <ol>
                <li>Desça na Estação Jardim das Flores</li>
                <li>Siga pela saída norte</li>
                <li>Caminhe 500m pela Rua das Flores</li>
                <li>O salão fica do lado esquerdo</li>
              </ol>
              <p className="metro-time">⏱️ Tempo de caminhada: 5-7 minutos</p>
            </div>
          </div>

          <div className="direction-card">
            <h3>De Ônibus</h3>
            <div className="direction-steps">
              <p>Linhas que passam próximo ao local:</p>
              <ul>
                <li><strong>Linha 123:</strong> Para na Rua das Flores (em frente ao salão)</li>
                <li><strong>Linha 456:</strong> Para na esquina da Rua das Flores</li>
                <li><strong>Linha 789:</strong> Para a 100m do salão</li>
              </ul>
            </div>
          </div>

          <div className="direction-card">
            <h3>De Outras Cidades</h3>
            <div className="direction-steps">
              <p><strong>Aeroporto de Guarulhos (GRU):</strong></p>
              <ul>
                <li>Distância: 30 km</li>
                <li>Tempo: 45-60 minutos (dependendo do trânsito)</li>
                <li>Opções: Táxi, Uber ou transporte particular</li>
              </ul>
              <p><strong>Aeroporto de Congonhas (CGH):</strong></p>
              <ul>
                <li>Distância: 15 km</li>
                <li>Tempo: 30-40 minutos</li>
                <li>Opções: Táxi, Uber ou transporte particular</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="contact-box">
          <h3>Precisa de ajuda?</h3>
          <p>
            Se tiver dúvidas sobre como chegar, entre em contato conosco:
          </p>
          <p className="contact-info">
            (11) 99999-9999 | contato@casamento.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComoChegar;
