@echo off
REM ====================================================================
REM  MR HASAR — KAMERA KOPRU BASLATICI (go2rtc)
REM  Bu dosyayi go2rtc.exe ve go2rtc.yaml ile AYNI klasore koyun.
REM  Cift tiklayinca kopru calisir. Pencereyi kapatmayin (acik kalmali).
REM  Bilgisayar acildiginda otomatik baslamasi icin: bu .bat dosyasinin
REM  kisayolunu  shell:startup  klasorune koyun.
REM ====================================================================
cd /d "%~dp0"
title MR HASAR - KAMERA KOPRU (KAPATMAYIN)
echo.
echo  MR HASAR - KAMERA KOPRU CALISIYOR
echo  Bu pencereyi KAPATMAYIN. Kapatirsaniz kameralar gorunmez.
echo.
go2rtc.exe
echo.
echo  KOPRU DURDU. Bir tusa basin...
pause >nul
