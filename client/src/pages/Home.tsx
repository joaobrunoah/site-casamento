import React from 'react';
import Countdown from '../components/Countdown';
import Cerimony from '../components/Cerimony';
import './Home.css';

const Home: React.FC = () => {
  // Target date: June 13, 2026 at 15:00 Brazilian time (America/Sao_Paulo)
  const targetDate = new Date('2026-06-13T15:00:00-03:00'); // Brazilian time (UTC-3)

  return (
    <div>
      <section id="home">
        <h1>Mariane & João Bruno</h1>
        <div className="home-images">
          <img src="/assets/marijoao1.jpg" alt="Mariane & João Bruno" />
          <img src="/assets/marijoao2.jpg" alt="Mariane & João Bruno" />
          <img src="/assets/marijoao3.jpg" alt="Mariane & João Bruno" />
        </div>
        <div className="home-info">
          <p className="home-date">13.06.2026</p>
          <p className="home-location">Villa Mandacarú - Itu/SP</p>
        </div>
      </section>
      <section id="countdown">
        <div className="countdown-bar">
          <p className="countdown-text">Contagem Regressiva</p>
          <Countdown endDate={targetDate} />
        </div>
      </section>
      <section id="ceremony">
        <div className="ceremony-container">
          <div className="ceremony-image-column">
            <img src="/assets/villa_mandacaru2.jpeg" alt="Villa Mandacarú" />
          </div>
          <div className="ceremony-text-column">
            <h1 className="h1-section">Cerimônia e Festa</h1>
            <p className="ceremony-text">
              Um fim de tarde gostoso, lugar incrível e todas as pessoas que a gente ama reunidas.<br/>

              É exatamente esse clima que queremos viver com vocês!<br/>

              No dia <b>13 de junho de 2026</b>, na Villa Mandacarú, em Itu, vamos celebrar nosso amor. Às 15h tudo estará pronto para receber vocês, podem chegar tranquilos e desfrutar de toda beleza do local. <br/>
              
              Após a cerimônia vamos receber todos para a festa que estamos preparando cada detalhe com muito amor.<br/>
              
              Tudo no mesmo cenário, sem pressa, só curtindo cada momento.<br/>
              
              <b>Do pôr do sol à pista de dança</b><br/>
            </p>
            <a href="https://maps.app.goo.gl/FYJqsyqqtxUFCwt28" target="_blank" rel="noopener noreferrer" className="ceremony-map-link">
              Acesse o mapa para a Villa
            </a>
          </div>
        </div>
      </section>
      <section id="cerimony-details">
        <div className="cerimony-details-container">
          <div className="cerimony-details-column">
            <Cerimony
              title="Pré Wedding"
              dateText="12 de Junho"
              timeText="20hs"
              description="pizzada de boas vindas aos convidados"
              dressCode="Para a sexta feira (pré-casamento) : Casual"
              place="Itu - SP - a definir"
              icon="/assets/glass.svg"
            />
          </div>
          <div className="cerimony-details-column">
            <Cerimony
              title="Cerimônia"
              dateText="13 de Junho"
              timeText="15hs"
              description="Cerimônia e festa no mesmo lugar"
              dressCode="Para sabado: Esporte Fino"
              place="Villa Mandacaru - Itu"
            />
          </div>
        </div>
      </section>
      <section id="hotels">
        <h1 className="h1-section">Hotéis</h1>
        {/* Content will be added later */}
      </section>
      <section id="transport">
        <h1 className="h1-section">Transporte</h1>
        {/* Content will be added later */}
      </section>
    </div>
  );
};

export default Home;
