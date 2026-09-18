@echo off
cd /d "%~dp0"
echo Simulation Atlas v1
echo URL: http://127.0.0.1:5174/
call npm.cmd run app
if errorlevel 1 call npm.cmd run app:web
pause
