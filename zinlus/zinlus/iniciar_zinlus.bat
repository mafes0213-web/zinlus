@echo off
title ZINLUS - Servidor y Lanzador
cd /d "%~dp0"

echo ========================================================
echo               INICIANDO ZINLUS
echo ========================================================
echo Abriendo servidor local en http://localhost:8080 ...
echo Abriendo Google Chrome...
echo ========================================================

start "" "http://localhost:8080"
node server.js
if %errorlevel% neq 0 (
    echo [AVISO] Node no esta en el PATH global, intentando con lanzador agy-node...
    "%LOCALAPPDATA%\..\Roaming\Antigravity\bin\agy-node.cmd" server.js
)
pause
