import React from 'react';
import Countdown from '../components/Countdown';
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
            <img src="/assets/villa_mandacaru.jpeg" alt="Villa Mandacarú" />
          </div>
          <div className="ceremony-text-column">
            <h1>Cerimônia e Festa</h1>
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
      <section id="hotels">
        <h1>Hotéis</h1>
        {/* Content will be added later */}
      </section>
      <section id="transport">
        <h1>Transporte</h1>
        {/* Content will be added later */}
      </section>
    </div>
  );
};

export default Home;
