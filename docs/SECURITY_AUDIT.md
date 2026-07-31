# Auditoria de Seguranca - SIMITEC 2026

Data: 2026-07-28. Nenhum `.env`, token, senha, banco local ou dado de participante foi aberto.

## Controles ja presentes

- Helmet, compression e cookie parser estao ativos no servidor.
- Senhas usam bcrypt; o fluxo de autenticacao valida e-mail e senha.
- Tokens de verificacao e redefinicao sao armazenados em hash no caminho Mongo.
- Cookies de sessao sao `httpOnly`, `secure` em producao e `sameSite=lax`.
- Rotas administrativas aplicam `requireAuth`, `requireAdmin` e, quando necessario, `requireSuperAdmin` antes do handler.
- Dados sensiveis possuem liberacao temporaria separada por cinco minutos.
- A verificacao de previas de e-mail passou: destinatario indevido foi bloqueado e injecao de cabecalho foi rejeitada.
- `npm audit --omit=dev` reportou 0 vulnerabilidades conhecidas nas 245 dependencias de producao instaladas do backend neste momento.

## Achados priorizados

### P0 - Aplicativo permite HTTP em texto claro

- Evidencia: `Aplicativo/app/src/main/AndroidManifest.xml:19` define `android:usesCleartextTraffic="true"`; `.env.example` Android usa URL `http://`.
- Risco: token Bearer e dados de credenciamento podem ser interceptados/modificados em rede local ou publica.
- Correcao: producao somente HTTPS, URL de API por build flavor, network security config restrita e bloqueio de cleartext no release.
- Teste: instalar release e confirmar que uma URL HTTP falha enquanto HTTPS valida certificado e hostname.

### P0 - Token do aplicativo e guardado sem criptografia de hardware

- Evidencia: `PreferencesManager.kt:9-10` usa `getSharedPreferences`; `:33-37` guarda `session_token` diretamente.
- Risco: em aparelho comprometido/backup indevido, a sessao da equipe pode ser extraida.
- Correcao: Android Keystore com armazenamento cifrado, tokens curtos/rotacionaveis, revogacao no servidor e limpeza em logout/alteracao de senha.

### P1 - Modelo de deploy CORS/cookie nao esta definido

- Evidencia: `src/server.js:147-169` libera origem apenas para regex de desenvolvimento; cookie esta em `sameSite=lax` sem dominio configuravel em `middleware/auth.js:10-14`.
- Risco: ao separar Pages, API e painel em subdominios, autenticacao pode falhar ou ser configurada de forma permissiva sob pressao.
- Correcao: decisao formal de mesma origem ou subdominios; allowlist por `ALLOWED_ORIGINS`, credentials explicitas e cookie config por ambiente.

### P1 - Falta correlacao e saneamento de logs de erros

- Evidencia: `src/server.js:201-202` faz `console.error(error)`; nao ha request id nem logger estruturado.
- Risco: excecoes podem carregar dados de requisicao e tornam investigacao/alerta imprecisos.
- Correcao: request ID, logger JSON com redacao de senha/token/CPF/e-mail, erros publicos genericos e logs internos com retencao.

### P1 - Rate limiting em memoria e sem politica por operacao critica

- Evidencia: limitadores usam configuracao padrao sem `store` distribuido; `apiLimiter` global e `authLimiter`/`adminLimiter` locais.
- Risco: em mais de uma instancia o limite nao e global; um limite geral pode prejudicar operacao legitima enquanto brute force recebe politica pouco especifica.
- Correcao: Redis/Cloudflare para rate limits, chaves por IP+conta, limites proprios para login/reset/scan/backup e metricas de bloqueio.

### P1 - Exclusao de conta Mongo deixa inscricoes orfas

- Evidencia: `src/routes/auth.js:464` usa `Registration.deleteMany({ userId: req.user._id })`, enquanto o esquema usa o campo `user` em `src/models/Registration.js:81-85`.
- Risco: dado pessoal da inscricao permanece apos exclusao, contrariando expectativa do usuario e politica de retencao.
- Correcao: corrigir filtro, executar migracao/auditoria de orfaos e cobrir exclusao com teste de integracao Mongo.

### P1 - Fallback local nao e adequado para dados pessoais em producao

- Evidencia: JSON local guarda usuarios e inscricoes; backup Mongo atual grava exportacao completa sem criptografia em `.data/backups`.
- Risco: exposicao por acesso ao disco, backup sem retencao segura e divergencia de dados entre modos.
- Correcao: desabilitar fallback automatico em producao, criptografar backup em repouso no provedor e definir restauracao controlada.

### P2 - `trust proxy` esta fixo

- Evidencia: `src/server.js:116` define `trust proxy` como `1` para todo ambiente.
- Risco: se a API for exposta sem o proxy esperado, IP/origem para rate limiting pode ser falsificado.
- Correcao: variavel por ambiente e topologia de proxy documentada.

### P2 - Sessoes JWT longas sem revogacao observavel

- Evidencia: `middleware/auth.js:29-31` emite sessao por sete dias e nao ha lista de revogacao/sessao por dispositivo.
- Risco: token de equipe comprometido permanece valido ate expirar.
- Correcao: access token curto, refresh token revogavel ou versao de sessao no usuario; invalidacao ao redefinir senha/alterar papel.

### P2 - Compatibilidade de token legado no fallback

- Evidencia: `src/routes/localFallback.js:787-790` aceita `resetTokenHash === token` alem da comparacao em hash.
- Risco: se houver registros legados com token em claro, reduz a protecao esperada do fluxo de reset.
- Correcao: migrar/remover compatibilidade apos prazo controlado e nunca gravar token bruto.

## Decisoes obrigatorias antes de producao

1. API, site publico e painel ficarao na mesma origem ou em subdominios? Registrar dominios exatos.
2. O app de equipe usara somente HTTPS? A resposta para release deve ser sim.
3. Qual provedor guarda backups, por quanto tempo e quem pode restaurar?
4. Qual politica LGPD define exclusao, retencao e resposta a incidente?
