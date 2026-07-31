const legalUpdatedAt = "24 de maio de 2026";
const legalVersion = `Versão 1.0 — ${legalUpdatedAt}`;
const legalContact = "simitec.suporte.oficial@gmail.com";
const legalOrganization = "SIMITEC — ECIT Márcia Guedes, Belém-PB";
const legalDataRetention = "até 24 meses após o encerramento da edição, salvo obrigação legal, prestação de contas, defesa de direitos, emissão de certificados ou solicitação válida de exclusão";

export const legalPages = {
  termos: {
    eyebrow: "SIMITEC",
    title: "Termos e Condições de Uso e Participação",
    intro: "Regras de uso do site de inscrições, credenciamento e participação nas atividades da SIMITEC.",
    version: legalVersion,
    route: "/termos",
    description: "Termos de uso, participação, credenciamento, QR Code, certificados, conduta e uso de imagem e voz da SIMITEC.",
    sections: [
      {
        id: "apresentacao",
        title: "Apresentação e ciência dos termos",
        paragraphs: [
          "A SIMITEC é um evento educacional, científico, tecnológico, cultural e institucional. Estes termos explicam as regras de uso do site, das inscrições, do credenciamento, da credencial digital e da participação nas atividades oficiais.",
          "Ao criar conta, realizar inscrição, acessar a credencial ou participar de uma atividade, a pessoa participante declara que leu e compreendeu estes termos. Quando houver menor de idade, a participação poderá depender de ciência ou autorização do responsável legal, conforme a regra da atividade."
        ]
      },
      {
        id: "conta-inscricao",
        title: "Conta e inscrição",
        paragraphs: [
          "A pessoa participante deve informar dados verdadeiros, completos e atualizados. O e-mail, CPF, telefone, instituição, turma, cidade e demais informações cadastradas poderão ser usados para organizar a entrada, confirmar a participação, emitir credenciais e enviar orientações relacionadas ao evento.",
          "Informações falsas, incompletas, duplicadas, desatualizadas ou incompatíveis com a finalidade do evento poderão gerar correção cadastral, recusa de inscrição, bloqueio temporário, cancelamento de vaga ou impedimento de credenciamento.",
          "Quando houver conta de acesso, a pessoa usuária é responsável por manter o sigilo da senha e por usar corretamente o e-mail ou outro contato informado."
        ]
      },
      {
        id: "credencial",
        title: "Credencial e QR Code",
        paragraphs: [
          "A credencial com QR Code é pessoal, individual e intransferível. Ela poderá ser usada para confirmar inscrição, credenciar a pessoa na entrada, registrar presença, organizar filas, controlar vagas, validar acesso a atividades e apoiar a emissão de certificados.",
          "O QR Code deverá ser apresentado pela própria pessoa participante no credenciamento geral e, quando necessário, nas atividades escolhidas. A equipe poderá validar o código pelo leitor oficial, por busca manual ou por conferência dos dados cadastrados.",
          "A organização poderá solicitar documento de identificação, conferência de dados ou validação presencial quando houver dúvida sobre a inscrição, inconsistência cadastral, tentativa de uso indevido ou necessidade de segurança operacional.",
          "É proibido vender, ceder, emprestar, adulterar, reutilizar, fotografar para uso de terceiros ou compartilhar credencial de outra pessoa. O uso indevido poderá gerar cancelamento da inscrição, bloqueio da credencial e impedimento de participação.",
          "Se houver falha técnica, internet instável ou indisponibilidade momentânea do leitor, a equipe poderá registrar a presença por conferência manual e sincronizar os dados depois."
        ]
      },
      {
        id: "vagas-programacao",
        title: "Vagas, atividades e programação",
        paragraphs: [
          "A inscrição em atividades com vagas limitadas depende da disponibilidade e das regras de cada atividade. A inscrição geral no evento não garante vaga automática em oficinas, minicursos, competições, apresentações, exposições ou atividades especiais.",
          "Cada atividade poderá ter critérios próprios, como ordem de inscrição, horário de chegada, faixa etária, autorização do responsável, material necessário, limite físico do espaço ou validação pela equipe.",
          "A programação, os horários, locais, vagas, responsáveis e formatos poderão ser alterados por necessidade pedagógica, técnica, administrativa, de segurança, acessibilidade, disponibilidade de espaço, condições climáticas ou força maior."
        ]
      },
      {
        id: "regras-participacao",
        title: "Regras de participação",
        paragraphs: [
          "A pessoa participante deve seguir as orientações da organização, dos monitores, docentes, palestrantes, responsáveis de sala e equipe de segurança. Áreas restritas, salas técnicas, laboratórios ou espaços reservados só podem ser acessados com autorização.",
          "A organização poderá limitar a entrada em espaços lotados, reorganizar filas, remanejar participantes e adotar medidas razoáveis para preservar a segurança, a acessibilidade, o funcionamento das atividades e o ambiente escolar."
        ]
      },
      {
        id: "conduta",
        title: "Conduta e ambiente escolar",
        paragraphs: [
          "A SIMITEC é um espaço de aprendizagem, convivência, inclusão, diversidade, cultura de paz e respeito. Toda pessoa participante deve agir com responsabilidade, cordialidade e cuidado com o espaço escolar, a equipe, estudantes, visitantes, convidados e demais participantes.",
          "Não serão toleradas condutas ofensivas, discriminatórias, violentas, intimidatórias, racistas, capacitistas, LGBTfóbicas, misóginas, assédio, bullying, vandalismo, dano ao patrimônio ou qualquer comportamento incompatível com o caráter educativo do evento."
        ]
      },
      {
        id: "cultura-cosplay",
        title: "Atividades culturais, cosplay e props",
        paragraphs: [
          "Figurinos, acessórios, props e apresentações devem ser seguros, respeitosos, adequados ao ambiente escolar e compatíveis com a circulação de estudantes, visitantes, crianças e adolescentes.",
          "A organização poderá inspecionar itens, solicitar adaptações, reter temporariamente material incompatível, impedir apresentação ou barrar item que represente risco, perturbação, desconforto grave ao público ou dano ao patrimônio."
        ],
        bullets: [
          "Não são permitidos explosivos, chamas, fumaça, líquidos para efeito cênico, substâncias tóxicas ou materiais corrosivos.",
          "Também não são permitidos objetos cortantes, perfurantes, réplicas realistas de armas, armas de fogo, armas brancas, airsoft, munição ou itens com potencial de ferir terceiros.",
          "Apresentações, falas, trilhas e performances devem respeitar a diversidade, a cultura de paz e a classificação adequada ao ambiente escolar."
        ]
      },
      {
        id: "certificados",
        title: "Certificados e confirmação de presença",
        paragraphs: [
          "A confirmação de presença poderá ser usada para organização interna e emissão de certificados, quando aplicável. A presença poderá ser registrada por QR Code, lista manual, validação por monitor, conferência em sala ou outro procedimento informado pela organização.",
          "A emissão de certificados, declarações ou comprovantes dependerá de inscrição válida, dados corretos, credenciamento regular, presença confirmada, carga horária mínima quando houver e validação pela equipe responsável.",
          "O certificado poderá ser enviado por e-mail, disponibilizado digitalmente ou entregue por outro meio informado pela organização. Em inscrições em grupo, quando estudantes não tiverem e-mail próprio, o certificado poderá ser enviado ao e-mail do professor ou responsável informado.",
          "A inscrição sem comparecimento, a saída antecipada, o uso indevido de credencial ou a ausência de validação de presença podem impedir a emissão do certificado."
        ]
      },
      {
        id: "imagem-voz-finalidade",
        title: "Uso de imagem e voz",
        paragraphs: [
          "Durante a SIMITEC, poderão ser realizados registros fotográficos, vídeos, captação de áudio, entrevistas, gravações de apresentações, registros de bastidores e outras formas de documentação institucional do evento.",
          "Fotos, vídeos e áudios do evento poderão ser usados para fins institucionais, pedagógicos, informativos, históricos e de divulgação da SIMITEC, sempre com respeito à dignidade, ao contexto escolar e à imagem da pessoa participante.",
          "Esses registros não deverão ser usados para exposição vexatória, discriminatória, descontextualizada, ofensiva ou incompatível com a finalidade educativa do evento."
        ]
      },
      {
        id: "imagem-voz-locais-limites",
        title: "Onde os registros podem aparecer",
        paragraphs: [
          "Os registros poderão aparecer no site da SIMITEC, páginas institucionais da escola ou da instituição promotora, redes sociais oficiais, murais, apresentações, relatórios, materiais de divulgação, vídeos-resumo, publicações comemorativas e acervos institucionais vinculados ao evento.",
          "A SIMITEC poderá realizar registros gerais do público, da circulação, dos estandes, das salas e das apresentações para documentação contextual e coletiva do evento.",
          "Quando houver foco individual identificável, como retratos, entrevistas, depoimentos, cards com nome e foto, vídeos centrados em uma pessoa ou campanhas específicas, a organização deverá adotar cuidado reforçado, especialmente com crianças e adolescentes."
        ]
      },
      {
        id: "imagem-voz-menores",
        title: "Menores de idade e responsáveis",
        paragraphs: [
          "No caso de crianças e adolescentes, a SIMITEC observará o melhor interesse do menor, a dignidade, a imagem, a identidade e a integridade moral da pessoa participante.",
          "Para usos destacados de imagem e voz, entrevistas, depoimentos ou conteúdos com protagonismo individual, a organização poderá exigir ciência ou autorização do responsável legal, especialmente quando a pessoa participante for menor de idade.",
          "Quando houver restrição ou não autorização formal, a organização adotará esforços razoáveis para evitar captação destacada, publicação individualizada e identificação nominal do menor em materiais futuros."
        ]
      },
      {
        id: "imagem-voz-restricao-revogacao",
        title: "Não autorização e revogação",
        paragraphs: [
          "A pessoa participante, ou seu responsável legal quando aplicável, poderá informar que não deseja o uso destacado de imagem e voz. Essa manifestação deverá ser feita pelos canais oficiais ou durante o credenciamento, quando a opção estiver disponível.",
          "A autorização eventualmente concedida poderá ser revogada para usos futuros. A revogação não torna irregular o uso feito de forma válida antes do pedido.",
          "Pode haver limitação técnica para retirar materiais impressos, vídeos já distribuídos, publicações já compartilhadas, registros históricos, cenas coletivas ou materiais em que a remoção seja inviável ou desproporcional."
        ]
      },
      {
        id: "seguranca",
        title: "Segurança e responsabilidade",
        paragraphs: [
          "A pessoa participante deve cuidar de seus pertences pessoais, como celular, mochila, documentos, figurinos, materiais de apresentação e equipamentos. A organização adotará medidas razoáveis de apoio e segurança compatíveis com o evento.",
          "Em situações de risco, emergência, desorganização, dano ao patrimônio ou descumprimento de orientações, a equipe poderá intervir, reorganizar o fluxo, solicitar retirada de item, acionar responsáveis legais ou encaminhar o caso à coordenação da instituição."
        ]
      },
      {
        id: "cancelamento",
        title: "Cancelamento, suspensão ou impedimento",
        paragraphs: [
          "A organização poderá advertir, retirar de atividade, cancelar inscrição, bloquear credencial ou impedir permanência de participante que pratique fraude cadastral, use credencial de terceiro, descumpra orientações de segurança, cause tumulto, porte item proibido, danifique patrimônio ou viole os documentos oficiais do evento.",
          "As medidas serão aplicadas de forma proporcional à situação e poderão envolver comunicação à coordenação, responsáveis legais ou canais institucionais competentes."
        ]
      },
      {
        id: "alteracoes-termos",
        title: "Alterações destes termos",
        paragraphs: [
          "Estes termos poderão ser atualizados para refletir mudanças legais, operacionais, pedagógicas, técnicas ou institucionais. A versão publicada no site será a referência de consulta da edição atual."
        ]
      },
      {
        id: "contato-termos",
        title: "Contato institucional",
        paragraphs: [
          `Dúvidas sobre estes termos, participação, credenciais ou regras do evento podem ser encaminhadas à organização da SIMITEC por meio do canal institucional: ${legalContact}.`,
          "Este documento inclui as regras de uso de imagem e voz e deve ser lido em conjunto com a Política de Privacidade e as orientações específicas de cada atividade da SIMITEC."
        ]
      }
    ],
    actions: [["Política de Privacidade", "/privacidade"], ["Créditos", "/creditos"]]
  },
  privacidade: {
    eyebrow: "Dados pessoais",
    title: "Política de Privacidade",
    intro: "Como os dados dos participantes podem ser coletados, utilizados, protegidos e tratados no contexto da SIMITEC.",
    version: legalVersion,
    route: "/privacidade",
    description: "Política de Privacidade da SIMITEC com resumo sobre dados tratados, finalidades, segurança, direitos e contato institucional.",
    sections: [
      {
        id: "visao-geral",
        title: "Visão geral",
        paragraphs: [
          "Esta Política de Privacidade explica, em linguagem simples, como a SIMITEC pode tratar dados pessoais para organizar inscrições, credenciamento, presença, comunicação, segurança, certificados e registros institucionais do evento.",
          "Tratamento de dados significa qualquer uso de informação relacionada a uma pessoa, como coleta, registro, consulta, organização, armazenamento, atualização, compartilhamento restrito ou eliminação.",
          `A organização institucional do evento é realizada pela ${legalOrganization}. Quando atuar definindo finalidades e meios essenciais do tratamento, a instituição promotora será considerada controladora dos dados no contexto da SIMITEC.`
        ]
      },
      {
        id: "dados-tratados",
        title: "Quais dados podem ser coletados",
        paragraphs: [
          "A SIMITEC poderá tratar dados compatíveis com a realização do evento, como nome completo, nome social, e-mail, telefone, CPF quando necessário, instituição ou escola, cidade, turma, série, perfil de participação, atividades escolhidas, presença, QR Code, credencial, certificados e contatos com a organização.",
          "Também poderão existir dados de acessibilidade ou apoio especial quando forem necessários para acolhimento, inclusão, segurança ou organização da participação. Esses dados devem ter acesso restrito às pessoas que realmente precisam deles.",
          "O site não deve solicitar documentos, informações sensíveis ou dados adicionais sem necessidade operacional, pedagógica, administrativa ou de segurança."
        ]
      },
      {
        id: "finalidades",
        title: "Para que os dados são usados",
        paragraphs: [
          "Os dados poderão ser usados para criar conta, realizar inscrição, confirmar participação, organizar vagas, escolher atividades, emitir credenciais, gerar QR Code, controlar acesso, registrar presença, administrar filas, garantir segurança, emitir certificados e responder solicitações.",
          "Os dados também poderão ser usados para melhorar a experiência da pessoa participante, corrigir informações, facilitar o atendimento, evitar retrabalho no credenciamento, organizar grupos, adaptar fluxos do evento e enviar orientações úteis sobre horários, locais, regras ou mudanças da programação.",
          "Os dados poderão apoiar histórico institucional, documentação do evento, relatórios internos, prevenção a fraude, correção cadastral e comunicação operacional.",
          "Os dados não serão usados para finalidades comerciais externas ao evento, salvo se houver informação institucional expressa e adequada ao caso."
        ]
      },
      {
        id: "resumo-dados",
        title: "Resumo dos dados e critérios",
        table: {
          caption: "Resumo dos principais tipos de dados tratados, finalidades e critérios de retenção da SIMITEC.",
          columns: ["Tipo de dado", "Finalidade", "Retenção ou critério"],
          rows: [
            ["Identificação e contato", "Inscrição, comunicação, confirmação de conta e credenciamento.", legalDataRetention],
            ["Instituição, turma, cidade e perfil", "Organização de listas, grupos, atividades, relatórios internos e certificados.", legalDataRetention],
            ["Atividades escolhidas e presença", "Controle de vagas, presença, filas, acesso às atividades e emissão de certificados.", legalDataRetention],
            ["Credencial e QR Code", "Controle de acesso, organização, segurança operacional e prevenção de uso indevido.", legalDataRetention],
            ["Acessibilidade e apoio especial", "Inclusão, acolhimento, segurança e adaptação razoável de participação.", "Pelo menor tempo necessário para a finalidade, com acesso restrito aos cargos autorizados."]
          ]
        }
      },
      {
        id: "base-legal-menores",
        title: "Base legal e crianças e adolescentes",
        paragraphs: [
          "A base legal aplicável depende da natureza da instituição, da finalidade e do caso concreto. O tratamento poderá se apoiar, quando cabível, em obrigação legal ou regulatória, execução de políticas públicas, procedimentos relacionados à participação, exercício regular de direitos, proteção da vida, segurança, prevenção a fraude ou consentimento em situações realmente opcionais.",
          "Consentimento não deve ser usado como justificativa genérica para todo o tratamento. Inscrição, credenciamento, QR Code, presença e certificados fazem parte do núcleo operacional do evento.",
          "No tratamento de dados de crianças e adolescentes, prevalecerá o melhor interesse do menor. Quando a base aplicável for consentimento para dados de criança, ele deverá ser específico, em destaque e, quando aplicável, fornecido por pelo menos um dos pais ou responsável legal."
        ]
      },
      {
        id: "compartilhamento",
        title: "Compartilhamento de dados",
        paragraphs: [
          "O acesso aos dados deve ficar restrito aos funcionários autorizados de maior cargo e às pessoas expressamente liberadas pela administração quando houver necessidade real para realizar a SIMITEC.",
          "Equipe de credenciamento, suporte, comunicação ou operação só deve acessar os dados compatíveis com sua função, respeitando permissões do sistema, controle de cargo e necessidade de uso.",
          "Prestadores de hospedagem, e-mail, suporte, QR Code, banco de dados ou certificados poderão tratar dados apenas dentro das finalidades do evento e conforme instruções da organização.",
          "A SIMITEC não vende nem aluga dados pessoais."
        ]
      },
      {
        id: "retencao",
        title: "Armazenamento, retenção e descarte",
        paragraphs: [
          `A SIMITEC manterá os dados pessoais pelo prazo de ${legalDataRetention}`,
          "Quando a finalidade terminar e não houver necessidade legítima de guarda, os dados deverão ser eliminados, anonimizados ou preservados apenas em formato compatível com a legislação e as regras institucionais aplicáveis.",
          "Registros estatísticos sem identificação pessoal poderão ser mantidos por mais tempo para histórico institucional, relatórios e melhoria das próximas edições."
        ]
      },
      {
        id: "seguranca-dados",
        title: "Segurança da informação",
        paragraphs: [
          "A SIMITEC adota medidas técnicas e administrativas razoáveis para proteger dados pessoais contra acesso não autorizado, perda, alteração, divulgação indevida, destruição ou uso incompatível com a finalidade informada.",
          "Essas medidas podem incluir controle de acesso por perfil, senhas, autenticação no painel administrativo, revisão de permissões, registros de ações críticas, backups, atualização de sistemas, conexão segura, orientação da equipe e guarda cuidadosa de listas físicas.",
          "Nenhum ambiente digital é absolutamente livre de riscos. Se ocorrer incidente com possibilidade de risco ou dano relevante, a organização deverá avaliar o caso e adotar medidas de contenção, correção e comunicação conforme a legislação aplicável."
        ]
      },
      {
        id: "direitos",
        title: "Direitos da pessoa titular",
        paragraphs: [
          "A pessoa titular dos dados, ou seu representante legal, poderá solicitar confirmação de tratamento, acesso aos dados, correção de informações incompletas ou desatualizadas, anonimização, bloqueio, eliminação quando cabível, informação sobre compartilhamento, oposição nas hipóteses legais adequadas e revogação do consentimento quando essa for a base utilizada.",
          "Para proteger a própria pessoa titular, a organização poderá solicitar informações mínimas para confirmar a identidade de quem faz o pedido ou de seu representante legal.",
          `Solicitações sobre correção, atualização, exclusão de dados, revogação de consentimento quando cabível, dúvidas ou restrições de imagem devem ser encaminhadas ao e-mail ${legalContact}. O pedido deve informar nome completo, contato, descrição do que precisa ser corrigido ou excluído e, quando necessário, comprovante de vínculo ou representação legal.`,
          "A exclusão poderá não ser imediata quando houver obrigação legal, necessidade de certificado, auditoria, segurança, prevenção de fraude, exercício regular de direitos ou registro institucional legítimo."
        ]
      },
      {
        id: "controlador-contato",
        title: "Controlador, contato e encarregado",
        paragraphs: [
          `Controlador é quem define por que e como os dados são tratados. No contexto da SIMITEC, essa função cabe à instituição promotora do evento: ${legalOrganization}.`,
          `Canal de contato para privacidade e solicitações de titulares: ${legalContact}.`,
          "Enquanto não houver encarregado de dados nomeado em página própria, as solicitações deverão ser recebidas pelo e-mail oficial da SIMITEC e encaminhadas à gestão responsável da instituição."
        ]
      },
      {
        id: "atualizacoes-politica",
        title: "Atualizações desta política",
        paragraphs: [
          "Esta Política de Privacidade poderá ser atualizada para refletir mudanças legais, técnicas, operacionais ou institucionais. A versão publicada nesta página será a referência de consulta da edição atual."
        ]
      }
    ],
    actions: [["Termos e Condições", "/termos"], ["Créditos", "/creditos"]]
  },
  creditos: {
    eyebrow: "Créditos",
    title: "Créditos",
    intro: "Informações sobre organização, desenvolvimento, identidade visual e materiais da SIMITEC.",
    version: legalVersion,
    route: "/creditos",
    sections: [
      {
        id: "organizacao-creditos",
        title: "Organização institucional",
        paragraphs: [
          `A SIMITEC é uma iniciativa educacional, científica, tecnológica, cultural e institucional realizada pela ${legalOrganization}, com participação da comunidade escolar e de equipes de organização, ensino, apoio, comunicação, tecnologia e acolhimento.`,
          "A coordenação geral do evento é responsável pelo planejamento, programação, orientação oficial, credenciamento, comunicação com participantes, organização das atividades e validação das regras publicadas no site.",
          "As informações oficiais da SIMITEC devem ser consultadas prioritariamente quando houver divergência com comunicações informais ou conteúdos reproduzidos por terceiros."
        ]
      },
      {
        id: "desenvolvimento-sistema",
        title: "Desenvolvimento do site e do sistema",
        paragraphs: [
          "O site da SIMITEC e seus fluxos de inscrição, credenciamento, controle de presença, geração de credenciais, QR Code, validação de participação e emissão de certificados integram a estrutura digital de apoio à realização do evento.",
          "O desenvolvimento, manutenção e suporte do sistema podem envolver equipe interna, estudantes, servidores, prestadores técnicos ou parceiros autorizados, conforme o arranjo adotado pela instituição em cada edição.",
          "Créditos nominais específicos poderão ser incluídos apenas quando aprovados pela gestão responsável da SIMITEC."
        ]
      },
      {
        id: "identidade-visual",
        title: "Identidade visual e comunicação",
        paragraphs: [
          "A identidade visual da SIMITEC, incluindo nome do evento, elementos gráficos, composições visuais, peças institucionais, textos editoriais, sinalização, ilustrações e materiais de divulgação, pertence à iniciativa SIMITEC e à instituição promotora, resguardados direitos de terceiros.",
          "A comunicação institucional deve observar coerência com a proposta pedagógica, a linguagem escolar e os documentos legais publicados nesta área do site."
        ]
      },
      {
        id: "materiais-terceiros",
        title: "Conteúdos e materiais de terceiros",
        paragraphs: [
          "Apresentações, trabalhos, exposições, projetos, marcas, imagens, trilhas, fotografias, personagens, obras autorais e demais materiais submetidos por participantes ou convidados continuam sujeitos aos direitos de seus respectivos titulares.",
          "Quando materiais de terceiros forem utilizados pela SIMITEC, isso deverá ocorrer com autorização, licença, enquadramento legal pertinente ou indicação de responsabilidade da pessoa que submeteu o conteúdo.",
          "O envio ou apresentação de conteúdo por participante não transfere automaticamente a titularidade integral da obra para a SIMITEC."
        ]
      },
      {
        id: "tecnologias-licencas",
        title: "Tecnologias e licenças",
        paragraphs: [
          "O site e os sistemas de apoio podem utilizar frameworks, bibliotecas, componentes de interface, serviços de hospedagem, soluções de QR Code, bancos de dados, autenticação, e-mail e outras tecnologias de terceiros, sujeitas às suas próprias licenças e condições de uso.",
          "A existência de tecnologia de terceiros no site não autoriza reprodução indevida da identidade visual, dos materiais institucionais ou dos conteúdos próprios da SIMITEC."
        ]
      },
      {
        id: "uso-materiais",
        title: "Uso dos materiais da SIMITEC",
        paragraphs: [
          "É vedada a reprodução enganosa, redistribuição indevida, adulteração de documentos, uso de identidade visual para fins fraudulentos, criação de páginas falsas de inscrição, reaproveitamento não autorizado de credenciais ou publicação que simule comunicação oficial.",
          "Citações institucionais, referência acadêmica ao evento, reprodução jornalística legítima e compartilhamento de links oficiais devem preservar a integridade das informações e a origem do conteúdo."
        ]
      },
      {
        id: "agradecimentos",
        title: "Agradecimentos",
        paragraphs: [
          "A SIMITEC agradece estudantes, docentes, equipe técnica, comunicação institucional, monitores, palestrantes, artistas, convidados, profissionais de apoio e instituições parceiras que contribuem para a realização de cada edição.",
          "Esta página poderá ser atualizada para refletir novas equipes, parcerias, créditos técnicos, mudanças de identidade visual e evolução do sistema."
        ]
      }
    ],
    actions: [["Termos e Condições", "/termos"], ["Política de Privacidade", "/privacidade"]]
  }
};
