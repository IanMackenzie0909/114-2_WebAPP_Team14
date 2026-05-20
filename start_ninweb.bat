@echo off
setlocal

set "IMAGE=ninweb:test"
set "CONTAINER=ninweb-test"
set "PORT=8001"
set "URL=http://localhost:%PORT%/"

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

echo Stopping old "%CONTAINER%" container if it exists...
docker rm -f "%CONTAINER%" >nul 2>&1

echo Starting "%IMAGE%" on %URL% ...
docker run -d --rm --name "%CONTAINER%" ^
  -p %PORT%:8000 ^
  -e DJANGO_DEBUG=1 ^
  -e DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0 ^
  -e DJANGO_SEED_INITIAL_CONTENT=1 ^
  "%IMAGE%" >nul

if errorlevel 1 (
  echo Failed to start the Docker container.
  pause
  exit /b 1
)

call :wait_for_site
if errorlevel 1 (
  echo The container started, but the site did not respond in time.
  echo Check logs with:
  echo   docker logs %CONTAINER%
  pause
  exit /b 1
)

start "" "%URL%"
echo Site is running at %URL%
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
