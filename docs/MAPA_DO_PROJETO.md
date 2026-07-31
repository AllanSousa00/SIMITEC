# Mapa do projeto SIMITEC

Guia rapido para entender a pasta atual da SIMITEC depois da limpeza.

## Raiz

- `Site Publico`: site usado por participantes e visitantes.
- `Site Funcionarios`: servidor, API, banco, painel administrativo e credenciamento.
- `Aplicativo`: app Android nativo da equipe.
- `docs`: documentos de configuracao, entrega e dados pendentes.
- `iniciar-simitec.bat`: liga o sistema local.
- `parar-simitec.bat`: encerra o servidor na porta 3000.

## Site Publico

Arquivos principais:

- `index.html`: estrutura base do site.
- `app.js`: telas, rotas, inscricoes, perfil, credenciais, termos e integracao com API.
- `styles.css`: tema visual, responsividade, modo claro/escuro e impressao.
- `assets`: logo oficial, favicon, galeria, brasao e imagens institucionais.

O site e servido pelo Express em `Site Funcionarios` e abre em:

```text
http://127.0.0.1:3000/
```

## Site Funcionarios

Arquivos principais:

- `src/server.js`: servidor Express.
- `src/routes`: rotas de autenticacao, inscricao, credenciamento e administracao.
- `src/models`: modelos do MongoDB.
- `src/services`: servicos de conteudo, Google Sheets, e-mail, backups, INEP e banco local.
- `src/data/inep-schools.json`: base local de instituicoes.
- `painel-react`: fonte do painel administrativo.
- `painel-react/dist`: build servido em `/funcionarios/`.
- `.data`: fallback local e backups.

Painel:

```text
http://127.0.0.1:3000/funcionarios/
```

API:

```text
http://127.0.0.1:3000/api/health
```

## Aplicativo

Arquivos principais:

- `app/src/main/java/com/example`: codigo Kotlin do app.
- `app/src/main/res`: recursos Android.
- `releases`: APK de distribuicao mantido para a equipe.
- `gradlew.bat`: build pelo terminal.

Gerar APK:

```bat
cd Aplicativo
gradlew.bat assembleDebug
```

## Docs

- `Documentacao_Tecnica_Operacional_SIMITEC_2026_min_80_paginas.docx`: referencia tecnica e operacional completa.
- `MAPA_DO_PROJETO.md`: este arquivo.
- `identidade-visual.md`: paleta e regras visuais compartilhadas.

## Fluxo dos dados

O painel altera o conteudo oficial pelo servidor. O site publico e o app leem esse conteudo pela mesma API. O banco principal e MongoDB local; o JSON em `.data/local-db.json` fica como contingencia.

## Arquivos gerados

- Caches Android (`.gradle`, `.kotlin` e `build`) sao regenerados pelo Gradle e nao fazem parte da fonte.
- Capturas do Playwright e logs locais sao usados apenas durante testes e nao devem ser mantidos como codigo.
- O `painel-react/dist` e a versao compilada servida pelo Express; por isso permanece junto ao painel.
