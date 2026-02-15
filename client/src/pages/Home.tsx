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
          <p className="countdown-text">CONTAGEM REGRESSIVA</p>
          <Countdown endDate={targetDate} />
        </div>
      </section>
      <section id="ceremony">
        <h1>Cerimônia e Festa</h1>
        {/* Content will be added later */}
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
