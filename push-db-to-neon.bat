@echo off
setlocal
echo ======================================================
echo   MiniLedger - Push Database Schema to Neon Cloud DB
echo ======================================================
echo.
echo Paste your Neon PostgreSQL connection string below:
echo (Example: postgresql://username:password@ep-xyz...neon.tech/neondb?sslmode=require)
echo.
set /p NEON_URL="DATABASE_URL: "

if "%NEON_URL%"=="" (
    echo [ERROR] No DATABASE_URL provided. Exiting.
    pause
    exit /b 1
)

set DATABASE_URL=%NEON_URL%
echo.
echo Initializing database schema on Neon...
call npx --prefix apps/api prisma db push

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================
    echo [SUCCESS] Cloud database initialized successfully!
    echo All tables (User, Loan, OtpRecord, Repayment) created.
    echo ======================================================
) else (
    echo.
    echo ======================================================
    echo [ERROR] Failed to connect to database. Please check your URL.
    echo ======================================================
)
pause
