import type {
  Belief,
  LandingEvent,
  Leader,
  Region,
  ScheduleItem,
  SocialLink,
} from '../types/landing';

export const site = {
  name: 'IDBCEN',
  fullName: 'Igreja de Deus no Brasil Centenário - IDBCEN',
  domain: 'https://idbcen.com.br',
  url: 'https://idbcen.com.br/',
  logo: '/android-icon-192x192.png',
  heroImage: '/hero.jpeg',
  heroTitle: 'Igreja de Deus no Brasil Centenário - IDBCEN',
  heroSubtitle:
    'Vivenciando a fé pentecostal: Conheça nossas crenças, doutrinas e dedicação a um estilo de vida comprometido com a realização da Grande Comissão.',
  heroBadge: '140 anos no mundo, no Brasil desde 1955 e 37 anos em Campina Grande.',
  description:
    'Conheça a história, a declaração de fé, a agenda de cultos e a liderança da Igreja de Deus no Brasil em Campina Grande, PB.',
  keywords: [
    'IDBCEN',
    'Igreja de Deus no Brasil',
    'Campina Grande',
    'Centenário',
    'cultos',
    'declaração de fé',
  ],
  address: 'Rua Osvaldo Cruz, 1375, Centenário, Campina Grande, Brasil',
  mapUrl: 'https://maps.app.goo.gl/9pxBscQVgz2NaJyn6',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Rua%20Osvaldo%20Cruz%2C%201375%2C%20Centen%C3%A1rio%2C%20Campina%20Grande%2C%20Brasil&output=embed',
  videoUrl: 'https://www.youtube.com/watch?v=yBlkkaqk67c',
  videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/yBlkkaqk67c',
};

export const landingChurch = {
  name: site.fullName,
  shortName: site.name,
  address: site.address,
  city: 'Campina Grande',
  state: 'PB',
  neighborhood: 'Centenário',
  logo: site.logo,
  themeColor: '#1c4ed8',
};

export const landingTexts = {
  site_name: site.name,
  hero_title: site.heroTitle,
  hero_description: site.heroSubtitle,
  hero_primary_label: 'Conheça a Igreja',
  hero_secondary_label: 'Ver agenda de cultos',
  about_title: 'Sobre a IDBCEN',
  about_description:
    'Nossas crenças, fundamentadas nas Escrituras, moldam a identidade da Igreja de Deus. Elas representam compromissos doutrinais que refletem nossa compreensão da fé cristã e orientam nossa jornada espiritual.',
  mission_title: 'Igreja de Deus: Onde a Missão se Torna Vida',
  mission_text:
    'Comunicar o evangelho completo de Jesus Cristo, guiados pelo Espírito e pelo poder do Pentecostes, seguindo a Grande Comissão com fé, obediência e serviço.',
  vision_title: 'Nossa Visão',
  vision_text:
    'Ser uma comunidade pentecostal comprometida com a realização da Grande Comissão, formando discípulos e vivendo a santidade como estilo de vida.',
  video_url: site.videoUrl,
  journeys_title: 'Caminhos de fé em cada geração',
  journeys_description:
    'Da formação discipular à ação missionária, descubra os caminhos pelos quais a igreja serve, ensina e caminha junto com cada família.',
  contact_description: 'Estamos prontos para receber você e sua família.',
  footer_note: 'Igreja de Deus no Brasil - Centenário',
  map_url: site.mapUrl,
};

export const landingLinks: Record<string, { label: string; url: string }> = {
  calendar: {
    label: 'Agenda de Cultos',
    url: `${site.url}calendario/a7652f44690143f1a4abf938f11290d8`,
  },
  links: {
    label: 'Todos os Links',
    url: `${site.url}p/links`,
  },
  visitor: {
    label: 'Cadastro de Visitante',
    url: `${site.url}p/links/visitante`,
  },
  growth_groups: {
    label: 'Grupos de Crescimento',
    url: `${site.url}gc/links`,
  },
  prayer: {
    label: 'Pedidos de Oração',
    url: `${site.url}p/links`,
  },
  member_form: {
    label: 'Ficha de Membro / Cadastro',
    url: `${site.url}p/links`,
  },
  youtube: {
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCFw9bXuNEE-E6FqXDa6yu7g/about',
  },
  instagram: {
    label: 'Instagram',
    url: 'https://www.instagram.com/idb.cen/',
  },
  facebook: {
    label: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=100086099877665',
  },
  whatsapp: {
    label: 'WhatsApp',
    url: `${site.url}p/links`,
  },
  maps: {
    label: 'Localização / Mapa',
    url: site.mapUrl,
  },
};

export const historyMilestones = [
  {
    year: '1886',
    title: 'O começo na Carolina do Norte',
    text: 'A Igreja de Deus nasceu nos Estados Unidos, a partir de um pequeno grupo que buscava viver a fé pentecostal com compromisso e serviço.',
  },
  {
    year: '185 países',
    title: 'Uma família global',
    text: 'A trajetória cresceu até alcançar quase 8 milhões de membros em 185 países, mantendo a mesma paixão pelo evangelho completo de Jesus Cristo.',
  },
  {
    year: '1955',
    title: 'Presença no Brasil',
    text: 'A Igreja de Deus chegou ao Brasil e segue crescendo em todas as regiões do país, com experiências de fé, formação discipular e ação social.',
  },
  {
    year: '37 anos',
    title: 'IDBCEN em Campina Grande',
    text: 'Há 37 anos, a IDBCEN serve a cidade de Campina Grande com cultos, ensino da Palavra, comunhão e dedicação à Grande Comissão.',
  },
];

export const mission = {
  title: 'Igreja de Deus: Onde a Missão se Torna Vida',
  text: 'Comunicar o evangelho completo de Jesus Cristo, guiados pelo Espírito e pelo poder do Pentecostes, seguindo a Grande Comissão com fé, obediência e serviço.',
};

export const vision = {
  title: 'Nossa Visão',
  text: 'Ser uma comunidade pentecostal comprometida com a realização da Grande Comissão, formando discípulos e vivendo a santidade como estilo de vida.',
};

export const beliefsIntro =
  'Nossas crenças, fundamentadas nas Escrituras, moldam a identidade da Igreja de Deus. Elas representam compromissos doutrinais que refletem nossa compreensão da fé cristã e orientam nossa jornada espiritual.';

export const beliefs: Belief[] = [
  { number: '01', text: 'Na inspiração verbal da Bíblia.' },
  {
    number: '02',
    text: 'Em um só Deus, existente em três pessoas, a saber: o Pai, o Filho e o Espírito Santo.',
  },
  {
    number: '03',
    text: 'Que Jesus Cristo é o Filho Unigênito do Pai, concebido pelo Espírito Santo, nascido da Virgem Maria. Que Jesus foi crucificado, sepultado e ressuscitado dentre os mortos. Que subiu ao céu e hoje está à destra de Deus como intercessor.',
  },
  {
    number: '04',
    text: 'Que todos pecaram e destituídos estão da glória de Deus e que o arrependimento é ordenado por Deus a todos como necessário para perdão dos pecados.',
  },
  {
    number: '05',
    text: 'Que a justificação, regeneração e o novo nascimento são operados pela fé no sangue de Jesus Cristo.',
  },
  {
    number: '06',
    text: 'Na santificação subsequente ao novo nascimento, pela fé no sangue de Jesus Cristo, pela Palavra de Deus e pelo Espírito Santo.',
  },
  {
    number: '07',
    text: 'Na santidade como modelo de vida de Deus para seu povo.',
  },
  {
    number: '08',
    text: 'No batismo do Espírito Santo subsequente à purificação do coração.',
  },
  {
    number: '09',
    text: 'No falar em outras línguas, conforme o Espírito Santo concede que falemos e que isto é a evidência inicial do batismo do Espírito Santo.',
  },
  {
    number: '10',
    text: 'No batismo em água por imersão, e que todos que se arrependem devem ser batizados em nome do Pai, e do Filho, e do Espírito Santo.',
  },
  {
    number: '11',
    text: 'Que a cura divina é provida para todos na expiação.',
  },
  {
    number: '12',
    text: 'Na Ceia do Senhor e na lavagem dos pés dos santos.',
  },
  {
    number: '13',
    text: 'Na segunda vinda pré-milenial de Jesus. Primeiro para ressuscitar os santos e arrebatar os santos vivos para se encontrarem com Ele nos ares. Segundo, para reinar com Ele na terra por mil anos.',
  },
  {
    number: '14',
    text: 'A ressurreição dos corpos, vida eterna para os justos e castigo eterno para os ímpios.',
  },
];

export const schedule: ScheduleItem[] = [
  {
    period: '1º domingo de todo mês',
    activity: 'Santa Ceia',
    description: 'Momento de comunhão, memória e gratidão ao redor da mesa do Senhor.',
  },
  {
    period: '2º domingo de todo mês',
    activity: 'Culto de Missões',
    description: 'Intercessão e informação sobre a obra missionária nacional e mundial.',
  },
  {
    period: '3º domingo de todo mês',
    activity: 'Culto da Família',
    description: 'Culto intergeracional com participação de crianças, jovens e famílias.',
  },
  {
    period: 'Todas as terças-feiras',
    activity: 'Grupos de Crescimento',
    description: 'Encontros de discipulado, estudo da Palavra e comunhão em pequenos grupos.',
  },
  {
    period: 'Todas as quintas-feiras',
    activity: 'Culto de Doutrina',
    description: 'Ensino sistemático das verdades bíblicas e da declaração de fé.',
  },
];

export const upcomingEvents: LandingEvent[] = [];

export const internationalLeaders: Leader[] = [
  { name: 'Dr. Gary J. Lewis', role: 'Diretor Geral da Igreja de Deus' },
  { name: 'Dr. M. Thomas Propes', role: 'Diretor Mundial de Missões' },
  { name: 'Dr. Ángel Marcial', role: 'Diretor para América Latina' },
];

export interface CouncilRow {
  label: string;
  names: string[];
}

export const internationalCouncilTitle =
  'Conselho dos Dezoito / Conselho Executivo Internacional';

export const internationalCouncilRows: CouncilRow[] = [
  {
    label: 'Frente, esq.',
    names: ['Mark Williams', 'Tony Stewart', 'Gary Lewis', 'Wayne Dority', 'Thomas Madden'],
  },
  {
    label: 'Segunda fila, esq.',
    names: ['Lennox Walker', 'Toby Morgan', 'Niko Njotorahardjo', 'David Cooper', 'Julio Melendez'],
  },
  {
    label: 'Terceira fila, esq.',
    names: [
      'Jerry Madden',
      'Nick Park',
      'Ken Hill',
      'Rudi Abraham (representante da Indonésia)',
      'Stafford Petersen (representante da África do Sul)',
      'Angel Marcial',
      'Rick Whitter',
      'Anthony Pelt',
    ],
  },
  {
    label: 'Fileira superior, esq.',
    names: [
      'Kelvin Page',
      'RC Hugh Nelson',
      'Kip Box',
      'Ishmael Charles',
      'Joe Dobbins',
      'Kevin McGlamery',
      'William Lee',
    ],
  },
];

export const nationalSuperintendent: Leader = {
  name: 'Dr. Orlando José de Figueiredo Neto',
  role: 'Superintendente Nacional',
};

export const nationalLeaders: Leader[] = [
  { name: 'Pra. Clarice Figueiredo', role: 'Ministério da Mulher' },
  { name: 'Pra. Elizabeth Maria', role: 'Ministério de Intercessão' },
  { name: 'Bp. Samuel Tavares', role: 'Ministério de Jovens' },
  { name: 'Ev. Mara Núbia G. Costa', role: 'Ministério da Crianças' },
  { name: 'Bp. Francisco José', role: 'Ministério de Cuidado Pastoral' },
  { name: 'Pr. Israel Ferreira', role: 'Ministério Música e Artes' },
  { name: 'Ev. Reijane Oliveira', role: 'Ministério de Evangelismo e Discipulado' },
  { name: 'Pr. Matheus Nunes', role: 'Ministério Filhos de Pastores' },
  { name: 'Dr. Kleber Spirandeli', role: 'Diretor Nacional de Educação' },
  { name: 'Pra. Veranilda de Oliveira', role: 'Ação Social - ABASC' },
  { name: 'Bp. Ado Martins', role: 'DNP' },
  { name: 'Bp. Gustavo Chavez', role: 'CTM' },
  {
    name: 'Pr. Diogo Henrique',
    role: 'Diretor do Ministério de Plantação de Igreja',
  },
  {
    name: 'Pr. Marcus Basílio e Pra. Fernanda Basílio',
    role: 'Ministério da Família',
  },
  { name: 'Pra. Mariani Xavier', role: 'AEMI Brasil' },
  {
    name: 'Pra. Maria da Conceição Fidêncio',
    role: 'Diretora do SEID Nacional',
  },
  { name: 'Pr. Raquel Gomes', role: 'Ministério de Adolescentes' },
  { name: 'Pr. Eugênio Lopes', role: 'Capelania' },
  { name: 'Bp. Eric Thun', role: 'Diretor da EBD e Educação Cristã' },
  {
    name: 'Ev. Rodrigo Ávila Figueiredo',
    role: 'Secretário do ICM para o Brasil',
  },
];

export const regions: Region[] = [
  { region: 'Região Norte', supervisor: 'Bp. Altino Dias' },
  { region: 'Região Nordeste', supervisor: 'Bp. José Roberto' },
  { region: 'Região Centro-Oeste', supervisor: 'Dr. Izaias Antônio' },
  { region: 'Região Central', supervisor: 'Dr. Expedito de Melo' },
  { region: 'Região Sul - Interino', supervisor: 'Dr. Orlando José' },
  { region: 'Região Sudeste', supervisor: 'Bp. Paulo Roberto' },
];

export const socialLinks: SocialLink[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/idb.cen/', shortLabel: 'IG' },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCFw9bXuNEE-E6FqXDa6yu7g/about',
    shortLabel: 'YT',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=100086099877665',
    shortLabel: 'FB',
  },
  {
    label: 'WhatsApp',
    href: landingLinks.whatsapp.url,
    shortLabel: 'WA',
  },
];
