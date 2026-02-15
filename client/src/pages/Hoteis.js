import React from 'react';
import './Page.css';

const Hoteis = () => {
  const hoteis = [
    {
      nome: 'Hotel Grand Plaza',
      endereco: 'Av. Paulista, 1000 - São Paulo, SP',
      telefone: '(11) 3000-1000',
      distancia: '5 km do local',
      preco: 'A partir de R$ 250/noite',
      descricao: 'Hotel 4 estrelas com excelente localização e conforto.'
    },
    {
      nome: 'Boutique Hotel Central',
      endereco: 'Rua Augusta, 500 - São Paulo, SP',
      telefone: '(11) 3000-2000',
      distancia: '3 km do local',
      preco: 'A partir de R$ 300/noite',
      descricao: 'Hotel charmoso no centro da cidade, próximo ao local do evento.'
    },
    {
      nome: 'Hotel Express Downtown',
      endereco: 'Rua Consolação, 800 - São Paulo, SP',
      telefone: '(11) 3000-3000',
      distancia: '4 km do local',
      preco: 'A partir de R$ 200/noite',
      descricao: 'Opção econômica com boa qualidade e localização central.'
    }
  ];

  return (
    <div className="page-container">
      <h2 className="page-title">Hotéis</h2>
      <div className="section-content">
        <h3 className="section-subtitle">Hospedagem para os Convidados</h3>
        <p className="page-subtitle">
          Selecionamos alguns hotéis próximos ao <strong>Salão de Festas Jardim das Flores</strong>, 
          com condições especiais para o nosso casamento.
        </p>
        <p className="page-subtitle">
          Abaixo estão todas as informações organizadas de forma clara para facilitar a sua reserva.
        </p>
      </div>

      <div className="hotels-grid">
        {hoteis.map((hotel, index) => (
          <div key={index} className="hotel-card">
            <h3>{hotel.nome}</h3>
            <div className="hotel-info">
              <p className="info-item">
                <strong>📍 Endereço:</strong> {hotel.endereco}
              </p>
              <p className="info-item">
                <strong>📞 Telefone:</strong> {hotel.telefone}
              </p>
              <p className="info-item">
                <strong>📏 Distância:</strong> {hotel.distancia}
              </p>
              <p className="info-item">
                <strong>💰 Preço:</strong> {hotel.preco}
              </p>
              <p className="hotel-description">{hotel.descricao}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="note-box">
        <p>
          <strong>Dica:</strong> Ao fazer a reserva, mencione que é para o casamento 
          de João & Maria no dia 15/12/2024. Alguns hotéis oferecem descontos especiais 
          para eventos.
        </p>
      </div>
    </div>
  );
};

export default Hoteis;
