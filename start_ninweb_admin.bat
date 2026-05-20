@echo off
setlocal

set "IMAGE=ninweb:test"
set "CONTAINER=ninweb-test"
set "PORT=8001"
set "URL=http://localhost:%PORT%/admin/"

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop and make sure it is running.
  pause
  exit /b 1
)

docker image inspect "%IMAGE%" >nul 2>&1
if errorlevel 1 (
  echo Docker image "%IMAGE%" was not found.
  echo Build or load it first:
  echo   docker build --no-cache -t %IMAGE% .
  echo   docker load -i ninweb-test.tar
  pause
  exit /b 1
)

set "ADMIN_USERNAME="
set /p "ADMIN_USERNAME=Admin username [admin]: "
if "%ADMIN_USERNAME%"=="" set "ADMIN_USERNAME=admin"

set "ADMIN_EMAIL="
set /p "ADMIN_EMAIL=Admin email [admin@example.com]: "
if "%ADMIN_EMAIL%"=="" set "ADMIN_EMAIL=admin@example.com"

for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$p = Read-Host 'Admin password' -AsSecureString; $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }"`) do set "ADMIN_PASSWORD=%%P"

if "%ADMIN_PASSWORD%"=="" (
  echo Admin password cannot be empty.
  pause
  exit /b 1
)

echo Stopping old "%CONTAINER%" container if it exists...
docker rm -f "%CONTAINER%" >nul 2>&1

echo Starting "%IMAGE%" with admin bootstrap on %URL% ...
docker run -d --rm --name "%CONTAINER%" ^
  -p %PORT%:8000 ^
  -e DJANGO_DEBUG=1 ^
  -e DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0 ^
  -e DJANGO_SEED_INITIAL_CONTENT=1 ^
  -e "DJANGO_SUPERUSER_USERNAME=%ADMIN_USERNAME%" ^
  -e "DJANGO_SUPERUSER_PASSWORD=%ADMIN_PASSWORD%" ^
  -e "DJANGO_SUPERUSER_EMAIL=%ADMIN_EMAIL%" ^
  "%IMAGE%" >nul

if errorlevel 1 (
  echo Failed to start the Docker container.
  pause
  exit /b 1
)

call :wait_for_site
if errorlevel 1 (
  echo The container started, but the admin page did not respond in time.
  echo Check logs with:
  echo   docker logs %CONTAINER%
  pause
  exit /b 1
)

start "" "%URL%"
echo Admin site is running at %URL%
echo Username: %ADMIN_USERNAME%
echo Stop it with:
echo   docker stop %CONTAINER%
pause
exit /b 0

:wait_for_site
echo Waiting for Django to respond...
for /l %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%URL%'; if ($r.StatusCode -ge 200) { exit 0 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 exit /b 0
  timeout /t 1 >nul
)
exit /b 1
