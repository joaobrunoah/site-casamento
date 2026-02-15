import React, { useState } from 'react';
import axios from 'axios';
import '../components/Header.css';
import './Page.css';
import './ConfirmarPresenca.css';
import './ListaPresentes.css';

const WeddingPage = () => {
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
  const [presentes, setPresentes] = useState([]);
  const [presentesLoading, setPresentesLoading] = useState(true);

  React.useEffect(() => {
    fetchPresentes();
  }, []);

  const fetchPresentes = async () => {
    try {
      const response = await axios.get('/api/presentes');
      setPresentes(response.data);
    } catch (err) {
      console.error('Erro ao carregar presentes');
    } finally {
      setPresentesLoading(false);
    }
  };

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

  const handleTogglePresente = async (id) => {
    const presente = presentes.find(p => p.id === id);
    if (!presente) return;

    try {
      const response = await axios.put(`/api/presentes/${id}`, {
        comprado: !presente.comprado
      });
      setPresentes(presentes.map(p => p.id === id ? response.data : p));
    } catch (err) {
      console.error('Erro ao atualizar presente');
    }
  };

  const presentesDisponiveis = presentes.filter(p => !p.comprado);
  const presentesComprados = presentes.filter(p => p.comprado);

  const hoteis = [
    {
      nome: 'Hotel Grand Plaza',
      endereco: 'Av. Paulista, 1000 - Itu, SP',
      telefone: '(11) 3000-1000',
      distancia: '5 km do local',
      preco: 'A partir de R$ 250/noite',
      descricao: 'Hotel 4 estrelas com excelente localização e conforto.'
    },
    {
      nome: 'Boutique Hotel Central',
      endereco: 'Rua Augusta, 500 - Itu, SP',
      telefone: '(11) 3000-2000',
      distancia: '3 km do local',
      preco: 'A partir de R$ 300/noite',
      descricao: 'Hotel charmoso no centro da cidade, próximo ao local do evento.'
    },
    {
      nome: 'Hotel Express Downtown',
      endereco: 'Rua Consolação, 800 - Itu, SP',
      telefone: '(11) 3000-3000',
      distancia: '4 km do local',
      preco: 'A partir de R$ 200/noite',
      descricao: 'Opção econômica com boa qualidade e localização central.'
    }
  ];

  return (
    <div className="wedding-page">
      {/* Header Section */}
      <section className="hero-section">
        <div className="header-content">
          <div className="header-title">
            <h1 className="noivos">Mariane & João Bruno</h1>
            <p className="data-local">13 de Junho de 2026</p>
            <p className="local">Villa Mandacarú</p>
            <p className="cidade">Itu, SP</p>
          </div>
          
          {/* Photo Gallery */}
          <div className="header-gallery">
            {[
              'https://marianeejoaobruno.com.br/images/foto1.jpg',
              'https://marianeejoaobruno.com.br/images/foto2.jpg',
              'https://marianeejoaobruno.com.br/images/foto3.jpg',
              'https://marianeejoaobruno.com.br/images/foto4.jpg'
            ].map((src, index) => (
              <div key={index} className="gallery-item">
                <img 
                  src={src} 
                  alt={`Mariane e João Bruno - Foto ${index + 1}`}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ceremony Section */}
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
            No dia <strong>13 de junho de 2026</strong>, na <strong>Villa Mandacarú, em Itu/SP</strong>, 
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

      {/* About Section */}
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

      {/* Hotels Section */}
      <section className="hotels-section">
        <h2 className="page-title">Hotéis</h2>
        <div className="section-content">
          <h3 className="section-subtitle">Hospedagem para os Convidados</h3>
          <p className="page-subtitle">
            Selecionamos alguns hotéis próximos à <strong>Villa Mandacarú</strong>, 
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
                  <strong>Endereço:</strong> {hotel.endereco}
                </p>
                <p className="info-item">
                  <strong>Telefone:</strong> {hotel.telefone}
                </p>
                <p className="info-item">
                  <strong>Distância:</strong> {hotel.distancia}
                </p>
                <p className="info-item">
                  <strong>Preço:</strong> {hotel.preco}
                </p>
                <p className="hotel-description">{hotel.descricao}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="note-box">
          <p>
            <strong>Dica:</strong> Ao fazer a reserva, mencione que é para o casamento 
            de Mariane & João Bruno no dia 13/06/2026. Alguns hotéis oferecem descontos especiais 
            para eventos.
          </p>
        </div>
      </section>

      {/* Transport Section */}
      <section className="transport-section-page">
        <h2 className="page-title">Transporte</h2>
        <p className="page-subtitle">
          Informações sobre como chegar ao local do casamento e opções de transporte.
        </p>

        <div className="transport-section">
          <div className="transport-card">
            <h3>Transporte Próprio</h3>
            <p>
              A Villa Mandacarú possui estacionamento gratuito para todos os convidados.
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
              Villa Mandacarú - Itu, SP
            </p>
          </div>

          <div className="transport-card">
            <h3>Transporte Coletivo</h3>
            <p>
              O local é servido por várias linhas de ônibus e está próximo 
              ao centro de Itu.
            </p>
            <ul className="transport-list">
              <li><strong>Ônibus:</strong> Linhas que passam próximo à Villa Mandacarú</li>
              <li><strong>Distância do centro:</strong> Aproximadamente 5 km</li>
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
      </section>

      {/* Directions Section */}
      <section className="directions-section-page">
        <h2 className="page-title">Como Chegar</h2>
        <p className="page-subtitle">
          Villa Mandacarú<br />
          Itu, SP
        </p>

        <div className="directions-section">
          <div className="map-container">
            <div className="map-placeholder">
              <p>Mapa</p>
              <p className="map-note">Mapa interativo será integrado aqui</p>
            </div>
          </div>

          <div className="directions-cards">
            <div className="direction-card">
              <h3>De Carro</h3>
              <div className="direction-steps">
                <p><strong>Vindo de São Paulo:</strong></p>
                <ol>
                  <li>Siga pela Rodovia Castello Branco (SP-280)</li>
                  <li>Pegue a saída para Itu</li>
                  <li>Siga as placas para Villa Mandacarú</li>
                </ol>
                <p><strong>Vindo do Aeroporto:</strong></p>
                <ol>
                  <li>Pegue a Rodovia até Itu</li>
                  <li>Siga as placas para Villa Mandacarú</li>
                </ol>
              </div>
            </div>

            <div className="direction-card">
              <h3>De Ônibus</h3>
              <div className="direction-steps">
                <p>Linhas que passam próximo ao local:</p>
                <ul>
                  <li><strong>Linhas intermunicipais:</strong> Partem de São Paulo em direção a Itu</li>
                  <li><strong>Do centro de Itu:</strong> Táxi ou Uber até a Villa Mandacarú</li>
                </ul>
              </div>
            </div>

            <div className="direction-card">
              <h3>De Outras Cidades</h3>
              <div className="direction-steps">
                <p><strong>Aeroporto de Guarulhos (GRU):</strong></p>
                <ul>
                  <li>Distância: 80 km</li>
                  <li>Tempo: 1h30 - 2h (dependendo do trânsito)</li>
                  <li>Opções: Táxi, Uber ou transporte particular</li>
                </ul>
                <p><strong>Aeroporto de Congonhas (CGH):</strong></p>
                <ul>
                  <li>Distância: 90 km</li>
                  <li>Tempo: 1h30 - 2h</li>
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
      </section>

      {/* RSVP Section */}
      <section className="rsvp-section">
        <h2 className="page-title">Confirmar Presença</h2>
        <p className="page-subtitle">
          Por favor, confirme sua presença até o dia 01 de Junho de 2026.
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
      </section>

      {/* Gifts Section */}
      <section className="gifts-section">
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

        {!presentesLoading && presentesDisponiveis.length > 0 && (
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

        {!presentesLoading && presentesComprados.length > 0 && (
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
      </section>
    </div>
  );
};

export default WeddingPage;
