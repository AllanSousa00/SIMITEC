# Site Funcionarios, API e Painel

Servidor principal da SIMITEC. Esta pasta entrega o site publico, o painel da equipe e a API usada tambem pelo app Android.

## Partes internas

- `src`: servidor Express, rotas, modelos, servicos e dados oficiais.
- `painel-react`: painel administrativo feito em React/Vite.
- `painel-react/dist`: build servido em `/funcionarios/`.
- `.data`: fallback local, backups e arquivos operacionais locais.
- `scripts`: utilitarios de migracao e SMTP.

## Rodar

```bat
npm install
npm start
```

O servidor sobe em:

```text
http://127.0.0.1:3000
```

## Build do painel

Quando alterar o React:

```bat
cd painel-react
npm install
npm run build
```

Depois disso, o Express serve o resultado em:

```text
http://127.0.0.1:3000/funcionarios/
```

## Rotas principais

- `GET /`: site publico.
- `GET /funcionarios/`: painel interno da equipe.
- `GET /api/health`: status da API e do banco.
- `POST /api/auth/login`: login por e-mail e senha.
- `POST /api/auth/google`: login com Google.
- `GET /api/registrations/event`: dados oficiais do evento para site, painel e app.
- `GET /api/checkin/bootstrap`: pacote inicial para o app da equipe.
- `GET /api/checkin/registrations`: lista de credenciamento.
- `POST /api/checkin/scan`: valida QR Code, codigo, CPF ou e-mail.
- `GET /api/admin/content`: conteudo administrativo.
- `POST /api/admin/content`: salva alteracoes do painel.
- `POST /api/admin/sheets/sync`: sincroniza dados com Google Sheets.

## Banco de dados

O modo local atual usa MongoDB em:

```text
mongodb://127.0.0.1:27017/simitec
```

O arquivo `.env` deve conter pelo menos:

```text
MONGODB_URI=
JWT_SECRET=
ADMIN_SETUP_TOKEN=
APP_URL=http://127.0.0.1:3000
GOOGLE_CLIENT_ID=
GOOGLE_WEB_CLIENT_ID=
```

O JSON em `.data/local-db.json` continua como contingencia se o MongoDB nao estiver disponivel.

## Scripts uteis

```bat
npm run smtp:check
npm run smtp:test
npm run migrate:local-to-mongo
```

## Observacoes

- O painel antigo em `painel/` foi removido. O painel atual e `painel-react`.
- Os backups automaticos ficam em `.data/backups`.
- A base INEP local fica em `src/data/inep-schools.json`.
- Imagens enviadas pelo painel podem cair em `Site Publico/uploads` quando nao houver storage externo configurado.
