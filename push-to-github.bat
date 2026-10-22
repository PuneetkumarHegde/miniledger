@echo off
setlocal
echo ======================================================
echo   MiniLedger - Push Repository to GitHub
echo ======================================================
echo.
echo Current Remote:
git remote -v
echo.
echo If your repository exists on GitHub, press ENTER to push to:
echo https://github.com/PuneetkumarHegde/miniledger.git
echo.
echo (Or paste a different GitHub URL below)
echo.
set /p REPO_URL="GitHub URL [Press Enter for default]: "

if not "%REPO_URL%"=="" (
    git remote remove origin 2>nul
    git remote add origin %REPO_URL%
)

git branch -M main
echo.
echo Pushing branch 'main' to GitHub...
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================
    echo [SUCCESS] Code successfully pushed to GitHub!
    echo ======================================================
) else (
    echo ======================================================
    echo [NOTE] Push failed. 
    echo If you haven't created the repository on GitHub yet:
    echo 1. Go to https://github.com/new
    echo 2. Create a repository named: miniledger
    echo 3. Re-run this script!
    echo ======================================================
)
pause
