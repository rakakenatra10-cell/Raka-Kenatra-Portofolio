@echo off
title Upload Website ke GitHub - rakakenatra10-cell
echo ========================================================
echo   UPLOAD PORTOFOLIO KE GITHUB (rakakenatra10-cell)
echo ========================================================
echo.
echo Pastikan Anda sudah membuat repository di GitHub:
echo https://github.com/new dengan nama: raka-portfolio
echo.
pause
echo.
echo Menghubungkan ke GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/rakakenatra10-cell/raka-portfolio.git
git branch -M main
echo Mengirim file ke GitHub...
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   BERHASIL! Website Anda sudah terupload ke GitHub!
    echo   Buka: https://github.com/rakakenatra10-cell/raka-portfolio
    echo ========================================================
) else (
    echo.
    echo Ada kendala login atau repository belum dibuat di github.com/new.
)
echo.
pause
