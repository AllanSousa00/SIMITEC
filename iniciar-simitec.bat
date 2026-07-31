@echo off
REM Inicializador geral da SIMITEC.
REM Ele sobe o servidor e abre site publico e painel.
REM Comentario de estudante: e o botao "liga tudo logo".
setlocal
title SIMITEC - Inicializador

cd /d "%~dp0"
set "ROOT=%~dp0"
set "API_DIR=%ROOT%Site Funcionarios"
set "URL_PUBLICO=http://127.0.0.1:3000/"
set "URL_EQUIPE=http://127.0.0.1:3000/funcionarios/"

echo.
echo ========================================
echo        SIMITEC - iniciar sistemas
echo ========================================
echo.

if not exist "%API_DIR%\package.json" (
  echo Nao encontrei a API em "%API_DIR%".
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js antes de iniciar a SIMITEC.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nao encontrado. Reinstale o Node.js com npm habilitado.
  pause
  exit /b 1
)

if not exist "%API_DIR%\node_modules" (
  echo Instalando dependencias da API...
  pushd "%API_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
  popd
)

echo Iniciando servidor, site publico e painel da equipe...
start "SIMITEC API" cmd /k "cd /d ""%API_DIR%"" && npm start"

timeout /t 4 /nobreak >nul
start "" "%URL_PUBLICO%"
start "" "%URL_EQUIPE%"

echo.
echo Site publico: %URL_PUBLICO%
echo Painel da equipe: %URL_EQUIPE%
echo.
echo O servidor fica aberto na janela "SIMITEC API".
echo Para encerrar, feche a janela do servidor.
echo.
pause

