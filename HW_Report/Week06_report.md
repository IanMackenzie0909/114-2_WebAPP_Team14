Week 6 Practice report
===

In-class Practice
---

**Form Submission Logic with GET and POST**

> - `GET` for search queries  
>   - **Purpose**: Submit and preserve search conditions in the URL (`?q=...`), making results bookmarkable/shareable.  
>   - **Usage in this project**: Global search reads `q` via `URLSearchParams` and updates page highlighting/filter behavior.
>
> - `POST` for vote updates  
>   - **Purpose**: Modify server-side data safely (increase character popularity votes).  
>   - **Usage in this project**:  
>     - Frontend sends `POST /characters/<id>/vote/`  
>     - Backend updates vote count and returns JSON response.

Additional Content
---

**Secure and Fair Voting Design**

> - `@require_POST`  
>   - Restricts vote endpoint to POST requests only.
>
> - CSRF protection  
>   - `@ensure_csrf_cookie` on the character page ensures CSRF cookie availability.  
>   - Frontend sends `X-CSRFToken` in `fetch()` requests.
>
> - Session-based anti-spam voting  
>   - A new `CharacterVote` model stores `(character, session_key)` vote records.  
>   - A unique constraint (`uniq_character_vote_per_session`) prevents duplicate votes from the same session for the same character.

**Data Consistency and Concurrency Handling**

> - `transaction.atomic()`  
>   - Ensures vote record creation and vote count update run as one safe transaction.
>
> - `F("vote_count") + 1`  
>   - Performs database-side atomic increments and avoids race-condition overwrite issues.

**Interactive Frontend-Backend Integration**

> - Asynchronous vote submission with `fetch()`  
>   - The UI updates vote count immediately after server response without page reload.
>
> - Stateful UI feedback  
>   - The vote button switches to a locked state (`已投票`) after successful submission or if already voted.
>
> - Search quality improvements  
>   - Debounced live search, history suggestions via `localStorage`, and cross-page result panel improve discoverability and usability.
Contribution
---

| Member | Percentage | Contribution |
| :--: | :--: | :-- |
| 顏伯亨 | 50% | Voting system design and Search system optimization, Bug Fix |
| 呂羿樺 | 50% | Search system design, Bug Fix, and Report Writing |