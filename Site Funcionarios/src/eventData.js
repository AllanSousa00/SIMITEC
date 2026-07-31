// Dados padrao da SIMITEC.
// Se o banco ainda nao tiver conteudo publicado, o sistema usa isso aqui
// para nao nascer com a tela vazia.
export const eventInfo = {
  id: "simitec-2026",
  name: "SIMITEC",
  fullName: "Semana de Inovação e Metodologias Integradas a Tecnologias",
  edition: "SIMITEC 2026",
  logoUrl: "/assets/simitec-logo-oficial-2026-transparente.png",
  heroImage: "/assets/galeria-3.jpg",
  dateLabel: "Inscrições abertas",
  startAt: null,
  location: "ECIT Engenheira Márcia Guedes Alcoforado de Carvalho, Rua 1 de Maio, 220, Belém-PB",
  summary:
    "Evento extensivo e técnico-científico da ECIT Márcia Guedes, voltado para estudantes, professores, pesquisadores e comunidade, com trilhas tecnológicas, feira de ciências, oficinas, minicursos, apresentações culturais e práticas de inovação social.",
  researchNote:
    "A SIMITEC integra o calendário escolar da ECIT Márcia Guedes desde 2022, com atividades de ciência, tecnologia, cultura de paz, diversidade, inclusão social, pesquisa, extensão, inovação e empreendedorismo.",
  officialStatus:
    "Programação, avisos e orientações são divulgados pela organização do evento.",
  footer: {
    organizerName: "ECIT ENGENHEIRA MARCIA GUEDES ALCOFORADO DE CARVALHO",
    email: "simitec.suporte.oficial@gmail.com",
    instagram: "@simitec",
    whatsapp: "",
    footerText: "© 2026 SIMITEC · Todos os direitos reservados",
    termsEnabled: true,
    privacyEnabled: true
  },
  lastConfirmedEdition:
    "A SIMITEC é um evento técnico-científico promovido pela ECIT Márcia Guedes, em Belém-PB, com histórico público de atividades desde 2022.",
  highlights: [
    "Mostra científica e feira de ciências com projetos da Base Técnica e BNCC.",
    "Trilhas Tecnológicas com robótica, programação, manutenção de computadores e laboratórios.",
    "Oficinas, minicursos, palestras e workshops com atividades aplicadas nas áreas técnicas e científicas.",
    "Participação de estudantes da ECIT Márcia Guedes e de escolas de Belém e região."
  ],
  documents: [
    {
      title: "Regulamento 2025",
      label: "Documento oficial publicado na página 2025",
      url: "https://www.even3.com.br/simitec2025-585577/"
    },
    {
      title: "Diretrizes para resumo expandido",
      label: "Modelo citado na página pública 2025",
      url: "https://www.even3.com.br/simitec2025-585577/"
    },
    {
      title: "Modelo para banner do projeto",
      label: "Modelo citado na página pública 2025",
      url: "https://www.even3.com.br/simitec2025-585577/"
    }
  ],
  sources: [
    {
      title: "Even3 - SIMITEC 2025",
      url: "https://www.even3.com.br/simitec2025-585577/"
    },
    {
      title: "Consed - Projeto SIMITEC selecionado pelo CNPq",
      url: "https://www.consed.org.br/noticia/projeto-da-ecit-marcia-guedes-e-selecionado-pelo-cnpq-e-recebera-mais-de-r-30-mil-para-investimentos"
    },
    {
      title: "Governo da Paraíba - SIMITEC 2024",
      url: "https://paraiba.pb.gov.br/diretas/secretaria-da-educacao/noticias/ecit-marcia-guedes-em-belem-promove-semana-de-inovacao-e-tecnologia-com-estudantes-do-brejo-paraibano"
    },
    {
      title: "Governo da Paraíba - SIMITEC 2023",
      url: "https://paraiba.pb.gov.br/diretas/secretaria-da-educacao/noticias/ecit-marcia-guedes-em-belem-promove-ii-semana-de-inovacao-e-metodologias-integradas-a-tecnologias"
    }
  ]
};

export const eventSchedule = [
  {
    day: "Dia 1",
    title: "Abertura, credenciamento e integração",
    status: "Recepção e abertura",
    items: [
      {
        time: "08:00",
        title: "Credenciamento geral",
        type: "Geral",
        location: "Entrada principal",
        description: "Recepção de estudantes, professores, visitantes e convidados."
      },
      {
        time: "09:00",
        title: "Abertura institucional",
        type: "Cerimônia",
        location: "Auditório ou pátio",
        description: "Apresentação da proposta da SIMITEC, parceiros e orientações de participação."
      },
      {
        time: "10:00",
        title: "Palestra de inovação e participação estudantil",
        type: "Palestra",
        location: "Auditório",
        description: "Debate sobre tecnologia, mundo contemporâneo e participação dos estudantes."
      },
      {
        time: "13:30",
        title: "Oficinas e minicursos",
        type: "Oficinas",
        location: "Laboratórios e salas",
        description: "Atividades práticas como Python, robótica, plano de negócios e tecnologias educacionais."
      }
    ]
  },
  {
    day: "Dia 2",
    title: "Trilhas Tecnológicas",
    status: "Mostras e experiências",
    items: [
      {
        time: "08:00",
        title: "Mostra de robótica e programação",
        type: "Trilhas",
        location: "Sala maker e laboratórios",
        description: "Projetos de robótica educacional, algoritmos, manutenção e experiências interativas."
      },
      {
        time: "10:30",
        title: "Laboratórios em exposição",
        type: "Mostra",
        location: "Laboratórios de ciências",
        description: "Exposições de física, química, matemática e tecnologias aplicadas."
      },
      {
        time: "14:00",
        title: "Games e experiências interativas",
        type: "Interação",
        location: "Sala maker",
        description: "Jogos educativos, desafios e demonstrações tecnológicas."
      }
    ]
  },
  {
    day: "Dia 3",
    title: "Feira de ciências, cultura e encerramento",
    status: "Projetos e cultura",
    items: [
      {
        time: "08:00",
        title: "Feira de ciências e mostra científica",
        type: "Científico",
        location: "Pátio e salas de exposição",
        description: "Apresentação de trabalhos da Base Técnica e BNCC por estudantes da ECIT e escolas convidadas."
      },
      {
        time: "13:30",
        title: "Apresentações culturais",
        type: "Cultura",
        location: "Palco escolar",
        description: "Teatro, música, dança, comunicação e atividades de convivência."
      },
      {
        time: "15:30",
        title: "Cosplay e cultura geek",
        type: "Cultura geek",
        location: "Palco escolar",
        description: "Mostra de criatividade, figurino, performance e convivência respeitosa."
      }
    ]
  }
];

export const eventFaq = [
  {
    category: "Inscrições e credenciais",
    items: [
      {
        question: "Quem pode participar da SIMITEC?",
        answer:
          "O evento é voltado para estudantes, professores, pesquisadores, comunidade escolar e visitantes interessados em ciência, tecnologia e inovação social."
      },
      {
        question: "A inscrição geral é obrigatória?",
        answer:
          "Sim. A inscrição geral confirma o credenciamento e libera a escolha de uma área de participação."
      },
      {
        question: "Como funciona a credencial?",
        answer:
          "Após a confirmação, o site gera uma credencial com código único e QR Code para apresentação no credenciamento."
      }
    ]
  },
  {
    category: "Atividades",
    items: [
      {
        question: "Posso participar de mais de uma área?",
        answer:
          "O sistema permite registrar interesse em diferentes áreas. Oficinas com vagas limitadas podem ter controle específico pela organização."
      },
      {
        question: "Como funcionam trabalhos e banners?",
        answer:
          "Projetos de feira de ciências devem seguir as diretrizes publicadas pela organização, incluindo resumo, orientador e área temática."
      },
      {
        question: "Cosplay faz parte da programação oficial?",
        answer:
          "Sim. A área de cosplay e cultura geek está organizada para receber inscrições, regras e controle de credenciais pelo site."
      }
    ]
  },
  {
    category: "Dados e segurança",
    items: [
      {
        question: "Por que preciso confirmar o e-mail?",
        answer:
          "A verificação reduz cadastros falsos e protege a recuperação de senha e a emissão de credenciais."
      },
      {
        question: "Quais dados ficam salvos?",
        answer:
          "O site salva apenas dados necessários para conta, inscrição, área escolhida, acessibilidade, credencial e comunicação do evento."
      },
      {
        question: "Posso corrigir meus dados depois?",
        answer:
          "Sim. O participante pode atualizar as informações do perfil antes do evento para manter a credencial e o contato corretos."
      },
      {
        question: "Como recupero o acesso à conta?",
        answer:
          "Na tela de entrada, use a opção de recuperação de senha e siga o link enviado para o e-mail cadastrado."
      }
    ]
  }
];

export const eventPeople = [
  {
    slug: "inovacao-e-participacao-estudantil",
    category: "Palestra",
    activityTitle: "Inovação e participação estudantil",
    activitySummary: "Conversa sobre tecnologia, mundo contemporâneo e a participação dos estudantes na construção de novas ideias.",
    details: "A palestra apresenta caminhos para transformar curiosidade em iniciativa, aproximando inovação, educação e protagonismo estudantil.",
    schedule: "Dia 1 · 10:00",
    location: "Auditório",
    name: "Equipe SIMITEC",
    role: "Mediação da organização",
    bio: "A equipe responsável conduz a conversa e organiza a participação dos estudantes durante a atividade.",
    visible: true
  },
  {
    slug: "python-e-logica-de-programacao",
    category: "Oficina",
    activityTitle: "Python e lógica de programação",
    activitySummary: "Introdução prática ao raciocínio lógico e aos primeiros passos na criação de soluções com Python.",
    details: "A oficina propõe exercícios guiados de lógica, leitura de código e construção de pequenos exemplos em Python para quem está começando.",
    schedule: "Dia 1 · Tarde",
    location: "Laboratório de informática",
    name: "Equipe SIMITEC",
    role: "Equipe responsável",
    bio: "A equipe da organização acompanha a oficina, orienta os participantes e mantém a atividade no ritmo certo.",
    visible: true
  },
  {
    slug: "robotica-na-pratica",
    category: "Oficina",
    activityTitle: "Robótica na prática",
    activitySummary: "Atividade introdutória com montagem, experimentação e demonstrações conectadas à robótica educacional.",
    details: "A oficina aproxima os participantes de conceitos básicos de robótica por meio de exemplos práticos, montagem orientada e troca de experiências.",
    schedule: "Dia 1 · Tarde",
    location: "Sala maker",
    name: "Equipe SIMITEC",
    role: "Equipe responsável",
    bio: "A equipe da organização acompanha a oficina, orienta os participantes e mantém a atividade no ritmo certo.",
    visible: true
  },
  {
    slug: "plano-de-negocios",
    category: "Oficina",
    activityTitle: "Plano de negócios e empreendedorismo",
    activitySummary: "Oficina para organizar ideias, identificar oportunidades e compreender os primeiros elementos de um plano de negócios.",
    details: "A atividade apresenta uma visão inicial de proposta de valor, público, recursos e planejamento para transformar uma ideia em projeto.",
    schedule: "Dia 1 · Tarde",
    location: "Sala temática",
    name: "Equipe SIMITEC",
    role: "Equipe responsável",
    bio: "A equipe da organização acompanha a oficina, orienta os participantes e mantém a atividade no ritmo certo.",
    visible: true
  }
];

export const eventAreas = [
  {
    slug: "cosplay",
    title: "Cosplay e Cultura Geek",
    shortTitle: "Cosplay",
    seats: 30,
    accent: "#ec3750",
    tag: "Apresentação cultural",
    schedule: "Mostra e desfile",
    location: "Auditório principal",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "10:30", end: "11:30" }, Tarde: { start: "15:30", end: "16:30" } },
    applicationMode: "external-form",
    externalFormLabel: "Inscrever-se pelo Forms",
    externalFormUrl: "",
    externalFormMessage:
      "A participação no cosplay passa por avaliação da equipe. Depois de responder ao Forms, a organização avisará por e-mail se a inscrição foi aceita ou não.",
    description:
      "Espaço voltado a personagens, figurinos, performance e criatividade, com foco em expressão artística, respeito e convivência em ambiente escolar.",
    requirements: [
      "Figurinos e props devem ser seguros para circulação no evento.",
      "Menores de idade devem informar responsável.",
      "A apresentação deve respeitar o código de conduta e a diversidade do público."
    ],
    formFields: [
      { name: "characterName", label: "Personagem ou conceito", type: "text", required: true },
      { name: "origin", label: "Anime, jogo, filme ou obra", type: "text", required: false },
      { name: "presentation", label: "Resumo da apresentação", type: "textarea", required: false }
    ]
  },
  {
    slug: "trilhas-tecnologicas",
    title: "Trilhas Tecnológicas",
    shortTitle: "Trilhas",
    seats: 30,
    accent: "#2484c6",
    tag: "Mostra prática",
    schedule: "Dois dias de exposições e experiências",
    location: "Laboratórios e salas temáticas",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "08:00", end: "09:00" }, Tarde: { start: "13:30", end: "14:30" } },
    description:
      "Mostra de trabalhos desenvolvidos por estudantes e professores, incluindo robótica educacional, programação, montagem e manutenção de computadores, química, física e matemática.",
    requirements: [
      "Participantes podem visitar as trilhas como ouvintes.",
      "Projetos expositores devem informar título e equipe.",
      "As equipes devem manter pelo menos um representante no espaço."
    ],
    formFields: []
  },
  {
    slug: "oficinas-minicursos",
    title: "Oficinas e Minicursos",
    shortTitle: "Oficinas",
    seats: 30,
    accent: "#0faf5d",
    tag: "Vagas limitadas",
    schedule: "Manhã e tarde - conforme programação",
    location: "Salas e laboratório de informática",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "09:15", end: "10:15" }, Tarde: { start: "14:45", end: "15:45" } },
    description:
      "Atividades de aprendizagem prática inspiradas na programação da SIMITEC, com temas como algoritmos em Python, robótica, plano de negócios, tecnologias de baixo custo, linguagens e cultura digital.",
    requirements: [
      "Chegar com antecedência para credenciamento.",
      "Algumas oficinas podem exigir notebook ou celular.",
      "A vaga é confirmada pela credencial emitida no site."
    ],
    formFields: [
      {
        name: "interest",
        label: "Oficina de maior interesse",
        type: "select",
        required: true,
        options: ["Python e lógica", "Robótica na prática", "Plano de negócios", "Tecnologias de baixo custo", "Mandarim e cultura"]
      }
    ]
  },
  {
    slug: "feira-ciencias",
    title: "Feira de Ciências e Mostra Científica",
    shortTitle: "Feira",
    seats: 30,
    accent: "#f3c316",
    tag: "Projetos e banners",
    schedule: "Exposição de projetos",
    location: "Pátio e salas de exposição",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "10:30", end: "11:30" }, Tarde: { start: "13:30", end: "14:30" } },
    description:
      "Espaço para apresentação de trabalhos das áreas de base técnica e BNCC, com pesquisa, inovação e comunicação científica feita pelos estudantes.",
    requirements: [
      "Projetos devem ter orientador ou responsável informado.",
      "Resumo e banner podem seguir as diretrizes oficiais do evento.",
      "A organização poderá agrupar projetos por área temática."
    ],
    formFields: [
      { name: "projectTitle", label: "Título do trabalho", type: "text", required: true },
      { name: "advisor", label: "Orientador ou responsável", type: "text", required: false },
      { name: "area", label: "Área temática", type: "text", required: true }
    ]
  },
  {
    slug: "apresentacoes-culturais",
    title: "Apresentações Culturais",
    shortTitle: "Cultura",
    seats: 30,
    accent: "#7b57d6",
    tag: "Palco escolar",
    schedule: "Abertura e encerramento",
    location: "Auditório e pátio",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "09:15", end: "10:15" }, Tarde: { start: "15:00", end: "16:00" } },
    description:
      "Apresentações de teatro, música, dança, comunicação e intervenções artísticas que aproximam ciência, tecnologia, cultura de paz e identidade local.",
    requirements: [
      "Informar o tipo de apresentação.",
      "Conteúdos devem ser adequados ao ambiente escolar.",
      "Equipamentos especiais devem ser solicitados com antecedência."
    ],
    formFields: [
      { name: "presentationType", label: "Tipo de apresentação", type: "text", required: true },
      { name: "duration", label: "Duração aproximada", type: "text", required: false }
    ]
  },
  {
    slug: "games-interativos",
    title: "Games e Experiências Interativas",
    shortTitle: "Games",
    seats: 30,
    accent: "#252b65",
    tag: "Desafios e interação",
    schedule: "Atividades livres e desafios",
    location: "Sala maker",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "10:30", end: "11:30" }, Tarde: { start: "14:45", end: "15:45" } },
    description:
      "Área para desafios, experiências digitais, jogos educativos, cubo mágico e demonstrações criativas conectadas ao universo da tecnologia.",
    requirements: [
      "Zelar pelos equipamentos compartilhados.",
      "Respeitar as filas e tempos de participação.",
      "Projetos autorais podem ser cadastrados para demonstração."
    ],
    formFields: [
      { name: "activity", label: "Atividade desejada", type: "text", required: true },
      { name: "experience", label: "Experiência prévia", type: "textarea", required: false }
    ]
  },
  {
    slug: "robotica-educacional",
    title: "Robótica Educacional",
    shortTitle: "Robótica",
    seats: 30,
    accent: "#16a6c9",
    tag: "Oficina prática",
    schedule: "Manhã e tarde",
    location: "Sala maker",
    imageUrl: "/assets/galeria-2.jpg",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "08:00", end: "09:00" }, Tarde: { start: "13:30", end: "14:30" } },
    description:
      "Espaço para conhecer protótipos, automação, montagem de circuitos e soluções criativas desenvolvidas com robótica educacional.",
    requirements: [
      "Respeitar as orientações de segurança durante as demonstrações.",
      "Compartilhar os materiais e equipamentos com os demais participantes.",
      "Chegar com antecedência para organização das turmas."
    ],
    formFields: []
  },
  {
    slug: "programacao-web",
    title: "Programação e Desenvolvimento Web",
    shortTitle: "Programação",
    seats: 30,
    accent: "#316be8",
    tag: "Laboratório digital",
    schedule: "Manhã e tarde",
    location: "Laboratório de informática",
    imageUrl: "/assets/galeria-1.jpg",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "09:15", end: "10:15" }, Tarde: { start: "14:45", end: "15:45" } },
    description:
      "Atividade introdutória para explorar lógica, criação de páginas, interfaces digitais e possibilidades de desenvolvimento com tecnologia.",
    requirements: [
      "Seguir as orientações do laboratório de informática.",
      "Utilizar os equipamentos de forma responsável.",
      "Não é necessário ter experiência anterior."
    ],
    formFields: []
  },
  {
    slug: "empreendedorismo-negocios",
    title: "Empreendedorismo e Plano de Negócios",
    shortTitle: "Negócios",
    seats: 30,
    accent: "#e88724",
    tag: "Ideias e projetos",
    schedule: "Manhã e tarde",
    location: "Sala temática",
    imageUrl: "/assets/galeria-4.jpg",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "10:30", end: "11:30" }, Tarde: { start: "15:00", end: "16:00" } },
    description:
      "Atividade para transformar ideias em projetos, compreendendo proposta de valor, público, planejamento e apresentação de soluções.",
    requirements: [
      "Participar das dinâmicas propostas pela equipe.",
      "Levar ideias ou problemas que possam inspirar soluções.",
      "Respeitar o tempo de apresentação dos grupos."
    ],
    formFields: []
  },
  {
    slug: "quimica-experimentos",
    title: "Química e Experimentos",
    shortTitle: "Química",
    seats: 30,
    accent: "#12a56e",
    tag: "Laboratório científico",
    schedule: "Manhã e tarde",
    location: "Laboratório de ciências",
    imageUrl: "/assets/galeria-3.jpg",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "08:00", end: "09:00" }, Tarde: { start: "13:30", end: "14:30" } },
    description:
      "Experiências orientadas para aproximar conceitos de química do cotidiano com observação, investigação e aprendizagem prática.",
    requirements: [
      "Seguir todas as orientações dos responsáveis pelo laboratório.",
      "Não manipular materiais sem autorização.",
      "Utilizar equipamentos de proteção quando solicitado."
    ],
    formFields: []
  },
  {
    slug: "fisica-astronomia",
    title: "Física e Astronomia",
    shortTitle: "Física",
    seats: 30,
    accent: "#7656d9",
    tag: "Ciência aplicada",
    schedule: "Manhã e tarde",
    location: "Sala de ciências",
    imageUrl: "/assets/galeria-1.jpg",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "09:15", end: "10:15" }, Tarde: { start: "14:45", end: "15:45" } },
    description:
      "Demonstrações e atividades para observar fenômenos físicos, experimentos escolares e curiosidades relacionadas ao universo.",
    requirements: [
      "Participar das demonstrações de forma organizada.",
      "Aguardar a orientação antes de utilizar materiais.",
      "Respeitar a capacidade da sala em cada turno."
    ],
    formFields: []
  },
  {
    slug: "sustentabilidade-inovacao-social",
    title: "Sustentabilidade e Inovação Social",
    shortTitle: "Sustentabilidade",
    seats: 30,
    accent: "#5daa36",
    tag: "Impacto social",
    schedule: "Manhã e tarde",
    location: "Sala temática",
    imageUrl: "/assets/galeria-4.jpg",
    sessionOptions: ["Manhã", "Tarde"],
    sessionSlots: { Manhã: { start: "10:30", end: "11:30" }, Tarde: { start: "15:00", end: "16:00" } },
    description:
      "Espaço para discutir soluções sustentáveis, tecnologias de baixo custo e projetos capazes de melhorar a comunidade.",
    requirements: [
      "Participar das conversas e atividades propostas.",
      "Valorizar soluções viáveis para a realidade local.",
      "Respeitar a diversidade de ideias apresentadas."
    ],
    formFields: []
  }
];

export function findArea(slug) {
  return eventAreas.find((area) => area.slug === slug);
}

