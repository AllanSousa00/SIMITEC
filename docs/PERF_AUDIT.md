# Auditoria de Desempenho - SIMITEC 2026

Data: 2026-07-28. Escopo: leitura de codigo, tamanhos de artefatos e testes locais; nao houve carga contra Mongo Atlas ou servico externo.

## Achados priorizados

### P1 - Listas administrativas e de check-in sem paginacao real

- Evidencia: `src/routes/checkin.js:270-275` aplica apenas `limit(300)`; `src/routes/admin.js:600-607` limita inscricoes a 500; a busca de usuarios tambem limita a 500.
- Impacto: com 30000 pessoas, resultados podem desaparecer sem indicar total, pagina seguinte ou cursor. Consultas e payloads aumentam, e o app so enxerga parte da base.
- Correcao proposta: contrato cursor/limit com maximo pequeno, `total` opcional separado, projecao minima por tela e endpoint de detalhe individual.
- Validacao: carga com 30000 inscricoes, `explain('executionStats')`, p95 e teste de navegacao por cursor.

### P1 - Reserva de vagas e conflito sao leitura seguida de escrita

- Evidencia: `src/routes/checkin.js:586-593` e `709-716` fazem `countDocuments` antes do upsert; a gravacao ocorre depois. Ha caminhos similares de alteracao nas linhas `955`, `1016` e `1042`.
- Impacto: duas operacoes simultaneas podem enxergar a ultima vaga e ambas confirma-la. O problema cresce com varios operadores.
- Correcao proposta: contador atomico por evento/atividade/periodo ou transacao Mongo com condicao de capacidade; teste concorrente obrigatorio.

### P1 - Check-in manual nao e atomico

- Evidencia: `src/routes/checkin.js:479-491` usa `findById`, altera o documento em memoria e chama `save`.
- Impacto: dois dispositivos podem processar o mesmo registro sem semantica deterministica; e nao existe chave de idempotencia.
- Correcao proposta: `findOneAndUpdate` condicional, evento de check-in com chave idempotente e retorno claro de `already_checked_in`.

### P1 - Fallback JSON faz leitura fora da fila de gravacao

- Evidencia: `src/services/localStore.js:91-95` le `readLocalStore()` antes de enfileirar `writeLocalStore()`; a fila protege somente a escrita no processo atual.
- Impacto: duas requisicoes podem mutar snapshots iguais e a ultima substituir a primeira. Nao ha sincronizacao entre processos/maquinas.
- Correcao proposta: retirar fallback de producao; para contingencia, fila transacional persistente ou SQLite/WAL com checksum, lock e reconciliacao.

### P2 - Busca textual usa regex em muitos campos

- Evidencia: `src/routes/checkin.js:248-263` monta sete campos com regex case-insensitive, depois ordena e limita.
- Impacto: com crescimento da base, regex sem indice de texto e ordenacao podem causar scan caro.
- Correcao proposta: busca prefixada normalizada, Atlas Search/text index conforme UX, debounce no cliente e medicao de plano de consulta.

### P2 - Backup carrega a base inteira na memoria do processo web

- Evidencia: `src/services/mongoBackup.js:20-30` usa `User.find({})` e `Registration.find({})` antes de `JSON.stringify`.
- Impacto: uso de memoria e I/O competem com check-in; backups de milhares de registros podem afetar o p95.
- Correcao proposta: backup gerenciado pelo Atlas ou job externo com streaming, compressao e destino remoto.

### P2 - Cache de ativos imutaveis sem nomes com hash no site publico

- Evidencia: `src/server.js:31-38` usa cache agressivo para assets; o site publico referencia arquivos como `app.min.js` e `styles.min.css` sem hash de conteudo.
- Impacto: risco de navegador manter arquivo antigo apos deploy; a correcao de cache depende de query string manual.
- Correcao proposta: build que emita nomes com hash ou versionamento unico no deploy e politica Cloudflare alinhada.

### P2 - Payload inicial publico e CSS/JS monoliticos

- Evidencia: `Site Publico/app.min.js` tem 158568 bytes e `styles.min.css` 183562 bytes. A SPA tem uma unica entrada para todas as rotas.
- Impacto: em conexoes lentas, usuarios baixam codigo e estilos de telas que talvez nunca visitem.
- Correcao proposta: dividir o JS por rota ou converter partes pesadas em modulos sob demanda; remover CSS morto apos auditoria visual automatizada.

### P2 - Painel tem chunks grandes embora as telas sejam lazy

- Evidencia: rotas lazy em `painel-react/src/app/routes.ts`; `dist/assets/exceljs...js` ~918 KiB, chart ~386 KiB, jsPDF ~381 KiB e html2canvas ~198 KiB.
- Impacto: relatorios/exportacoes podem ficar lentos no primeiro acesso e elevam uso de memoria.
- Correcao proposta: carregar bibliotecas de exportacao apenas na acao de exportar, revisar imports e medir bundle comprimido.

### P3 - Jobs no mesmo processo do servidor

- Evidencia: `src/server.js:83-113` agenda Google Sheets em memoria; `src/services/mongoBackup.js:55-67` agenda backup por `setInterval`.
- Impacto: multiplas instancias executam jobs duplicados e um restart perde estado.
- Correcao proposta: mover jobs para worker unico ou agendador do provedor, com lock distribudo e historico.

## Indices Mongo: estado e proxima medicao

O modelo `Registration` possui varios indices, inclusive compostos. Eles parecem cobrir filtros de evento/atividade/status e ticket, mas nao ha evidencia de `explain()` nem de cardinalidade real. Antes de adicionar/remover indices, executar:

1. Importar dados anonimizados representativos.
2. Rodar `explain('executionStats')` para bootstrap, busca, scan por ticket, ocupacao e usuarios.
3. Registrar `totalDocsExamined`, `totalKeysExamined`, `executionTimeMillis` e tamanho de cada indice.
4. Remover somente indices comprovadamente redundantes apos janela de observacao.

## Medidas de base

- API local respondeu normalmente, mas estava em `local-store`; isso nao mede Mongo.
- Site publico: bundle JS 158568 bytes; CSS 183562 bytes.
- Painel: code splitting por rota confirmado; maiores chunks listados acima.
- Nao foram executados `k6`, Artillery, Lighthouse ou `explain()` porque nao ha ambiente Mongo de carga configurado nesta maquina.

## Saida desta fase

Nenhuma otimizacao estrutural foi aplicada nesta fase. As P1 entram primeiro no plano de estabilizacao, pois sao tambem problemas de consistencia.
