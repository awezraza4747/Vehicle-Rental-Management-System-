@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.5 or newer, then try again.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/vehicles' -TimeoutSec 2; if ($r.PSObject.Properties.Name -contains 'vehicles') { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open_site

start "BharatDrive Server" /D "%~dp0" cmd.exe /k node server.mjs
set attempts=0

:wait_for_server
 timeout /t 1 /nobreak >nul
 powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/vehicles' -TimeoutSec 2; if ($r.PSObject.Properties.Name -contains 'vehicles') { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>&1
 if not errorlevel 1 goto open_site
 set /a attempts+=1
 if %attempts% LSS 30 goto wait_for_server

echo BharatDrive did not start. Check the server window for an error.
pause
exit /b 1

:open_site
start "" "http://127.0.0.1:3000"
echo BharatDrive is open. Keep the server window running while you use the site.
endlocal
