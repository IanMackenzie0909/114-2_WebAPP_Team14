# Week 7 Practice report

## In-class Practice

### Relational Model Design for the Element System

> - **Normalized schema with three models**
>   - **Purpose**: Separate source categories, individual elemental powers, and holder timeline records into independent tables instead of hard-coding them in frontend files.
>   - **Usage in this project**: We added `ElementSource`, `ElementPower`, and `ElementHolderHistory` so the Elements page can load its content from the database, including each element's source, current holder, and past holders.
>
> - **Deletion policy based on data meaning**
>   - **Purpose**: Use different relationship rules according to actual business logic.
>   - **Usage in this project**:
>     - `source -> ElementPower` uses `PROTECT`, so a source category cannot be deleted while related powers still exist.
>     - `current_holder` and history `character` use `SET_NULL`, so holder records can still be preserved even if a linked character is removed.

### Model-Level Database Integrity

> - **Conditional uniqueness**
>   - **Purpose**: Let the database enforce rules that must always remain true.
>   - **Usage in this project**: `UniqueConstraint(condition=Q(is_current=True), fields=["element"], ...)` ensures that each element can have only one current holder record.
>
> - **Check constraints**
>   - **Purpose**: Prevent incomplete history rows from being saved into the database.
>   - **Usage in this project**: `CheckConstraint(condition=Q(character__isnull=False) | ~Q(holder_name=""), ...)` guarantees that each holder-history record has either a linked `Character` object or a fallback text name.

### SQLite-Driven Content Update

> - **Purpose**: Use the local SQLite database as the source of truth for dynamic page content during development.
> - **Usage in this project**: The new element data and holder-history records were stored in `db.sqlite3`, then read by the backend API so the element popup content no longer relied only on static HTML text.

## Additional Content

### Data API for Frontend Popups

> - **Structured JSON serialization**
>   - **Purpose**: Convert relational model data into a response format that the frontend can consume directly.
>   - **Usage in this project**: `element_powers_api()` assembles each element's source information, description, current holder, and ordered holder-history list into JSON for the popup interface on the Elements page.

### Admin Workflow Improvements for Relational Data

> - **Advanced admin configuration**
>   - **Purpose**: Improve content management efficiency after the schema became more complex.
>   - **Usage in this project**: We used `autocomplete_fields`, `list_editable`, `list_select_related`, and inline history editing in Django Admin to manage element sources, powers, and holder records more efficiently.

### Framework-Version Compatibility Debugging

> - **Django 6 constraint API update**
>   - **Purpose**: Keep the project compatible with the installed framework version.
>   - **Usage in this project**: We fixed a runtime error by replacing `CheckConstraint(check=...)` with `CheckConstraint(condition=...)`, which is the correct API in Django 6.0. This prevented `runserver` from crashing during model loading.

## Contribution

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | element page optimization, Bug Fix, and Report Writing |
| 呂羿樺 | 50% | Create feedback system, Home page optimization, Bug Fix, and Report Writing |
