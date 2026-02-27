export interface GiftSeedItem {
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  imagem: string;
  quota?: boolean;
}

export const DEFAULT_GIFTS_SEED: GiftSeedItem[] = [
  {
    nome: 'Gyros da Madrugada em Atenas',
    descricao:
      'Depois de um dia inteiro explorando, nada melhor que um gyros suculento para fechar a noite felizes da vida.',
    preco: 95,
    estoque: 6,
    imagem:
      'https://www.tasteofhome.com/wp-content/uploads/2024/03/Homemade-Gyros_EXPS_FT24_269750_EC_010424_10.jpg',
  },
  {
    nome: 'Sorvete Grego à Beira-Mar',
    descricao: 'Uma pausa doce durante um passeio pelas ilhas gregas.',
    preco: 110,
    estoque: 5,
    imagem:
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/18/53/56/23/mitatos-handcrafted-ice.jpg?w=600&h=300&s=1',
  },
  {
    nome: 'Uber em Atenas',
    descricao: 'Nosso transporte confortável entre aeroporto, hotel e passeios.',
    preco: 97,
    estoque: 4,
    imagem:
      'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/04/taxi-atenas-grecia-jpg.webp',
  },
  {
    nome: 'Brinde Grego a Dois',
    descricao:
      'Taças levantadas com vinho grego para celebrar nossa lua de mel.',
    preco: 160,
    estoque: 4,
    imagem: 'https://dayanecasal.com/wp-content/uploads/2023/08/IMG_9524.jpg',
  },
  {
    nome: 'Tour em Plaka',
    descricao:
      'Caminhada charmosa por Plaka e Monastiraki com guia local, histórias curiosas e aquelas dicas de comida que so os locais conhecem.',
    preco: 126,
    estoque: 5,
    imagem:
      'https://uploads.grupodicas.com/2024/07/PqCmvEuV-plaka-atenas-jpeg.webp',
  },
  {
    nome: 'Date na Acrópole',
    descricao:
      'Entradas para explorar a Acrópole juntinhos e tirar fotos inesquecíveis.',
    preco: 220,
    estoque: 4,
    imagem:
      'https://cdn-imgix.headout.com/microbrands-banner-image/image/b698f96a3bf7e35418940973f33c4708-The%20Acropolis%20of%20Athens.jpeg',
  },
  {
    nome: 'Modo Férias: Spa em Casal',
    descricao:
      'Uma hora de massagem para desligar do mundo e recarregar as energias entre um passeio e outro.',
    preco: 149,
    estoque: 4,
    imagem:
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/68/5a/29/old-city-hamam.jpg?w=500&h=500&s=1',
  },
  {
    nome: 'MasterChef da Lua de Mel',
    descricao:
      'Aula pratica para aprendermos receitas gregas e testar nosso talento culinario juntos.',
    preco: 227,
    estoque: 4,
    imagem:
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1b/06/23/1b/caption.jpg?w=500&h=400&s=1',
  },
  {
    nome: 'Jantar com Vista para a Acrópole',
    descricao:
      'Mesa especial em rooftop para brindar nossa história com vista iluminada.',
    preco: 350,
    estoque: 3,
    imagem:
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/e0/5d/60/acropolis-on-your-plate.jpg?w=900&h=500&s=1',
  },
  {
    nome: 'Catamarã no Mar Egeu',
    descricao:
      'Meio dia navegando com paradas para mergulho em águas cristalinas.',
    preco: 417,
    estoque: 3,
    imagem:
      'https://imageresizer.yachtsbt.com/boats/117724/5eb3f583d9e2447a5233c6ed.jpeg?method=fit&width=360&height=300&format=jpeg',
  },
  {
    nome: 'Tour gastronômico em Atenas',
    descricao: 'Um roteiro delicioso pelos sabores tradicionais da Grécia.',
    preco: 258,
    estoque: 4,
    imagem:
      'https://www.fuiserviajante.com/wp-content/uploads/2020/04/culinaria-grega-pratos-tipicos.jpg',
  },
  {
    nome: 'Aula de dança Grega',
    descricao: 'Uma experiência divertida para entrarmos no ritmo local.',
    preco: 230,
    estoque: 3,
    imagem:
      'https://www.listenandlearn.com.br/blog/wp-content/uploads/2013/12/washington-DC-greek-wedding-58.jpg',
  },
  {
    nome: 'Espumante no Pôr do Sol em Santorini',
    descricao: 'Um brinde especial vendo o sol desaparecer no mar Egeu.',
    preco: 280,
    estoque: 4,
    imagem:
      'https://media-cdn.tripadvisor.com/media/photo-s/11/39/de/d8/melhor-combinacao-champagne.jpg',
  },
  {
    nome: 'Diária Charmosa em Santorini',
    descricao: 'Uma noite acordando com vista cinematográfica da caldeira.',
    preco: 480,
    imagem:
      'https://cdn.hotel.express/santorini_grecia_fd0230cf29/santorini_grecia_fd0230cf29.jpg',
    estoque: 3,
  },
  {
    nome: 'Ensaio Fotográfico em Santorini',
    descricao: 'Fotos profissionais para eternizar nossa lua de mel.',
    preco: 390,
    estoque: 2,
    imagem: 'https://media.tacdn.com/media/attractions-splice-spp-674x446/12/8f/c0/e0.jpg',
  },
  {
    nome: 'Aluguel de Carro',
    descricao: 'Um dia de carro para explorar os arredores de Atenas.',
    preco: 299,
    estoque: 3,
    imagem:
      'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/03/aluguel-carro-grecia-5-1-jpg.webp',
  },
  {
    nome: 'Passeio de Barco Privativo (Cota)',
    descricao:
      'Ajuda para realizarmos um cruzeiro de um dia para Paxos, Antipaxos e Grutas Azuis.',
    preco: 650,
    estoque: 3,
    quota: true,
    imagem:
      'https://cdn.getyourguide.com/image/format=auto,fit=crop,gravity=center,quality=60,height=465,dpr=2/tour_img/563e3e7b4f5cef20.jpeg',
  },
  {
    nome: 'Jantar nas termas de Agripa',
    descricao: 'Um jantar à luz de velas nas antigas termas de Agripa.',
    preco: 446,
    estoque: 3,
    imagem:
      'https://cdn.getyourguide.com/image/format=auto,fit=crop,gravity=center,quality=60,height=465,dpr=2/tour_img/fed765b9fdb733d354f17b10f9cb060af51da466d6ed1e826c546f519236dbf1.jpg',
  },
  {
    nome: 'Mergulho a Dois no Mar Egeu',
    descricao:
      'Experiência de mergulho com instrutor e todo equipamento incluso para descobrirmos juntos o fundo do mar grego.',
    preco: 463,
    estoque: 3,
    imagem: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1200&q=80',
  },
  {
    nome: 'Mini Temporada em Hotel Boutique (Cota)',
    descricao: 'Contribuição para três noites especiais em hotel boutique.',
    preco: 700,
    estoque: 3,
    quota: true,
    imagem:
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/b9/70/3b/caption.jpg?w=900&h=500&s=1',
  },
  {
    nome: 'Voo Atenas - Mykonos (Cota)',
    descricao: 'Parte das passagens entre as ilhas gregas.',
    preco: 780,
    estoque: 4,
    quota: true,
    imagem:
      'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/07/mykonos-aeroporto-aviao-jpg.webp',
  },
  {
    nome: 'Passagem Aérea Brasil - Grécia (Cota)',
    descricao: 'Contribuição para o grande vôo da nossa lua de mel.',
    preco: 1200,
    estoque: 5,
    quota: true,
    imagem:
      'https://dicadagrecia.com.br/wp-content/uploads/sites/24/2020/11/aviao-grecia-jpg.webp',
  },
];
