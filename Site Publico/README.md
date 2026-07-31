# Site Publico SIMITEC

Frontend publico da SIMITEC 2026. Ele e servido pelo Express em `Site Funcionarios` e usa a mesma API do painel e do aplicativo.

## O que este site faz

- Cadastro e login de participantes.
- Login com Google.
- Perfil do participante.
- Inscricao individual e credencial com QR Code.
- Areas, cronograma, palestrantes/oficineiros, galeria, FAQ, termos, privacidade e creditos.
- Rodape sincronizado com o painel administrativo.

## Arquivos principais

- `index.html`: estrutura inicial, favicon e carregamento do app.
- `app.js`: rotas, telas, inscricoes, perfil, credenciais e consumo da API.
- `styles.css`: visual, responsividade, tema claro/escuro e impressao.
- `assets`: logos oficiais, imagens da galeria, favicon e imagens institucionais.
- `google-auth-callback.html` e `google-auth-callback.js`: retorno do login Google.

## Como rodar

Este site nao tem servidor proprio. Inicie o sistema pela raiz:

```bat
..\iniciar-simitec.bat
```

Endereco local:

```text
http://127.0.0.1:3000/
```

## Conteudo editavel

O conteudo publico e alterado pelo painel em:

```text
http://127.0.0.1:3000/funcionarios/
```

Use a pagina `Site Publico` do painel para editar visual, secoes, rodape, galeria, palestrantes/oficineiros e textos oficiais.
