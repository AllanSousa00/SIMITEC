# Plano de Estabilizacao - SIMITEC 2026

Este plano deriva dos inventarios e auditorias de 2026-07-28. Nenhuma mudanca estrutural foi aplicada antes desta aprovacao tecnica.

## Ordem de execucao

### Onda 1 - Bloqueadores de producao

1. Corrigir exclusao de conta Mongo e criar teste de integracao que prova a remocao/anominizacao definida pela politica LGPD.
2. Substituir check-in manual por operacao atomica e idempotente.
3. Tornar reserva de vagas e cadastro de grupo transacionais/atomicos.
4. Desligar fallback JSON automatico em producao; introduzir modo de manutencao explicito e migracao/reconciliacao.
5. Proibir HTTP no APK release e mover token para armazenamento cifrado com revogacao.
6. Definir dominios, CORS, cookies e HTTPS antes de qualquer deploy externo.

### Onda 2 - Escalabilidade e dados

1. Introduzir paginacao por cursor, projecoes minimas e endpoint de detalhe.
2. Criar `CHECKIN_EVENTS`/outbox e suporte a `Idempotency-Key` no backend e app.
3. Rodar `explain()` em consultas principais e ajustar somente indices comprovadamente necessarios.
4. Mover backup/sincronizacao para worker ou agendador externo; backup criptografado e restauracao testada.
5. Configurar Mongo Atlas com usuarios separados, IPs/rede, alertas e metricas.

### Onda 3 - Observabilidade e seguranca operacional

1. Logger estruturado com request id e redacao de dados sensiveis.
2. Healthcheck publico minimo e diagnostics interno protegido.
3. Rate limit distribuido por operacao critica e WAF/CDN no Cloudflare.
4. Runbooks de incidente, degradacao, rollback e suporte ao credenciamento.
5. Politica de segredos, retencao, LGPD e revisao de acessos.

### Onda 4 - Experiencia e custo

1. Carregamento sob demanda de bibliotecas de relatorio/exportacao do painel.
2. Divisao de codigo/CSS do site publico e imagens modernas responsivas.
3. Versionamento de assets por hash e cache Cloudflare adequado.
4. Remover dependencias do painel somente depois de analise de importacao e build verde.

## Matriz de aceite

| Dominio | Prova exigida |
| --- | --- |
| Check-in | teste concorrente e idempotencia com repeticao de requisicao |
| Vagas | teste de ultima vaga com requisicoes paralelas |
| Exclusao | teste de integracao Mongo e auditoria de registros orfaos |
| App | release sem HTTP, token cifrado e cenarios offline/retry |
| Banco | `explain()` registrado e carga anonima aprovada |
| Backup | restore em ambiente isolado com checksum validado |
| Deploy | staging, rollback e healthcheck funcionando |
| Seguranca | CORS/cookies/HTTPS/rate limit verificados em dominio final |

## Riscos que permanecem ate a proxima fase

- Nao ha evidencia de Mongo Atlas nem de carga concorrente nesta maquina.
- O build do painel esta bloqueado por uma instalacao `node_modules` parcial com arquivos que o Windows recusa remover.
- O teste unitario e o `assembleDebug` Android passaram com cache Gradle isolado; o cache global desta maquina permanece corrompido e nao foi alterado.
- Nao ha testes automatizados `npm test`/lint para backend ou painel.

## Acao humana necessaria antes do deploy

1. Fornecer dominios finais e decidir topologia de origens.
2. Criar/provisionar Mongo Atlas, Cloudflare, Oracle/servidor, SMTP e armazenamento de backup.
3. Manter segredos apenas no provedor/CI; nunca no repositorio.
4. Confirmar politica LGPD de retencao e quem aprova exclusao/restauracao.
