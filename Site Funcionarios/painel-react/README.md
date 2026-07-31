# Painel React SIMITEC

Interface administrativa da equipe SIMITEC. Este painel substitui o painel antigo e e servido pelo servidor Express depois do build.

## Telas principais

- Dashboard.
- Inscricoes.
- Credenciamento.
- Site Publico.
- Site da Equipe.
- Funcionarios.
- Cargos.
- Relatorios.
- Configuracoes.

## Rodar em desenvolvimento

```bat
npm install
npm run dev
```

O Vite abre o painel em modo desenvolvimento. Para usar dados reais, mantenha tambem o servidor em `Site Funcionarios` ligado.

## Gerar build

```bat
npm run build
```

O resultado sai em:

```text
dist
```

O servidor principal entrega essa pasta em:

```text
http://127.0.0.1:3000/funcionarios/
```

## Integracoes usadas

- API Express em `/api/*`.
- MongoDB via servidor.
- Google Login.
- Google Sheets.
- PDF, CSV e planilhas.
- Controle de cargos e permissoes.

## Observacao

Este projeto veio de uma arte do Figma, mas agora esta conectado ao sistema real da SIMITEC. Nao use mais as instrucoes antigas do Figma como referencia operacional.
