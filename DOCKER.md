# Docker Setup

This project can run with a single Django container. The database still uses the project's original SQLite setup.

## What Docker Does Here

Docker does not replace Django or Git. Its purpose is to package the runtime environment, including the Python version, pip dependencies, startup commands, and port mapping.

This lets every teammate run the project in the same environment without manually setting up a virtual environment or installing dependencies one by one.

## First-Time Startup

Open Docker Desktop first and wait until the Docker Engine is running. Then run this command from the project root:

```bash
docker compose up --build
```

After the server starts, open:

```text
http://localhost:8000/
```

On startup, the container automatically runs:

```bash
python manage.py migrate
python manage.py seed_initial_content
python manage.py runserver 0.0.0.0:8000
```

The default fixture contains public site content only, such as characters,
elements, and world locations. It does not contain real user accounts,
feedback, votes, favorites, or timeline progress.

To create or update an admin account at container startup, pass these
environment variables:

```bash
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=change-this-password
DJANGO_SUPERUSER_EMAIL=admin@example.com
```

Do not commit real admin passwords into `docker-compose.yml`.

After `NINJAMaster/db.sqlite3` already exists, the container will still run migrations automatically, but it will not seed the initial content every time by default. This avoids overwriting admin content, votes, or other local data.

## Common Commands

Start the service:

```bash
docker compose up
```

Rebuild and start the service:

```bash
docker compose up --build
```

Stop the service:

```bash
docker compose down
```

Run Django management commands manually:

```bash
docker compose run --rm web python manage.py createsuperuser
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py seed_initial_content
```

To force the initial content to load again, temporarily change `DJANGO_SEED_INITIAL_CONTENT` in `docker-compose.yml` to `"1"`, or run:

```bash
docker compose run --rm -e DJANGO_SEED_INITIAL_CONTENT=1 web python manage.py seed_initial_content
```

## Windows One-Click Scripts

After the image exists locally as `ninweb:test`, Windows users can start the
site by double-clicking:

```text
start_ninweb.bat
```

This starts the container on `http://localhost:8001/` and opens the browser.

To start the site and create a temporary admin account, double-click:

```text
start_ninweb_admin.bat
```

The script asks for the admin username, email, and password, then opens:

```text
http://localhost:8001/admin/
```

Both scripts stop and replace any existing `ninweb-test` container before
starting a new one. Stop the running container with:

```powershell
docker stop ninweb-test
```

## Test the Image From an Empty Folder

Use this flow to verify that the Docker image can run by itself, without
depending on the original project folder or local `NINJAMaster/db.sqlite3`.
This is the best check before sharing the image with another computer.

First, build the image from the project root:

```powershell
cd C:\YOUR\PATH\TO\PROJECT-ROOT
docker build --no-cache -t ninweb:test .
```

Then create and enter an empty test folder:

```powershell
mkdir C:\ANOTHER\PATH\TO\PROJECT-ROOT-image-test
cd C:\ANOTHER\PATH\TO\PROJECT-ROOT-image-test
```

Run the image directly from that empty folder:

```powershell
docker run --rm --name ninweb-test `
  -p 8001:8000 `
  -e DJANGO_DEBUG=1 `
  -e DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0 `
  -e DJANGO_SEED_INITIAL_CONTENT=1 `
  ninweb:test
```

Open these URLs:

```text
http://localhost:8001/
http://localhost:8001/characters/
http://localhost:8001/src/world.html
```

If those pages load, the image has the runtime environment and public fixture
content needed to run independently.

To test the admin page too, start the container with a temporary admin account:

```powershell
docker run --rm --name ninweb-test `
  -p 8001:8000 `
  -e DJANGO_DEBUG=1 `
  -e DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0 `
  -e DJANGO_SEED_INITIAL_CONTENT=1 `
  -e DJANGO_SUPERUSER_USERNAME=admin `
  -e DJANGO_SUPERUSER_PASSWORD=change-this-password `
  -e DJANGO_SUPERUSER_EMAIL=admin@example.com `
  ninweb:test
```

Then open:

```text
http://localhost:8001/admin/
```

Stop the test container when finished:

```powershell
docker stop ninweb-test
```

Do not use a volume mount such as `-v C:\YOUR\PATH\TO\PROJECT-ROOT:/app` for this
test. A volume mount replaces the files inside the image with your local
project folder, so it no longer proves that the image can run independently.

## Files Added

- `Dockerfile`: Defines how to build the Python/Django image.
- `docker-compose.yml`: Defines the web service, port mapping, volume, and environment variables.
- `.dockerignore`: Prevents unnecessary files such as `.git`, virtual environments, and the SQLite database from being copied into the image.
- `docker/entrypoint.sh`: Runs migrations when the container starts and seeds initial content when the database is created for the first time.

## Troubleshooting

Common causes:

- Docker Desktop is not running.
- Port `8000` is already being used. In that case, change `"8000:8000"` in `docker-compose.yml` to `"8001:8000"` and open `http://localhost:8001/`.
- Windows Firewall or Docker Desktop permissions are blocking the service.
