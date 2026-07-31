# Baseline da Onda 1

Data: 2026-07-28

## Estado do repositorio

- Diretorio avaliado: raiz do projeto SIMITEC.
- Git: indisponivel. O diretorio nao contem `.git`; por isso nao ha branch, commit ou checkpoint Git a registrar nesta maquina.
- Nenhum `.env` real, banco, upload, backup, APK de release ou dado operacional foi aberto, alterado ou removido.
- Java usado nos comandos Android: `C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot`.
- Cache Gradle isolado: `C:\Users\Allan\AppData\Local\Temp\simitec-gradle-audit`, para evitar o cache global corrompido ja identificado.

## Comandos executados

| Componente | Comando | Resultado real | Duracao | Observacoes |
| --- | --- | --- | --- | --- |
| Backend | `npm run test:system` | passou | 16.74 s | Validou paginas, protecao, cadastro, verificacao, login, perfil, inscricao, credencial, check-in, recuperacao, exclusao e e-mails no ambiente de teste local. |
| Backend | `npm run email:verify` | passou | 1.26 s | Validou quatro previas, bloqueio de destinatario e rejeicao de injecao de cabecalho. |
| Backend | `npm run email:verify-route` | passou | 13.36 s | Confirmou que a rota de previas exige sessao. |
| Backend | `npm run smtp:check` | passou | 3.33 s | Executado sem `--send`; a saida que poderia conter configuracao foi suprimida. |
| Painel | `npm run build` | falhou | 0.98 s | `vite` nao foi encontrado porque `painel-react/node_modules` permanece uma instalacao parcial bloqueada pelo Windows. Nenhum arquivo foi removido nesta baseline. |
| Android | `gradlew.bat testDebugUnitTest` | passou | 11.51 s | 32 tarefas atualizadas; avisos de APIs depreciadas ja conhecidos nao falharam o teste. |
| Android | `gradlew.bat assembleDebug` | passou | 3.77 s | APK debug gerado/reutilizado em `app/build/outputs/apk/debug/app-debug.apk`, 45269205 bytes. |
| Android | `gradlew.bat lint` | passou | 146.09 s | Relatorio em `app/build/reports/lint-results-debug.html`. |

## Lacunas da baseline

1. O teste de sistema atual cobre principalmente fallback local; nao prova concorrencia ou transacoes Mongo reais.
2. Backend e painel ainda nao expoem scripts gerais `test` e `lint`.
3. O build do painel fica bloqueado ate a instalacao gerada de dependencias ser reparada de modo controlado.
4. O cache Gradle global da maquina permanece fora de uso; os comandos desta onda usam cache isolado.

## Rollback da baseline

Esta etapa apenas executou testes e criou este documento. Nao existe alteracao operacional a desfazer.
