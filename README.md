# SIMITEC 2026

Plataforma integrada para inscricao, credenciamento, atividades, comunicacao e operacao da Semana de Inovacao e Metodologias Integradas a Tecnologias (SIMITEC).

## Componentes

| Componente | Responsabilidade |
| --- | --- |
| `Site Publico` | Inscricoes, conta do participante, programacao, credenciais e informacoes oficiais. |
| `Site Funcionarios` | API Node.js/Express, painel de operacao, controle de acesso, MongoDB e integracoes. |
| `Aplicativo` | Operacao de credenciamento da equipe em dispositivos Android. |
| `docs` | Documentacao tecnica, operacional, de seguranca e de governanca. |

## Governanca e uso

Este repositorio e software proprietario. Seu uso, copia, modificacao, distribuicao, hospedagem ou disponibilizacao depende de autorizacao expressa e por escrito da organizacao responsavel pela SIMITEC. Consulte [LICENSE](LICENSE), [Termos de Uso](docs/TERMOS_DE_USO.md), [Politica de Privacidade](docs/POLITICA_DE_PRIVACIDADE.md), [Seguranca](SECURITY.md) e [Contribuicao](CONTRIBUTING.md).

O fluxo de criacao de conta ja exige a confirmacao dos documentos legais no site publico e registra a data do aceite. Antes de colocar uma nova edicao em producao, a instituicao deve validar os textos com sua assessoria juridica, definir formalmente controlador, encarregado/canal LGPD, prazos de retencao, base legal de cada tratamento e autorizacoes especificas para menores e uso individual de imagem.

## Inicio local

Na raiz do projeto, execute:

```bat
iniciar-simitec.bat
```

Enderecos locais:

- Site publico: `http://127.0.0.1:3000/`
- Painel da equipe: `http://127.0.0.1:3000/funcionarios/`
- Saude da API: `http://127.0.0.1:3000/api/health`

Para encerrar o ambiente:

```bat
parar-simitec.bat
```

## Desenvolvimento

API e servidor:

```bat
cd "Site Funcionarios"
npm ci
npm start
```

Painel React:

```bat
cd "Site Funcionarios/painel-react"
npm ci
npm run build
```

Aplicativo Android:

```bat
cd Aplicativo
gradlew.bat assembleDebug
```

## Testes

```bat
cd "Site Funcionarios"
npm test
```

Os testes cobrem fluxos criticos de credenciamento, idempotencia, limite de vagas e verificacao integrada do sistema. Configuracoes reais de e-mail, OAuth, banco de dados, armazenamento e assinatura Android devem ser fornecidas apenas por variaveis de ambiente ou cofre de segredos; nunca por commits.

## Estrutura de dados

O ambiente local pode usar MongoDB em `mongodb://127.0.0.1:27017/simitec`. O modo de contingencia guarda dados locais em `Site Funcionarios/.data/local-db.json`; esse arquivo e deliberadamente ignorado pelo Git.

## Documentacao principal

- [Mapa do projeto](docs/MAPA_DO_PROJETO.md)
- [Identidade visual](docs/identidade-visual.md)
- [Auditoria de seguranca](docs/SECURITY_AUDIT.md)
- [Plano de estabilizacao](docs/PLANO_ESTABILIZACAO.md)
- [Termos de uso](docs/TERMOS_DE_USO.md)
- [Politica de privacidade](docs/POLITICA_DE_PRIVACIDADE.md)
- [Aviso de propriedade intelectual](docs/AVISO_DE_PROPRIEDADE_INTELECTUAL.md)
- [Registro de aprovacoes legais](docs/REGISTRO_DE_APROVACOES_LEGAIS.md)
