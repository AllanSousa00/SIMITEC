@echo off
REM Encerra o Node que estiver usando a porta 3000.
REM Serve para quando o servidor fica aberto e a gente so quer limpar a mesa.
setlocal
title SIMITEC - Encerrar servidor

echo Encerrando processos Node.js que estejam usando a porta 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -like 'node*') { Stop-Process -Id $p.Id -Force; Write-Host ('Servidor encerrado: PID ' + $p.Id) } }"
echo.
pause

