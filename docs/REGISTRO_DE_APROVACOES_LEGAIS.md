# Registro de Aprovacoes Legais e Institucionais

Este registro deve ser preenchido pela instituicao antes de disponibilizar uma edicao da SIMITEC ao publico. Ele nao deve conter dados pessoais de participantes nem segredos tecnicos.

| Item | Responsavel institucional | Data | Evidencia ou processo |
| --- | --- | --- | --- |
| Termos de Uso aprovados | A preencher | A preencher | Parecer ou despacho interno |
| Politica de Privacidade aprovada | A preencher | A preencher | Parecer ou despacho interno |
| Controlador identificado | A preencher | A preencher | Pagina oficial e ato institucional |
| Encarregado/canal LGPD definido | A preencher | A preencher | Canal publicado e responsavel designado |
| Bases legais e retencao revisadas | A preencher | A preencher | Inventario de tratamento |
| Fluxo para menores e uso de imagem aprovado | A preencher | A preencher | Termo e orientacao da equipe |
| Fornecedores e compartilhamentos validados | A preencher | A preencher | Contratos ou registros internos |
| Plano de resposta a incidentes aprovado | A preencher | A preencher | Procedimento operacional |
| Responsavel pela publicacao autorizado | A preencher | A preencher | Aprovacao de implantacao |

## Condicao de publicacao

Nao publique uma nova edicao enquanto os itens aplicaveis estiverem sem responsavel, sem evidencia ou sem aprovacao institucional. Mudancas em dados coletados, integracoes, uso de imagem, fornecedores ou finalidade de tratamento exigem nova revisao.

Em producao, a API tambem exige `LEGAL_RELEASE_APPROVED=true`, `LEGAL_CONTROLLER_NAME` e `LEGAL_PRIVACY_CONTACT`. Essa trava esta em `Site Funcionarios/src/services/legalRelease.js`; ela impede iniciar o servidor de producao sem os tres dados.
