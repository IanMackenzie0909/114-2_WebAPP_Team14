# Week 12 Practice report

## In-class Practice

### Dockerized Django Runtime Environment

> - **Purpose**: Package the project runtime environment so every teammate can run the same Python and Django setup without manually rebuilding a virtual environment.
> - **Usage in this project**: We added a `Dockerfile` that starts from a Python image, installs dependencies from `requirements.txt`, copies the project files, and runs the Django server from the `NINJAMaster` folder.

### Docker Compose Service Setup

> - **Purpose**: Provide one simple command for building and running the web application.
> - **Usage in this project**: We added `docker-compose.yml` with a `web` service, mapped container port `8000` to local port `8000`, and mounted the project folder into `/app` so code changes can be tested during development.

### Container Startup Workflow

> - **Purpose**: Make database setup part of the container startup process instead of requiring every developer to remember each Django command manually.
> - **Usage in this project**: We added `docker/entrypoint.sh`. When the container starts, it runs `python manage.py migrate`. If `NINJAMaster/db.sqlite3` does not exist yet, it also runs `python manage.py seed_initial_content` to load the default project content.

## Additional Content

### Environment Variable Support in Django Settings

> - **Purpose**: Make Django easier to configure inside Docker without editing source code for different machines.
> - **Usage in this project**: `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` can now be controlled with environment variables such as `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, and `DJANGO_ALLOWED_HOSTS`.

### Docker Ignore Rules

> - **Purpose**: Keep the Docker image smaller and avoid copying unnecessary local files into the container.
> - **Usage in this project**: We added `.dockerignore` to exclude `.git`, virtual environments, Python cache files, and `NINJAMaster/db.sqlite3`.

### Docker Documentation

> - **Purpose**: Help teammates understand how to build, run, stop, and troubleshoot the Dockerized project.
> - **Usage in this project**: We added `DOCKER.md` with setup steps, common Docker Compose commands, and troubleshooting notes for Docker Desktop, port conflicts, and database initialization.

### Git Cleanup for SQLite Database

> - **Purpose**: Avoid conflicts caused by tracking a local SQLite database file in Git.
> - **Usage in this project**: `NINJAMaster/db.sqlite3` is ignored and removed from version control, so each developer can generate their own local database through migrations or the Docker startup script.

## Verification

```bash
docker compose config
python NINJAMaster/manage.py check
```

Docker Compose configuration was valid, and Django reported no system check issues. A full Docker build still requires Docker Desktop to be running locally.

## Contribution

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | Dockerfile and Docker Compose setup, Django settings update, Docker workflow testing, and report writing |
| 呂羿樺 | 50% | Docker documentation, database startup workflow, Git cleanup for SQLite database, and report writing |
