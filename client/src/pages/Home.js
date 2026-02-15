import React from 'react';
import './Page.css';

const Home = () => {
  return (
    <div className="page-container">
      <section className="ceremony-section">
        <h2 className="section-title">Cerimônia e Recepção</h2>
        <div className="section-content">
          <p className="section-text">
            Um fim de tarde gostoso, lugar incrível e todas as pessoas que a gente ama reunidas.
          </p>
          <p className="section-text">
            É exatamente esse clima que queremos viver com vocês!
          </p>
          <p className="section-text">
            No dia <strong>15 de dezembro de 2024</strong>, no <strong>Salão de Festas Jardim das Flores, em São Paulo</strong>, 
            vamos celebrar nosso amor. Às 18h tudo estará pronto para receber vocês, podem chegar tranquilos 
            e desfrutar de toda beleza do local. Após a cerimônia vamos receber todos para a festa que estamos 
            preparando cada detalhe com muito amor.
          </p>
          <p className="section-text">
            Tudo no mesmo cenário, sem pressa, só curtindo cada momento.
          </p>
          <p className="section-tagline">Do pôr do sol à pista de dança</p>
        </div>
      </section>

      <section className="about-section">
        <h2 className="section-title">Sobre o Casamento</h2>
        <div className="about-grid">
          <div className="about-item">
            <h3 className="about-subtitle">A Cerimônia</h3>
            <p className="about-text">
              A cerimônia será realizada ao ar livre, com vista para o jardim, às 18h. 
              Será um momento íntimo e especial onde vamos oficializar nosso compromisso 
              diante das pessoas que mais amamos.
            </p>
          </div>
          <div className="about-item">
            <h3 className="about-subtitle">A Recepção</h3>
            <p className="about-text">
              Após a cerimônia, todos serão recebidos para uma festa inesquecível. 
              Teremos música, dança, comida deliciosa e muita alegria para celebrar 
              este momento especial da nossa vida.
            </p>
          </div>
          <div className="about-item">
            <h3 className="about-subtitle">Dress Code</h3>
            <p className="about-text">
              Traje social elegante. Cores neutras são preferidas, mas o mais importante 
              é que você se sinta confortável e à vontade para celebrar conosco.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
