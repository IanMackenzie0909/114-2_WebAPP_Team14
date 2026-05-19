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
