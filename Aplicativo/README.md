# Aplicativo Android SIMITEC

Aplicativo nativo da equipe para credenciamento presencial da SIMITEC.

## Funcionalidades

- Login da equipe.
- Dashboard compacto.
- Busca de participantes.
- Credenciamento manual.
- Leitura de QR Code pela camera.
- Inscricao presencial individual e em grupo.
- Ajustes de seguranca, tema, idioma e notificacoes.
- Sincronizacao com a API do painel.

## Estrutura

- `app/src/main/java/com/example`: codigo Kotlin do aplicativo.
- `app/src/main/res`: recursos Android, icones, tema e logo.
- `app/build.gradle.kts`: dependencias do app.
- `gradle`: wrapper do Gradle.
- `releases`: APKs mantidos para instalacao.

## Pacotes de distribuicao

A pasta mantem apenas os pacotes atuais:

- APK release assinado;
- AAB release assinado para publicacao;
- APK debug para testes locais.

Local:

```text
Aplicativo/releases
```

## Rodar no Android Studio

1. Abra o Android Studio.
2. Escolha `Open`.
3. Selecione a pasta `Aplicativo`.
4. Aguarde o Gradle sincronizar.
5. Rode em um celular ou emulador.

## Build pelo terminal

```bat
gradlew.bat assembleDebug
```

O APK gerado pelo Gradle fica em `app/build/outputs/apk/debug/`. Essa pasta e gerada automaticamente e pode ser apagada quando precisar limpar o projeto.

## Configuracao

O app deve apontar para a API do servidor SIMITEC. Em rede local, use o IP da maquina que roda o servidor, por exemplo:

```text
http://192.168.0.103:3000
```

No emulador Android, `127.0.0.1` aponta para o proprio emulador. Para acessar a maquina do servidor a partir do emulador, normalmente use:

```text
http://10.0.2.2:3000
```

## Observacoes

- A pasta `app/build` nao e fonte do projeto; e artefato gerado.
- A logo oficial fica nos recursos do app.
- O app depende da API em `Site Funcionarios` para login, dados, busca e credenciamento.
