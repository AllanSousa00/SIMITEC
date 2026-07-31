# Inventario Tecnico - SIMITEC 2026

Data da coleta: 2026-07-28

## Escopo e metodo

Inventario realizado sem abrir arquivos `.env`, bancos locais, uploads ou backups. Foram inspecionados apenas fontes, configuracoes versionadas, manifestos, `package.json`, `.env.example`, artefatos ja existentes e respostas sem dados pessoais dos endpoints locais.

## Componentes

| Componente | Entrada | Papel | Estado observado |
| --- | --- | --- | --- |
| Site Publico | `Site Publico/index.html` e `app.min.js` | Inscricao, login, perfil, areas, cronograma, FAQ, galeria e documentos legais | SPA estatica servida pelo backend |
| API e site da equipe | `Site Funcionarios/src/server.js` | API Express, autenticacao, inscricoes, check-in, administracao, e-mail, integracoes e fallback | Ativo localmente em `:3000` |
| Painel administrativo | `Site Funcionarios/painel-react` | Interface React para equipe | `dist` existente; instalacao local de dependencias ficou parcial/bloqueada |
| Aplicativo Android | `Aplicativo` | Credenciamento para equipe, QR, consulta e operacao presencial | Kotlin/Compose, Retrofit, CameraX e ML Kit |

## Backend

### Inicializacao e middleware

- Entrada: `Site Funcionarios/src/server.js`.
- Stack: Node.js, Express, Mongoose, Helmet, compression, cookie-parser e express-rate-limit.
- Sites estaticos: publico em `/` e painel em `/funcionarios`.
- Endpoints montados: `/api/auth`, `/api/registrations`, `/api/checkin`, `/api/admin` e `/api/health`.
- Fallback local: `src/routes/localFallback.js` e `src/services/localStore.js`, montado antes das rotas Mongo; ele responde quando Mongo nao esta conectado.
- Banco Mongo: modelos `User`, `Registration` e `SiteContent`.
- Integracoes: SMTP/e-mails, Google OAuth, Google Sheets e armazenamento R2/S3 para midia administrativa.
- Operacoes em processo: sincronizacao periodica com Google Sheets e backup diario do Mongo.

### Rotas e contratos principais

Foram identificadas 79 declaracoes de rota nas rotas oficiais e de fallback.

| Dominio | Operacoes observadas |
| --- | --- |
| Autenticacao | cadastro, login, Google, perfil, verificacao, reenvio, recuperacao e redefinicao de senha, logout, exclusao de conta e bootstrap de super admin |
| Inscricao publica | evento, instituicoes, inscricoes do usuario, inscricao principal, areas e ticket |
| Check-in | bootstrap, estatisticas, busca, leitura de QR, check-in manual, cadastro presencial, grupos e edicao de inscricao |
| Administracao | estatisticas, usuarios, cargos, inscricoes, conteudo, midia, previas de e-mail, backup e Google Sheets |

### Dados e persistencia

- `User`: identidade, credenciais, papeis e tokens hash de verificacao/redefinicao.
- `Registration`: participante, evento, atividade, ticket, status, check-in, historico e grupo.
- `SiteContent`: conteudo editavel do evento e configuracoes administrativas.
- Indices do modelo `Registration`: chave unica `user + eventId + activitySlug`, codigo de ticket, filtros por evento/atividade/status, check-in e campos de busca. A adequacao desses indices ainda precisa de `explain()` em Mongo com carga representativa.
- Fallback JSON: `.data/local-db.json`, copia de backup e gravacao por temporario seguido de `rename`.
- Backup Mongo: exporta colecoes inteiras para `.data/backups` e mantem sete arquivos.

## Site publico

- SPA vanilla: `app.js` tem roteador hash e telas de inicio, autenticacao, inscricao, areas, cronograma, FAQ, palestrantes, galeria, tickets, perfil e paginas legais.
- Artefatos principais atuais: `app.min.js` com 158568 bytes e `styles.min.css` com 183562 bytes; o carregamento inicial ainda e monolitico.
- Imagens locais maiores incluem logos de 543141 bytes e 203700 bytes e quatro imagens de galeria entre cerca de 102 KiB e 146 KiB.
- O site usa os mesmos endpoints por mesma origem. Para Cloudflare Pages sera necessario contrato explicito de URL de API e CORS.

## Painel administrativo

- React/Vite em `Site Funcionarios/painel-react`.
- Rotas React em `src/app/routes.ts`: dashboard, editores dos dois sites, cargos, funcionarios, inscricoes, credenciamento, relatorios e configuracoes.
- As rotas de tela usam `React.lazy`, portanto ja existe code splitting por tela.
- O build existente tem chunks grandes: ExcelJS ~918 KiB, AreaChart ~386 KiB, jsPDF ~381 KiB, bundle base ~320 KiB e html2canvas ~198 KiB, antes de compressao HTTP.
- A fonte contem dados demonstrativos de equipe/participantes no contexto. Eles nao devem substituir dados reais nem ser carregados em producao como fallback silencioso.

## Aplicativo Android

- Kotlin/Compose, `applicationId` `br.com.simitec.equipe`, minSdk 24 e targetSdk 36.
- Telas: login, tutorial, dashboard, scanner, busca, detalhes, cadastro presencial e funcoes administrativas.
- Integracoes: Retrofit/OkHttp, CameraX, ML Kit QR, Google Sign-In, DataStore e SharedPreferences.
- `QrCodeAnalyzer` fecha corretamente cada `ImageProxy` no caminho de conclusao.
- `SimitecRepository` configura connect timeout de 15 s e read/write de 30 s, com cache HTTP e retry de conexao.
- A URL vem de `BuildConfig.SIMITEC_API_URL`; o `.env.example` Android atual usa endereco LAN HTTP de exemplo e precisa ser substituido por contrato de producao HTTPS na fase de estabilizacao.
- Release tem minificacao e resource shrinking habilitados. A assinatura continua dependente de variaveis/keystore reais externos.

## Ambientes, artefatos e limites

- Arquivos `.env` reais nao foram lidos nem modificados.
- Tres artefatos Android de release ja existentes foram preservados.
- Dados locais, diretorio de Mongo local, uploads e backups foram preservados.
- O servidor local respondeu `200` em `/`, `/funcionarios/`, `/api/health` e `/api/auth/me`; a saude informou `database: local-store`.
- O modo `local-store` e adequado apenas para desenvolvimento/contingencia controlada; nao e base operacional para o volume declarado do evento.

## Testes existentes descobertos

| Componente | Scripts/testes |
| --- | --- |
| Backend | `test:system`, `email:verify`, `email:verify-route`, `smtp:check`, `smtp:test` e migracao local-para-Mongo |
| Painel | somente `dev` e `build`; nao ha `test` nem `lint` |
| Backend geral | nao ha `npm test` nem `npm run lint` |
| Android | teste unitario Robolectric; Gradle para testes e builds |

## Pontos que exigem decisao humana futura

1. Definir dominio HTTPS da API, dominio do site publico e subdominio do painel.
2. Confirmar se o fallback JSON pode existir em producao ou deve ser apenas manutencao controlada.
3. Provisionar Mongo Atlas, backup remoto, contas SMTP/Google/Cloudflare e segredos reais fora do repositorio.
4. Definir RPO/RTO, retencao de dados e regra de LGPD para exclusao/anominizacao.
