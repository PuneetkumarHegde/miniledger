@echo off
title MiniLedger Backend API
echo Starting MiniLedger Express Backend Server...
cd /d "%~dp0apps\api"
npm run dev
pause
