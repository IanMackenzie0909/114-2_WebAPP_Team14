# Week 13 Practice report

## In-class Practice

### Groq LLM API Integration

> - **Purpose**: Connect the website to an external LLM service so visitors can ask questions about the Ninjago timeline and world-building content.
> - **Usage in this project**: We added a Groq backend integration in `mainsite/groq_assistant.py`. The assistant uses the `llama-3.3-70b-versatile` model and sends only selected timeline context to Groq instead of exposing the full dataset or API key in the browser.

### Ninjago Question Answering REST API

> - **Purpose**: Provide a server-side API endpoint that the frontend can call safely without leaking the Groq API key.
> - **Usage in this project**: We added `POST /api/ninjago/ask/`. The endpoint accepts a JSON question, searches the local timeline dataset for relevant events, sends the selected context to Groq, and returns the answer together with source event metadata.

### Timeline Events REST API

> - **Purpose**: Expose structured timeline data through a REST-style endpoint so the website and assistant can reuse the same source of truth.
> - **Usage in this project**: We added `/api/timeline/events/`, including query and limit support. It can return all timeline events or search results such as `?q=Acronix%20Krux&limit=2`.

### Frontend AI Assistant Panel

> - **Purpose**: Let users interact with the LLM directly inside the timeline page.
> - **Usage in this project**: `src/timeline.html`, `action/timeline.js`, and `css/timeline.css` were updated with a Ninjago world-question panel. Users can type a question or click suggested questions, and the page displays the model answer plus clickable source events.

### Source-Grounded Answer Flow

> - **Purpose**: Reduce hallucination by forcing the LLM to answer from website data instead of general model memory.
> - **Usage in this project**: Before calling Groq, the backend retrieves relevant events from `data/ninjago_timeline_events.json`, builds a compact context prompt, and asks the model to answer in Traditional Chinese with source event IDs.

## Additional Content

### Timeline Markdown Data Pipeline

> - **Purpose**: Convert the original timeline Markdown files into structured data that can be searched by the assistant.
> - **Usage in this project**: We moved the official source files into `data/sources/timeline/` and added `mainsite/timeline_data.py` plus `python manage.py build_timeline_events`. This generates `data/ninjago_timeline_events.json` with event IDs, titles, summaries, details, keywords, source file names, and line numbers.

### Assistant Query Alias Improvements

> - **Purpose**: Improve search results for Chinese names, English names, and common user phrasing.
> - **Usage in this project**: The assistant now expands aliases such as `赤蘭 / Nya`, `勞埃德 / Lloyd`, `時間雙子 / Acronix / Krux`, `來源龍 / Source Dragon`, `國度水晶 / Realm Crystal`, and `第一旋風忍術大師 / First Spinjitzu Master`.

### Unsupported Detail Guard

> - **Purpose**: Prevent the LLM from guessing details that are not present in the website's built-in data.
> - **Usage in this project**: Questions about unsupported details such as birthdays, height, favorite food, exact dates, complete family trees, or every episode line are caught locally and return a clear "currently insufficient data" response instead of being sent to Groq.

### Local Environment File Support

> - **Purpose**: Avoid manually typing environment variables every time the server starts.
> - **Usage in this project**: We added `.env.example`, local `.env` loading in Django settings, and `.gitignore` rules so `GROQ_API_KEY` can be stored locally without committing secrets.

### Docker Compose Environment Support

> - **Purpose**: Keep the Groq model and API key configurable when running the project through Docker Compose.
> - **Usage in this project**: `docker-compose.yml` now supports `GROQ_MODEL` and `GROQ_API_KEY` through environment variables, defaulting the model to `llama-3.3-70b-versatile`.

## Contribution

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | Groq LLM API concatenation, RESTful API concatenation, front-end Q&A interface design, and error-proofing design for insufficient data, and report writing |
| 呂羿樺 | 50% | Docker documentation, database startup workflow, Git cleanup for SQLite database, and report writing |