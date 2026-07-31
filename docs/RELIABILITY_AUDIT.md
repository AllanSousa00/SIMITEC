# Auditoria de Confiabilidade - SIMITEC 2026

Data: 2026-07-28. Meta operacional declarada: cerca de 30000 usuarios e 8000 check-ins com varios dispositivos e rede instavel.

## Achados criticos

### R0 - Check-in manual tem condicao de corrida

- Evidencia: `src/routes/checkin.js:479-491` le a inscricao, muda em memoria e salva depois.
- Cenario: dois operadores enviam check-in para o mesmo ID; ambos podem ler o estado antigo antes de qualquer `save`.
- Consequencia: historico/autor/nota podem ser sobrescritos e o cliente nao recebe resultado idempotente.
- Acao: update atomico condicional com retorno de estado anterior/novo, chave `Idempotency-Key` e auditoria de evento imutavel.

### R0 - Vagas podem exceder capacidade sob concorrencia

- Evidencia: `countDocuments` nas linhas `586-593` de `checkin.js` antecede criacao/upsert de inscricao; grupo usa padrao equivalente.
- Cenario: operadores simultaneos contam a mesma ultima vaga e ambos confirmam.
- Consequencia: superlotacao e divergencia entre UI e banco.
- Acao: transacao Mongo ou documento de capacidade com incremento condicional; teste com concorrencia real.

### R0 - Fallback JSON pode perder gravacoes

- Evidencia: `updateLocalStore` em `localStore.js:91-95` obtem a copia antes da fila; a fila so inicia em `writeLocalStore`.
- Cenario: duas chamadas leem o mesmo JSON, mutam separadamente e gravam em sequencia.
- Consequencia: a ultima gravacao elimina a alteracao da primeira. Em multiplos processos nem a fila atual existe.
- Acao: nao usar esse modo para o evento; manter somente ferramenta de recuperacao explicitamente acionada e com reconciliacao.

### R0 - Troca automatica de Mongo para JSON e retorno nao possuem protocolo

- Evidencia: `server.js:60-80` tenta Mongo e, na falha, sobe o servidor com fallback montado antes das rotas oficiais (`:177-184`).
- Consequencia: uma falha temporaria pode fazer operacao continuar em outra fonte sem alerta operacional nem sincronizacao de volta.
- Acao: modo de dados explicito, bloqueio de escrita em incidente ou fila duravel, alerta e rotina de reconciliacao assinada.

## Achados altos

### R1 - Exclusao de conta nao remove inscricoes Mongo

- Evidencia: `auth.js:464` filtra `userId`; o modelo usa `user`.
- Consequencia: registros orfaos e retencao indevida de dados pessoais.
- Acao: correcao transacional, migracao de orfaos e teste Mongo de exclusao.

### R1 - Operacoes de grupo misturam varias escritas sem fronteira transacional

- Evidencia: `checkin.js:658-850` cria/atualiza usuarios e duas inscricoes por membro em loop.
- Consequencia: erro no meio deixa grupo parcialmente criado.
- Acao: transacao por grupo, limite de tamanho, resposta idempotente e tela de recuperacao para operador.

### R1 - Agendamentos dependem do processo web

- Evidencia: `server.js:83-113` e `mongoBackup.js:55-67` usam flags/intervalos em memoria.
- Consequencia: duplicidade em escala horizontal, perda de execucao em restart e falta de historico.
- Acao: worker unico/agendador externo, lock distribuido e tabela de execucoes.

### R1 - Backup nao e verificavel para restauracao

- Evidencia: `mongoBackup.js:20-50` gera JSON local sem checksum, compressao, criptografia, upload remoto ou teste de restore.
- Consequencia: backup pode existir sem ser restauravel ou expor dados.
- Acao: backup Atlas/armazenamento remoto, checksum, criptografia, retencao e teste mensal de restauracao em ambiente isolado.

### R1 - Aplicativo nao persiste fila de operacoes offline

- Evidencia: `SimitecRepository.kt:569-617` e `619-652` retornam falha em erro de rede; nao ha Outbox/WorkManager para check-in.
- Consequencia: operador nao sabe se a acao chegou quando a conexao cai depois do envio; pode repetir operacao.
- Acao: outbox local cifrada, chave idempotente por acao, estados pendente/enviado/confirmado/falhou e reconciliacao no bootstrap.

## Achados medios

- Bootstrap e listas usam limites fixos sem cursor (`checkin.js:270-275`), logo o app pode ter visao incompleta da base.
- O endpoint de health so informa `ok` e estado do banco; falta versao, uptime, dependencia externa e endpoint interno protegido.
- Nao ha tratamento de encerramento gracioso para HTTP, Mongo e jobs.
- O painel usa refresh periodico em relatorios; sem cancelamento/retry coordenado pode sobrepor requisicoes em redes lentas.
- O app possui modo demonstracao e dados locais de exemplo. Esse modo deve estar indisponivel em release operacional para evitar falsa confirmacao.

## Testes executados nesta auditoria

| Teste | Resultado | Limite |
| --- | --- | --- |
| `npm run test:system` | passou em 2026-07-28 | cobre principalmente fallback local, nao concorrencia Mongo |
| `npm run email:verify` | passou | validou quatro modelos e bloqueios de destinatario/cabecalho |
| `npm run email:verify-route` | passou | previa exige sessao |
| HTTP local `/`, `/funcionarios/`, `/api/health`, `/api/auth/me` | 200 | ambiente esta em `local-store` |
| `npm test` e `npm run lint` backend | scripts ausentes | lacuna de qualidade |
| Android `testDebugUnitTest` com cache Gradle isolado | passou | avisos de APIs depreciadas permanecem |
| Android `assembleDebug` com cache Gradle isolado | passou | artefato debug compilado; nao valida release nem dispositivo fisico |

## Criterio de saida para operacao

1. Mongo Atlas conectado e fallback automatico desligado em producao.
2. Check-in, reserva e grupo idempotentes e transacionais.
3. Carga de 30000 registros e pico de check-in aprovada com p95, taxa de erro e sem duplicacao.
4. Backup remoto e restauracao testada.
5. Observabilidade com request ID, alertas e runbook de incidente.
