@echo off
title Upload Website ke GitHub - rakakenatra10-cell
echo ========================================================
echo   UPLOAD PORTOFOLIO KE GITHUB (rakakenatra10-cell)
echo   Repository: Raka-Kenatra-Portofolio
echo ========================================================
echo.
echo Menghubungkan ke GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/rakakenatra10-cell/Raka-Kenatra-Portofolio.git
git branch -M main
echo.
echo Mengirim file ke GitHub...
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   BERHASIL! Website Anda sudah terupload ke GitHub!
    echo   Buka: https://github.com/rakakenatra10-cell/Raka-Kenatra-Portofolio
    echo ========================================================
) else (
    echo.
    echo Ada kendala login atau otentikasi GitHub.
)
echo.
pause
