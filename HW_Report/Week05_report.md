Week 5 Practice report
===

In-class Practice
---

**Settings Configuration (`settings.py`)**  

> - `TEMPLATES — DIRS`
>   - **Purpose**: Tell Django where to look for HTML template files outside of app directories.
>   - **Usage**: Configured `[BASE_DIR.parent, BASE_DIR.parent / "src"]` so that templates stored in the project root and the `src/` folder can be resolved.  
>
> - `STATICFILES_DIRS` with Named Tuples
>   - **Purpose**: Map virtual URL prefixes to physical filesystem paths for static assets.
>   - **Usage**: Registered `("css", ...), ("action", ...), ("img", ...)` so each asset category is accessible under its own namespace via `{% static %}`.  
>
> - `MEDIA_URL` / `MEDIA_ROOT`
>   - **Purpose**: Configure the URL prefix and root directory for user-uploaded media files (separate from collected static files).
>   - **Usage**: Set `MEDIA_URL = "/media/"` and `MEDIA_ROOT = BASE_DIR` to serve images uploaded through the admin panel.  

**URL Routing (`urls.py`)**  

> - `TemplateView.as_view(template_name=...)`
>   - **Purpose**: A generic class-based view that renders a template without requiring a custom view function.
>   - **Usage**: Used for static pages like `index.html`, `timeline.html`, `world.html`, and `elements.html`, reducing boilerplate code.  
>
> - `static()` Helper and `re_path()` in Development Mode
>   - **Purpose**: Serve static/media files during development when `DEBUG = True`; `re_path()` supports regex-based URL matching for edge cases.
>   - **Usage**: Appended URL patterns to serve CSS, image, JS, and media files directly from the filesystem, and used `re_path(r"^style\.css$", serve, {...})` to serve root-level assets.  

**Django Template Language (DTL)**  

> - `{% static 'path/to/file' %}`
>   - **Purpose**: Generate the correct URL for a static file at runtime, respecting `STATICFILES_DIRS` and `STATIC_URL`.
>   - **Usage**: Used for linking CSS (`{% static 'css/characters.css' %}`), JavaScript (`{% static 'action/characters.js' %}`), and images (`{% static 'img/lego-ninjago-logo.png' %}`).  
>
> - `{% for item in queryset %}...{% empty %}...{% endfor %}`
>   - **Purpose**: Loop over a queryset passed from the view; `{% empty %}` provides fallback content when the queryset is empty.
>   - **Usage**: Iterated over `characters` and their nested `images` to render character cards dynamically, with `{% empty %}` displaying a prompt to add data via admin.  
>
> - `{{ object.get_FOO_display }}`
>   - **Purpose**: Retrieve the human-readable label of a `choices`-based field instead of the stored value.
>   - **Usage**: Called `{{ character.get_gender_display }}` to display "男" / "女" instead of the raw `"M"` / `"F"` stored in the database.  

Additional Content
---

**Django ORM — Model Definition (`models.py`)**  

> - `models.TextChoices`
>   - **Purpose**: Define an enumeration of allowed values for a field, improving readability and type safety.
>   - **Usage**: Created `Character.Gender` with `MALE = "M"` and `FEMALE = "F"` to restrict the `gender` field.
>
>   ```python
>   class Gender(models.TextChoices):
>       MALE = "M", "男"
>       FEMALE = "F", "女"
>   ```
>
> - `ImageField(upload_to="characters/")`
>   - **Purpose**: A file upload field that stores image paths relative to `MEDIA_ROOT` and integrates with Django's file-handling system.
>   - **Usage**: Each `CharacterImage` stores its file under the `characters/` subdirectory, and exposes `photo.image.url` for template rendering.  
>
> - `ForeignKey(on_delete=models.CASCADE, related_name="images")`
>   - **Purpose**: Establish a many-to-one relationship between tables; `CASCADE` deletes child rows when the parent is removed; `related_name` enables reverse lookups.
>   - **Usage**: Linked `CharacterImage` to `Character`, enabling `character.images.all` in templates.  
>
> - `class Meta`
>   - **Purpose**: Provide model-level metadata such as custom table names and default ordering.
>   - **Usage**: Set `db_table = "character"` and `ordering = ["name"]` for `Character`; `ordering = ["sort_order", "id"]` for `CharacterImage`.  
>
> - Custom `clean()` and `save()` Methods
>   - **Purpose**: Add custom validation and pre-save logic at the model layer.
>   - **Usage**: `CharacterImage.clean()` enforces a maximum of 3 images per character; `save()` auto-assigns `sort_order` when not provided.
>
>   ```python
>   def clean(self) -> None:
>       super().clean()
>       if not self.character_id:
>           return
>       existing = CharacterImage.objects.filter(character_id=self.character_id)
>       if self.pk:
>           existing = existing.exclude(pk=self.pk)
>       if existing.count() >= 3:
>           raise ValidationError("每個角色最多只能上傳 3 張圖片。")
>   ```

**Database Setup & Migrations**  

> - `python manage.py makemigrations` / `migrate`
>   - **Purpose**: `makemigrations` auto-generates migration files from model changes; `migrate` applies them to the database.
>   - **Usage**: Produced 3 migration scripts and created the `character` and `character_image` tables in the SQLite database (`db.sqlite3`).  

**Django Admin Panel (`admin.py`)**  

> - `admin.ModelAdmin` Customization
>   - `list_display` — columns shown on the model list page.
>   - `list_filter` — sidebar filters for quick narrowing.
>   - `search_fields` — fields searchable via the admin search bar.
>   - **Usage**: Configured `CharacterAdmin` with display columns `(name, gender, affiliation, element, first_appearance)`, filters `(gender, affiliation, element)`, and search on `(name, affiliation, homeland, occupation, element)`.  
>
> - `admin.TabularInline`
>   - **Purpose**: Display related child models inline on the parent's edit page, allowing one-page CRUD for parent + children.
>   - **Usage**: `CharacterImageInline` allows adding/editing up to 3 images directly on the Character admin form.
>
>   ```python
>   class CharacterImageInline(admin.TabularInline):
>       model = CharacterImage
>       extra = 1
>       max_num = 3
>       fields = ("image", "sort_order")
>   ```

**QuerySet Optimization in Views (`views.py`)**  

> - `prefetch_related()` with `Prefetch()`
>   - **Purpose**: Reduce the number of database queries by fetching related objects in a single batch query instead of one query per parent row (N+1 problem).
>   - **Usage**: Pre-loaded the ordered `CharacterImage` set for each `Character` in a single additional query.
>
>   ```python
>   characters = (
>       Character.objects.all()
>       .prefetch_related(
>           Prefetch("images", queryset=CharacterImage.objects.order_by("sort_order", "id"))
>       )
>       .order_by("name")
>   )
>   ```

Contribution
---

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | Frontend Design and connection, Database Setup |
| 呂羿樺 | 50% | Django Backend, Bug Fix, and Report Writing |
