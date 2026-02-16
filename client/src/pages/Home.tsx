import React, { useRef, useEffect, useState } from 'react';
import Countdown from '../components/Countdown';
import Cerimony from '../components/Cerimony';
import './Home.css';

const Home: React.FC = () => {
  // Target date: June 13, 2026 at 15:00 Brazilian time (America/Sao_Paulo)
  const targetDate = new Date('2026-06-13T15:00:00-03:00'); // Brazilian time (UTC-3)

  const ceremonySectionRef = useRef<HTMLElement>(null);
  const ceremonyTextColumnRef = useRef<HTMLDivElement>(null);
  const ceremonyImageRef = useRef<HTMLImageElement>(null);
  const [imageTransform, setImageTransform] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Preload all images and wait for fonts
  useEffect(() => {
    const imagePaths = [
      '/assets/marijoao1.jpg',
      '/assets/marijoao2.jpg',
      '/assets/marijoao3.jpg',
      '/assets/villa_mandacaru2.jpeg',
      '/assets/hotel.png',
      '/assets/glass.svg',
      '/assets/bottom-cerimony.svg',
      '/assets/background.jpeg'
    ];

    let imagesLoaded = false;
    let fontsLoaded = false;

    const checkAllLoaded = () => {
      if (imagesLoaded && fontsLoaded) {
        setAssetsLoaded(true);
      }
    };

    // Load all images
    let loadedCount = 0;
    const totalImages = imagePaths.length;

    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        imagesLoaded = true;
        checkAllLoaded();
      }
    };

    imagePaths.forEach((path) => {
      const img = new Image();
      img.onload = onImageLoad;
      img.onerror = onImageLoad; // Continue even if an image fails to load
      img.src = path;
    });

    // Wait for fonts to load
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        fontsLoaded = true;
        checkAllLoaded();
      });
    } else {
      // Fallback for browsers that don't support document.fonts
      setTimeout(() => {
        fontsLoaded = true;
        checkAllLoaded();
      }, 1000);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!ceremonySectionRef.current || !ceremonyTextColumnRef.current || !ceremonyImageRef.current) {
        return;
      }

      const section = ceremonySectionRef.current;
      const textColumn = ceremonyTextColumnRef.current;
      const image = ceremonyImageRef.current;
      const imageColumn = image.parentElement as HTMLElement;

      if (!imageColumn) return;

      const isMobile = window.innerWidth <= 768;
      
      // Get container height
      let containerHeight: number;
      if (isMobile) {
        // On mobile, use the square container height (determined by aspect-ratio CSS)
        // The container width equals its height due to aspect-ratio: 1 / 1
        containerHeight = imageColumn.offsetWidth;
      } else {
        // On desktop, match the text column height
        const textColumnHeight = textColumn.offsetHeight;
        containerHeight = textColumnHeight;
        imageColumn.style.height = `${textColumnHeight}px`;
      }

      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Calculate when the section enters and exits the viewport
      const sectionStart = sectionTop - windowHeight;
      const sectionEnd = sectionTop + sectionHeight;

      // Calculate scroll progress (0 to 1) as we scroll through the section
      let progress = 0;
      if (scrollY >= sectionStart && scrollY <= sectionEnd) {
        progress = (scrollY - sectionStart) / (sectionEnd - sectionStart);
        progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
      } else if (scrollY > sectionEnd) {
        progress = 1;
      }

      const containerWidth = imageColumn.offsetWidth;
      
      // Calculate image dimensions
      // The image should be tall enough to allow parallax scrolling
      // We'll make it 1.5x the container height to ensure we can scroll through the full image
      let imageHeight = containerHeight * 1.5;
      
      // If image is loaded, try to maintain aspect ratio while ensuring it's tall enough
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        const imageAspectRatio = image.naturalWidth / image.naturalHeight;
        const aspectRatioHeight = containerWidth / imageAspectRatio;
        // Use the larger of the two to ensure we have enough image to scroll through
        imageHeight = Math.max(containerHeight * 1.5, aspectRatioHeight);
      }
      
      // Set image dimensions
      image.style.width = '100%';
      image.style.height = `${imageHeight}px`;
      image.style.objectFit = 'cover';
      
      // Calculate parallax translation
      // When progress = 0: show bottom of image (translateY = 0)
      // When progress = 1: show top of image (translateY = -(imageHeight - containerHeight))
      const maxTranslate = -(imageHeight - containerHeight);
      const translateY = progress * maxTranslate;

      setImageTransform(translateY);
    };

    // Wait for image to load before calculating dimensions
    const image = ceremonyImageRef.current;
    const runHandleScroll = () => {
      // Small delay to ensure layout is calculated
      setTimeout(handleScroll, 10);
    };

    if (image) {
      if (image.complete) {
        runHandleScroll();
      } else {
        image.addEventListener('load', runHandleScroll);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', runHandleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', runHandleScroll);
      if (image) {
        image.removeEventListener('load', runHandleScroll);
      }
    };
  }, []);

  // Show loading screen until all assets are loaded
  if (!assetsLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#faf9f7',
        fontFamily: 'Glacial Indifference, sans-serif',
        color: '#2c2c2c'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #DCAE9D',
            borderTop: '4px solid #2c2c2c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '1.2em' }}>Carregando...</p>
        </div>
      </div>
    );
  }

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
      <section id="ceremony" ref={ceremonySectionRef}>
        <div className="ceremony-container">
          <div className="ceremony-image-column">
            <img 
              ref={ceremonyImageRef}
              src="/assets/villa_mandacaru2.jpeg" 
              alt="Villa Mandacarú"
              style={{ transform: `translateY(${imageTransform}px)` }}
            />
          </div>
          <div className="ceremony-text-column" ref={ceremonyTextColumnRef}>
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
        <div className="hotels-header">
          <h1 className="h1-section">Hotéis</h1>
          <img src="/assets/hotel.png" alt="Hotel" className="hotels-header-image" />
        </div>
        <div className="hotels-container">
          <div className="hotel-card">
            <h2 className="hotel-name">Hotel Itu Plaza ⭐⭐⭐</h2>
            <p className="hotel-distance">Distância: 24 min. da Villa Mandacarú</p>
            
            <h3 className="hotel-section-title">💰 Tarifas por diária</h3>
            
            <div className="hotel-room-type">
              <h4 className="hotel-room-title">Apartamento Standard</h4>
              <p className="hotel-rate">Individual: R$ 501,00</p>
              <p className="hotel-rate">Duplo: R$ 654,00</p>
              <p className="hotel-rate">Triplo: R$ 810,00</p>
              <p className="hotel-rate">Quádruplo: R$ 1.026,00</p>
            </div>
            
            <div className="hotel-room-type">
              <h4 className="hotel-room-title">Apartamento Luxo</h4>
              <p className="hotel-rate">Individual: R$ 641,00</p>
              <p className="hotel-rate">Duplo: R$ 770,00</p>
              <p className="hotel-rate">Triplo: R$ 955,00</p>
              <p className="hotel-rate">Quádruplo: R$ 1.208,00</p>
            </div>
            
            <div className="hotel-room-type">
              <h4 className="hotel-room-title">Suíte</h4>
              <p className="hotel-rate">Individual: R$ 855,00</p>
              <p className="hotel-rate">Duplo: R$ 904,00</p>
            </div>
            
            <h3 className="hotel-section-title">👶 Crianças</h3>
            <p className="hotel-info">Até 5 anos: cortesia</p>
            <p className="hotel-info">De 6 a 12 anos (standard e luxo): R$ 147,00 por diária</p>
            
            <h3 className="hotel-section-title">✅ Benefícios</h3>
            <p className="hotel-info">Café da manhã · 1 vaga de estacionamento por apartamento</p>
            
            <h3 className="hotel-section-title">⏰ Horários</h3>
            <p className="hotel-info">Check-in: 14h</p>
            <p className="hotel-info">Check-out: 12h</p>
            
            <h3 className="hotel-section-title">💳 Pagamento</h3>
            <p className="hotel-info">Pagamento antecipado (cartão, depósito ou Pix)</p>
            
            <h3 className="hotel-section-title">📌 Importante</h3>
            <p className="hotel-important">As tarifas e a disponibilidade estão sujeitas à confirmação no momento da reserva.</p>
          </div>
          <div className="hotel-card">
            <h2 className="hotel-name">Hotel KK ⭐⭐⭐</h2>
            <p className="hotel-distance">Distância: 22 min. da Villa Mandacarú</p>
            <p className="hotel-instagram">Instagram: <a href="https://www.instagram.com/hotelkkitu/" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>@hotelkkitu</a></p>
            
            <h3 className="hotel-section-title">📅 Período do pacote especial</h3>
            <p className="hotel-info">Check-in: 12/06/2026 (sexta), a partir das 12h</p>
            <p className="hotel-info">Check-out: 14/06/2026 (domingo), até 18h</p>
            
            <h3 className="hotel-section-title">💰 Valores promocionais — pacote de 2 diárias</h3>
            <p className="hotel-rate">Single (SGL): R$ 590,00</p>
            <p className="hotel-rate">Duplo (DBL): R$ 635,00</p>
            <p className="hotel-rate">Triplo (TPL): R$ 765,00</p>
            <p className="hotel-rate">Quádruplo (QDP): R$ 840,00</p>
            <p className="hotel-info" style={{ marginTop: '10px', fontStyle: 'italic' }}>Também é possível reservar diárias separadas, sujeitas à disponibilidade.</p>
            
            <h3 className="hotel-section-title">👶 Crianças</h3>
            <p className="hotel-info">Até 6 anos: cortesia</p>
            <p className="hotel-info">Duas crianças até 6 anos no mesmo quarto: uma será cobrada</p>
            
            <h3 className="hotel-section-title">✅ Inclui</h3>
            <p className="hotel-info">Café da manhã · Estacionamento · Wi‑Fi · Piscina · Convênio com academia próxima</p>
            
            <h3 className="hotel-section-title">⚠️ Informações importantes</h3>
            <p className="hotel-info"><strong>Informar no ato da reserva:</strong></p>
            <p className="hotel-info" style={{ paddingLeft: '15px' }}>Casamento Mariane e João Bruno – 13/06/2026 – Villa Mandacarú</p>
            <p className="hotel-info">Reservas somente direto com o hotel</p>
            <p className="hotel-info">Pagamento antecipado de 1 diária para confirmação</p>
            <p className="hotel-info">Cancelamento gratuito até 24h antes da hospedagem</p>
            <p className="hotel-info">Não aceitam pets</p>
            <p className="hotel-info">Saída no sábado (13/06): check-out até 12h</p>
            
            <h3 className="hotel-section-title">📞 Contato</h3>
            <p className="hotel-info">E-mail: <a href="mailto:hotelkk@hotelkk.com.br" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>hotelkk@hotelkk.com.br</a></p>
            <p className="hotel-info">Telefone: (11) 4013-9000</p>
            <p className="hotel-info">WhatsApp: <a href="https://wa.me/+5511958810444" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>(11) 95881-0444</a></p>
            
            <h3 className="hotel-section-title">💳 Pagamento</h3>
            <p className="hotel-info">Pagamento antecipado (cartão, depósito ou Pix)</p>
            
            <h3 className="hotel-section-title">📌 Importante</h3>
            <p className="hotel-important">As tarifas e a disponibilidade estão sujeitas à confirmação no momento da reserva.</p>
          </div>
          <div className="hotel-card">
            <h2 className="hotel-name">Hotel Gandini ⭐⭐⭐</h2>
            <p className="hotel-distance">Distância: 22 minutos da Villa Mandacarú</p>
            <p className="hotel-instagram">Site: <a href="https://gandinihotel.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>https://gandinihotel.com.br</a></p>
            
            <h3 className="hotel-section-title">💸 Desconto especial</h3>
            <p className="hotel-info">Use o cupom <strong>MARIANEEJOAO</strong> e ganhe 10% de desconto na diária de sábado.</p>
            <p className="hotel-info">Reservas pelo site (clicar em "Reserve já" e inserir o código promocional).</p>
            
            <h3 className="hotel-section-title">👶 Crianças</h3>
            <p className="hotel-info">Até 7 anos: cortesia (informar na reserva)</p>
            
            <h3 className="hotel-section-title">🛏️ Configuração dos quartos</h3>
            <p className="hotel-info">1 cama de casal ou 2 camas de solteiro</p>
            <p className="hotel-info">Terceira pessoa: R$ 100,00 por diária (colchão extra)</p>
            
            <h3 className="hotel-section-title">✅ Inclui</h3>
            <p className="hotel-info">Café da manhã · Estacionamento</p>
            
            <h3 className="hotel-section-title">⏰ Horários</h3>
            <p className="hotel-info">Check-in: a partir das 14h</p>
            <p className="hotel-info">Check-out: até 12h</p>
            
            <h3 className="hotel-section-title">📞 Contato</h3>
            <p className="hotel-info">Telefone / WhatsApp: <a href="https://wa.me/+551140249700" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>(11) 4024-9700</a></p>
            <p className="hotel-info">E-mail: <a href="mailto:comercial@gandinihotel.com.br" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>comercial@gandinihotel.com.br</a></p>
            <p className="hotel-info">Responsável: Bruna</p>
          </div>
          <div className="hotel-card">
            <h2 className="hotel-name">Hotel Ibis Itu Plaza ⭐⭐⭐</h2>
            <p className="hotel-distance">Distância: 24min da Villa Mandacarú</p>
            
            <h3 className="hotel-section-title">💰 Tarifas fixas por diária</h3>
            <p className="hotel-rate">1 pessoa: R$ 300,00</p>
            <p className="hotel-rate">2 pessoas: R$ 350,00</p>
            
            <h3 className="hotel-section-title">⏰ Horários</h3>
            <p className="hotel-info">Check-in: a partir das 15h</p>
            <p className="hotel-info">Para reservas feitas diretamente com o hotel, o check-in poderá ser liberado a partir das 12h, sem custo adicional.</p>
            <p className="hotel-info" style={{ fontStyle: 'italic', fontSize: '0.95em' }}>(Reservas por Booking.com / Expedia não possuem liberação antecipada às 12h)</p>
            
            <h3 className="hotel-section-title">📌 Condições de reserva</h3>
            <p className="hotel-info">Para garantir a tarifa, os convidados devem entrar em contato diretamente com o hotel informando a data da hospedagem e o nome dos noivos.</p>
            <p className="hotel-info">O pagamento deverá ser realizado até 48h antes do evento para garantir a reserva.</p>
            <p className="hotel-info">A equipe do hotel ficará responsável por enviar lembretes aos hóspedes que realizarem a reserva.</p>
            
            <h3 className="hotel-section-title">📞 Contato</h3>
            <p className="hotel-info">WhatsApp (Reservas): <a href="https://wa.me/+5511947303805" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>(11) 94730-3805</a></p>
            <p className="hotel-info">Telefone e WhatsApp: <a href="https://wa.me/+551134143454" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>(11) 3414-3454</a></p>
            <p className="hotel-info">E-mail: <a href="mailto:h8138@accor.com" style={{ color: '#2c2c2c', textDecoration: 'underline' }}>h8138@accor.com</a></p>
          </div>
        </div>
      </section>
      <section id="transport">
        <h1 className="h1-section">Transporte</h1>
        {/* Content will be added later */}
      </section>
    </div>
  );
};

export default Home;
