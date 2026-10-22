@echo off
title MiniLedger Test Suite
echo Running MiniLedger Vitest Backend Tests...
cd /d "%~dp0apps\api"
npm test
pause
