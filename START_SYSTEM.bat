@echo off
echo ==========================================
echo      INICIANDO SISTEMA DE CHECKLIST
echo ==========================================
echo.
echo 1. Iniciando Servidor Local...
start "Checklist Server" /min cmd /c "cd server && npm start"
echo    OK.
echo.
echo 2. Conectando a Internet (Publicando)...
echo    URL Fixa: https://checklist-app-gutemberg-2026.loca.lt
echo.
echo    IMPORTANTE: Se pedir senha no site, digite: 149.19.166.164
echo.
echo    NAO FECHE ESTA JANELA ENQUANTO USAR O SISTEMA!
echo.
cd server
call npx localtunnel --port 8080 --subdomain checklist-app-gutemberg-2026
pause