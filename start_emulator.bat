@echo off
title FieldSurvey Android Emulator Launcher
echo ========================================================
echo Starting Android Emulator: QTDA_Pixel_6_API_36...
echo ========================================================
set ANDROID_HOME=D:\Android
set ANDROID_SDK_ROOT=D:\Android
set ANDROID_AVD_HOME=D:\Android\avd

start "" "D:\Android\emulator\emulator.exe" -avd QTDA_Pixel_6_API_36
echo.
echo [OK] Android Emulator process launched!
echo The Pixel 6 phone window will appear on your desktop.
echo.
timeout /t 5
