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

### Watch Online Page and Navigation Entry

> - **Purpose**: Give users a dedicated page for finding where to watch Ninjago seasons and specials.
> - **Usage in this project**: We added a `Watch Online` navigation link across the site and connected it to `src/watchonline.html`. The page organizes classic seasons and Dragons Rising seasons into poster cards with platform badges, language badges, and external links to YouTube, Netflix, or Bilibili.

### Character Page Visual Redesign

> - **Purpose**: Improve the browsing experience on the character page and make character cards feel more polished.
> - **Usage in this project**: `characters.html`, `characters.css`, and `characters.js` were updated with a redesigned layout, stronger visual styling, and frontend behavior that better supports character browsing.

### Timeline Page Redesign

> - **Purpose**: Make the long timeline page easier to scan and navigate.
> - **Usage in this project**: `timeline.css` and `timeline.html` were redesigned, and the left-side timeline bookmark area was improved so the current bookmarked location is easier to identify visually.

### WorldLocation Backend Model

> - **Purpose**: Move world-building content from static page markup into maintainable backend data.
> - **Usage in this project**: We added the `WorldLocation` model with Chinese and English names, category choices, short and long descriptions, image upload support, image descriptions, sorting, publish status, and timestamps. Django Admin now supports filtering, searching, inline publish/sort editing, and image previews for these records.

### World Locations API and Dynamic World Page

> - **Purpose**: Let the frontend render world locations from database records instead of hard-coded HTML.
> - **Usage in this project**: We added `/api/world/locations/`, which returns published `WorldLocation` records as JSON. `world.js` now fetches this endpoint, builds category filter buttons, renders location cards, and opens a modal with the selected location's image, category, names, and description.

### World Location Media Assets

> - **Purpose**: Provide actual visual assets for the world page content.
> - **Usage in this project**: We uploaded world-location images into `NINJAMaster/world/`, allowing Admin-managed `WorldLocation` records to display location artwork on the frontend cards and detail modal.

## Verification

```bash
docker compose config
python NINJAMaster/manage.py check
```

Docker Compose configuration was valid, and Django reported no system check issues. A full Docker build still requires Docker Desktop to be running locally.

## Contribution

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | Redesign of timeline page, character page, world page, created worldLocation backend model, created watch online page. Dockerfile and Docker Compose setup, Django settings update, Docker workflow testing, and report writing |
| 呂羿樺 | 50% | Docker documentation, database startup workflow, Git cleanup for SQLite database, and report writing |
